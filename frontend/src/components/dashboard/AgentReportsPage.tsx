import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TablePagination,
  Typography,
} from '@mui/material'
import {
  Assessment as ReportsIcon,
  ChatBubble as ChatIcon,
  ConfirmationNumber as TicketIcon,
  Dashboard as DashboardIcon,
  Download as DownloadIcon,
  Forum as InboxIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
  SupportAgent as SupportAgentIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { chatAPI, ticketAPI } from '../../services/apiService'
import { useAuth } from '../../services/authService'
import { formatDateTime } from '../../utils/dateUtils'
import DashboardShell, { type DashboardShellNavSection, toInitials } from './DashboardShell'

interface InboxItem {
  session_id: string
  customer: string
  status: string
}

interface Ticket {
  ticket_id?: string
  subject: string
  status: string
  created_at: string
}

const pendingStatuses = new Set(['new', 'assigned', 'in_progress', 'pending_customer', 'escalated', 'reopened'])
const resolvedStatuses = new Set(['resolved', 'closed'])
const ACTIVITY_ROWS_PER_PAGE = 3

const downloadCsv = (filename: string, rows: Array<Record<string, string | number>>) => {
  if (!rows.length) {
    return
  }

  const headers = Object.keys(rows[0])
  const escapeCell = (value: string | number) => {
    const text = String(value ?? '')
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  const csvLines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header] ?? '')).join(',')),
  ]

  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}

export default function AgentReportsPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [activityPage, setActivityPage] = useState(0)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [inboxRes, ticketsRes] = await Promise.all([
        chatAPI.getEscalationInbox(),
        ticketAPI.getTickets(),
      ])
      setInbox(inboxRes.data?.items || [])
      setTickets(ticketsRes.data || [])
    } catch (err) {
      console.error(err)
      setError('Failed to load report data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
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

  const filteredInbox = useMemo(() => {
    if (!normalizedSearch) {
      return inbox
    }

    return inbox.filter((item) => {
      const haystack = [item.session_id, item.customer, item.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [inbox, normalizedSearch])

  const stats = useMemo(() => {
    const pendingTickets = filteredTickets.filter((ticket) => pendingStatuses.has(ticket.status?.toLowerCase())).length
    const resolvedTickets = filteredTickets.filter((ticket) => resolvedStatuses.has(ticket.status?.toLowerCase())).length
    return {
      tickets: filteredTickets.length,
      pendingTickets,
      resolvedTickets,
      escalations: filteredInbox.length,
    }
  }, [filteredTickets, filteredInbox])

  const paginatedRecentActivity = useMemo(() => {
    const start = activityPage * ACTIVITY_ROWS_PER_PAGE
    return filteredTickets.slice(start, start + ACTIVITY_ROWS_PER_PAGE)
  }, [filteredTickets, activityPage])

  useEffect(() => {
    setActivityPage(0)
  }, [normalizedSearch])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredTickets.length / ACTIVITY_ROWS_PER_PAGE) - 1)
    if (activityPage > maxPage) {
      setActivityPage(maxPage)
    }
  }, [filteredTickets.length, activityPage])

  const handleDownloadTicketsReport = () => {
    downloadCsv('agent-tickets-report.csv', filteredTickets.map((ticket) => ({
      ticket_id: ticket.ticket_id || '',
      subject: ticket.subject,
      status: ticket.status,
      created_at: ticket.created_at,
    })))
    setSuccess('Tickets report downloaded.')
    window.setTimeout(() => setSuccess(null), 3000)
  }

  const handleDownloadEscalationsReport = () => {
    downloadCsv('agent-escalations-report.csv', filteredInbox.map((item) => ({
      session_id: item.session_id,
      customer: item.customer,
      status: item.status,
    })))
    setSuccess('Escalations report downloaded.')
    window.setTimeout(() => setSuccess(null), 3000)
  }

  const handleDownloadSummary = () => {
    downloadCsv('agent-summary-report.csv', [
      {
        generated_at: new Date().toISOString(),
        total_tickets: stats.tickets,
        pending_tickets: stats.pendingTickets,
        resolved_tickets: stats.resolvedTickets,
        escalations: stats.escalations,
      },
    ])
    setSuccess('Summary report downloaded.')
    window.setTimeout(() => setSuccess(null), 3000)
  }

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
          active: true,
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
          onClick: () => navigate('/dashboard/agent/tickets'),
        },
      ],
    },
    {
      id: 'operations',
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
      <button type="button" className="btn" onClick={handleDownloadSummary}>
        <DownloadIcon sx={{ fontSize: 12 }} /> Download Summary
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
      brandLabel="BotAssist Agent"
      brandIcon={<SupportAgentIcon sx={{ fontSize: 13 }} />}
      sidebarSections={sidebarSections}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search report data..."
      topActions={topActions}
      userName={displayName}
      userMeta="Agent reports"
      userInitials={toInitials(displayName, 'AG')}
      onUserCardClick={() => navigate('/dashboard/agent/reports')}
      alerts={
        <>
          {error && (
            <Box className="dashboard-alert">
              <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
            </Box>
          )}
          {success && (
            <Box className="dashboard-alert">
              <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>
            </Box>
          )}
        </>
      }
    >
      <Box sx={{ px: 1, pb: 1, pt: 0 }}>
        <Typography color="text.secondary" mb={2}>Download and review your ticket and escalation performance reports.</Typography>

        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">Total Tickets</Typography>
                <Typography variant="h5" fontWeight={700}>{stats.tickets}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">Pending Tickets</Typography>
                <Typography variant="h5" fontWeight={700}>{stats.pendingTickets}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">Resolved Tickets</Typography>
                <Typography variant="h5" fontWeight={700}>{stats.resolvedTickets}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">Escalations</Typography>
                <Typography variant="h5" fontWeight={700}>{stats.escalations}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={1.5}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>Tickets Report</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Export all ticket references, status, and creation dates.
              </Typography>
              <Button fullWidth variant="contained" startIcon={<DownloadIcon />} onClick={handleDownloadTicketsReport}>
                Download Tickets CSV
              </Button>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>Escalations Report</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Export escalation inbox records and current statuses.
              </Typography>
              <Button fullWidth variant="contained" color="warning" startIcon={<DownloadIcon />} onClick={handleDownloadEscalationsReport}>
                Download Escalations CSV
              </Button>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>Performance Summary</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Export high-level metrics used by your dashboard.
              </Typography>
              <Button fullWidth variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadSummary}>
                Download Summary CSV
              </Button>
            </Paper>
          </Grid>
        </Grid>

        <Paper sx={{ mt: 2, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
            <Typography fontWeight={700}>Recent Activity</Typography>
            <Chip label={`${filteredTickets.length} results`} size="small" variant="outlined" />
          </Box>

          <List disablePadding>
            {paginatedRecentActivity.map((ticket, index) => (
              <ListItemButton key={`${ticket.ticket_id || ticket.subject}-${index}`} onClick={() => {
                const ref = String(ticket.ticket_id || '').trim()
                if (ref) {
                  navigate(`/tickets/${ref}`)
                }
              }}>
                <ListItemText
                  primary={<Typography variant="body2" fontWeight={600}>{ticket.subject}</Typography>}
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {(ticket.ticket_id || 'No ref')} · {ticket.status.replace(/_/g, ' ')} · {formatDateTime(ticket.created_at)}
                    </Typography>
                  }
                />
              </ListItemButton>
            ))}

            {filteredTickets.length === 0 && (
              <Box textAlign="center" py={5}>
                <Typography color="text.secondary" variant="body2">No report records match your search.</Typography>
              </Box>
            )}
          </List>

          {filteredTickets.length > 0 && (
            <TablePagination
              component="div"
              count={filteredTickets.length}
              page={activityPage}
              onPageChange={(_, nextPage) => setActivityPage(nextPage)}
              rowsPerPage={ACTIVITY_ROWS_PER_PAGE}
              rowsPerPageOptions={[ACTIVITY_ROWS_PER_PAGE]}
            />
          )}
        </Paper>
      </Box>
    </DashboardShell>
  )
}
