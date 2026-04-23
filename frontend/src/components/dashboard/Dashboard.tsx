/**
 * Dashboard Component
 * Main customer dashboard view with support, tickets, and wallet summaries.
 */

import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Menu,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'
import {
  AccountBalanceWallet as WalletIcon,
  AccountCircle as ProfileIcon,
  Add as AddIcon,
  Bolt as ProgressIcon,
  ChatBubble as ChatIcon,
  CheckCircleOutline as ResolvedIcon,
  Computer as ConsoleIcon,
  Dashboard as DashboardIcon,
  Edit as EditIcon,
  EmailOutlined as EmailIcon,
  ErrorOutline as EscalatedIcon,
  ForumOutlined as SessionsIcon,
  Logout as LogoutIcon,
  Notifications as NotificationIcon,
  Public as WebIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  SettingsOutlined as SettingsIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  SyncAlt as ExchangeIcon,
  TrendingUp as TrendingIcon,
  WarningAmber as OpenIcon,
  WhatsApp as WhatsAppIcon,
  ConfirmationNumber as TicketIcon,
} from '@mui/icons-material'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../services/authService'
import { chatAPI, ticketAPI } from '../../services/apiService'
import { formatDateTime } from '../../utils/dateUtils'
import { LinkAccountModal } from '../banking'
import type { BalanceInquiry, LinkedPlatformAccount } from '../../types/banking'
import {
  AppNotification,
  computeCustomerSessionNotifications,
  markAllCustomerSessionsRead,
  markCustomerSessionRead,
} from '../../services/notificationService'
import {
  getAccountBalance,
  getLinkedAccounts,
  LINKED_ACCOUNTS_UPDATED_EVENT,
  setPrimaryAccount,
} from '../../services/linkedPlatformsService'
import './Dashboard.css'

interface ChatSession {
  id: string
  session_id: string
  created_at: string
  updated_at?: string
  status: string
  message_count: number
  last_message?: string
}

interface Ticket {
  id: string
  ticket_id?: string
  subject: string
  status: string
  priority: string
  created_at: string
}

interface TicketDetailsData extends Ticket {
  description: string
  category: string
  updated_at?: string
  resolved_at?: string
  resolution?: string | null
  resolution_notes?: string | null
  is_overdue?: boolean
}

type Tone = 'open' | 'prog' | 'esc' | 'res'

const normalizeStatus = (value?: string): string => String(value || '').toLowerCase()

const statusTone = (status?: string): Tone => {
  const normalized = normalizeStatus(status)

  if (['new', 'open', 'active'].includes(normalized)) {
    return 'open'
  }
  if (['assigned', 'in_progress', 'pending_customer'].includes(normalized)) {
    return 'prog'
  }
  if (['escalated', 'critical'].includes(normalized)) {
    return 'esc'
  }
  return 'res'
}

const priorityTone = (priority?: string): Tone => {
  const normalized = normalizeStatus(priority)

  if (['critical', 'high'].includes(normalized)) {
    return 'esc'
  }
  if (['medium'].includes(normalized)) {
    return 'prog'
  }
  return 'open'
}

const toneClassName = (tone: Tone): string => {
  if (tone === 'open') {
    return 'p-open'
  }
  if (tone === 'prog') {
    return 'p-prog'
  }
  if (tone === 'esc') {
    return 'p-esc'
  }
  return 'p-res'
}

const toInitials = (name: string): string => {
  const tokens = name
    .split(' ')
    .map((entry) => entry.trim())
    .filter(Boolean)

  if (tokens.length === 0) {
    return 'CU'
  }
  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase()
  }
  return `${tokens[0][0]}${tokens[1][0]}`.toUpperCase()
}

const formatRelativeTime = (dateString?: string): string => {
  if (!dateString) {
    return 'Just now'
  }

  const date = new Date(dateString)
  const diff = Date.now() - date.getTime()

  if (diff < 60000) {
    return 'Just now'
  }
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} min ago`
  }
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} hrs ago`
  }

  return date.toLocaleDateString()
}

const formatCurrency = (amount: number, currency = 'USD'): string => {
  const normalizedCurrency = (currency || 'USD').toUpperCase()

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${normalizedCurrency} ${amount.toFixed(2)}`
  }
}

const toLabel = (value?: string): string => {
  const raw = String(value || '').replace(/_/g, ' ').trim()
  if (!raw) {
    return 'unknown'
  }
  return raw
}

const truncate = (value: string | undefined, maxLength: number): string => {
  if (!value) {
    return ''
  }
  if (value.length <= maxLength) {
    return value
  }
  return `${value.slice(0, maxLength - 1)}...`
}

const walletCurrencyTargets = ['ZIG', 'USD'] as const

interface ChartPoint {
  x: number
  y: number
}

const formatCompactNumber = (value: number): string => {
  const safeValue = Number.isFinite(value) ? value : 0

  try {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(safeValue)
  } catch {
    return String(Math.round(safeValue))
  }
}

const formatSignedCount = (value: number): string => {
  if (value > 0) {
    return `+${value}`
  }
  return `${value}`
}

const buildSmoothPath = (points: ChartPoint[]): string => {
  if (points.length === 0) {
    return ''
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`
  }

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const midpointX = (previous.x + current.x) / 2
    const midpointY = (previous.y + current.y) / 2
    path += ` Q ${previous.x.toFixed(2)} ${previous.y.toFixed(2)} ${midpointX.toFixed(2)} ${midpointY.toFixed(2)}`
  }

  const last = points[points.length - 1]
  path += ` T ${last.x.toFixed(2)} ${last.y.toFixed(2)}`
  return path
}

export default function Dashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const ticketDetailsMatch = matchPath('/dashboard/customer/tickets/:ticketId', location.pathname)
  const selectedTicketId = ticketDetailsMatch?.params.ticketId || null
  const isTicketDetailsView = Boolean(selectedTicketId)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [sessionHistory, setSessionHistory] = useState<ChatSession[]>([])
  const [ticketHistory, setTicketHistory] = useState<Ticket[]>([])
  const [recentSessions, setRecentSessions] = useState<ChatSession[]>([])
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([])
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedPlatformAccount[]>([])
  const [walletBalances, setWalletBalances] = useState<Record<string, BalanceInquiry | null>>({})
  const [walletBalanceLoading, setWalletBalanceLoading] = useState<Record<string, boolean>>({})
  const [walletBalanceErrors, setWalletBalanceErrors] = useState<Record<string, string | null>>({})

  const [stats, setStats] = useState({
    totalSessions: 0,
    activeSessions: 0,
    openTickets: 0,
    resolvedTickets: 0,
    resolutionRate: 0,
  })

  const [customerNotifications, setCustomerNotifications] = useState<AppNotification[]>([])
  const [customerUnreadCount, setCustomerUnreadCount] = useState(0)
  const [notificationSessionsSnapshot, setNotificationSessionsSnapshot] = useState<ChatSession[]>([])

  const [notificationAnchorEl, setNotificationAnchorEl] = useState<HTMLElement | null>(null)
  const [profileAnchorEl, setProfileAnchorEl] = useState<HTMLElement | null>(null)
  const [providerAnchorEl, setProviderAnchorEl] = useState<HTMLElement | null>(null)

  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileRole, setProfileRole] = useState('customer')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileMessageType, setProfileMessageType] = useState<'success' | 'error'>('success')

  const [linkAccountOpen, setLinkAccountOpen] = useState(false)
  const [ticketDetailsLoading, setTicketDetailsLoading] = useState(false)
  const [ticketDetailsError, setTicketDetailsError] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<TicketDetailsData | null>(null)

  const whatsappUrl = 'https://wa.me/15551578991'

  const displayName = user?.name || user?.email?.split('@')[0] || 'Customer User'
  const displayRole = user?.role || 'customer'
  const displayInitials = useMemo(() => toInitials(displayName), [displayName])

  const loadLinkedAccounts = () => {
    setLinkedAccounts(getLinkedAccounts())
  }

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [sessionsRes, ticketsRes] = await Promise.all([
        chatAPI.getSessions(),
        ticketAPI.getTickets(),
      ])

      const sessions: ChatSession[] = Array.isArray(sessionsRes.data) ? sessionsRes.data : []
      const tickets: Ticket[] = Array.isArray(ticketsRes.data) ? ticketsRes.data : []

      setSessionHistory(sessions)
      setTicketHistory(tickets)

      const activeSessions = sessions.filter((session) => normalizeStatus(session.status) === 'active').length
      const openTickets = tickets.filter((ticket) => {
        const normalized = normalizeStatus(ticket.status)
        return ['new', 'assigned', 'in_progress', 'open', 'pending_customer', 'escalated'].includes(normalized)
      }).length
      const resolvedTickets = tickets.filter((ticket) => {
        const normalized = normalizeStatus(ticket.status)
        return ['resolved', 'closed'].includes(normalized)
      }).length
      const resolutionRate = tickets.length > 0 ? Math.round((resolvedTickets / tickets.length) * 1000) / 10 : 0

      setRecentSessions(sessions.slice(0, 8))
      setRecentTickets(tickets.slice(0, 8))
      setStats({
        totalSessions: sessions.length,
        activeSessions,
        openTickets,
        resolvedTickets,
        resolutionRate,
      })

    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Failed to load real dashboard data. Please refresh and try again.')
      setSessionHistory([])
      setTicketHistory([])
      setRecentSessions([])
      setRecentTickets([])
      setStats({
        totalSessions: 0,
        activeSessions: 0,
        openTickets: 0,
        resolvedTickets: 0,
        resolutionRate: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setProfileName(displayName)
    setProfileEmail(user?.email || '')
    setProfileRole(displayRole)
  }, [displayName, displayRole, user?.email])

  useEffect(() => {
    void loadDashboardData()
  }, [])

  useEffect(() => {
    if (!selectedTicketId) {
      setSelectedTicket(null)
      setTicketDetailsError(null)
      setTicketDetailsLoading(false)
      return
    }

    let isActive = true

    const loadTicketDetails = async () => {
      setTicketDetailsLoading(true)
      setTicketDetailsError(null)

      try {
        const response = await ticketAPI.getTicketDetails(selectedTicketId)
        if (isActive) {
          setSelectedTicket(response.data)
        }
      } catch {
        if (isActive) {
          setSelectedTicket(null)
          setTicketDetailsError('Unable to load ticket details. Please try another ticket.')
        }
      } finally {
        if (isActive) {
          setTicketDetailsLoading(false)
        }
      }
    }

    void loadTicketDetails()

    return () => {
      isActive = false
    }
  }, [selectedTicketId])

  useEffect(() => {
    loadLinkedAccounts()

    const handleLinkedAccountsUpdate = () => {
      loadLinkedAccounts()
    }

    window.addEventListener(LINKED_ACCOUNTS_UPDATED_EVENT, handleLinkedAccountsUpdate)
    window.addEventListener('storage', handleLinkedAccountsUpdate)

    return () => {
      window.removeEventListener(LINKED_ACCOUNTS_UPDATED_EVENT, handleLinkedAccountsUpdate)
      window.removeEventListener('storage', handleLinkedAccountsUpdate)
    }
  }, [])

  useEffect(() => {
    const nextBalances: Record<string, BalanceInquiry | null> = {}

    linkedAccounts.forEach((account) => {
      nextBalances[account.id] = account.cachedBalance
        ? {
            platformId: account.platformId,
            accountIdentifier: account.accountIdentifier,
            balance: account.cachedBalance.amount,
            currency: account.cachedBalance.currency,
            lastUpdated: account.cachedBalance.updatedAt,
          }
        : null
    })

    setWalletBalances(nextBalances)
  }, [linkedAccounts])

  useEffect(() => {
    if (!user?.id) {
      return
    }

    const loadCustomerNotifications = async () => {
      try {
        const sessionsRes = await chatAPI.getSessions()
        const sessions: ChatSession[] = Array.isArray(sessionsRes.data) ? sessionsRes.data : []
        setNotificationSessionsSnapshot(sessions)
        const { notifications, totalUnread } = computeCustomerSessionNotifications(sessions, user.id)
        setCustomerNotifications(notifications)
        setCustomerUnreadCount(totalUnread)
      } catch (err) {
        console.error('Failed to load customer notifications:', err)
      }
    }

    void loadCustomerNotifications()
    const intervalId = window.setInterval(() => {
      void loadCustomerNotifications()
    }, 15000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [user?.id])

  const orderedAccounts = useMemo(
    () => [...linkedAccounts].sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary)),
    [linkedAccounts]
  )

  const primaryAccount = orderedAccounts[0] || null

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date()),
    []
  )

  const activityGraph = useMemo(() => {
    const monthCount = 10
    const today = new Date()
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const firstMonthStart = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - (monthCount - 1), 1)

    const monthStarts = Array.from({ length: monthCount }, (_, index) => (
      new Date(firstMonthStart.getFullYear(), firstMonthStart.getMonth() + index, 1)
    ))

    const months = monthStarts.map((monthDate) => (
      new Intl.DateTimeFormat('en-US', { month: 'short' }).format(monthDate)
    ))

    const sessionsSeries = Array.from({ length: monthCount }, () => 0)
    const ticketsSeries = Array.from({ length: monthCount }, () => 0)

    const resolveMonthIndex = (dateInput?: string): number => {
      if (!dateInput) {
        return -1
      }

      const date = new Date(dateInput)
      if (Number.isNaN(date.getTime())) {
        return -1
      }

      return (
        (date.getFullYear() - firstMonthStart.getFullYear()) * 12
        + (date.getMonth() - firstMonthStart.getMonth())
      )
    }

    sessionHistory.forEach((session) => {
      const monthIndex = resolveMonthIndex(session.created_at || session.updated_at)
      if (monthIndex >= 0 && monthIndex < monthCount) {
        sessionsSeries[monthIndex] += 1
      }
    })

    ticketHistory.forEach((ticket) => {
      const monthIndex = resolveMonthIndex(ticket.created_at)
      if (monthIndex >= 0 && monthIndex < monthCount) {
        ticketsSeries[monthIndex] += 1
      }
    })

    const seriesPeak = Math.max(...sessionsSeries, ...ticketsSeries, 1)
    const yDomainMax = Math.max(seriesPeak + 1, Math.ceil(seriesPeak * 1.2))

    const viewWidth = 340
    const viewHeight = 136
    const topPadding = 18
    const bottomPadding = 20
    const drawHeight = viewHeight - topPadding - bottomPadding
    const xStep = viewWidth / Math.max(monthCount - 1, 1)

    const toY = (value: number) => (
      topPadding + (1 - (value / yDomainMax)) * drawHeight
    )

    const sessionsPoints: ChartPoint[] = sessionsSeries.map((value, index) => ({
      x: index * xStep,
      y: toY(value),
    }))

    const ticketsPoints: ChartPoint[] = ticketsSeries.map((value, index) => ({
      x: index * xStep,
      y: toY(value),
    }))

    const focusIndex = monthCount - 1
    const previousIndex = Math.max(focusIndex - 1, 0)

    const tooltipLeft = Math.min(
      Math.max(Math.max(sessionsPoints[focusIndex].x, ticketsPoints[focusIndex].x) - 80, 10),
      viewWidth - 180
    )

    const gridLines = Array.from({ length: 4 }, (_, tick) => (
      topPadding + (drawHeight * tick) / 3
    ))

    return {
      months,
      viewWidth,
      viewHeight,
      sessionsPath: buildSmoothPath(sessionsPoints),
      ticketsPath: buildSmoothPath(ticketsPoints),
      focusIndex,
      focusMonthLabel: months[focusIndex],
      previousMonthLabel: months[previousIndex],
      focusSessions: sessionsSeries[focusIndex],
      focusTickets: ticketsSeries[focusIndex],
      sessionsDelta: sessionsSeries[focusIndex] - sessionsSeries[previousIndex],
      ticketsDelta: ticketsSeries[focusIndex] - ticketsSeries[previousIndex],
      totalSessions: sessionsSeries.reduce((sum, value) => sum + value, 0),
      totalTickets: ticketsSeries.reduce((sum, value) => sum + value, 0),
      focusPointSessions: sessionsPoints[focusIndex],
      focusPointTickets: ticketsPoints[focusIndex],
      tooltipLeft,
      gridLines,
    }
  }, [sessionHistory, ticketHistory])

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const isTicketsView = location.pathname.startsWith('/dashboard/customer/tickets')

  const filteredSessions = useMemo(() => {
    if (!normalizedQuery) {
      return recentSessions
    }

    return recentSessions.filter((session) => {
      const candidates = [session.session_id, session.status, session.last_message]
      return candidates.some((entry) => String(entry || '').toLowerCase().includes(normalizedQuery))
    })
  }, [recentSessions, normalizedQuery])

  const filteredTickets = useMemo(() => {
    if (!normalizedQuery) {
      return recentTickets
    }

    return recentTickets.filter((ticket) => {
      const candidates = [ticket.subject, ticket.ticket_id, ticket.status, ticket.priority]
      return candidates.some((entry) => String(entry || '').toLowerCase().includes(normalizedQuery))
    })
  }, [recentTickets, normalizedQuery])

  const filteredTicketHistory = useMemo(() => {
    if (!normalizedQuery) {
      return ticketHistory
    }

    return ticketHistory.filter((ticket) => {
      const candidates = [ticket.subject, ticket.ticket_id, ticket.status, ticket.priority]
      return candidates.some((entry) => String(entry || '').toLowerCase().includes(normalizedQuery))
    })
  }, [ticketHistory, normalizedQuery])

  const filteredAccounts = useMemo(() => {
    if (!normalizedQuery) {
      return orderedAccounts
    }

    return orderedAccounts.filter((account) => {
      const candidates = [account.nickname, account.platformName, account.accountIdentifier]
      return candidates.some((entry) => String(entry || '').toLowerCase().includes(normalizedQuery))
    })
  }, [orderedAccounts, normalizedQuery])

  const visibleSessions = filteredSessions.slice(0, 3)
  const visibleTickets = filteredTickets.slice(0, 3)

  const defaultEcoCashAccount = useMemo(() => {
    const isEcoCashAccount = (account: LinkedPlatformAccount): boolean => {
      const platformName = String(account.platformName || '').toLowerCase()
      const platformId = String(account.platformId || '').toLowerCase()
      return platformName.includes('ecocash') || platformId.includes('ecocash')
    }

    return (
      filteredAccounts.find(isEcoCashAccount)
      || orderedAccounts.find(isEcoCashAccount)
      || primaryAccount
      || orderedAccounts[0]
      || null
    )
  }, [filteredAccounts, orderedAccounts, primaryAccount])

  const walletCards = useMemo(() => {
    return walletCurrencyTargets.map((currency) => {
      const matchedAccount = filteredAccounts.find((candidate) => {
        const accountCurrency = String(candidate.cachedBalance?.currency || '').toUpperCase()
        return accountCurrency === currency
      })

      return { currency, account: matchedAccount || defaultEcoCashAccount || undefined }
    })
  }, [defaultEcoCashAccount, filteredAccounts])

  const hasVisibleWallets = filteredAccounts.length > 0
  const selectedProviderName = primaryAccount?.platformName || defaultEcoCashAccount?.platformName || 'EcoCash'

  const handleCheckWalletBalance = async (account?: LinkedPlatformAccount) => {
    const targetAccount = account || defaultEcoCashAccount || primaryAccount || orderedAccounts[0]
    if (!targetAccount) {
      return
    }

    setWalletBalanceLoading((previous) => ({ ...previous, [targetAccount.id]: true }))
    setWalletBalanceErrors((previous) => ({ ...previous, [targetAccount.id]: null }))

    try {
      const balance = await getAccountBalance(targetAccount.id)
      setWalletBalances((previous) => ({ ...previous, [targetAccount.id]: balance }))
      loadLinkedAccounts()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check balance.'
      setWalletBalanceErrors((previous) => ({ ...previous, [targetAccount.id]: message }))
    } finally {
      setWalletBalanceLoading((previous) => ({ ...previous, [targetAccount.id]: false }))
    }
  }

  const handleWalletCardClick = (account?: LinkedPlatformAccount) => {
    const targetAccount = account || defaultEcoCashAccount || primaryAccount || orderedAccounts[0]
    if (!targetAccount) {
      return
    }

    setPrimaryAccount(targetAccount.id)
    loadLinkedAccounts()
    void handleCheckWalletBalance(targetAccount)
  }

  const latestActiveSession =
    recentSessions.find((session) => normalizeStatus(session.status) === 'active') || recentSessions[0]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleOpenProfileMenu = (event: MouseEvent<HTMLElement>) => {
    setProfileAnchorEl(event.currentTarget)
  }

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

  const handleCustomerNotificationOpen = (item: AppNotification) => {
    setNotificationAnchorEl(null)

    const sessionId = String(item.meta?.session_id || '').trim()
    if (!sessionId || !user?.id) {
      if (item.route) {
        navigate(item.route)
      }
      return
    }

    const session = notificationSessionsSnapshot.find((entry) => entry.session_id === sessionId)
    if (session) {
      markCustomerSessionRead(user.id, sessionId, session.message_count || 0)
    }

    navigate(`/chat?session=${sessionId}`)
  }

  const handleCustomerNotificationsReadAll = () => {
    if (!user?.id) {
      return
    }

    markAllCustomerSessionsRead(user.id, notificationSessionsSnapshot)
    setCustomerNotifications([])
    setCustomerUnreadCount(0)
  }

  const handleOpenSession = (session: ChatSession) => {
    navigate(`/chat?session=${session.session_id || session.id}`)
  }

  const handleOpenTicket = (ticket: Ticket) => {
    if (ticket.ticket_id) {
      navigate(`/dashboard/customer/tickets/${encodeURIComponent(ticket.ticket_id)}`)
      return
    }
    navigate('/dashboard/customer/tickets')
  }

  const handleOpenDashboardHome = () => {
    navigate('/dashboard/customer')
  }

  const handleViewAllTickets = () => {
    navigate('/dashboard/customer/tickets')
  }

  const handleBackToTicketsList = () => {
    navigate('/dashboard/customer/tickets')
  }

  const handleOpenProviderMenu = (event: MouseEvent<HTMLElement>) => {
    if (orderedAccounts.length === 0) {
      setLinkAccountOpen(true)
      return
    }

    setProviderAnchorEl(event.currentTarget)
  }

  const handleCloseProviderMenu = () => {
    setProviderAnchorEl(null)
  }

  const handleSelectPrimaryProvider = (accountId: string) => {
    const selectedAccount = orderedAccounts.find((account) => account.id === accountId)
    if (!selectedAccount) {
      handleCloseProviderMenu()
      return
    }

    setPrimaryAccount(selectedAccount.id)
    loadLinkedAccounts()
    handleCloseProviderMenu()
  }

  const scrollToWallets = () => {
    if (isTicketsView) {
      navigate('/dashboard/customer')
      return
    }

    const section = document.getElementById('customer-wallets-card')
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const selectedTicketStatusTone: Tone = selectedTicket ? statusTone(selectedTicket.status) : 'open'
  const selectedTicketPriorityTone: Tone = selectedTicket ? priorityTone(selectedTicket.priority) : 'open'

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress size={56} />
      </Box>
    )
  }

  return (
    <div className="customer-dashboard">
      {error && (
        <Box className="dashboard-alert">
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Box>
      )}

      {profileMessage && (
        <Box className="dashboard-alert">
          <Alert severity={profileMessageType} onClose={() => setProfileMessage(null)}>
            {profileMessage}
          </Alert>
        </Box>
      )}

      <div className="shell">
        <aside className="sidebar">
          <div className="sb-logo">
            <div className="sb-dot">
              <ChatIcon sx={{ fontSize: 13 }} />
            </div>
            BotAssist
          </div>

          <div className="sb-sec">Main</div>
          <button type="button" className={`sb-item${isTicketsView ? '' : ' on'}`} onClick={handleOpenDashboardHome}>
            <DashboardIcon sx={{ fontSize: 13 }} /> Dashboard
          </button>
          <button type="button" className="sb-item" onClick={() => (latestActiveSession ? handleOpenSession(latestActiveSession) : navigate('/chat'))}>
            <SessionsIcon sx={{ fontSize: 13 }} /> Sessions
          </button>
          <button type="button" className={`sb-item${isTicketsView ? ' on' : ''}`} onClick={handleViewAllTickets}>
            <TicketIcon sx={{ fontSize: 13 }} /> Tickets
          </button>
          <button type="button" className="sb-item" onClick={scrollToWallets}>
            <WalletIcon sx={{ fontSize: 13 }} /> Wallets
          </button>

          <div className="sb-sec">Support</div>
          <button type="button" className="sb-item" onClick={() => navigate('/chat')}>
            <WebIcon sx={{ fontSize: 13 }} /> Web chat
          </button>
          <button type="button" className="sb-item" onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}>
            <WhatsAppIcon sx={{ fontSize: 13 }} /> WhatsApp
          </button>
          <button type="button" className="sb-item" onClick={() => { window.location.href = 'mailto:support@botassist.ai' }}>
            <EmailIcon sx={{ fontSize: 13 }} /> Email
          </button>

          <div className="sb-sec">Account</div>
          <button type="button" className="sb-item" onClick={handleOpenProfileDialog}>
            <ProfileIcon sx={{ fontSize: 13 }} /> Profile
          </button>
          <button type="button" className="sb-item" onClick={handleOpenProfileDialog}>
            <SettingsIcon sx={{ fontSize: 13 }} /> Settings
          </button>

          <div className="sb-foot">
            <button type="button" className="u-row-btn" onClick={handleOpenProfileMenu}>
              <div className="u-row">
                <div className="u-av">{displayInitials}</div>
                <div>
                  <div className="u-name">{displayName}</div>
                  <div className="u-role">{primaryAccount?.platformName || 'Primary account pending'}</div>
                </div>
              </div>
            </button>
          </div>
        </aside>

        <div className="main">
          <div className="topbar">
            <div className="srch">
              <SearchIcon sx={{ fontSize: 14 }} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={isTicketsView ? 'Search tickets by subject, status, priority...' : 'Search sessions, wallets, tickets...'}
                aria-label="Search dashboard"
              />
            </div>

            <div className="tb-r">
              <button type="button" className="btn" onClick={() => void loadDashboardData()}>
                <RefreshIcon sx={{ fontSize: 12 }} /> Refresh
              </button>
              <button type="button" className="btn btn-pu" onClick={() => navigate('/chat')}>
                <AddIcon sx={{ fontSize: 12 }} /> New chat
              </button>
              <button
                type="button"
                className="btn btn-wa"
                onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
              >
                <WhatsAppIcon sx={{ fontSize: 12 }} /> WhatsApp
              </button>
              {['agent', 'supervisor', 'admin'].includes(displayRole) && (
                <button type="button" className="btn" onClick={() => navigate('/agent/console')}>
                  <ConsoleIcon sx={{ fontSize: 12 }} /> Console
                </button>
              )}
              <button type="button" className="btn nb" onClick={(event) => setNotificationAnchorEl(event.currentTarget)}>
                <NotificationIcon sx={{ fontSize: 13 }} />
                {customerUnreadCount > 0 && <span className="nb-d">{Math.min(customerUnreadCount, 99)}</span>}
              </button>
            </div>
          </div>

          <div className="content">
            {isTicketDetailsView ? (
              <div className="card">
                <div className="section-header-row">
                  <div className="ctitle section-inline-title">
                    <TicketIcon sx={{ fontSize: 12 }} /> Ticket details
                  </div>
                  <button type="button" className="view-all" onClick={handleBackToTicketsList}>
                    Back to tickets
                  </button>
                </div>

                {ticketDetailsLoading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={34} />
                  </Box>
                )}

                {!ticketDetailsLoading && ticketDetailsError && (
                  <Alert severity="error" sx={{ mb: 1.5 }}>
                    {ticketDetailsError}
                  </Alert>
                )}

                {!ticketDetailsLoading && !ticketDetailsError && selectedTicket && (
                  <>
                    <div className="tk-name">
                      <span className="tk-subject">{selectedTicket.subject || 'Untitled ticket'}</span>
                      <span className={`pill ${toneClassName(selectedTicketStatusTone)}`}>
                        {toLabel(selectedTicket.status)}
                      </span>
                    </div>
                    <div className="tk-meta">Reference: {selectedTicket.ticket_id || 'N/A'}</div>
                    <div className="tk-time">Created: {formatDateTime(selectedTicket.created_at)}</div>

                    <div className="bdiv" />

                    <div className="tk-meta">Priority</div>
                    <div className="at">
                      <span className={`pill ${toneClassName(selectedTicketPriorityTone)}`}>{toLabel(selectedTicket.priority)}</span>
                      {selectedTicket.is_overdue && <span className="pill p-esc">Overdue</span>}
                    </div>

                    <div className="tk-meta">Category</div>
                    <div className="as">{toLabel(selectedTicket.category)}</div>

                    <div className="tk-meta">Description</div>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'var(--color-text-primary)' }}>
                      {selectedTicket.description || 'No description available.'}
                    </Typography>

                    {(selectedTicket.resolution || selectedTicket.resolution_notes) && (
                      <>
                        <Divider sx={{ my: 1.5 }} />
                        <div className="tk-meta">Resolution</div>
                        {selectedTicket.resolution && (
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'var(--color-text-primary)' }}>
                            {selectedTicket.resolution}
                          </Typography>
                        )}
                        {selectedTicket.resolution_notes && (
                          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mt: 0.75 }}>
                            Notes: {selectedTicket.resolution_notes}
                          </Typography>
                        )}
                      </>
                    )}

                    <Divider sx={{ my: 1.5 }} />
                    {selectedTicket.updated_at && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Updated: {formatDateTime(selectedTicket.updated_at)}
                      </Typography>
                    )}
                    {selectedTicket.resolved_at && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Resolved: {formatDateTime(selectedTicket.resolved_at)}
                      </Typography>
                    )}
                  </>
                )}
              </div>
            ) : isTicketsView ? (
              <div className="card">
                <div className="section-header-row">
                  <div className="ctitle section-inline-title">
                    <TicketIcon sx={{ fontSize: 12 }} /> All tickets
                  </div>
                  <div className="tk-time">Showing {filteredTicketHistory.length} of {ticketHistory.length}</div>
                </div>

                {filteredTicketHistory.length === 0 && (
                  <div className="empty-note">
                    {ticketHistory.length === 0
                      ? 'No tickets available yet.'
                      : 'No tickets match your current search.'}
                  </div>
                )}

                {filteredTicketHistory.map((ticket, index) => {
                  const tone = statusTone(ticket.status)

                  return (
                    <button
                      key={`${ticket.id}-${index}`}
                      type="button"
                      className="tk-row tk-row-btn"
                      onClick={() => handleOpenTicket(ticket)}
                    >
                      <div className={`tk-ic ${
                        tone === 'open' ? 'tk-open' : tone === 'prog' ? 'tk-prog' : tone === 'esc' ? 'tk-esc' : 'tk-res'
                      }`}>
                        {tone === 'open' && <OpenIcon sx={{ fontSize: 12 }} />}
                        {tone === 'prog' && <ProgressIcon sx={{ fontSize: 12 }} />}
                        {tone === 'esc' && <EscalatedIcon sx={{ fontSize: 12 }} />}
                        {tone === 'res' && <ResolvedIcon sx={{ fontSize: 12 }} />}
                      </div>
                      <div className="tk-body">
                        <div className="tk-name">
                          <span className="tk-subject">{ticket.subject || 'Untitled ticket'}</span>
                          <span className={`pill ${toneClassName(tone)}`}>
                            {toLabel(ticket.status)}
                          </span>
                        </div>
                        <div className="tk-meta">Priority: {toLabel(ticket.priority)}</div>
                        <div className="tk-time">
                          {formatRelativeTime(ticket.created_at)}
                          {ticket.ticket_id ? ` - #${ticket.ticket_id}` : ''}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="two-col">
              <div className="left-col">
                <div className="welcome-assistant-card">
                  <div className="welcome-copy">
                    <h2 className="welcome-title">Welcome Back, {displayName}!</h2>
                    <p className="welcome-subtitle">
                      Your 24/7 chat assistant is here to help you with all your queries.
                    </p>
                    <div className="welcome-actions">
                      <button
                        type="button"
                        className="welcome-action-btn welcome-action-btn-chat"
                        onClick={() => navigate('/chat')}
                      >
                        <ChatIcon sx={{ fontSize: 14 }} />
                        Chat Now
                      </button>
                      <button
                        type="button"
                        className="welcome-action-btn welcome-action-btn-whatsapp"
                        onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
                      >
                        <WhatsAppIcon sx={{ fontSize: 14 }} />
                        WhatsApp
                      </button>
                    </div>
                  </div>
                  <div className="welcome-avatar-wrap">
                    <img
                      src="/chatbot-head.jpg"
                      alt="Real chatbot head"
                      className="welcome-avatar-image"
                    />
                  </div>
                </div>

                <div className="stats-row">
                  <div className="sc sc-total">
                    <div className="sc-ic">
                      <SessionsIcon sx={{ fontSize: 14 }} />
                    </div>
                    <div className="sc-body">
                      <div className="sv sv-pu">{stats.totalSessions}</div>
                      <div className="sl">Total sessions</div>
                    </div>
                  </div>
                  <div className="sc sc-active">
                    <div className="sc-ic">
                      <ChatIcon sx={{ fontSize: 14 }} />
                    </div>
                    <div className="sc-body">
                      <div className="sv sv-g">{stats.activeSessions}</div>
                      <div className="sl">Active sessions</div>
                    </div>
                  </div>
                  <div className="sc sc-open">
                    <div className="sc-ic">
                      <TicketIcon sx={{ fontSize: 14 }} />
                    </div>
                    <div className="sc-body">
                      <div className="sv sv-a">{stats.openTickets}</div>
                      <div className="sl">Open tickets</div>
                    </div>
                  </div>
                  <div className="sc sc-rate">
                    <div className="sc-ic">
                      <TrendingIcon sx={{ fontSize: 14 }} />
                    </div>
                    <div className="sc-body">
                      <div className="sv sv-b">{stats.resolutionRate.toFixed(1)}%</div>
                      <div className="sl">Resolution rate</div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="section-header-row">
                    <div className="ctitle section-inline-title">
                      <TicketIcon sx={{ fontSize: 12 }} /> Recent tickets
                    </div>
                    <button type="button" className="view-all" onClick={handleViewAllTickets}>
                      View all
                    </button>
                  </div>

                  {visibleTickets.length === 0 && (
                    <div className="empty-note">No tickets found for the current filter.</div>
                  )}

                  {visibleTickets.map((ticket, index) => {
                    const tone = statusTone(ticket.status)

                    return (
                      <button
                        key={`${ticket.id}-${index}`}
                        type="button"
                        className="tk-row tk-row-btn"
                        onClick={() => handleOpenTicket(ticket)}
                      >
                        <div className={`tk-ic ${
                          tone === 'open' ? 'tk-open' : tone === 'prog' ? 'tk-prog' : tone === 'esc' ? 'tk-esc' : 'tk-res'
                        }`}>
                          {tone === 'open' && <OpenIcon sx={{ fontSize: 12 }} />}
                          {tone === 'prog' && <ProgressIcon sx={{ fontSize: 12 }} />}
                          {tone === 'esc' && <EscalatedIcon sx={{ fontSize: 12 }} />}
                          {tone === 'res' && <ResolvedIcon sx={{ fontSize: 12 }} />}
                        </div>
                        <div className="tk-body">
                          <div className="tk-name">
                            <span className="tk-subject">{ticket.subject || 'Untitled ticket'}</span>
                            <span className={`pill ${tone === 'open' ? 'p-open' : tone === 'prog' ? 'p-prog' : tone === 'esc' ? 'p-esc' : 'p-res'}`}>
                              {toLabel(ticket.status)}
                            </span>
                          </div>
                          <div className="tk-meta">
                            Priority: {toLabel(ticket.priority)}
                          </div>
                          <div className="tk-time">
                            {formatRelativeTime(ticket.created_at)}
                            {ticket.ticket_id ? ` - #${ticket.ticket_id}` : ''}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="card">
                  <div className="ctitle">
                    <SessionsIcon sx={{ fontSize: 12 }} /> Recent activity
                  </div>

                  {visibleSessions.length === 0 && (
                    <div className="empty-note">No recent sessions found for the current filter.</div>
                  )}

                  {visibleSessions.map((session, index) => {
                    const tone = statusTone(session.status)

                    return (
                      <button
                        key={`${session.id}-${index}`}
                        type="button"
                        className="act-row act-row-btn"
                        onClick={() => handleOpenSession(session)}
                      >
                        <div className={`av ${tone === 'esc' ? 'av-gr' : 'av-g'}`}>CS</div>
                        <div className="ab">
                          <div className="at">
                            Chat session
                            <span className={`pill ${tone === 'open' ? 'p-open' : tone === 'prog' ? 'p-prog' : tone === 'esc' ? 'p-esc' : 'p-res'}`}>
                              {toLabel(session.status)}
                            </span>
                          </div>
                          <div className="as">{session.last_message || 'No preview available.'}</div>
                          <div className="am">{formatRelativeTime(session.updated_at || session.created_at)} - {session.message_count} msgs</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="right-col">
                <div className="card card-activity-trend">
                  <div className="ctitle">
                    <TrendingIcon sx={{ fontSize: 12 }} /> Activity trend - {monthLabel}
                  </div>

                  <div className="balance-graph-card">
                    <div className="activity-summary-row">
                      <div className="activity-summary-card activity-summary-ticket">
                        <span>Raised tickets</span>
                        <strong>{formatCompactNumber(activityGraph.totalTickets)}</strong>
                        <em>
                          {activityGraph.focusMonthLabel}: {activityGraph.focusTickets}
                          {' '}({formatSignedCount(activityGraph.ticketsDelta)} vs {activityGraph.previousMonthLabel})
                        </em>
                      </div>
                      <div className="activity-summary-card activity-summary-session">
                        <span>Conversations started</span>
                        <strong>{formatCompactNumber(activityGraph.totalSessions)}</strong>
                        <em>
                          {activityGraph.focusMonthLabel}: {activityGraph.focusSessions}
                          {' '}({formatSignedCount(activityGraph.sessionsDelta)} vs {activityGraph.previousMonthLabel})
                        </em>
                      </div>
                    </div>

                    <div className="balance-graph-tooltip" style={{ left: `${activityGraph.tooltipLeft}px` }}>
                      <span>{activityGraph.focusMonthLabel} snapshot</span>
                      <strong>Tickets: {activityGraph.focusTickets}</strong>
                      <strong className="balance-tooltip-secondary">Conversations: {activityGraph.focusSessions}</strong>
                    </div>

                    <svg
                      className="balance-chart-svg"
                      viewBox={`0 0 ${activityGraph.viewWidth} ${activityGraph.viewHeight}`}
                      preserveAspectRatio="none"
                    >
                      {activityGraph.gridLines.map((lineY, index) => (
                        <line
                          key={`graph-grid-${index}`}
                          x1="0"
                          y1={lineY}
                          x2={activityGraph.viewWidth}
                          y2={lineY}
                          className="balance-grid-line"
                        />
                      ))}

                      <path d={activityGraph.ticketsPath} className="balance-line balance-line-ticket" />
                      <path d={activityGraph.sessionsPath} className="balance-line balance-line-session" />

                      <circle
                        cx={activityGraph.focusPointTickets.x}
                        cy={activityGraph.focusPointTickets.y}
                        r="3"
                        className="balance-point balance-point-ticket"
                      />
                      <circle
                        cx={activityGraph.focusPointSessions.x}
                        cy={activityGraph.focusPointSessions.y}
                        r="4"
                        className="balance-point balance-point-session"
                      />
                    </svg>

                    <div className="balance-months-row">
                      {activityGraph.months.map((month, index) => (
                        <span
                          key={`graph-month-${month}`}
                          className={`balance-month ${index === activityGraph.focusIndex ? 'balance-month-focus' : ''}`}
                        >
                          {month}
                        </span>
                      ))}
                    </div>

                    <div className="activity-legend-row">
                      <span className="activity-legend-item">
                        <i className="activity-legend-dot activity-legend-dot-ticket" />
                        Raised tickets
                      </span>
                      <span className="activity-legend-item">
                        <i className="activity-legend-dot activity-legend-dot-session" />
                        Conversations started
                      </span>
                    </div>
                  </div>

                </div>

                <div className="card" id="customer-wallets-card">
                  <div className="ctitle">
                    <WalletIcon sx={{ fontSize: 12 }} /> My wallets
                  </div>

                  {!hasVisibleWallets && (
                    <div className="empty-wallet">
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        No linked wallets found.
                      </Typography>
                      <button type="button" className="chg-btn" onClick={() => setLinkAccountOpen(true)}>
                        <AddIcon sx={{ fontSize: 10 }} /> Link your first provider
                      </button>
                    </div>
                  )}

                  {hasVisibleWallets && (
                    <div className="cg cg-wallet-two">
                      {walletCards.map(({ currency, account }) => {
                        const checkedBalance = account ? walletBalances[account.id] || null : null
                        const hasBalance = Boolean(checkedBalance)
                        const balanceText = hasBalance && checkedBalance
                          ? formatCurrency(checkedBalance.balance, checkedBalance.currency)
                          : ''
                        const isChecking = account ? Boolean(walletBalanceLoading[account.id]) : false
                        const balanceError = account ? walletBalanceErrors[account.id] : null
                        const balanceHint = account
                          ? (balanceError
                            ? 'Unable to fetch balance. Tap to retry.'
                            : (hasBalance && checkedBalance?.lastUpdated
                              ? `Updated ${formatRelativeTime(checkedBalance.lastUpdated)}`
                              : 'Tap card to fetch live balance.'))
                          : 'Balance unavailable right now.'
                        const toneClass = currency === 'ZIG' ? 'cc-style-zig' : 'cc-style-usd'

                        return (
                          <button
                            key={`${currency}-${account?.id || 'placeholder'}`}
                            type="button"
                            className="wallet-card-button"
                            onClick={() => handleWalletCardClick(account)}
                            title={account
                              ? (account.isPrimary ? `Primary ${currency} wallet` : `Set ${currency} wallet as primary provider`)
                              : `Check ${currency} balance`}
                          >
                            <div className={`cc ${toneClass} ${account?.isPrimary ? 'cc-primary' : ''}`}>
                              <div className="cc-d1" />
                              <div className="cc-d2" />
                              {account?.isPrimary && (
                                <span className="cc-primary-badge">Primary</span>
                              )}
                              <div>
                                <div className="cc-lbl">Main Balance</div>
                                {hasBalance ? (
                                  <div className="cc-bal">{balanceText}</div>
                                ) : (
                                  <div className="cc-bal-cta" aria-hidden="true">
                                    <RefreshIcon sx={{ fontSize: 12 }} /> Check balance
                                  </div>
                                )}
                                <div className={`cc-check ${balanceError ? 'cc-check-error' : ''}`}>
                                  {isChecking ? 'Checking balance...' : balanceHint}
                                </div>
                              </div>
                              <div className="cc-bot">
                                <div>
                                  <div className="cc-ml">Selected provider</div>
                                  <div className="cc-mv">{truncate(selectedProviderName, 16)}</div>
                                </div>
                                <span className="wallet-provider">{currency}</span>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  <button
                    type="button"
                    className="chg-btn provider-select-btn"
                    onClick={handleOpenProviderMenu}
                    aria-haspopup="menu"
                    aria-expanded={Boolean(providerAnchorEl)}
                  >
                    <span className="provider-select-label">
                      <ExchangeIcon sx={{ fontSize: 10 }} /> Choose your provider
                    </span>
                    <span className="provider-select-value">{truncate(selectedProviderName, 16)}</span>
                    <ExpandMoreIcon sx={{ fontSize: 15 }} />
                  </button>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      <Menu
        anchorEl={notificationAnchorEl}
        open={Boolean(notificationAnchorEl)}
        onClose={() => setNotificationAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 340, maxWidth: '92vw' } }}
      >
        <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>Notifications</Typography>
          {customerUnreadCount > 0 && (
            <Button size="small" onClick={handleCustomerNotificationsReadAll}>
              Mark all as read
            </Button>
          )}
        </Box>
        <Divider />
        {customerNotifications.length === 0 ? (
          <Box sx={{ px: 2, py: 1.75 }}>
            <Typography variant="body2" color="text.secondary">No new notifications.</Typography>
          </Box>
        ) : (
          customerNotifications.slice(0, 12).map((item) => (
            <MenuItem
              key={item.id}
              onClick={() => handleCustomerNotificationOpen(item)}
              sx={{ alignItems: 'flex-start', py: 1 }}
            >
              <Box>
                <Typography variant="body2" fontWeight={600}>{item.title}</Typography>
                <Typography variant="caption" color="text.secondary">{item.description}</Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>

      <Menu anchorEl={profileAnchorEl} open={Boolean(profileAnchorEl)} onClose={() => setProfileAnchorEl(null)}>
        <Box sx={{ px: 2, py: 1.25, minWidth: 240 }}>
          <Typography variant="subtitle2" fontWeight={700}>{profileName || 'Customer User'}</Typography>
          <Typography variant="caption" color="text.secondary" display="block">{profileEmail || 'No email'}</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ textTransform: 'capitalize' }}>
            Role: {profileRole}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleOpenProfileDialog}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Update Profile
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={providerAnchorEl}
        open={Boolean(providerAnchorEl)}
        onClose={handleCloseProviderMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        PaperProps={{ sx: { width: 280, maxWidth: '92vw', maxHeight: 300 } }}
      >
        <Box sx={{ px: 2, py: 1.1 }}>
          <Typography variant="subtitle2" fontWeight={700}>Choose your provider</Typography>
          <Typography variant="caption" color="text.secondary">Select the wallet provider to set as primary.</Typography>
        </Box>
        <Divider />
        {orderedAccounts.map((account) => {
          const currency = String(account.cachedBalance?.currency || '').toUpperCase()
          const providerLabel = String(account.platformName || 'Linked provider')
          const accountLabel = account.nickname || account.accountIdentifier
          const title = currency ? `${providerLabel} - ${currency}` : providerLabel

          return (
            <MenuItem
              key={account.id}
              selected={account.isPrimary}
              onClick={() => handleSelectPrimaryProvider(account.id)}
              sx={{ alignItems: 'flex-start', py: 1 }}
            >
              <Box sx={{ minWidth: 0, width: '100%' }}>
                <Typography variant="body2" fontWeight={account.isPrimary ? 700 : 600} noWrap>
                  {title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {accountLabel}
                  </Typography>
                  {account.isPrimary && (
                    <Typography variant="caption" color="success.main" fontWeight={700}>
                      PRIMARY
                    </Typography>
                  )}
                </Box>
              </Box>
            </MenuItem>
          )
        })}
      </Menu>

      <Dialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>My Profile</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            label="Full Name"
            size="small"
            fullWidth
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
            sx={{ mb: 1.25 }}
          />
          <TextField
            label="Email"
            size="small"
            fullWidth
            value={profileEmail}
            onChange={(event) => setProfileEmail(event.target.value)}
            sx={{ mb: 1.25 }}
          />
          <TextField
            label="Role"
            size="small"
            fullWidth
            value={profileRole}
            disabled
            sx={{ mb: 1.25 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
            Change Password
          </Typography>
          <TextField
            label="Current Password"
            type="password"
            size="small"
            fullWidth
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            sx={{ mb: 1 }}
          />
          <TextField
            label="New Password"
            type="password"
            size="small"
            fullWidth
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            sx={{ mb: 1 }}
          />
          <TextField
            label="Confirm New Password"
            type="password"
            size="small"
            fullWidth
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveProfile}>Save</Button>
        </DialogActions>
      </Dialog>

      <LinkAccountModal
        open={linkAccountOpen}
        onClose={() => setLinkAccountOpen(false)}
        onSuccess={() => {
          loadLinkedAccounts()
          void loadDashboardData()
        }}
      />
    </div>
  )
}