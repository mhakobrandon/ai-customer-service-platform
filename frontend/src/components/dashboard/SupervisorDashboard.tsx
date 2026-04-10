import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Typography,
  Avatar,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import {
  PendingActions as PendingIcon,
  TaskAlt as ResolvedIcon,
  Groups as AgentsIcon,
  TrendingUp as TrendIcon,
  Logout as LogoutIcon,
  Download as DownloadIcon,
  Assessment as ReportsIcon,
  Refresh as RefreshIcon,
  AccountCircle as ProfileIcon,
  Edit as EditIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { adminAPI, analyticsAPI, ticketAPI } from '../../services/apiService'
import { useAuth } from '../../services/authService'
import StatCard from '../common/StatCard'
import PageHeader from '../common/PageHeader'
import { downloadCsv, filterByDateRange, getDateRangeForPeriod, ReportPeriod } from '../../utils/reporting'
import NotificationBell from '../common/NotificationBell'
import {
  AppNotification,
  computeSupervisorTicketCreatedNotifications,
  markSupervisorTicketCreatedNotificationsRead,
} from '../../services/notificationService'

interface AgentTicketSummary {
  agent_id: string
  agent_name: string
  agent_email: string
  resolved: number
  pending: number
  total: number
  resolution_rate: number
}

interface TicketOverview {
  total_agents: number
  agents: AgentTicketSummary[]
  totals: {
    resolved: number
    pending: number
    assigned: number
  }
}

interface ReportUser {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

interface ReportTicket {
  id: string
  ticket_id: string
  subject: string
  category: string
  priority: string
  status: string
  assigned_agent_id?: string | null
  agent_name?: string | null
  created_at: string
  is_overdue: boolean
}

export default function SupervisorDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<TicketOverview | null>(null)
  const [reportUsers, setReportUsers] = useState<ReportUser[]>([])
  const [reportTickets, setReportTickets] = useState<ReportTicket[]>([])
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('weekly')
  const [reportStartDate, setReportStartDate] = useState(getDateRangeForPeriod('weekly').startDate)
  const [reportEndDate, setReportEndDate] = useState(getDateRangeForPeriod('weekly').endDate)
  const [supervisorNotifications, setSupervisorNotifications] = useState<AppNotification[]>([])
  const [supervisorUnreadCount, setSupervisorUnreadCount] = useState(0)
  const [assigningTicketId, setAssigningTicketId] = useState<string | null>(null)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const [profileAnchorEl, setProfileAnchorEl] = useState<HTMLElement | null>(null)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileRole, setProfileRole] = useState('supervisor')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileMessageType, setProfileMessageType] = useState<'success' | 'error'>('success')
  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [overviewResponse, usersResponse, ticketsResponse] = await Promise.all([
        analyticsAPI.getAgentTicketOverview(),
        adminAPI.getUsers(),
        adminAPI.getAllTickets(),
      ])

      setOverview(overviewResponse.data)
      setReportUsers(usersResponse.data || [])
      setReportTickets(ticketsResponse.data || [])
    } catch (err) {
      console.error(err)
      setError('Failed to load supervisor dashboard metrics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (reportPeriod === 'custom') return
    const range = getDateRangeForPeriod(reportPeriod)
    setReportStartDate(range.startDate)
    setReportEndDate(range.endDate)
  }, [reportPeriod])

  useEffect(() => {
    const { notifications, totalUnread } = computeSupervisorTicketCreatedNotifications(reportTickets, user?.id)
    setSupervisorNotifications(notifications)
    setSupervisorUnreadCount(totalUnread)
  }, [reportTickets, user?.id])

  useEffect(() => {
    setProfileName(user?.name || 'Supervisor User')
    setProfileEmail(user?.email || '')
    setProfileRole(user?.role || 'supervisor')
  }, [user?.name, user?.email, user?.role])

  const handleOpenProfileDialog = () => {
    setProfileDialogOpen(true)
    setProfileAnchorEl(null)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleSaveProfile = () => {
    if (currentPassword || newPassword || confirmPassword) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        setProfileMessageType('error')
        setProfileMessage('Fill all password fields to change password.')
        return
      }
      if (newPassword.length < 8) {
        setProfileMessageType('error')
        setProfileMessage('New password must be at least 8 characters.')
        return
      }
      if (newPassword !== confirmPassword) {
        setProfileMessageType('error')
        setProfileMessage('New password and confirmation do not match.')
        return
      }
    }
    setProfileMessageType('success')
    setProfileMessage('Profile details updated for this session.')
    setProfileDialogOpen(false)
  }

  const resolutionRate = useMemo(() => {
    if (!overview?.totals.assigned) return 0
    return Math.round((overview.totals.resolved / overview.totals.assigned) * 1000) / 10
  }, [overview])

  const filteredUsersForReport = useMemo(
    () => filterByDateRange(reportUsers, (entry) => entry.created_at, reportStartDate, reportEndDate),
    [reportUsers, reportStartDate, reportEndDate]
  )

  const activeAgentUsers = useMemo(
    () => reportUsers.filter((entry) => entry.role === 'agent' && entry.is_active),
    [reportUsers]
  )

  const filteredTicketsForReport = useMemo(
    () => filterByDateRange(reportTickets, (entry) => entry.created_at, reportStartDate, reportEndDate),
    [reportTickets, reportStartDate, reportEndDate]
  )

  const handleAssignTicket = async (ticketId: string, agentId: string) => {
    if (!agentId) return
    setAssignmentError(null)
    setAssigningTicketId(ticketId)
    try {
      await ticketAPI.assignTicket(ticketId, agentId)
      await loadData()
    } catch (err) {
      console.error('Failed to assign ticket:', err)
      setAssignmentError('Failed to assign ticket. Please try again.')
    } finally {
      setAssigningTicketId(null)
    }
  }

  const filteredIssuesForReport = useMemo(() => {
    const grouped = filteredTicketsForReport.reduce<Record<string, number>>((acc, ticket) => {
      const key = new Date(ticket.created_at).toISOString().slice(0, 10)
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    return Object.entries(grouped)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, issue_count]) => ({ date, issue_count }))
  }, [filteredTicketsForReport])

  const downloadSupervisorUsersReport = () => {
    downloadCsv(
      `supervisor-users-report-${reportStartDate}-to-${reportEndDate}.csv`,
      filteredUsersForReport.map((entry) => ({
        id: entry.id,
        name: entry.name,
        email: entry.email,
        role: entry.role,
        active: entry.is_active,
        created_at: entry.created_at,
      }))
    )
  }

  const downloadSupervisorTicketsReport = () => {
    downloadCsv(
      `supervisor-tickets-report-${reportStartDate}-to-${reportEndDate}.csv`,
      filteredTicketsForReport.map((entry) => ({
        ticket_id: entry.ticket_id,
        subject: entry.subject,
        category: entry.category,
        priority: entry.priority,
        status: entry.status,
        created_at: entry.created_at,
        is_overdue: entry.is_overdue,
      }))
    )
  }

  const downloadSupervisorIssuesReport = () => {
    downloadCsv(
      `supervisor-issues-report-${reportStartDate}-to-${reportEndDate}.csv`,
      filteredIssuesForReport
    )
  }

  const dashboardHeroBackground = [
    'radial-gradient(1200px 640px at -6% -12%, rgba(145, 212, 255, 0.75), transparent 58%)',
    'radial-gradient(900px 520px at 110% -8%, rgba(147, 185, 255, 0.62), transparent 55%)',
    'linear-gradient(160deg, #edf6ff 0%, #d7ecff 36%, #c3e2ff 72%, #b7dbff 100%)',
  ].join(',')

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        p: { xs: 1.5, sm: 2 },
        gap: 1.5,
        background: dashboardHeroBackground,
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(transparent 31px, rgba(255,255,255,0.16) 32px), linear-gradient(90deg, transparent 31px, rgba(255,255,255,0.16) 32px)',
          backgroundSize: '32px 32px',
          opacity: 0.45,
        }}
      />

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {profileMessage && <Alert severity={profileMessageType} onClose={() => setProfileMessage(null)}>{profileMessage}</Alert>}

      {/* â”€â”€ Header â”€â”€ */}
      <PageHeader
        mb={0}
        transparent
        title="Supervisor Dashboard"
        subtitle={`Welcome, ${user?.name || user?.email}. Monitor agent resolution and workload.`}
        actions={
          <>
            <NotificationBell
              items={supervisorNotifications}
              unreadCount={supervisorUnreadCount}
              onOpenItem={() => setActiveTab(1)}
              onMarkAllRead={() => {
                markSupervisorTicketCreatedNotificationsRead(user?.id, reportTickets)
                setSupervisorNotifications([])
                setSupervisorUnreadCount(0)
              }}
              tooltip="New ticket alerts"
            />
            <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={loadData}>Refresh</Button>
            <Button size="small" variant="outlined" onClick={() => navigate('/agent/console')}>Console</Button>
            <Button size="small" variant="outlined" startIcon={<ProfileIcon />} onClick={(e) => setProfileAnchorEl(e.currentTarget)}>Profile</Button>
            <Button size="small" variant="outlined" color="error" startIcon={<LogoutIcon />} onClick={() => { logout(); navigate('/login') }}>Logout</Button>
          </>
        }
      />

      <Menu anchorEl={profileAnchorEl} open={Boolean(profileAnchorEl)} onClose={() => setProfileAnchorEl(null)}>
        <Box sx={{ px: 2, py: 1.25, minWidth: 240 }}>
          <Typography variant="subtitle2" fontWeight={700}>{profileName || 'Supervisor User'}</Typography>
          <Typography variant="caption" color="text.secondary" display="block">{profileEmail || 'No email'}</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ textTransform: 'capitalize' }}>Role: {profileRole}</Typography>
        </Box>
        <MenuItem onClick={handleOpenProfileDialog}><EditIcon fontSize="small" sx={{ mr: 1 }} />Update Profile</MenuItem>
        <MenuItem onClick={() => { setProfileAnchorEl(null); logout(); navigate('/login') }}><LogoutIcon fontSize="small" sx={{ mr: 1 }} />Logout</MenuItem>
      </Menu>

      <Dialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>My Profile</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField label="Full Name" size="small" fullWidth value={profileName} onChange={(e) => setProfileName(e.target.value)} sx={{ mb: 1.25 }} />
          <TextField label="Email" size="small" fullWidth value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} sx={{ mb: 1.25 }} />
          <TextField label="Role" size="small" fullWidth value={profileRole} disabled sx={{ mb: 1.25 }} />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>Change Password</Typography>
          <TextField label="Current Password" type="password" size="small" fullWidth value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} sx={{ mb: 1 }} />
          <TextField label="New Password" type="password" size="small" fullWidth value={newPassword} onChange={(e) => setNewPassword(e.target.value)} sx={{ mb: 1 }} />
          <TextField label="Confirm New Password" type="password" size="small" fullWidth value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveProfile}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* â”€â”€ KPI Stats â”€â”€ */}
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        {[
          { label: 'Agents Tracked', value: overview?.total_agents || 0, Icon: AgentsIcon, color: 'primary' as const },
          { label: 'Resolved', value: overview?.totals.resolved || 0, Icon: ResolvedIcon, color: 'success' as const },
          { label: 'Pending', value: overview?.totals.pending || 0, Icon: PendingIcon, color: 'warning' as const },
          { label: 'Resolution Rate', value: `${resolutionRate}%`, Icon: TrendIcon, color: 'info' as const },
        ].map((s) => (
          <Box key={s.label} sx={{ flex: 1 }}>
            <StatCard label={s.label} value={s.value} Icon={s.Icon} color={s.color} />
          </Box>
        ))}
      </Box>

      {/* â”€â”€ Tabbed content â”€â”€ */}
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Tab bar */}
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', px: 2, flexShrink: 0 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ minHeight: 44 }}>
            <Tab label="Agent Performance" icon={<AgentsIcon sx={{ fontSize: 16 }} />} iconPosition="start"
              sx={{ minHeight: 44, py: 0, fontSize: '0.8rem' }} />
            <Tab label="Analytics & Reports" icon={<ReportsIcon sx={{ fontSize: 16 }} />} iconPosition="start"
              sx={{ minHeight: 44, py: 0, fontSize: '0.8rem' }} />
          </Tabs>
        </Box>

        {/* â”€â”€ Tab 0: Agent Performance â”€â”€ */}
        {activeTab === 0 && (
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow
                    sx={{
                      '& .MuiTableCell-head': {
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                        borderBottom: '2px solid',
                        borderColor: 'divider',
                      },
                    }}
                  >
                    <TableCell>Agent</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell align="right">Resolved</TableCell>
                    <TableCell align="right">Pending</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Rate</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(overview?.agents || []).map((agent) => {
                    const rate = agent.resolution_rate ?? 0
                    const rateColor = rate >= 80 ? 'success' : rate >= 50 ? 'warning' : 'error'
                    return (
                      <TableRow
                        key={agent.agent_id}
                        sx={{
                          '&:nth-of-type(even)': { bgcolor: (t) => alpha(t.palette.primary.main, 0.03) },
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
                              {agent.agent_name?.[0]?.toUpperCase() || '?'}
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>{agent.agent_name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{agent.agent_email}</TableCell>
                        <TableCell align="right">{agent.resolved}</TableCell>
                        <TableCell align="right">{agent.pending}</TableCell>
                        <TableCell align="right">{agent.total}</TableCell>
                        <TableCell align="right">
                          <Chip label={`${rate}%`} size="small" color={rateColor} variant="outlined"
                            sx={{ fontWeight: 700, minWidth: 56, fontSize: '0.72rem' }} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {!overview?.agents?.length && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 4, textAlign: 'center' }}>
                        <AgentsIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                        <Typography variant="body2" color="text.secondary">No agent data available yet.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* â”€â”€ Tab 1: Analytics & Reports â”€â”€ */}
        {activeTab === 1 && (
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {assignmentError && <Alert severity="error" sx={{ mb: 2 }}>{assignmentError}</Alert>}

            {/* Date filters */}
            <Box display="flex" gap={1.5} mb={2} flexWrap="wrap" alignItems="center">
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Period</InputLabel>
                <Select value={reportPeriod} label="Period" onChange={(e) => setReportPeriod(e.target.value as ReportPeriod)}>
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="custom">Custom Range</MenuItem>
                </Select>
              </FormControl>
              <TextField size="small" label="Start" type="date" value={reportStartDate}
                onChange={(e) => { setReportPeriod('custom'); setReportStartDate(e.target.value) }}
                InputLabelProps={{ shrink: true }} />
              <TextField size="small" label="End" type="date" value={reportEndDate}
                onChange={(e) => { setReportPeriod('custom'); setReportEndDate(e.target.value) }}
                InputLabelProps={{ shrink: true }} />
              <Box display="flex" gap={1} ml="auto">
                <Button size="small" variant="contained" startIcon={<DownloadIcon />}
                  onClick={downloadSupervisorUsersReport} disabled={!filteredUsersForReport.length}>
                  Users ({filteredUsersForReport.length})
                </Button>
                <Button size="small" variant="contained" color="warning" startIcon={<DownloadIcon />}
                  onClick={downloadSupervisorTicketsReport} disabled={!filteredTicketsForReport.length}>
                  Tickets ({filteredTicketsForReport.length})
                </Button>
                <Button size="small" variant="contained" color="secondary" startIcon={<DownloadIcon />}
                  onClick={downloadSupervisorIssuesReport} disabled={!filteredIssuesForReport.length}>
                  Issues ({filteredIssuesForReport.length})
                </Button>
              </Box>
            </Box>

            {/* Ticket assignment table */}
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Ticket Assignment</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-head': { fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: 'action.hover' } }}>
                    <TableCell>Ticket</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Assigned To</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Assign Agent</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTicketsForReport.slice(0, 12).map((entry) => (
                    <TableRow key={entry.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{entry.ticket_id}</TableCell>
                      <TableCell sx={{ maxWidth: 160 }}>
                        <Typography variant="caption" fontWeight={600} noWrap display="block">{entry.subject}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{entry.agent_name || 'â€”'}</TableCell>
                      <TableCell>
                        <Chip label={(entry.status || '').replace(/_/g, ' ')} size="small"
                          color={entry.status === 'resolved' || entry.status === 'closed' ? 'success' : entry.is_overdue ? 'error' : 'default'}
                          variant="outlined" sx={{ fontSize: '0.65rem' }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{new Date(entry.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select value={entry.assigned_agent_id || ''} displayEmpty
                            disabled={assigningTicketId === entry.ticket_id || entry.status === 'closed'}
                            onChange={(e) => handleAssignTicket(entry.ticket_id, e.target.value as string)}
                          >
                            <MenuItem value=""><em>Unassigned</em></MenuItem>
                            {entry.assigned_agent_id && !activeAgentUsers.some((u) => u.id === entry.assigned_agent_id) && (
                              <MenuItem value={entry.assigned_agent_id}>{entry.agent_name || 'Current'} (inactive)</MenuItem>
                            )}
                            {activeAgentUsers.map((u) => (
                              <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTicketsForReport.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
                        No tickets in selected range.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
