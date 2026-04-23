import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
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
import { ticketAPI } from '../../services/apiService'
import { formatDateTime } from '../../utils/dateUtils'
import { useAuth } from '../../services/authService'
import DashboardShell, { type DashboardShellNavSection, toInitials } from './DashboardShell'

interface Ticket {
  ticket_id?: string
  subject: string
  status: string
  created_at: string
}

const resolvedStatuses = new Set(['resolved', 'closed'])
const TICKETS_ROWS_PER_PAGE = 9

export default function AgentMyTicketsPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketsPage, setTicketsPage] = useState(0)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const ticketsRes = await ticketAPI.getTickets()
      setTickets(ticketsRes.data || [])
    } catch (err) {
      console.error(err)
      setError('Failed to load my tickets.')
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

  const filteredTickets = useMemo(() => {
    if (!normalizedSearch) {
      return tickets
    }

    return tickets.filter((ticket) => {
      const haystack = [ticket.ticket_id, ticket.subject, ticket.status, ticket.created_at]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [tickets, normalizedSearch])

  const paginatedTickets = useMemo(() => {
    const start = ticketsPage * TICKETS_ROWS_PER_PAGE
    return filteredTickets.slice(start, start + TICKETS_ROWS_PER_PAGE)
  }, [filteredTickets, ticketsPage])

  useEffect(() => {
    setTicketsPage(0)
  }, [normalizedSearch])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredTickets.length / TICKETS_ROWS_PER_PAGE) - 1)
    if (ticketsPage > maxPage) {
      setTicketsPage(maxPage)
    }
  }, [filteredTickets.length, ticketsPage])

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
      searchPlaceholder="Search my tickets..."
      topActions={topActions}
      userName={displayName}
      userMeta="My tickets"
      userInitials={toInitials(displayName, 'AG')}
      onUserCardClick={() => navigate('/dashboard/agent/tickets')}
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
            background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)}, transparent)`,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main' }}>
              <TicketIcon sx={{ fontSize: 16 }} />
            </Avatar>
            <Typography variant="subtitle1" fontWeight={700}>My Tickets</Typography>
          </Box>
          <Chip label={`${filteredTickets.length} shown`} size="small" color="primary" variant="outlined" />
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', py: 0.5 }}>
          <List disablePadding>
            {paginatedTickets.map((ticket, index) => {
              const ticketRef = (ticket.ticket_id || '').trim()
              return (
                <ListItemButton
                  key={`${ticketRef || ticket.subject}-${index}`}
                  onClick={() => {
                    if (ticketRef) {
                      navigate(`/tickets/${ticketRef}`)
                    } else {
                      setError('This ticket cannot be opened because its reference is missing. Please refresh and try again.')
                    }
                  }}
                  sx={{
                    px: 2,
                    py: 0.6,
                    pr: 11,
                    minHeight: 'unset',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    '& .MuiListItemText-root': {
                      my: 0,
                    },
                    '& .MuiListItemText-primary': {
                      lineHeight: 1.3,
                    },
                    '& .MuiListItemText-secondary': {
                      lineHeight: 1.25,
                    },
                    '&:hover': {
                      backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.06),
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {ticket.subject}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(ticket.created_at)}{ticketRef ? ` - ${ticketRef}` : ''}
                      </Typography>
                    }
                  />
                  <Chip
                    label={ticket.status?.replace(/_/g, ' ')}
                    size="small"
                    color={resolvedStatuses.has(ticket.status?.toLowerCase()) ? 'success' : 'default'}
                    variant="outlined"
                    sx={{ fontSize: '0.68rem', ml: 1, pointerEvents: 'none' }}
                  />
                </ListItemButton>
              )
            })}

            {filteredTickets.length === 0 && (
              <Box textAlign="center" py={6}>
                <TicketIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  {tickets.length === 0 ? 'No assigned tickets yet.' : 'No tickets match your search.'}
                </Typography>
              </Box>
            )}
          </List>
        </Box>

        {filteredTickets.length > 0 && (
          <TablePagination
            component="div"
            count={filteredTickets.length}
            page={ticketsPage}
            onPageChange={(_, nextPage) => setTicketsPage(nextPage)}
            rowsPerPage={TICKETS_ROWS_PER_PAGE}
            rowsPerPageOptions={[TICKETS_ROWS_PER_PAGE]}
          />
        )}

        <Divider />
        <Box sx={{ p: 1.5, flexShrink: 0 }}>
          <Button fullWidth size="small" variant="outlined" startIcon={<SupportAgentIcon />}
            onClick={() => navigate('/agent/console')}>
            Continue in Console
          </Button>
        </Box>
      </Paper>
    </DashboardShell>
  )
}
