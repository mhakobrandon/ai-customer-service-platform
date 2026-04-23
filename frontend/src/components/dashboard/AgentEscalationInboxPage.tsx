import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  TablePagination,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
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
import { useNavigate } from 'react-router-dom'
import { chatAPI } from '../../services/apiService'
import { useAuth } from '../../services/authService'
import DashboardShell, { type DashboardShellNavSection, toInitials } from './DashboardShell'

interface InboxItem {
  session_id: string
  customer: string
  status: string
  escalation_reason?: string
}

const INBOX_ROWS_PER_PAGE = 6

export default function AgentEscalationInboxPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [inboxPage, setInboxPage] = useState(0)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const inboxRes = await chatAPI.getEscalationInbox()
      setInbox(inboxRes.data?.items || [])
    } catch (err) {
      console.error(err)
      setError('Failed to load escalation inbox.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      void loadData()
    }, 15000)

    return () => clearInterval(interval)
  }, [])

  const normalizedSearch = searchQuery.trim().toLowerCase()

  const filteredInbox = useMemo(() => {
    if (!normalizedSearch) {
      return inbox
    }

    return inbox.filter((item) => {
      const haystack = [item.customer, item.status, item.escalation_reason, item.session_id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [inbox, normalizedSearch])

  const paginatedInbox = useMemo(() => {
    const start = inboxPage * INBOX_ROWS_PER_PAGE
    return filteredInbox.slice(start, start + INBOX_ROWS_PER_PAGE)
  }, [filteredInbox, inboxPage])

  useEffect(() => {
    setInboxPage(0)
  }, [normalizedSearch])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredInbox.length / INBOX_ROWS_PER_PAGE) - 1)
    if (inboxPage > maxPage) {
      setInboxPage(maxPage)
    }
  }, [filteredInbox.length, inboxPage])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const displayName = user?.name || user?.email || 'Agent User'

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
          active: true,
          onClick: () => navigate('/dashboard/agent/escalations'),
        },
        {
          id: 'agent-tickets',
          label: 'My Tickets',
          icon: <TicketIcon sx={{ fontSize: 13 }} />,
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
      <button type="button" className="btn" onClick={() => void loadData()}>
        <RefreshIcon sx={{ fontSize: 12 }} /> Refresh
      </button>
      <button type="button" className="btn" onClick={() => navigate('/agent/console')}>
        <SupportAgentIcon sx={{ fontSize: 12 }} /> Console
      </button>
      <button type="button" className="btn" onClick={() => navigate('/chat')}>
        <ChatIcon sx={{ fontSize: 12 }} /> Open chat
      </button>
      <button type="button" className="btn" onClick={handleLogout}>
        <LogoutIcon sx={{ fontSize: 12 }} /> Logout
      </button>
    </>
  )

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <DashboardShell
      roleClassName="role-dashboard-agent"
      brandLabel="Taur.ai Agent"
      brandIcon={<SupportAgentIcon sx={{ fontSize: 13 }} />}
      sidebarSections={sidebarSections}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search escalation inbox..."
      topActions={topActions}
      userName={displayName}
      userMeta="Escalation inbox"
      userInitials={toInitials(displayName, 'AG')}
      onUserCardClick={() => navigate('/dashboard/agent/escalations')}
      alerts={
        <>
          {error && (
            <Box className="dashboard-alert">
              <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
            </Box>
          )}
        </>
      }
    >
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            flexShrink: 0,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.08)}, transparent)`,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar sx={{ width: 30, height: 30, bgcolor: 'warning.main' }}>
              <InboxIcon sx={{ fontSize: 16 }} />
            </Avatar>
            <Typography variant="subtitle1" fontWeight={700}>Escalation Inbox</Typography>
          </Box>
          <Chip label={`${filteredInbox.length} shown`} size="small" color={filteredInbox.length > 0 ? 'warning' : 'default'} />
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', py: 0.5 }}>
          <List disablePadding>
            {paginatedInbox.map((item) => (
              <ListItemButton
                key={item.session_id}
                onClick={() => navigate(`/agent/console?session=${encodeURIComponent(item.session_id)}`)}
                sx={{ px: 2, py: 1.25 }}
              >
                <ListItemAvatar sx={{ minWidth: 40 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'warning.dark', fontSize: '0.75rem' }}>
                    {item.customer?.[0]?.toUpperCase() || '?'}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography variant="body2" fontWeight={600}>{item.customer}</Typography>}
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {item.escalation_reason || 'Escalated by AI'}
                    </Typography>
                  }
                />
                <Chip
                  label={item.status}
                  size="small"
                  color={item.status === 'escalated' ? 'warning' : 'default'}
                  variant="outlined"
                  sx={{ fontSize: '0.68rem' }}
                />
              </ListItemButton>
            ))}

            {filteredInbox.length === 0 && (
              <Box textAlign="center" py={6}>
                <InboxIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  {inbox.length === 0 ? 'Inbox is clear - no escalations.' : 'No inbox entries match your search.'}
                </Typography>
              </Box>
            )}
          </List>
        </Box>

        {filteredInbox.length > 0 && (
          <TablePagination
            component="div"
            count={filteredInbox.length}
            page={inboxPage}
            onPageChange={(_, nextPage) => setInboxPage(nextPage)}
            rowsPerPage={INBOX_ROWS_PER_PAGE}
            rowsPerPageOptions={[INBOX_ROWS_PER_PAGE]}
          />
        )}

        <Box sx={{ p: 1.5, flexShrink: 0, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button fullWidth size="small" variant="contained" color="warning" startIcon={<SupportAgentIcon />}
            onClick={() => navigate('/agent/console')}>
            Open Agent Console
          </Button>
        </Box>
      </Paper>
    </DashboardShell>
  )
}
