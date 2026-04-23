import { useEffect, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  TextField,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {
  Assessment as ReportsIcon,
  ChatBubble as ChatIcon,
  ConfirmationNumber as TicketIcon,
  Dashboard as DashboardIcon,
  Forum as InboxIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
  SupportAgent as SupportAgentIcon,
} from '@mui/icons-material'
import { useNavigate, useParams } from 'react-router-dom'
import { ticketAPI } from '../../services/apiService'
import { formatDateTime } from '../../utils/dateUtils'
import PageHeader from '../common/PageHeader'
import { useAuth } from '../../services/authService'
import DashboardShell, { type DashboardShellNavSection, toInitials } from '../dashboard/DashboardShell'

interface TicketDetailsData {
  ticket_id: string
  subject: string
  description: string
  category: string
  priority: string
  status: string
  created_at: string
  updated_at?: string
  resolved_at?: string
  resolution?: string | null
  resolution_notes?: string | null
  is_overdue?: boolean
}

const getPriorityColor = (priority: string): 'default' | 'error' | 'warning' | 'info' => {
  switch ((priority || '').toLowerCase()) {
    case 'critical':
    case 'high':
      return 'error'
    case 'medium':
      return 'warning'
    case 'low':
      return 'info'
    default:
      return 'default'
  }
}

const getStatusColor = (status: string): 'default' | 'success' | 'warning' | 'error' => {
  switch ((status || '').toLowerCase()) {
    case 'resolved':
    case 'closed':
      return 'success'
    case 'new':
    case 'assigned':
    case 'in_progress':
    case 'pending_customer':
      return 'warning'
    case 'escalated':
    case 'reopened':
      return 'error'
    default:
      return 'default'
  }
}

export default function TicketDetails() {
  const navigate = useNavigate()
  const { ticketId } = useParams()
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ticket, setTicket] = useState<TicketDetailsData | null>(null)
  const [agentResolutionComment, setAgentResolutionComment] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const isAgentView = user?.role === 'agent'
  const compactView = isAgentView
  const displayName = user?.name || user?.email || 'Agent User'

  const loadTicket = async () => {
    if (!ticketId) {
      setError('Missing ticket reference')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await ticketAPI.getTicketDetails(ticketId)
      setTicket(response.data)
    } catch (err) {
      setError('Unable to load ticket details. The ticket may not exist or you may not have access.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTicket()
  }, [ticketId])

  const handleAgentResolveAndNotify = async () => {
    if (!ticketId || !ticket) return

    const comment = agentResolutionComment.trim()
    if (!comment) {
      setActionError('Please add a resolution comment before marking as resolved.')
      return
    }

    setActionLoading(true)
    setActionMessage(null)
    setActionError(null)

    try {
      await ticketAPI.updateTicket(ticketId, {
        status: 'resolved',
        resolution: comment,
        resolution_notes: comment,
      })

      // Notify customer for confirmation after agent resolution.
      await ticketAPI.requestConfirmation(ticketId)

      const refreshed = await ticketAPI.getTicketDetails(ticketId)
      setTicket(refreshed.data)
      setActionMessage('Ticket updated and customer notification sent for confirmation.')
      setAgentResolutionComment('')
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setActionError(detail || 'Failed to update ticket and notify customer.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={56} />
      </Box>
    )
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const sidebarSections: DashboardShellNavSection[] = [
    {
      id: 'main',
      title: 'Main',
      items: [
        {
          id: 'agent-home',
          label: 'Home',
          icon: <DashboardIcon sx={{ fontSize: 13 }} />,
          onClick: () => navigate('/dashboard/agent'),
        },
        {
          id: 'agent-reports',
          label: 'Reports',
          icon: <ReportsIcon sx={{ fontSize: 13 }} />,
          onClick: () => navigate('/dashboard/agent/reports'),
        },
        {
          id: 'agent-inbox',
          label: 'Escalation Inbox',
          icon: <InboxIcon sx={{ fontSize: 13 }} />,
          onClick: () => navigate('/dashboard/agent/escalations'),
        },
        {
          id: 'agent-tickets',
          label: 'My Tickets',
          icon: <TicketIcon sx={{ fontSize: 13 }} />,
          active: true,
          onClick: () => navigate('/dashboard/agent/tickets'),
        },
      ],
    },
    {
      id: 'ops',
      title: 'Operations',
      items: [
        {
          id: 'agent-console',
          label: 'Agent Console',
          icon: <SupportAgentIcon sx={{ fontSize: 13 }} />,
          onClick: () => navigate('/agent/console'),
        },
        {
          id: 'agent-chat',
          label: 'Live Chat',
          icon: <ChatIcon sx={{ fontSize: 13 }} />,
          onClick: () => navigate('/chat'),
        },
      ],
    },
    {
      id: 'account',
      title: 'Account',
      items: [
        {
          id: 'agent-logout',
          label: 'Logout',
          icon: <LogoutIcon sx={{ fontSize: 13 }} />,
          onClick: handleLogout,
        },
      ],
    },
  ]

  const topActions = (
    <>
      <button type="button" className="btn" onClick={() => void loadTicket()}>
        <RefreshIcon sx={{ fontSize: 12 }} /> Refresh
      </button>
      <button type="button" className="btn" onClick={() => navigate('/dashboard/agent/tickets')}>
        <ArrowBackIcon sx={{ fontSize: 12 }} /> Back to My Tickets
      </button>
      <button type="button" className="btn" onClick={handleLogout}>
        <LogoutIcon sx={{ fontSize: 12 }} /> Logout
      </button>
    </>
  )

  const detailsCard = ticket && (
    <Paper
      elevation={compactView ? 1 : 2}
      sx={{
        p: compactView ? 1.75 : 3.5,
        borderRadius: compactView ? 2 : 3,
        ...(compactView
          ? {
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }
          : {}),
      }}
    >
      <Grid container spacing={compactView ? 1 : 2}>
        <Grid item xs={12} md={8}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 0.25 }}>{ticket.subject}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Reference: {ticket.ticket_id}
          </Typography>
        </Grid>
        <Grid item xs={12} md={4} sx={{ display: 'flex', gap: compactView ? 0.75 : 1, justifyContent: { md: 'flex-end' }, alignItems: 'center' }}>
          <Chip label={ticket.priority.replace('_', ' ')} size="small" color={getPriorityColor(ticket.priority)} variant="outlined" sx={{ textTransform: 'capitalize' }} />
          <Chip label={ticket.status.replace('_', ' ')} size="small" color={getStatusColor(ticket.status)} sx={{ textTransform: 'capitalize' }} />
          {ticket.is_overdue && <Chip label="Overdue" size="small" color="error" variant="filled" />}
        </Grid>
      </Grid>

      <Divider sx={{ my: compactView ? 1 : 2 }} />

      <Typography variant="subtitle2" color="text.secondary">Category</Typography>
      <Typography variant="body1" sx={{ mb: compactView ? 0.75 : 1.5 }}>{ticket.category.replace(/_/g, ' ')}</Typography>

      <Typography variant="subtitle2" color="text.secondary" sx={{ mt: compactView ? 1 : 2 }}>Description</Typography>
      <Typography variant={compactView ? 'body2' : 'body1'} sx={{ whiteSpace: 'pre-wrap', lineHeight: compactView ? 1.35 : 1.55 }}>
        {ticket.description}
      </Typography>

      {(ticket.resolution || ticket.resolution_notes) && (
        <>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: compactView ? 1.25 : 3 }}>Resolution</Typography>
          {ticket.resolution && (
            <Typography variant={compactView ? 'body2' : 'body1'} sx={{ whiteSpace: 'pre-wrap', lineHeight: compactView ? 1.35 : 1.55 }}>
              {ticket.resolution}
            </Typography>
          )}
          {ticket.resolution_notes && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: compactView ? 0.5 : 1, whiteSpace: 'pre-wrap' }}>
              Notes: {ticket.resolution_notes}
            </Typography>
          )}
        </>
      )}

      {isAgentView && ticket.status !== 'closed' && ticket.status !== 'resolved' && (
        <>
          <Divider sx={{ my: compactView ? 1 : 2 }} />
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: compactView ? 0.5 : 1 }}>
            Agent Action
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={compactView ? 2 : 3}
            size="small"
            label="Resolution Comment"
            placeholder="Write the resolution details that will be saved to the ticket and sent for customer confirmation"
            value={agentResolutionComment}
            onChange={(event) => setAgentResolutionComment(event.target.value)}
            sx={{ mb: compactView ? 1 : 1.5 }}
          />
          <Button
            variant="contained"
            color="success"
            size={compactView ? 'small' : 'medium'}
            disabled={actionLoading || !agentResolutionComment.trim()}
            onClick={handleAgentResolveAndNotify}
          >
            {actionLoading ? 'Updating...' : 'Mark Resolved & Notify Customer'}
          </Button>
        </>
      )}

      <Divider sx={{ my: compactView ? 1 : 2 }} />

      <Typography variant="caption" color="text.secondary" display="block">
        Created: {formatDateTime(ticket.created_at)}
      </Typography>
      {ticket.updated_at && (
        <Typography variant="caption" color="text.secondary" display="block">
          Updated: {formatDateTime(ticket.updated_at)}
        </Typography>
      )}
      {ticket.resolved_at && (
        <Typography variant="caption" color="text.secondary" display="block">
          Resolved: {formatDateTime(ticket.resolved_at)}
        </Typography>
      )}
    </Paper>
  )

  if (isAgentView) {
    return (
      <DashboardShell
        roleClassName="role-dashboard-agent"
        brandLabel="BotAssist Agent"
        brandIcon={<SupportAgentIcon sx={{ fontSize: 13 }} />}
        sidebarSections={sidebarSections}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search ticket details..."
        topActions={topActions}
        userName={displayName}
        userMeta="Ticket details"
        userInitials={toInitials(displayName, 'AG')}
        onUserCardClick={() => navigate('/dashboard/agent/tickets')}
      >
        <Box sx={{ p: 0.5, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          {actionError && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setActionError(null)}>{actionError}</Alert>}
          {actionMessage && <Alert severity="success" sx={{ mb: 1 }} onClose={() => setActionMessage(null)}>{actionMessage}</Alert>}
          {detailsCard}
        </Box>
      </DashboardShell>
    )
  }

  return (
    <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
      <PageHeader
        title="Ticket Details"
        subtitle="Review issue status, ownership, and resolution timeline"
        actions={
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/chat')}>
            Back to Chat
          </Button>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {actionError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>{actionError}</Alert>}
      {actionMessage && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setActionMessage(null)}>{actionMessage}</Alert>}

      {detailsCard}
    </Box>
  )
}
