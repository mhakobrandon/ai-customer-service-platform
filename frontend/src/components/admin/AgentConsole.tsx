import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Button,
  TextField,
  CircularProgress,
  Divider,
  Alert,
  Stack,
} from '@mui/material'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { chatAPI, ticketAPI } from '../../services/apiService'
import { useAuth } from '../../services/authService'
import { getDashboardRoute } from '../../utils/dashboardRoute'

interface InboxItem {
  session_id: string
  status: string
  customer: string
  escalation_reason?: string
  assigned_agent_id?: string | null
  ticket_id?: string | null
  ticket_status?: string | null
  updated_at?: string
  unreplied?: boolean
}

interface Message {
  id: string
  content: string
  language: string
  is_from_customer: boolean
  is_from_ai: boolean
  is_from_agent?: boolean
  sender_name?: string
  timestamp: string
}

export default function AgentConsole() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const targetSessionFromQuery = searchParams.get('session')
  const dashboardRoute = getDashboardRoute(user?.role)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [ticketActionLoading, setTicketActionLoading] = useState(false)
  const [newEscalationNotice, setNewEscalationNotice] = useState<string | null>(null)
  const hasInboxInitializedRef = useRef(false)
  const previousInboxCountRef = useRef(0)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      setTimeout(() => {
        messagesContainerRef.current?.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' })
      }, 0)
    }
  }, [messages])

  const activeInboxItem = useMemo(
    () => inbox.find((item) => item.session_id === activeSessionId) || null,
    [inbox, activeSessionId]
  )

  const loadInbox = async () => {
    try {
      const response = await chatAPI.getEscalationInbox()
      const items: InboxItem[] = response.data?.items || []
      setInbox(items)
      if (targetSessionFromQuery) {
        const matched = items.find((item) => item.session_id === targetSessionFromQuery)
        if (matched) {
          setActiveSessionId(matched.session_id)
          return
        }
      }

      if (!activeSessionId && items.length > 0) {
        setActiveSessionId(items[0].session_id)
      }
    } catch (err) {
      setError('Failed to load escalation inbox')
      console.error(err)
    }
  }

  const loadMessages = async (sessionId: string) => {
    try {
      const response = await chatAPI.getMessages(sessionId)
      setMessages(response.data || [])
    } catch (err) {
      setError('Failed to load session messages')
      console.error(err)
    }
  }

  const claimSession = async (sessionId: string) => {
    try {
      await chatAPI.assignAgent(sessionId)
      await loadInbox()
    } catch (err) {
      setError('Failed to claim session')
      console.error(err)
    }
  }

  const sendReply = async () => {
    if (!activeSessionId || !reply.trim()) return

    setSending(true)
    try {
      await chatAPI.sendAgentMessage(activeSessionId, reply)
      setReply('')
      await loadMessages(activeSessionId)
      await loadInbox()
    } catch (err) {
      setError('Failed to send agent reply')
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  const markPendingCustomerConfirmation = async () => {
    if (!activeInboxItem?.ticket_id) return
    setTicketActionLoading(true)
    try {
      await ticketAPI.requestConfirmation(activeInboxItem.ticket_id)
      await loadInbox()
    } catch (err) {
      setError('Failed to mark ticket as pending customer confirmation')
      console.error(err)
    } finally {
      setTicketActionLoading(false)
    }
  }

  const closeEscalatedTicket = async () => {
    if (!activeInboxItem?.ticket_id) return
    setTicketActionLoading(true)
    try {
      if (activeSessionId) {
        // Ensure ownership is persisted before attempting closure.
        await chatAPI.assignAgent(activeSessionId)
      }
      await ticketAPI.closeTicket(activeInboxItem.ticket_id, 'agent_close_after_escalation')
      await loadInbox()
    } catch (err) {
      const apiError = err as AxiosError<{ detail?: string }>
      const detail = apiError.response?.data?.detail
      setError(detail ? `Failed to close escalated ticket: ${detail}` : 'Failed to close escalated ticket')
      console.error(err)
    } finally {
      setTicketActionLoading(false)
    }
  }

  useEffect(() => {
    const initialize = async () => {
      setLoading(true)
      setError(null)
      await loadInbox()
      setLoading(false)
    }
    initialize()
  }, [])

  useEffect(() => {
    if (!activeSessionId) {
      setMessages([])
      return
    }
    loadMessages(activeSessionId)
  }, [activeSessionId])

  useEffect(() => {
    const interval = setInterval(() => {
      loadInbox()
      if (activeSessionId) {
        loadMessages(activeSessionId)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [activeSessionId])

  useEffect(() => {
    const currentCount = inbox.length
    const previousCount = previousInboxCountRef.current

    if (!hasInboxInitializedRef.current) {
      hasInboxInitializedRef.current = true
      previousInboxCountRef.current = currentCount
      return
    }

    if (currentCount > previousCount) {
      const waitingNow = currentCount - previousCount
      setNewEscalationNotice(
        `${waitingNow} new escalated customer${waitingNow > 1 ? 's are' : ' is'} waiting for your response.`
      )
    }

    previousInboxCountRef.current = currentCount
  }, [inbox])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Human Agent Console
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Handle escalated chats in real time.
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => navigate(dashboardRoute)}>
          Back to Dashboard
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {newEscalationNotice && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setNewEscalationNotice(null)}>
          {newEscalationNotice}
        </Alert>
      )}

      {inbox.length > 0 && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                const firstWaiting = inbox[0]
                if (firstWaiting) {
                  setActiveSessionId(firstWaiting.session_id)
                }
              }}
            >
              View waiting customer
            </Button>
          }
        >
          {`${inbox.length} escalated customer${inbox.length > 1 ? 's are' : ' is'} currently waiting for a human response.`}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: '70vh', overflow: 'auto' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Escalation Inbox ({inbox.length})
              </Typography>
            </Box>
            <List sx={{ p: 0 }}>
              {inbox.length === 0 ? (
                <Box sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    No escalated sessions right now.
                  </Typography>
                </Box>
              ) : (
                inbox.map((item) => (
                  <ListItemButton
                    key={item.session_id}
                    selected={activeSessionId === item.session_id}
                    onClick={() => setActiveSessionId(item.session_id)}
                    sx={{
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      backgroundColor: item.unreplied ? 'rgba(211, 47, 47, 0.06)' : 'transparent',
                      '&:hover': {
                        backgroundColor: item.unreplied ? 'rgba(211, 47, 47, 0.12)' : undefined,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                      {item.unreplied && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: 'error.main',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <ListItemText
                        primary={
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: item.unreplied ? 'bold' : 'normal',
                              color: item.unreplied ? 'error.main' : 'inherit',
                            }}
                          >
                            {item.customer}
                          </Typography>
                        }
                        secondary={`${item.session_id} • ${item.escalation_reason || 'Escalated'}`}
                      />
                    </Box>
                    <Chip
                      label={item.status}
                      size="small"
                      color={item.status === 'assigned' ? 'success' : 'warning'}
                    />
                  </ListItemButton>
                ))
              )}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {activeInboxItem ? `Session ${activeInboxItem.session_id}` : 'Select a session'}
                </Typography>
                {activeInboxItem && (
                  <Typography variant="caption" color="text.secondary">
                    {activeInboxItem.customer} • {activeInboxItem.escalation_reason || 'Escalated by AI'}
                  </Typography>
                )}
                {activeInboxItem?.ticket_id && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Ticket: {activeInboxItem.ticket_id} ({activeInboxItem.ticket_status || 'unknown'})
                  </Typography>
                )}
              </Box>
              <Stack direction="row" spacing={1}>
                {activeInboxItem?.ticket_id && (
                  <>
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={ticketActionLoading}
                      onClick={markPendingCustomerConfirmation}
                    >
                      Await Customer Confirm
                    </Button>
                    <Button
                      variant="outlined"
                      color="success"
                      size="small"
                      disabled={ticketActionLoading}
                      onClick={closeEscalatedTicket}
                    >
                      Close Issue
                    </Button>
                  </>
                )}
                {activeSessionId && (
                  <Button variant="contained" size="small" onClick={() => claimSession(activeSessionId)}>
                    Claim Session
                  </Button>
                )}
              </Stack>
            </Box>

            <Box
              ref={messagesContainerRef}
              sx={{ flexGrow: 1, overflow: 'auto', p: 2, bgcolor: 'background.default' }}
            >
              {activeSessionId ? (
                messages.map((msg) => (
                  <Box
                    key={msg.id}
                    sx={{
                      mb: 1.5,
                      display: 'flex',
                      justifyContent: msg.is_from_customer ? 'flex-start' : 'flex-end',
                    }}
                  >
                    <Paper
                      sx={{
                        p: 1.5,
                        maxWidth: '75%',
                        bgcolor: msg.is_from_customer ? 'white' : msg.is_from_agent ? 'warning.50' : 'primary.50',
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {msg.content}
                      </Typography>
                      <Divider sx={{ my: 0.8 }} />
                      <Typography variant="caption" color="text.secondary">
                        {msg.is_from_customer
                          ? 'Customer'
                          : msg.is_from_agent
                          ? `Agent ${msg.sender_name || ''}`
                          : 'AI'}
                      </Typography>
                    </Paper>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Select an escalated session from inbox.
                </Typography>
              )}
            </Box>

            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  placeholder="Type your message to customer..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendReply()
                    }
                  }}
                  disabled={!activeSessionId || sending}
                />
                <Button
                  variant="contained"
                  onClick={sendReply}
                  disabled={!activeSessionId || !reply.trim() || sending}
                >
                  Send
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
