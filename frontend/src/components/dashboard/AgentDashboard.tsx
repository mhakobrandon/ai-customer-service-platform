import { useEffect, useState } from 'react'
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
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import {
  AccountCircle as ProfileIcon,
  Assessment as ReportsIcon,
  ChatBubble as ChatIcon,
  ConfirmationNumber as TicketIcon,
  Dashboard as DashboardIcon,
  Edit as EditIcon,
  Forum as InboxIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
  ShowChart as AnalyticsIcon,
  SupportAgent as SupportAgentIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { ticketAPI } from '../../services/apiService'
import { useAuth } from '../../services/authService'
import NotificationBell from '../common/NotificationBell'
import DashboardShell, { type DashboardShellNavSection, toInitials } from './DashboardShell'
import {
  AppNotification,
  computeAgentAssignmentNotifications,
  markAgentTicketNotificationsRead,
} from '../../services/notificationService'

interface Ticket {
  ticket_id?: string
  subject: string
  status: string
  created_at: string
}

export default function AgentDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
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
      const ticketsRes = await ticketAPI.getTickets()
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

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const displayName = profileName || user?.name || 'Agent User'

  const sidebarSections: DashboardShellNavSection[] = [
    {
      id: 'main',
      title: 'Main',
      items: [
        {
          id: 'agent-home',
          label: 'Home',
          icon: <DashboardIcon sx={{ fontSize: 13 }} />,
          active: false,
          onClick: () => navigate('/dashboard/agent'),
        },
        {
          id: 'agent-performance',
          label: 'Performance & Analytics',
          icon: <AnalyticsIcon sx={{ fontSize: 13 }} />,
          active: true,
          onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
        },
        {
          id: 'agent-reports',
          label: 'Reports',
          icon: <ReportsIcon sx={{ fontSize: 13 }} />,
          active: false,
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
          id: 'agent-profile',
          label: 'Profile',
          icon: <ProfileIcon sx={{ fontSize: 13 }} />,
          onClick: handleOpenProfileDialog,
        },
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
          const ticketId = String(item.meta?.ticket_id || '').trim()
          if (ticketId) {
            navigate(`/tickets/${ticketId}`)
          }
        }}
        onMarkAllRead={() => {
          markAgentTicketNotificationsRead(user?.id, tickets)
          setAgentNotifications([])
          setAgentUnreadCount(0)
        }}
        tooltip="Assigned ticket alerts"
      />

      <button type="button" className="btn" onClick={() => void loadData()}>
        <RefreshIcon sx={{ fontSize: 12 }} /> Refresh
      </button>
      <button type="button" className="btn" onClick={() => navigate('/agent/console')}>
        <SupportAgentIcon sx={{ fontSize: 12 }} /> Console
      </button>
      <button type="button" className="btn" onClick={() => navigate('/chat')}>
        <ChatIcon sx={{ fontSize: 12 }} /> Open chat
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
        roleClassName="role-dashboard-agent"
        brandLabel="Taur.ai Agent"
        brandIcon={<SupportAgentIcon sx={{ fontSize: 13 }} />}
        sidebarSections={sidebarSections}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search performance analytics..."
        topActions={topActions}
        userName={displayName}
        userMeta="Performance & analytics"
        userInitials={toInitials(displayName, 'AG')}
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
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            p: 2,
            borderRadius: 1,
          }}
        >
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Performance & Analytics Workspace
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            My Tickets has moved to a dedicated page to keep analytics focused and easier to navigate.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" variant="contained" startIcon={<TicketIcon />} onClick={() => navigate('/dashboard/agent/tickets')}>
              Open My Tickets
            </Button>
            <Button size="small" variant="outlined" startIcon={<InboxIcon />} onClick={() => navigate('/dashboard/agent/escalations')}>
              Open Escalation Inbox
            </Button>
          </Box>
        </Paper>
      </DashboardShell>

      <Menu anchorEl={profileAnchorEl} open={Boolean(profileAnchorEl)} onClose={() => setProfileAnchorEl(null)}>
        <Box sx={{ px: 2, py: 1.25, minWidth: 240 }}>
          <Typography variant="subtitle2" fontWeight={700}>{profileName || 'Agent User'}</Typography>
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