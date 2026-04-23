import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AccountCircle as ProfileIcon,
  Dashboard as DashboardIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Groups as AgentsIcon,
  Logout as LogoutIcon,
  PendingActions as PendingIcon,
  Refresh as RefreshIcon,
  Assessment as ReportsIcon,
  SupportAgent as SupportAgentIcon,
  TaskAlt as ResolvedIcon,
  TrendingUp as TrendIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { adminAPI, analyticsAPI, ticketAPI } from '../../services/apiService'
import { useAuth } from '../../services/authService'
import { downloadCsv, filterByDateRange, getDateRangeForPeriod, ReportPeriod } from '../../utils/reporting'
import NotificationBell from '../common/NotificationBell'
import DashboardShell, { type DashboardShellNavSection, toInitials } from './DashboardShell'
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

const resolvedTicketStatuses = new Set(['resolved', 'closed'])
const escalatedTicketStatuses = new Set(['escalated', 'reopened'])
const queuedTicketStatuses = new Set(['new', 'assigned'])
const compactNumber = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const formatCompactNumber = (value: number) => compactNumber.format(value)

interface DashboardTooltipPayloadItem {
  name?: string
  value?: number | string
  color?: string
}

function SupervisorMetricsTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: DashboardTooltipPayloadItem[]
  label?: string | number
}) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <Paper
      elevation={0}
      sx={{
        px: 1.2,
        py: 0.8,
        border: '1px solid #e1e8f5',
        borderRadius: '9px',
        backgroundColor: '#ffffff',
        boxShadow: '0 10px 24px rgba(26, 39, 80, 0.16)',
      }}
    >
      {typeof label !== 'undefined' && (
        <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#37405f', mb: 0.3 }}>
          {label}
        </Typography>
      )}

      {payload.map((entry, index) => (
        <Box key={`${entry.name || 'metric'}-${index}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.7, mt: index === 0 ? 0 : 0.35 }}>
          <Box sx={{ width: 7, height: 7, borderRadius: '999px', backgroundColor: entry.color || '#4f6cf0', flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.68rem', color: '#6a738a', minWidth: 78 }}>
            {entry.name || 'Value'}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: '#1e2742', fontWeight: 700 }}>
            {formatCompactNumber(Number(entry.value || 0))}
          </Typography>
        </Box>
      ))}
    </Paper>
  )
}

type SupervisorView = 'dashboard' | 'agent-performance' | 'reports'

interface SupervisorDashboardProps {
  view?: SupervisorView
}

export default function SupervisorDashboard({ view = 'dashboard' }: SupervisorDashboardProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
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
    void loadData()
  }, [])

  useEffect(() => {
    if (reportPeriod === 'custom') {
      return
    }
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

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const resolvedTicketsCount = useMemo(
    () => reportTickets.filter((ticket) => resolvedTicketStatuses.has((ticket.status || '').toLowerCase())).length,
    [reportTickets]
  )

  const resolutionRate = useMemo(() => {
    if (!reportTickets.length) {
      return 0
    }
    return Math.round((resolvedTicketsCount / reportTickets.length) * 1000) / 10
  }, [reportTickets.length, resolvedTicketsCount])

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

  const agentSummariesFromTickets = useMemo(() => {
    const countByAgent = reportTickets.reduce<Record<string, { total: number; resolved: number }>>((acc, ticket) => {
      const agentId = ticket.assigned_agent_id || ''
      if (!agentId) {
        return acc
      }

      if (!acc[agentId]) {
        acc[agentId] = { total: 0, resolved: 0 }
      }

      acc[agentId].total += 1
      if (resolvedTicketStatuses.has((ticket.status || '').toLowerCase())) {
        acc[agentId].resolved += 1
      }

      return acc
    }, {})

    return reportUsers
      .filter((entry) => entry.role === 'agent')
      .map<AgentTicketSummary>((entry) => {
        const counts = countByAgent[entry.id] || { total: 0, resolved: 0 }
        const pending = Math.max(0, counts.total - counts.resolved)
        const resolution_rate = counts.total > 0
          ? Math.round((counts.resolved / counts.total) * 1000) / 10
          : 0

        return {
          agent_id: entry.id,
          agent_name: entry.name,
          agent_email: entry.email,
          resolved: counts.resolved,
          pending,
          total: counts.total,
          resolution_rate,
        }
      })
      .sort((left, right) => {
        if (right.resolved !== left.resolved) {
          return right.resolved - left.resolved
        }
        if (right.total !== left.total) {
          return right.total - left.total
        }
        return (left.agent_name || '').localeCompare(right.agent_name || '')
      })
  }, [reportTickets, reportUsers])

  const normalizedSearch = searchQuery.trim().toLowerCase()

  const visibleAgentSummaries = useMemo(() => {
    const summaries = agentSummariesFromTickets
    if (!normalizedSearch) {
      return summaries
    }

    return summaries.filter((agent) => {
      const haystack = [agent.agent_name, agent.agent_email, String(agent.total), String(agent.resolution_rate)]
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalizedSearch)
    })
  }, [agentSummariesFromTickets, normalizedSearch])

  const visibleTicketsForAssignment = useMemo(() => {
    if (!normalizedSearch) {
      return filteredTicketsForReport
    }

    return filteredTicketsForReport.filter((entry) => {
      const haystack = [entry.ticket_id, entry.subject, entry.agent_name, entry.status, entry.priority, entry.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [filteredTicketsForReport, normalizedSearch])

  const dashboardTickets = useMemo(() => {
    if (!normalizedSearch) {
      return reportTickets
    }

    return reportTickets.filter((entry) => {
      const haystack = [
        entry.ticket_id,
        entry.subject,
        entry.agent_name,
        entry.status,
        entry.priority,
        entry.category,
        entry.created_at,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [reportTickets, normalizedSearch])

  const dashboardDateWindow = useMemo(() => {
    const today = new Date()
    const days: Array<{ key: string; label: string }> = []

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(today)
      date.setDate(today.getDate() - offset)

      days.push({
        key: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      })
    }

    return days
  }, [])

  const ticketFlowSeries = useMemo(() => {
    const buckets = dashboardDateWindow.reduce<Record<string, { created: number; resolved: number; pending: number }>>((acc, day) => {
      acc[day.key] = { created: 0, resolved: 0, pending: 0 }
      return acc
    }, {})

    dashboardTickets.forEach((ticket) => {
      const createdDate = new Date(ticket.created_at)
      if (Number.isNaN(createdDate.getTime())) {
        return
      }

      const dayKey = createdDate.toISOString().slice(0, 10)
      const bucket = buckets[dayKey]
      if (!bucket) {
        return
      }

      bucket.created += 1
      const status = (ticket.status || '').toLowerCase()
      if (resolvedTicketStatuses.has(status)) {
        bucket.resolved += 1
      } else {
        bucket.pending += 1
      }
    })

    return dashboardDateWindow.map((day) => ({
      label: day.label,
      created: buckets[day.key]?.created || 0,
      resolved: buckets[day.key]?.resolved || 0,
      pending: buckets[day.key]?.pending || 0,
    }))
  }, [dashboardDateWindow, dashboardTickets])

  const dashboardStatusBreakdown = useMemo(() => {
    const counts = {
      resolved: 0,
      pending: 0,
      escalated: 0,
      queued: 0,
    }

    dashboardTickets.forEach((ticket) => {
      const status = (ticket.status || '').toLowerCase()

      if (resolvedTicketStatuses.has(status)) {
        counts.resolved += 1
        return
      }

      if (escalatedTicketStatuses.has(status)) {
        counts.escalated += 1
        return
      }

      if (queuedTicketStatuses.has(status)) {
        counts.queued += 1
        return
      }

      counts.pending += 1
    })

    return [
      { name: 'Resolved', value: counts.resolved, color: '#2faf72' },
      { name: 'Pending', value: counts.pending, color: '#efb82a' },
      { name: 'Escalated', value: counts.escalated, color: '#ea6a57' },
      { name: 'Queued', value: counts.queued, color: '#4d6ee8' },
    ]
  }, [dashboardTickets])

  const dashboardTicketsCount = dashboardTickets.length

  const dashboardStatusTotal = useMemo(
    () => dashboardStatusBreakdown.reduce((sum, entry) => sum + entry.value, 0),
    [dashboardStatusBreakdown]
  )

  const dashboardCategoryTraffic = useMemo(() => {
    const grouped = dashboardTickets.reduce<Record<string, number>>((acc, ticket) => {
      const rawLabel = (ticket.category || 'Uncategorized').replace(/_/g, ' ').trim()
      const label = rawLabel ? rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1) : 'Uncategorized'
      acc[label] = (acc[label] || 0) + 1
      return acc
    }, {})

    return Object.entries(grouped)
      .sort(([, leftValue], [, rightValue]) => rightValue - leftValue)
      .slice(0, 4)
      .map(([name, value]) => ({
        name,
        value,
        percentage: dashboardTicketsCount ? Math.round((value / dashboardTicketsCount) * 100) : 0,
      }))
  }, [dashboardTickets, dashboardTicketsCount])

  const topAgentsForChart = useMemo(
    () => [...visibleAgentSummaries]
      .sort((left, right) => {
        if (right.resolved !== left.resolved) {
          return right.resolved - left.resolved
        }
        return right.total - left.total
      })
      .slice(0, 5)
      .map((agent) => ({
        name: agent.agent_name,
        shortName: agent.agent_name.length > 14 ? `${agent.agent_name.slice(0, 12)}...` : agent.agent_name,
        resolved: agent.resolved,
        pending: agent.pending,
      })),
    [visibleAgentSummaries]
  )

  const priorityMix = useMemo(() => {
    const buckets = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0,
      normal: 0,
    }

    dashboardTickets.forEach((ticket) => {
      const priority = (ticket.priority || 'normal').toLowerCase()
      if (Object.prototype.hasOwnProperty.call(buckets, priority)) {
        buckets[priority as keyof typeof buckets] += 1
        return
      }
      buckets.normal += 1
    })

    return [
      { label: 'Urgent', count: buckets.urgent, color: '#d74850' },
      { label: 'High', count: buckets.high, color: '#f08d42' },
      { label: 'Medium', count: buckets.medium, color: '#e4bc36' },
      { label: 'Low', count: buckets.low, color: '#43aa73' },
      { label: 'Normal', count: buckets.normal, color: '#607be1' },
    ]
  }, [dashboardTickets])

  const activeAgentsCount = useMemo(
    () => reportUsers.filter((entry) => entry.role === 'agent' && entry.is_active).length,
    [reportUsers]
  )

  const averageAgentRate = useMemo(() => {
    const allAgents = agentSummariesFromTickets
    if (!allAgents.length) {
      return 0
    }

    const totalRate = allAgents.reduce((sum, entry) => sum + (entry.resolution_rate || 0), 0)
    return Math.round((totalRate / allAgents.length) * 10) / 10
  }, [agentSummariesFromTickets])

  const handleAssignTicket = async (ticketId: string, agentId: string) => {
    if (!agentId) {
      return
    }

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

  const isDashboardView = view === 'dashboard'
  const isPerformanceView = view === 'agent-performance'
  const isReportsView = view === 'reports'

  const displayName = profileName || user?.name || 'Supervisor User'

  const sidebarSections: DashboardShellNavSection[] = [
    {
      id: 'main',
      title: 'Main',
      items: [
        {
          id: 'supervisor-dashboard',
          label: 'Dashboard',
          icon: <DashboardIcon sx={{ fontSize: 13 }} />,
          active: isDashboardView,
          onClick: () => navigate('/dashboard/supervisor'),
        },
        {
          id: 'supervisor-performance',
          label: 'Agent Performance',
          icon: <AgentsIcon sx={{ fontSize: 13 }} />,
          active: isPerformanceView,
          onClick: () => navigate('/dashboard/supervisor/agent-performance'),
        },
        {
          id: 'supervisor-reports',
          label: 'Reports',
          icon: <ReportsIcon sx={{ fontSize: 13 }} />,
          active: isReportsView,
          onClick: () => navigate('/dashboard/supervisor/reports'),
        },
      ],
    },
    {
      id: 'ops',
      title: 'Operations',
      items: [
        {
          id: 'supervisor-console',
          label: 'Agent Console',
          icon: <SupportAgentIcon sx={{ fontSize: 13 }} />,
          onClick: () => navigate('/agent/console'),
        },
        {
          id: 'supervisor-refresh',
          label: 'Refresh Data',
          icon: <RefreshIcon sx={{ fontSize: 13 }} />,
          onClick: () => void loadData(),
        },
      ],
    },
    {
      id: 'account',
      title: 'Account',
      items: [
        {
          id: 'supervisor-profile',
          label: 'Profile',
          icon: <ProfileIcon sx={{ fontSize: 13 }} />,
          onClick: handleOpenProfileDialog,
        },
        {
          id: 'supervisor-logout',
          label: 'Logout',
          icon: <LogoutIcon sx={{ fontSize: 13 }} />,
          onClick: handleLogout,
        },
      ],
    },
  ]

  const topActions = (
    <>
      <NotificationBell
        items={supervisorNotifications}
        unreadCount={supervisorUnreadCount}
        onOpenItem={() => navigate('/dashboard/supervisor/reports')}
        onMarkAllRead={() => {
          markSupervisorTicketCreatedNotificationsRead(user?.id, reportTickets)
          setSupervisorNotifications([])
          setSupervisorUnreadCount(0)
        }}
        tooltip="New ticket alerts"
      />

      <button type="button" className="btn" onClick={() => void loadData()}>
        <RefreshIcon sx={{ fontSize: 12 }} /> Refresh
      </button>
      <button type="button" className="btn" onClick={() => navigate('/agent/console')}>
        <SupportAgentIcon sx={{ fontSize: 12 }} /> Console
      </button>
      <button type="button" className="btn" onClick={(event) => setProfileAnchorEl(event.currentTarget)}>
        <ProfileIcon sx={{ fontSize: 12 }} /> Profile
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
    <>
      <DashboardShell
        roleClassName="role-dashboard-supervisor"
        brandLabel="Taur.ai Supervisor"
        brandIcon={<AgentsIcon sx={{ fontSize: 13 }} />}
        sidebarSections={sidebarSections}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={
          isPerformanceView
            ? 'Search agents by name, email, or metrics...'
            : isReportsView
              ? 'Search tickets, assignment, and report data...'
              : 'Search dashboard summaries...'
        }
        topActions={topActions}
        userName={displayName}
        userMeta={
          isPerformanceView
            ? 'Agent performance'
            : isReportsView
              ? 'Supervisor reports'
              : 'Supervisor workspace'
        }
        userInitials={toInitials(displayName, 'SP')}
        onUserCardClick={handleOpenProfileDialog}
        alerts={
          <>
            {error && (
              <Box className="dashboard-alert">
                <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
              </Box>
            )}
            {profileMessage && (
              <Box className="dashboard-alert">
                <Alert severity={profileMessageType} onClose={() => setProfileMessage(null)}>{profileMessage}</Alert>
              </Box>
            )}
          </>
        }
      >
        {isDashboardView && (
          <>
            <div className="supervisor-home-layout">
              <div className="supervisor-kpi-row">
                <div className="supervisor-kpi-card supervisor-kpi-card-agents">
                  <div className="supervisor-kpi-icon"><AgentsIcon sx={{ fontSize: 15 }} /></div>
                  <div className="supervisor-kpi-copy">
                    <div className="supervisor-kpi-label">Agents tracked</div>
                    <div className="supervisor-kpi-value">{overview?.total_agents || 0}</div>
                  </div>
                  <div className="supervisor-kpi-dots" aria-hidden="true"><span /><span /><span /></div>
                </div>

                <div className="supervisor-kpi-card supervisor-kpi-card-resolved">
                  <div className="supervisor-kpi-icon"><ResolvedIcon sx={{ fontSize: 15 }} /></div>
                  <div className="supervisor-kpi-copy">
                    <div className="supervisor-kpi-label">Resolved tickets</div>
                    <div className="supervisor-kpi-value">{resolvedTicketsCount}</div>
                  </div>
                  <div className="supervisor-kpi-dots" aria-hidden="true"><span /><span /><span /></div>
                </div>

                <div className="supervisor-kpi-card supervisor-kpi-card-pending">
                  <div className="supervisor-kpi-icon"><PendingIcon sx={{ fontSize: 15 }} /></div>
                  <div className="supervisor-kpi-copy">
                    <div className="supervisor-kpi-label">Pending tickets</div>
                    <div className="supervisor-kpi-value">{overview?.totals.pending || 0}</div>
                  </div>
                  <div className="supervisor-kpi-dots" aria-hidden="true"><span /><span /><span /></div>
                </div>

                <div className="supervisor-kpi-card supervisor-kpi-card-rate">
                  <div className="supervisor-kpi-icon"><TrendIcon sx={{ fontSize: 15 }} /></div>
                  <div className="supervisor-kpi-copy">
                    <div className="supervisor-kpi-label">Resolution rate</div>
                    <div className="supervisor-kpi-value">{resolutionRate.toFixed(1)}%</div>
                  </div>
                  <div className="supervisor-kpi-dots" aria-hidden="true"><span /><span /><span /></div>
                </div>
              </div>

              <div className="supervisor-metrics-primary">
                <Paper className="supervisor-panel supervisor-trend-panel" elevation={0}>
                  <div className="supervisor-panel-head">
                    <div>
                      <h3 className="supervisor-panel-title">Ticket flow overview</h3>
                      <p className="supervisor-panel-subtitle">Created vs resolved ticket flow for the last 7 days</p>
                    </div>
                    <div className="supervisor-chip-row">
                      <span className="supervisor-chip">7-day view</span>
                      <span className="supervisor-chip supervisor-chip-soft">{formatCompactNumber(dashboardTicketsCount)} tracked</span>
                    </div>
                  </div>

                  <div className="supervisor-chart-frame supervisor-chart-frame-tall">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={ticketFlowSeries} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="supervisorCreatedGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4c70ee" stopOpacity={0.42} />
                            <stop offset="100%" stopColor="#4c70ee" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="supervisorResolvedGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34af72" stopOpacity={0.34} />
                            <stop offset="100%" stopColor="#34af72" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e9edf5" vertical={false} />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6f7890' }} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6f7890' }} width={28} />
                        <RechartsTooltip content={<SupervisorMetricsTooltip />} />
                        <Area type="monotone" dataKey="created" name="Created" stroke="#4c70ee" strokeWidth={2.2} fill="url(#supervisorCreatedGradient)" />
                        <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#34af72" strokeWidth={2} fill="url(#supervisorResolvedGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Paper>

                <Paper className="supervisor-panel supervisor-donut-panel" elevation={0}>
                  <div className="supervisor-panel-head">
                    <div>
                      <h3 className="supervisor-panel-title">Status distribution</h3>
                      <p className="supervisor-panel-subtitle">Current workload split by ticket state</p>
                    </div>
                  </div>

                  <div className="supervisor-donut-shell">
                    <div className="supervisor-chart-frame supervisor-chart-frame-donut">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={dashboardStatusBreakdown} dataKey="value" nameKey="name" innerRadius={52} outerRadius={75} paddingAngle={3} strokeWidth={0}>
                            {dashboardStatusBreakdown.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip content={<SupervisorMetricsTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="supervisor-donut-center">
                      <strong>{formatCompactNumber(dashboardStatusTotal)}</strong>
                      <span>Total tickets</span>
                    </div>
                  </div>

                  <div className="supervisor-legend-list">
                    {dashboardStatusBreakdown.map((entry) => {
                      const percentage = dashboardStatusTotal ? Math.round((entry.value / dashboardStatusTotal) * 100) : 0
                      return (
                        <div key={entry.name} className="supervisor-legend-item">
                          <span className="supervisor-legend-dot" style={{ backgroundColor: entry.color }} />
                          <span className="supervisor-legend-label">{entry.name}</span>
                          <strong className="supervisor-legend-value">{entry.value}</strong>
                          <span className="supervisor-legend-share">{percentage}%</span>
                        </div>
                      )
                    })}
                  </div>
                </Paper>

                <Paper className="supervisor-panel supervisor-traffic-panel" elevation={0}>
                  <div className="supervisor-panel-head">
                    <div>
                      <h3 className="supervisor-panel-title">Traffic by category</h3>
                      <p className="supervisor-panel-subtitle">Where incoming ticket demand is concentrated</p>
                    </div>
                  </div>

                  <div className="supervisor-traffic-list">
                    {dashboardCategoryTraffic.length ? (
                      dashboardCategoryTraffic.map((entry) => (
                        <div key={entry.name} className="supervisor-traffic-row">
                          <div className="supervisor-traffic-top">
                            <span>{entry.name}</span>
                            <span>{entry.value}</span>
                          </div>
                          <div className="supervisor-traffic-track">
                            <span style={{ width: `${entry.percentage}%` }} />
                          </div>
                          <div className="supervisor-traffic-meta">{entry.percentage}% of incoming volume</div>
                        </div>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">No category traffic available for the current filter.</Typography>
                    )}
                  </div>
                </Paper>
              </div>

              <div className="supervisor-metrics-secondary">
                <Paper className="supervisor-panel supervisor-agent-panel" elevation={0}>
                  <div className="supervisor-panel-head">
                    <div>
                      <h3 className="supervisor-panel-title">Top agent throughput</h3>
                      <p className="supervisor-panel-subtitle">Highest resolved ticket volume in the current result set</p>
                    </div>
                    <div className="supervisor-chip-row">
                      <span className="supervisor-chip supervisor-chip-soft">Active agents {activeAgentsCount}</span>
                    </div>
                  </div>

                  <div className="supervisor-chart-frame supervisor-chart-frame-medium">
                    {topAgentsForChart.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={topAgentsForChart} margin={{ top: 4, right: 10, left: 8, bottom: 2 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#edf1f7" horizontal={false} />
                          <XAxis type="number" axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize: 10, fill: '#737c95' }} />
                          <YAxis type="category" dataKey="shortName" axisLine={false} tickLine={false} width={84} tick={{ fontSize: 10, fill: '#5f6782' }} />
                          <RechartsTooltip content={<SupervisorMetricsTooltip />} />
                          <Bar dataKey="resolved" name="Resolved" fill="#4d6ee8" radius={[0, 7, 7, 0]} />
                          <Bar dataKey="pending" name="Pending" fill="#e7bf4e" radius={[0, 7, 7, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <Typography variant="body2" color="text.secondary">No agent throughput data matches your search.</Typography>
                    )}
                  </div>
                </Paper>

                <Paper className="supervisor-panel supervisor-priority-panel" elevation={0}>
                  <div className="supervisor-panel-head">
                    <div>
                      <h3 className="supervisor-panel-title">Priority mix</h3>
                      <p className="supervisor-panel-subtitle">Distribution of work urgency across tickets</p>
                    </div>
                    <div className="supervisor-chip-row">
                      <span className="supervisor-chip">Avg rate {averageAgentRate}%</span>
                    </div>
                  </div>

                  <div className="supervisor-chart-frame supervisor-chart-frame-medium">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={priorityMix} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#edf1f7" vertical={false} />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6f7890' }} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6f7890' }} width={24} />
                        <RechartsTooltip content={<SupervisorMetricsTooltip />} />
                        <Bar dataKey="count" name="Tickets" radius={[8, 8, 0, 0]}>
                          {priorityMix.map((entry) => (
                            <Cell key={entry.label} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Paper>
              </div>
            </div>
          </>
        )}

        {isPerformanceView && (
          <Paper
            elevation={0}
            sx={{
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={700}>Agent Performance</Typography>
              <Typography variant="body2" color="text.secondary">
                Individual agent resolution and ticket handling metrics.
              </Typography>
            </Box>

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
                          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
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
                    {visibleAgentSummaries.map((agent) => {
                      const rate = agent.resolution_rate ?? 0
                      const rateColor = rate >= 80 ? 'success' : rate >= 50 ? 'warning' : 'error'
                      return (
                        <TableRow
                          key={agent.agent_id}
                          sx={{
                            '&:nth-of-type(even)': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.03) },
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
                            <Chip
                              label={`${rate}%`}
                              size="small"
                              color={rateColor}
                              variant="outlined"
                              sx={{ fontWeight: 700, minWidth: 56, fontSize: '0.72rem' }}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}

                    {visibleAgentSummaries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ py: 4, textAlign: 'center' }}>
                          <AgentsIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                          <Typography variant="body2" color="text.secondary">
                            {agentSummariesFromTickets.length ? 'No agent records match your search.' : 'No agent data available yet.'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Paper>
        )}

        {isReportsView && (
          <Paper
            elevation={0}
            sx={{
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={700}>Reports</Typography>
              <Typography variant="body2" color="text.secondary">
                Export reports and manage ticket assignment workflows.
              </Typography>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {assignmentError && <Alert severity="error" sx={{ mb: 2 }}>{assignmentError}</Alert>}

              <Box display="flex" gap={1.5} mb={2} flexWrap="wrap" alignItems="center">
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Period</InputLabel>
                  <Select value={reportPeriod} label="Period" onChange={(event) => setReportPeriod(event.target.value as ReportPeriod)}>
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="custom">Custom Range</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  label="Start"
                  type="date"
                  value={reportStartDate}
                  onChange={(event) => {
                    setReportPeriod('custom')
                    setReportStartDate(event.target.value)
                  }}
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  size="small"
                  label="End"
                  type="date"
                  value={reportEndDate}
                  onChange={(event) => {
                    setReportPeriod('custom')
                    setReportEndDate(event.target.value)
                  }}
                  InputLabelProps={{ shrink: true }}
                />

                <Box display="flex" gap={1} ml="auto">
                  <Button size="small" variant="contained" startIcon={<DownloadIcon />} onClick={downloadSupervisorUsersReport} disabled={!filteredUsersForReport.length}>
                    Users ({filteredUsersForReport.length})
                  </Button>
                  <Button size="small" variant="contained" color="warning" startIcon={<DownloadIcon />} onClick={downloadSupervisorTicketsReport} disabled={!filteredTicketsForReport.length}>
                    Tickets ({filteredTicketsForReport.length})
                  </Button>
                  <Button size="small" variant="contained" color="secondary" startIcon={<DownloadIcon />} onClick={downloadSupervisorIssuesReport} disabled={!filteredIssuesForReport.length}>
                    Issues ({filteredIssuesForReport.length})
                  </Button>
                </Box>
              </Box>

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
                    {visibleTicketsForAssignment.slice(0, 12).map((entry) => (
                      <TableRow key={entry.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                        <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{entry.ticket_id}</TableCell>
                        <TableCell sx={{ maxWidth: 160 }}>
                          <Typography variant="caption" fontWeight={600} noWrap display="block">{entry.subject}</Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{entry.agent_name || 'Unassigned'}</TableCell>
                        <TableCell>
                          <Chip
                            label={(entry.status || '').replace(/_/g, ' ')}
                            size="small"
                            color={entry.status === 'resolved' || entry.status === 'closed' ? 'success' : entry.is_overdue ? 'error' : 'default'}
                            variant="outlined"
                            sx={{ fontSize: '0.65rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{new Date(entry.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select
                              value={entry.assigned_agent_id || ''}
                              displayEmpty
                              disabled={assigningTicketId === entry.ticket_id || entry.status === 'closed'}
                              onChange={(event) => handleAssignTicket(entry.ticket_id, event.target.value as string)}
                            >
                              <MenuItem value=""><em>Unassigned</em></MenuItem>
                              {entry.assigned_agent_id && !activeAgentUsers.some((currentUser) => currentUser.id === entry.assigned_agent_id) && (
                                <MenuItem value={entry.assigned_agent_id}>{entry.agent_name || 'Current'} (inactive)</MenuItem>
                              )}
                              {activeAgentUsers.map((currentUser) => (
                                <MenuItem key={currentUser.id} value={currentUser.id}>{currentUser.name}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                      </TableRow>
                    ))}

                    {visibleTicketsForAssignment.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
                          {filteredTicketsForReport.length === 0 ? 'No tickets in selected range.' : 'No tickets match your search.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Paper>
        )}
      </DashboardShell>

      <Menu anchorEl={profileAnchorEl} open={Boolean(profileAnchorEl)} onClose={() => setProfileAnchorEl(null)}>
        <Box sx={{ px: 2, py: 1.25, minWidth: 240 }}>
          <Typography variant="subtitle2" fontWeight={700}>{profileName || 'Supervisor User'}</Typography>
          <Typography variant="caption" color="text.secondary" display="block">{profileEmail || 'No email'}</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ textTransform: 'capitalize' }}>Role: {profileRole}</Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleOpenProfileDialog}><EditIcon fontSize="small" sx={{ mr: 1 }} />Update Profile</MenuItem>
        <MenuItem onClick={handleLogout}><LogoutIcon fontSize="small" sx={{ mr: 1 }} />Logout</MenuItem>
      </Menu>

      <Dialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>My Profile</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField label="Full Name" size="small" fullWidth value={profileName} onChange={(event) => setProfileName(event.target.value)} sx={{ mb: 1.25 }} />
          <TextField label="Email" size="small" fullWidth value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} sx={{ mb: 1.25 }} />
          <TextField label="Role" size="small" fullWidth value={profileRole} disabled sx={{ mb: 1.25 }} />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>Change Password</Typography>
          <TextField label="Current Password" type="password" size="small" fullWidth value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} sx={{ mb: 1 }} />
          <TextField label="New Password" type="password" size="small" fullWidth value={newPassword} onChange={(event) => setNewPassword(event.target.value)} sx={{ mb: 1 }} />
          <TextField label="Confirm New Password" type="password" size="small" fullWidth value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveProfile}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}