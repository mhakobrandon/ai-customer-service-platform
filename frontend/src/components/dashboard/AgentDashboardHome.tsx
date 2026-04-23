import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Typography,
} from '@mui/material'
import {
  Assessment as ReportsIcon,
  CalendarTodayOutlined as CalendarIcon,
  ChatBubble as ChatIcon,
  ConfirmationNumber as TicketIcon,
  CheckCircleOutline as ResolvedMetricIcon,
  ConfirmationNumberOutlined as PendingMetricIcon,
  Dashboard as DashboardIcon,
  Forum as InboxIcon,
  ForumOutlined as EscalationMetricIcon,
  GridViewOutlined as AssignedMetricIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowLeft as ArrowLeftIcon,
  KeyboardArrowRight as ArrowRightIcon,
  Logout as LogoutIcon,
  SupportAgent as SupportAgentIcon,
  TrendingUp as GrowthIcon,
} from '@mui/icons-material'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { chatAPI, ticketAPI } from '../../services/apiService'
import { useAuth } from '../../services/authService'
import NotificationBell from '../common/NotificationBell'
import DashboardShell, { type DashboardShellNavSection, toInitials } from './DashboardShell'
import {
  type AppNotification,
  computeAgentAssignmentNotifications,
  markAgentTicketNotificationsRead,
} from '../../services/notificationService'

interface InboxItem {
  session_id: string
  customer: string
  status: string
  escalation_reason?: string
  updated_at?: string | null
}

interface Ticket {
  ticket_id?: string
  subject: string
  status: string
  created_at: string
}

const escalationStatuses = new Set(['escalated', 'reopened', 'pending_customer'])

const formatCount = (value: number) => new Intl.NumberFormat('en-US').format(value)

const buildEscalationTicks = (maxValue: number) => {
  const step = Math.max(1, Math.ceil(maxValue / 4))
  return [0, step, step * 2, step * 3, step * 4]
}

const toDayKey = (raw?: string | null) => {
  if (!raw) {
    return null
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString().slice(0, 10)
}

function EscalationTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number }>; label?: string }) {
  if (!active || !payload || !payload.length) {
    return null
  }

  const value = Number(payload[0]?.value || 0)

  return (
    <Paper
      elevation={0}
      sx={{
        px: 1,
        py: 0.5,
        border: '1px solid #e6eaf3',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        boxShadow: '0 6px 16px rgba(21, 33, 68, 0.14)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3f6df6' }} />
        <Typography sx={{ fontSize: '0.7rem', color: '#5f6784', fontWeight: 600 }}>
          {label || 'Day'}
        </Typography>
        <Typography sx={{ fontSize: '0.72rem', color: '#3f4560', fontWeight: 700 }}>
          {formatCount(value)} escalations
        </Typography>
      </Box>
    </Paper>
  )
}

export default function AgentDashboardHome() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [agentNotifications, setAgentNotifications] = useState<AppNotification[]>([])
  const [agentUnreadCount, setAgentUnreadCount] = useState(0)

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
      setError('Failed to load agent dashboard data.')
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
    }, 20000)

    return () => clearInterval(interval)
  }, [])

  const normalizedSearch = searchQuery.trim().toLowerCase()

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

  useEffect(() => {
    const { notifications, totalUnread } = computeAgentAssignmentNotifications(tickets, user?.id)
    setAgentNotifications(notifications)
    setAgentUnreadCount(totalUnread)
  }, [tickets, user?.id])

  const escalationDateWindow = useMemo(() => {
    const today = new Date()
    const days: Array<{ key: string; label: string }> = []

    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(today)
      date.setDate(today.getDate() - offset)

      days.push({
        key: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
      })
    }

    return days
  }, [])

  const escalationSeries = useMemo(() => {
    const buckets = escalationDateWindow.reduce<Record<string, number>>((acc, day) => {
      acc[day.key] = 0
      return acc
    }, {})

    filteredInbox.forEach((item) => {
      const dayKey = toDayKey(item.updated_at)
      if (dayKey && Object.prototype.hasOwnProperty.call(buckets, dayKey)) {
        buckets[dayKey] += 1
      }
    })

    const hasInboxSignals = Object.values(buckets).some((value) => value > 0)
    if (!hasInboxSignals) {
      filteredTickets.forEach((ticket) => {
        if (!escalationStatuses.has(ticket.status?.toLowerCase())) {
          return
        }

        const dayKey = toDayKey(ticket.created_at)
        if (dayKey && Object.prototype.hasOwnProperty.call(buckets, dayKey)) {
          buckets[dayKey] += 1
        }
      })
    }

    const series = escalationDateWindow.map((day) => ({
      label: day.label,
      value: buckets[day.key] || 0,
    }))

    return series
  }, [escalationDateWindow, filteredInbox, filteredTickets])

  const escalationRangeLabel = `${escalationDateWindow[0]?.label || ''} - ${escalationDateWindow[escalationDateWindow.length - 1]?.label || ''}`

  const escalationSummary = useMemo(() => {
    const openEscalations = filteredInbox.filter((item) => {
      const status = item.status?.toLowerCase()
      return status === 'pending' || status === 'assigned'
    }).length
    const resolvedEscalations = filteredInbox.filter((item) => item.status?.toLowerCase() === 'resolved').length
    const trendTotal = escalationSeries.reduce((sum, entry) => sum + entry.value, 0)

    return {
      openEscalations,
      resolvedEscalations,
      trendTotal,
    }
  }, [filteredInbox, escalationSeries])

  const earningBreakdown = useMemo(() => {
    return [
      { name: 'Escalation inbox', value: 18, color: '#3f6df6' },
      { name: 'Pending tickets', value: 5, color: '#f0c432' },
      { name: 'Resolved and closed', value: 7, color: '#34c46c' },
      { name: 'Total assigned tickets', value: 12, color: '#f07e55' },
    ]
  }, [])

  const displayName = user?.name || user?.email || 'Agent User'
  const firstName = displayName.split(' ')[0] || 'Agent'

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
          active: true,
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
      <NotificationBell
        items={agentNotifications}
        unreadCount={agentUnreadCount}
        onOpenItem={(item) => {
          const ticketRef = String(item.meta?.ticket_id || '').trim()
          if (ticketRef) {
            navigate(`/tickets/${ticketRef}`)
          }
        }}
        onMarkAllRead={() => {
          markAgentTicketNotificationsRead(user?.id, tickets)
          setAgentNotifications([])
          setAgentUnreadCount(0)
        }}
        tooltip="Assigned ticket alerts"
      />

      <button type="button" className="btn" onClick={() => navigate('/chat')}>
        <ChatIcon sx={{ fontSize: 12 }} /> Chat
      </button>
      <button type="button" className="btn" onClick={() => navigate('/agent/console')}>
        <SupportAgentIcon sx={{ fontSize: 12 }} /> Console
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

  const donutTotal = earningBreakdown.reduce((sum, entry) => sum + entry.value, 0)
  const highlightBarIndex = escalationSeries.reduce((maxIndex, item, index, array) => (
    item.value > array[maxIndex].value ? index : maxIndex
  ), 0)
  const yAxisTicks = buildEscalationTicks(Math.max(...escalationSeries.map((item) => item.value), 1))
  const hasEscalationTrendData = escalationSummary.trendTotal > 0

  const kpiCards = [
    {
      label: 'Escalation inbox',
      value: 18,
      icon: <EscalationMetricIcon sx={{ fontSize: 14 }} />,
      featured: true,
    },
    {
      label: 'Pending tickets',
      value: 5,
      icon: <PendingMetricIcon sx={{ fontSize: 14 }} />,
      featured: false,
    },
    {
      label: 'Resolved and closed',
      value: 7,
      icon: <ResolvedMetricIcon sx={{ fontSize: 14 }} />,
      featured: false,
    },
    {
      label: 'Total assigned tickets',
      value: 12,
      icon: <AssignedMetricIcon sx={{ fontSize: 14 }} />,
      featured: false,
    },
  ]

  const miniCalendarNow = new Date()
  const miniCalendarMonthYear = miniCalendarNow.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const miniCalendarWeek = Array.from({ length: 5 }, (_, index) => {
    const day = new Date(miniCalendarNow)
    day.setDate(miniCalendarNow.getDate() + index - 2)
    return {
      dayLabel: day.toLocaleDateString('en-US', { weekday: 'short' }),
      dateLabel: day.toLocaleDateString('en-US', { day: '2-digit' }),
      isToday: index === 2,
    }
  })

  return (
    <DashboardShell
      roleClassName="role-dashboard-agent"
      brandLabel="BotAssist Agent"
      brandIcon={<SupportAgentIcon sx={{ fontSize: 13 }} />}
      sidebarSections={sidebarSections}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search dashboard metrics and activity..."
      topActions={topActions}
      userName={displayName}
      userMeta="Agent home"
      userInitials={toInitials(displayName, 'AG')}
      onUserCardClick={() => navigate('/dashboard/agent')}
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
      <Box
        sx={{
          p: { xs: 1.1, md: 1.25 },
          border: '1px solid #e3e9f4',
          borderRadius: '14px',
          background: 'linear-gradient(180deg, #f8faff 0%, #f2f5fc 100%)',
          minHeight: { xs: 'auto', lg: 'calc(100dvh - 150px)' },
          display: 'flex',
          flexDirection: 'column',
          '@keyframes syncedCardFlash': {
            '0%, 100%': {
              transform: 'translateY(0)',
              boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)',
              filter: 'brightness(1)',
            },
            '50%': {
              transform: 'translateY(-1px)',
              boxShadow: '0 14px 28px rgba(63, 109, 246, 0.26)',
              filter: 'brightness(1.03)',
            },
          },
          '& .sync-flash-card': {
            animation: 'syncedCardFlash 2.6s ease-in-out infinite',
            willChange: 'transform, box-shadow, filter',
          },
          '@media (prefers-reduced-motion: reduce)': {
            '& .sync-flash-card': {
              animation: 'none',
            },
          },
        }}
      >
        <Grid container spacing={1.2} sx={{ flex: 1, minHeight: 0, height: '100%', alignItems: 'stretch' }}>
          <Grid item xs={12} lg={8} sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
            <Paper
              elevation={0}
              sx={{
                mb: 1.1,
                px: { xs: 1.4, md: 2 },
                py: { xs: 1.25, md: 1.5 },
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.28)',
                background: 'linear-gradient(120deg, #4b67f5 0%, #5f7bff 58%, #3c5ce6 100%)',
                boxShadow: '0 14px 30px rgba(63, 109, 246, 0.34)',
                position: 'relative',
                overflow: 'hidden',
                color: '#f4f7ff',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  right: { xs: -32, sm: -24 },
                  top: { xs: -28, sm: -18 },
                  width: { xs: 116, sm: 168 },
                  height: { xs: 116, sm: 168 },
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.02) 72%)',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  right: { xs: 12, sm: 24 },
                  bottom: { xs: -38, sm: -42 },
                  width: { xs: 92, sm: 136 },
                  height: { xs: 92, sm: 136 },
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(167, 238, 255, 0.42) 0%, rgba(167, 238, 255, 0.04) 72%)',
                }}
              />

              <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ maxWidth: { xs: '100%', sm: '70%' } }}>
                  <Typography sx={{ fontSize: { xs: '1.18rem', md: '1.5rem' }, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.01em' }}>
                    Good morning, {firstName}
                  </Typography>
                  <Typography sx={{ mt: 0.45, fontSize: { xs: '0.76rem', md: '0.82rem' }, color: 'rgba(239, 244, 255, 0.92)' }}>
                    You have {formatCount(escalationSummary.openEscalations)} active escalations to review today.
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => navigate('/dashboard/agent/escalations')}
                    sx={{
                      mt: 1.05,
                      minHeight: 28,
                      px: 1.2,
                      borderRadius: '7px',
                      backgroundColor: '#ffffff',
                      color: '#3556de',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'none',
                      '&:hover': {
                        backgroundColor: '#eef2ff',
                      },
                    }}
                  >
                    Review queue
                  </Button>
                </Box>

                <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', justifyContent: 'center', minWidth: 120 }}>
                  <SupportAgentIcon sx={{ fontSize: 66, color: '#eef4ff', filter: 'drop-shadow(0 8px 14px rgba(31, 53, 149, 0.4))' }} />
                </Box>
              </Box>
            </Paper>

            <Grid container spacing={1.2} sx={{ mb: 1.1 }}>
              {kpiCards.map((card) => (
                <Grid item xs={12} sm={6} md={3} key={card.label}>
                  <Paper
                    className="sync-flash-card"
                    elevation={0}
                    sx={{
                      p: 1.35,
                      borderRadius: '10px',
                      minHeight: 102,
                      border: card.featured ? 'none' : '1px solid #ecf0f7',
                      background: card.featured
                        ? 'linear-gradient(135deg, #3f6df6 0%, #355edf 100%)'
                        : '#ffffff',
                      color: card.featured ? '#ffffff' : '#1f2438',
                      boxShadow: card.featured
                        ? '0 12px 20px rgba(63, 109, 246, 0.28)'
                        : '0 8px 18px rgba(15, 23, 42, 0.05)',
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.1}>
                      <Typography sx={{ fontSize: '0.8rem', opacity: card.featured ? 0.96 : 0.62, fontWeight: 600 }}>
                        {card.label}
                      </Typography>
                      <Box
                        sx={{
                          width: 23,
                          height: 23,
                          borderRadius: '50%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: card.featured ? 'rgba(255,255,255,0.18)' : '#edf3ff',
                          color: card.featured ? '#f1f4ff' : '#4f67b6',
                        }}
                      >
                        {card.icon}
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.02em' }}>
                      {card.value}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            <Paper
              className="sync-flash-card"
              elevation={0}
              sx={{
                border: '1px solid #ecf0f7',
                borderRadius: '12px',
                p: 1.6,
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 10px 22px rgba(15, 23, 42, 0.06)',
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.3}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.96rem', color: '#252a40' }}>Escalation metrics</Typography>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1,
                    py: 0.48,
                    border: '1px solid #e4e8f0',
                    borderRadius: '8px',
                    color: '#6d7590',
                  }}
                >
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 600 }}>{escalationRangeLabel}</Typography>
                  <CalendarIcon sx={{ fontSize: 12 }} />
                </Box>
              </Box>
              <Typography sx={{ fontSize: '2.02rem', fontWeight: 700, mb: 0.85, color: '#171c31', letterSpacing: '-0.02em' }}>
                {formatCount(escalationSummary.trendTotal)}
              </Typography>
              {!hasEscalationTrendData && filteredInbox.length > 0 ? (
                <Typography sx={{ mt: -0.35, mb: 0.75, fontSize: '0.76rem', color: '#8d96ad' }}>
                  No timestamped escalation updates in this date range.
                </Typography>
              ) : (
                <Typography sx={{ mt: -0.35, mb: 0.75, fontSize: '0.76rem', color: '#8d96ad' }}>
                  {formatCount(escalationSummary.openEscalations)} open and {formatCount(escalationSummary.resolvedEscalations)} resolved in inbox
                </Typography>
              )}
              {hasEscalationTrendData ? (
                <Box sx={{ flex: 1, minHeight: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={escalationSeries} margin={{ top: 8, right: 2, left: -22, bottom: 0 }}>
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#9aa3ba' }} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        ticks={yAxisTicks}
                        tick={{ fontSize: 10, fill: '#b1b8cb' }}
                        tickFormatter={(value: number) => `${value}`}
                      />
                      <RechartsTooltip content={<EscalationTooltip />} cursor={{ fill: 'rgba(63, 109, 246, 0.08)' }} />
                      <Bar dataKey="value" radius={[8, 8, 8, 8]} barSize={32}>
                        {escalationSeries.map((entry, index) => (
                          <Cell
                            key={`${entry.label}-${index}`}
                            fill={index === highlightBarIndex ? '#3f6df6' : '#e5e8ef'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Box
                  sx={{
                    mt: 0.5,
                    flex: 1,
                    minHeight: 170,
                    border: '1px dashed #dce4f2',
                    borderRadius: '10px',
                    background: 'linear-gradient(180deg, #fbfcff 0%, #f6f8fd 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Box textAlign="center">
                    <EscalationMetricIcon sx={{ fontSize: 22, color: '#9aa7c4', mb: 0.5 }} />
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#5f6985' }}>
                      No escalation activity for this period
                    </Typography>
                    <Typography sx={{ fontSize: '0.73rem', color: '#93a0ba', mt: 0.2 }}>
                      Activity bars appear automatically when timestamped updates are available.
                    </Typography>
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} lg={4} sx={{ display: 'flex', alignItems: 'flex-start' }}>
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              <Paper
                elevation={0}
                sx={{
                  border: '1px solid #ecf0f7',
                  borderRadius: '12px',
                  p: 1.6,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 10px 22px rgba(15, 23, 42, 0.06)',
                }}
              >
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.96rem', color: '#252a40' }}>Analytics</Typography>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.2,
                      px: 0.85,
                      py: 0.4,
                      border: '1px solid #e4e8f0',
                      borderRadius: '8px',
                      color: '#6d7590',
                    }}
                  >
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 600 }}>Month</Typography>
                    <ArrowDownIcon sx={{ fontSize: 14 }} />
                  </Box>
                </Box>

                <Box sx={{ position: 'relative', height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={earningBreakdown}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={84}
                        paddingAngle={2}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {earningBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => `${value}`} />
                    </PieChart>
                  </ResponsiveContainer>

                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <Box textAlign="center">
                      <Typography sx={{ fontSize: '1.7rem', fontWeight: 700, color: '#171c31' }}>{donutTotal}</Typography>
                      <Typography sx={{ fontSize: '0.78rem', color: '#8088a0' }}>Tickets</Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0.75, mb: 0.7 }}>
                  {earningBreakdown.map((entry) => (
                    <Box key={entry.name}>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#2a3048' }}>{entry.value}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: entry.color }} />
                        <Typography sx={{ fontSize: '0.73rem', color: '#8b93a8' }}>{entry.name}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>

                <Typography sx={{ fontSize: '0.73rem', color: '#9ba3b9', lineHeight: 1.4 }}>
                  Ticket workload distribution across inbox and assigned resolution queues.
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  border: '1px solid #ecf0f7',
                  borderRadius: '12px',
                  p: 1.3,
                  width: '100%',
                  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)',
                  background: 'linear-gradient(180deg, #ffffff 0%, #f9fbff 100%)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.95 }}>
                  <Box sx={{ width: 24, height: 24, borderRadius: '7px', border: '1px solid #e6e9f2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#a3acc1' }}>
                    <ArrowLeftIcon sx={{ fontSize: 16 }} />
                  </Box>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#424d69' }}>{miniCalendarMonthYear}</Typography>
                  <Box sx={{ width: 24, height: 24, borderRadius: '7px', border: '1px solid #e6e9f2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#a3acc1' }}>
                    <ArrowRightIcon sx={{ fontSize: 16 }} />
                  </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 0.45, mb: 0.55 }}>
                  {miniCalendarWeek.map((entry) => (
                    <Typography key={`day-${entry.dayLabel}-${entry.dateLabel}`} sx={{ textAlign: 'center', fontSize: '0.66rem', color: '#a1aac0', fontWeight: 600 }}>
                      {entry.dayLabel}
                    </Typography>
                  ))}
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 0.45, mb: 1.15 }}>
                  {miniCalendarWeek.map((entry) => {
                    const active = entry.isToday
                    return (
                      <Box
                        key={`date-${entry.dayLabel}-${entry.dateLabel}`}
                        sx={{
                          height: 34,
                          borderRadius: '9px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.72rem',
                          fontWeight: active ? 700 : 600,
                          color: active ? '#f3f7ff' : '#5f6987',
                          background: active ? 'linear-gradient(145deg, #7084ff 0%, #5d6fee 100%)' : 'transparent',
                          boxShadow: active ? '0 10px 20px rgba(95, 111, 238, 0.36)' : 'none',
                        }}
                      >
                        {entry.dateLabel}
                      </Box>
                    )
                  })}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.78rem', color: '#2d354d', fontWeight: 700 }}>Community growth</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mt: 0.2 }}>
                      <GrowthIcon sx={{ fontSize: 14, color: '#36bb71' }} />
                      <Typography sx={{ fontSize: '0.64rem', color: '#74b68d', fontWeight: 600 }}>Increase to 19.6%</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress variant="determinate" value={100} size={40} thickness={5} sx={{ color: '#e8edf9' }} />
                    <CircularProgress
                      variant="determinate"
                      value={62}
                      size={40}
                      thickness={5}
                      sx={{
                        color: '#5f70f3',
                        position: 'absolute',
                        left: 0,
                        '& .MuiCircularProgress-circle': {
                          strokeLinecap: 'round',
                        },
                      }}
                    />
                    <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography sx={{ fontSize: '0.56rem', fontWeight: 700, color: '#5a6488' }}>62%</Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </DashboardShell>
  )
}
