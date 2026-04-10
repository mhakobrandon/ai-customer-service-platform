import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
  Avatar,
  ListItemAvatar,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import {
  AssignmentTurnedIn as ResolvedIcon,
  ConfirmationNumber as TicketIcon,
  SupportAgent as SupportAgentIcon,
  Forum as InboxIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
  AccountCircle as ProfileIcon,
  Edit as EditIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { chatAPI, ticketAPI } from '../../services/apiService'
import { formatDateTime } from '../../utils/dateUtils'
import { useAuth } from '../../services/authService'
import StatCard from '../common/StatCard'
import PageHeader from '../common/PageHeader'
import NotificationBell from '../common/NotificationBell'
import {
  AppNotification,
  computeAgentAssignmentNotifications,
  markAgentTicketNotificationsRead,
} from '../../services/notificationService'

interface InboxItem {
  session_id: string
  customer: string
  status: string
  escalation_reason?: string
}

interface Ticket {
  ticket_id?: string
  subject: string
  status: string
  created_at: string
}

const pendingStatuses = new Set(['new', 'assigned', 'in_progress', 'pending_customer', 'escalated', 'reopened'])
const resolvedStatuses = new Set(['resolved', 'closed'])

export default function AgentDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [agentNotifications, setAgentNotifications] = useState<AppNotification[]>([])
  const [agentUnreadCount, setAgentUnreadCount] = useState(0)
  const [profileAnchorEl, setProfileAnchorEl] = useState<HTMLElement | null>(null)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileRole, setProfileRole] = useState('agent')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileMessageType, setProfileMessageType] = useState<'success' | 'error'>('success')

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
    loadData()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      loadData()
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const { notifications, totalUnread } = computeAgentAssignmentNotifications(tickets, user?.id)
    setAgentNotifications(notifications)
    setAgentUnreadCount(totalUnread)
  }, [tickets, user?.id])

  useEffect(() => {
    setProfileName(user?.name || 'Agent User')
    setProfileEmail(user?.email || '')
    setProfileRole(user?.role || 'agent')
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

  const stats = useMemo(() => {
    const pendingTickets = tickets.filter((ticket) => pendingStatuses.has(ticket.status?.toLowerCase())).length
    const resolvedTickets = tickets.filter((ticket) => resolvedStatuses.has(ticket.status?.toLowerCase())).length
    return {
      inboxCount: inbox.length,
      pendingTickets,
      resolvedTickets,
    }
  }, [inbox, tickets])

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

      {/* ── Header ── */}
      <PageHeader
        mb={0}
        transparent
        title="Agent Dashboard"
        subtitle={`Welcome, ${user?.name || user?.email}. Track and resolve escalations quickly.`}
        actions={
          <>
            <NotificationBell
              items={agentNotifications}
              unreadCount={agentUnreadCount}
              onOpenItem={(item) => {
                const ticketId = String(item.meta?.ticket_id || '').trim()
                if (ticketId) navigate(`/tickets/${ticketId}`)
              }}
              onMarkAllRead={() => {
                markAgentTicketNotificationsRead(user?.id, tickets)
                setAgentNotifications([])
                setAgentUnreadCount(0)
              }}
              tooltip="Assigned ticket alerts"
            />
            <Badge badgeContent={inbox.length} color="error" max={99}>
              <Button size="small" variant="contained" onClick={() => navigate('/agent/console')} startIcon={<SupportAgentIcon />}>Console</Button>
            </Badge>
            <Button size="small" variant="outlined" onClick={() => navigate('/chat')}>Open Chat</Button>
            <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={loadData}>Refresh</Button>
            <Button size="small" variant="outlined" startIcon={<ProfileIcon />} onClick={(e) => setProfileAnchorEl(e.currentTarget)}>Profile</Button>
            <Button size="small" variant="outlined" color="error" startIcon={<LogoutIcon />} onClick={() => { logout(); navigate('/login') }}>Logout</Button>
          </>
        }
      />

      <Menu anchorEl={profileAnchorEl} open={Boolean(profileAnchorEl)} onClose={() => setProfileAnchorEl(null)}>
        <Box sx={{ px: 2, py: 1.25, minWidth: 240 }}>
          <Typography variant="subtitle2" fontWeight={700}>{profileName || 'Agent User'}</Typography>
          <Typography variant="caption" color="text.secondary" display="block">{profileEmail || 'No email'}</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ textTransform: 'capitalize' }}>Role: {profileRole}</Typography>
        </Box>
        <Divider />
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

      {/* ── KPI Stats ── */}
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          <StatCard label="Escalation Inbox" value={stats.inboxCount} Icon={InboxIcon} color="warning" />
        </Box>
        <Box sx={{ flex: 1 }}>
          <StatCard label="Pending Tickets" value={stats.pendingTickets} Icon={TicketIcon} color="info" />
        </Box>
        <Box sx={{ flex: 1 }}>
          <StatCard label="Resolved / Closed" value={stats.resolvedTickets} Icon={ResolvedIcon} color="success" />
        </Box>
      </Box>

      {/* ── Main Panels ── */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 1.5 }}>

        {/* Escalation Inbox */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              px: 2, py: 1.5, flexShrink: 0,
              borderBottom: '1px solid', borderColor: 'divider',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: (t) => `linear-gradient(135deg, ${alpha(t.palette.warning.main, 0.08)}, transparent)`,
            }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <Avatar sx={{ width: 30, height: 30, bgcolor: 'warning.main' }}>
                <InboxIcon sx={{ fontSize: 16 }} />
              </Avatar>
              <Typography variant="subtitle1" fontWeight={700}>Escalation Inbox</Typography>
            </Box>
            <Chip label={`${inbox.length} open`} size="small" color={inbox.length > 0 ? 'warning' : 'default'} />
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto', py: 0.5 }}>
            <List disablePadding>
              {inbox.map((item) => (
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
              {inbox.length === 0 && (
                <Box textAlign="center" py={6}>
                  <InboxIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary" variant="body2">Inbox is clear — no escalations.</Typography>
                </Box>
              )}
            </List>
          </Box>

          <Box sx={{ p: 1.5, flexShrink: 0, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button fullWidth size="small" variant="contained" color="warning" startIcon={<SupportAgentIcon />}
              onClick={() => navigate('/agent/console')}>
              Open Agent Console
            </Button>
          </Box>
        </Paper>

        {/* My Tickets */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              px: 2, py: 1.5, flexShrink: 0,
              borderBottom: '1px solid', borderColor: 'divider',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.08)}, transparent)`,
            }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main' }}>
                <TicketIcon sx={{ fontSize: 16 }} />
              </Avatar>
              <Typography variant="subtitle1" fontWeight={700}>My Tickets</Typography>
            </Box>
            <Chip label={`${tickets.length} total`} size="small" color="primary" variant="outlined" />
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto', py: 0.5 }}>
            <List disablePadding>
              {tickets.map((ticket) => {
                const ticketRef = (ticket.ticket_id || '').trim()
                return (
                  <ListItemButton
                    key={ticketRef || ticket.subject}
                    onClick={() => {
                      if (ticketRef) {
                        navigate(`/tickets/${ticketRef}`)
                      } else {
                        setError('This ticket cannot be opened because its reference is missing. Please refresh and try again.')
                      }
                    }}
                    sx={{
                      px: 2,
                      py: 1,
                      pr: 11,
                      cursor: 'pointer',
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
                        <>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {formatDateTime(ticket.created_at)}
                          </Typography>
                          {ticketRef && (
                            <Typography variant="caption" color="primary.main" display="block" sx={{ fontFamily: 'monospace' }}>
                              {ticketRef}
                            </Typography>
                          )}
                        </>
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
              {tickets.length === 0 && (
                <Box textAlign="center" py={6}>
                  <TicketIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary" variant="body2">No assigned tickets yet.</Typography>
                </Box>
              )}
            </List>
          </Box>

          <Divider />
          <Box sx={{ p: 1.5, flexShrink: 0 }}>
            <Button fullWidth size="small" variant="outlined" startIcon={<SupportAgentIcon />}
              onClick={() => navigate('/agent/console')}>
              Continue in Console
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}

