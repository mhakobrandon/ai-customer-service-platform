/**
 * Dashboard Component
 * Main dashboard view for customers.
 * 
 * Author: Brandon K Mhako (R223931W)
 */

import { useState, useEffect, type MouseEvent } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  ChatBubble as ChatIcon,
  ConfirmationNumber as TicketIcon,
  Add as AddIcon,
  History as HistoryIcon,
  Star as StarIcon,
  ListAlt as ActivityTitleIcon,
  AccountBalanceWallet as WalletTitleIcon,
  SettingsInputAntenna as ChannelsTitleIcon,
  TrendingUp as MarketTitleIcon,
  Logout as LogoutIcon,
  AccountCircle as ProfileIcon,
  Edit as EditIcon,
  WhatsApp as WhatsAppIcon,
  Language as WebIcon,
  EmailOutlined as EmailIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/authService';
import { chatAPI, ticketAPI, analyticsAPI } from '../../services/apiService';
import { BalanceWidget, LinkAccountModal } from '../banking';
import StatCard from '../common/StatCard';
import PageHeader from '../common/PageHeader';
import NotificationBell from '../common/NotificationBell';
import {
  AppNotification,
  computeCustomerSessionNotifications,
  markAllCustomerSessionsRead,
  markCustomerSessionRead,
} from '../../services/notificationService';

interface ChatSession {
  id: string;
  session_id: string;
  created_at: string;
  status: string;
  message_count: number;
  last_message?: string;
}

interface Ticket {
  id: string;
  ticket_id?: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentSessions, setRecentSessions] = useState<ChatSession[]>([]);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [linkAccountOpen, setLinkAccountOpen] = useState(false);
  const [balanceKey, setBalanceKey] = useState(0);
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeSessions: 0,
    openTickets: 0,
    resolvedTickets: 0,
    resolutionRate: 0,
  });
  const [marketSummary, setMarketSummary] = useState<any>(null);
  const [customerNotifications, setCustomerNotifications] = useState<AppNotification[]>([]);
  const [customerUnreadCount, setCustomerUnreadCount] = useState(0);
  const [notificationSessionsSnapshot, setNotificationSessionsSnapshot] = useState<ChatSession[]>([]);
  const [profileAnchorEl, setProfileAnchorEl] = useState<HTMLElement | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileRole, setProfileRole] = useState('customer');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileMessageType, setProfileMessageType] = useState<'success' | 'error'>('success');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    setProfileName(user?.name || 'Customer User');
    setProfileEmail(user?.email || '');
    setProfileRole(user?.role || 'customer');
  }, [user?.name, user?.email, user?.role]);

  const handleOpenProfileMenu = (event: MouseEvent<HTMLElement>) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleOpenProfileDialog = () => {
    setProfileDialogOpen(true);
    setProfileAnchorEl(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSaveProfile = () => {
    if (currentPassword || newPassword || confirmPassword) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        setProfileMessageType('error');
        setProfileMessage('Fill all password fields to change password.');
        return;
      }
      if (newPassword.length < 8) {
        setProfileMessageType('error');
        setProfileMessage('New password must be at least 8 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setProfileMessageType('error');
        setProfileMessage('New password and confirmation do not match.');
        return;
      }
    }
    setProfileMessageType('success');
    setProfileMessage('Profile details updated for this session.');
    setProfileDialogOpen(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const loadCustomerNotifications = async () => {
      try {
        const sessionsRes = await chatAPI.getSessions();
        const sessions: ChatSession[] = sessionsRes.data || [];
        setNotificationSessionsSnapshot(sessions);
        const { notifications, totalUnread } = computeCustomerSessionNotifications(sessions, user.id);
        setCustomerNotifications(notifications);
        setCustomerUnreadCount(totalUnread);
      } catch (err) {
        console.error('Failed to load customer notifications:', err);
      }
    };

    loadCustomerNotifications();
    const interval = setInterval(loadCustomerNotifications, 15000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionsRes, ticketsRes, marketRes] = await Promise.all([
        chatAPI.getSessions(),
        ticketAPI.getTickets(),
        analyticsAPI.getMarketComparison(),
      ]);

      const sessions = sessionsRes.data || [];
      const tickets = ticketsRes.data || [];

      setRecentSessions(sessions.slice(0, 3));
      setRecentTickets(tickets.slice(0, 5));

      const activeSessions = sessions.filter((session: ChatSession) => session.status?.toLowerCase() === 'active').length;
      const openTickets = tickets.filter((ticket: Ticket) => ['new', 'assigned', 'in_progress', 'open'].includes(ticket.status?.toLowerCase())).length;
      const resolvedTickets = tickets.filter((ticket: Ticket) => ['resolved', 'closed'].includes(ticket.status?.toLowerCase())).length;
      const totalSessions = sessions.length;
      const resolutionRate = tickets.length > 0 ? Math.round((resolvedTickets / tickets.length) * 1000) / 10 : 0;

      setStats({
        totalSessions,
        activeSessions,
        openTickets,
        resolvedTickets,
        resolutionRate,
      });
      setMarketSummary({
        lowestFees: marketRes.data?.lowest_fees,
        lowestBundles: marketRes.data?.lowest_bundles,
        lastUpdated: marketRes.data?.last_updated,
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load real dashboard data. Please refresh and try again.');
      setRecentSessions([]);
      setRecentTickets([]);
      setStats({
        totalSessions: 0,
        activeSessions: 0,
        openTickets: 0,
        resolvedTickets: 0,
        resolutionRate: 0,
      });
      setMarketSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'open':
      case 'new':
        return 'success';
      case 'in_progress':
      case 'assigned':
        return 'warning';
      case 'closed':
      case 'resolved':
        return 'default';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} min ago`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Fixed WhatsApp chatbot number
  const whatsappUrl = 'https://wa.me/15551578991';
  const channelAvailability = [
    {
      name: 'web',
      label: 'Web Chat',
      description: 'Customer dashboard and live AI support',
      status: 'live',
      icon: <WebIcon fontSize="small" />,
      tint: 'primary.main',
    },
    {
      name: 'whatsapp',
      label: 'WhatsApp',
      description: 'Official WhatsApp support channel',
      status: 'live',
      icon: <WhatsAppIcon fontSize="small" />,
      tint: '#25D366',
    },
    {
      name: 'email',
      label: 'Email',
      description: 'Email follow-up and ticket updates',
      status: 'live',
      icon: <EmailIcon fontSize="small" />,
      tint: 'info.main',
    },
  ];
  const latestActiveSession = recentSessions.find((session) => session.status?.toLowerCase() === 'active') || recentSessions[0];

  const handleCustomerNotificationOpen = (item: AppNotification) => {
    const sessionId = String(item.meta?.session_id || '').trim();
    if (!sessionId || !user?.id) {
      if (item.route) navigate(item.route);
      return;
    }

    const session = notificationSessionsSnapshot.find((entry) => entry.session_id === sessionId);
    if (session) {
      markCustomerSessionRead(user.id, sessionId, session.message_count || 0);
    }
    navigate(`/chat?session=${sessionId}`);
  };

  const handleCustomerNotificationsReadAll = () => {
    if (!user?.id) return;
    markAllCustomerSessionsRead(user.id, notificationSessionsSnapshot);
    setCustomerNotifications([]);
    setCustomerUnreadCount(0);
  };

  const panelShellSx = {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: 3,
    border: '1px solid',
    borderColor: (t: any) => alpha(t.palette.common.white, 0.45),
    bgcolor: (t: any) => alpha(t.palette.common.white, 0.8),
    boxShadow: '0 18px 48px rgba(14, 45, 98, 0.16)',
    backdropFilter: 'blur(12px)',
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        p: { xs: 1, sm: 1.25, md: 1.5 },
        gap: { xs: 1, md: 1.25 },
        background: [
          'radial-gradient(1200px 640px at -6% -12%, rgba(145, 212, 255, 0.75), transparent 58%)',
          'radial-gradient(900px 520px at 110% -8%, rgba(147, 185, 255, 0.62), transparent 55%)',
          'linear-gradient(160deg, #edf6ff 0%, #d7ecff 36%, #c3e2ff 72%, #b7dbff 100%)',
        ].join(','),
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

      {/* Header */}
      <PageHeader
        mb={0}
        transparent
        title={`Welcome back, ${user?.name || user?.email?.split('@')[0] || 'User'}!`}
        subtitle="Here's what's happening with your account today."
        actions={
          <>
            <NotificationBell
              items={customerNotifications}
              unreadCount={customerUnreadCount}
              onOpenItem={handleCustomerNotificationOpen}
              onMarkAllRead={handleCustomerNotificationsReadAll}
              tooltip="Chat notifications"
            />
            <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={loadDashboardData}>
              Refresh
            </Button>
            {latestActiveSession && (
              <Button variant="outlined" size="small" startIcon={<HistoryIcon />}
                onClick={() => navigate(`/chat?session=${latestActiveSession.session_id || latestActiveSession.id}`)}>
                Continue Chat
              </Button>
            )}
            <Button variant="contained" size="small" startIcon={<ChatIcon />} onClick={() => navigate('/chat')}>New Chat</Button>
            <Button variant="outlined" size="small" color="success" startIcon={<WhatsAppIcon />}
              onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}>WhatsApp</Button>
            {['agent', 'supervisor', 'admin'].includes(user?.role || '') && (
              <Button variant="outlined" size="small" color="warning" onClick={() => navigate('/agent/console')}>Console</Button>
            )}
            <Button variant="outlined" size="small" startIcon={<ProfileIcon />} onClick={handleOpenProfileMenu}>Profile</Button>
            <Button variant="outlined" size="small" color="error" startIcon={<LogoutIcon />} onClick={handleLogout}>Logout</Button>
          </>
        }
      />

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

      {profileMessage && (
        <Alert severity={profileMessageType} sx={{ mb: 1 }} onClose={() => setProfileMessage(null)}>
          {profileMessage}
        </Alert>
      )}

      {/* KPI Stats */}
      <Grid container spacing={{ xs: 1, md: 1.25 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Total Sessions" value={stats.totalSessions} Icon={HistoryIcon} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Active Sessions" value={stats.activeSessions} Icon={ChatIcon} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Open Tickets" value={stats.openTickets} Icon={TicketIcon} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Resolution Rate" value={`${stats.resolutionRate.toFixed(1)}%`} Icon={StarIcon} color="info" />
        </Grid>
      </Grid>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: '1fr 1fr 1fr',
            lg: '1fr 1fr 1fr',
            xl: '1fr 1fr 1fr',
          },
          gap: { xs: 1, md: 1.25 },
        }}
      >

        {/* Column 1: Activity Panel */}
        <Paper
          elevation={0}
          sx={{
            ...panelShellSx,
          }}
        >
          {/* Panel header */}
          <Box
            sx={{
              px: 1.25,
              py: 0.75,
              minHeight: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid',
              borderColor: (t) => alpha(t.palette.primary.main, 0.14),
              flexShrink: 0,
              background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.09)}, ${alpha(t.palette.info.main, 0.08)})`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: (t) => alpha(t.palette.primary.main, 0.14), color: 'primary.main' }}>
                <ActivityTitleIcon sx={{ fontSize: 14 }} />
              </Box>
              <Typography variant="subtitle2" fontWeight={700}>Recent Activity</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Tabs
                value={tabValue}
                onChange={(_, v) => setTabValue(v)}
                sx={{
                  minHeight: 40,
                  bgcolor: (t) => alpha(t.palette.common.white, 0.62),
                  borderRadius: 1.5,
                  p: 0.25,
                  '& .MuiTabs-indicator': { display: 'none' },
                }}
              >
                <Tab label="Sessions" icon={<ChatIcon sx={{ fontSize: 16 }} />} iconPosition="start"
                  sx={{
                    minHeight: 34,
                    py: 0.5,
                    px: 1.25,
                    borderRadius: 1,
                    fontSize: '0.76rem',
                    textTransform: 'none',
                    color: 'text.secondary',
                    '&.Mui-selected': {
                      color: 'primary.contrastText',
                      bgcolor: 'primary.main',
                      boxShadow: '0 10px 18px rgba(17, 77, 162, 0.3)',
                    },
                  }}
                />
                <Tab label="Tickets" icon={<TicketIcon sx={{ fontSize: 16 }} />} iconPosition="start"
                  sx={{
                    minHeight: 34,
                    py: 0.5,
                    px: 1.25,
                    borderRadius: 1,
                    fontSize: '0.76rem',
                    textTransform: 'none',
                    color: 'text.secondary',
                    '&.Mui-selected': {
                      color: 'primary.contrastText',
                      bgcolor: 'primary.main',
                      boxShadow: '0 10px 18px rgba(17, 77, 162, 0.3)',
                    },
                  }}
                />
              </Tabs>
            </Box>
          </Box>

          {/* Scrollable list */}
          <Box sx={{ flex: 1, overflow: 'auto', px: 1, py: 1, bgcolor: (t) => alpha(t.palette.common.white, 0.46) }}>
            {/* Sessions tab */}
            {tabValue === 0 && (
              recentSessions.length === 0 ? (
                <Box textAlign="center" py={6}>
                  <ChatIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary" variant="body2">No chat sessions yet.</Typography>
                  <Button variant="contained" size="small" startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={() => navigate('/chat')}>
                    Start Chat
                  </Button>
                </Box>
              ) : (
                <List disablePadding>
                  {recentSessions.map((session, index) => (
                    <Box key={session.id}>
                      <ListItem
                        disablePadding
                        sx={{ borderRadius: 2, overflow: 'hidden' }}
                      >
                        <ListItemButton
                          onClick={() => navigate(`/chat?session=${session.session_id || session.id}`)}
                          sx={{
                            px: 1,
                            py: 1,
                            alignItems: 'flex-start',
                            borderRadius: 1.5,
                            '&:hover': {
                              bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                            },
                          }}
                        >
                          <ListItemAvatar sx={{ minWidth: 44 }}>
                            <Avatar sx={{ width: 34, height: 34, bgcolor: session.status === 'active' ? 'success.main' : 'grey.500' }}>
                              <ChatIcon sx={{ fontSize: 18 }} />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2" fontWeight={600}>Chat Session</Typography>
                                <Chip label={session.status} size="small" color={getStatusColor(session.status) as any} sx={{ height: 18, fontSize: '0.68rem' }} />
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {session.last_message ? `${session.last_message.slice(0, 60)}... - ` : ''}
                                {formatDate(session.created_at)} - {session.message_count} msgs
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                      {index < recentSessions.length - 1 && <Divider variant="inset" sx={{ ml: 7 }} />}
                    </Box>
                  ))}
                </List>
              )
            )}

            {/* Tickets tab */}
            {tabValue === 1 && (
              recentTickets.length === 0 ? (
                <Box textAlign="center" py={6}>
                  <TicketIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary" variant="body2">No support tickets yet.</Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {recentTickets.map((ticket, index) => (
                    <Box key={ticket.id}>
                      <ListItem
                        disablePadding
                        sx={{ borderRadius: 2, overflow: 'hidden' }}
                      >
                        <ListItemButton
                          onClick={() => ticket.ticket_id && navigate(`/tickets/${ticket.ticket_id}`)}
                          disabled={!ticket.ticket_id}
                          sx={{
                            px: 1,
                            py: 1,
                            alignItems: 'flex-start',
                            borderRadius: 1.5,
                            '&:hover': {
                              bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                            },
                          }}
                        >
                          <ListItemAvatar sx={{ minWidth: 44 }}>
                            <Avatar sx={{ width: 34, height: 34, bgcolor: 'warning.main' }}>
                              <TicketIcon sx={{ fontSize: 18 }} />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 220 }}>{ticket.subject}</Typography>
                                <Chip label={ticket.priority} size="small" color={getPriorityColor(ticket.priority) as any} sx={{ height: 18, fontSize: '0.68rem' }} />
                              </Box>
                            }
                            secondary={
                              <Box display="flex" alignItems="center" gap={0.75}>
                                <Chip label={ticket.status.replace(/_/g, ' ')} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.65rem' }} />
                                <Typography variant="caption" color="text.secondary">- {formatDate(ticket.created_at)}</Typography>
                              </Box>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                      {index < recentTickets.length - 1 && <Divider variant="inset" sx={{ ml: 7 }} />}
                    </Box>
                  ))}
                </List>
              )
            )}
          </Box>

          {/* CTA strip */}
          <Box
            sx={{
              px: 2, py: 1.25, flexShrink: 0,
              borderTop: '1px solid', borderColor: 'divider',
              display: 'flex', alignItems: 'center', gap: 1,
              bgcolor: (t) => alpha(t.palette.info.main, 0.08),
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
              AI assistant available 24/7 - English, Shona and Ndebele
            </Typography>
            <Button size="small" variant="contained" startIcon={<ChatIcon />} onClick={() => navigate('/chat')}>Chat Now</Button>
            <Button size="small" variant="contained" startIcon={<WhatsAppIcon />}
              href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#1ebe5d' } }}>
              WhatsApp
            </Button>
          </Box>
        </Paper>

        {/* Column 2: My Wallets */}
        <Paper elevation={0} sx={{ ...panelShellSx, p: 1.25 }}>
          <Box sx={{ minHeight: 32, display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
            <Box sx={{ width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: (t) => alpha(t.palette.primary.main, 0.12), color: 'primary.main' }}>
              <WalletTitleIcon sx={{ fontSize: 14 }} />
            </Box>
            <Typography variant="subtitle2" fontWeight={700}>My Wallets</Typography>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <BalanceWidget key={balanceKey} onAddAccount={() => setLinkAccountOpen(true)} compact={false} />
          </Box>
        </Paper>

        {/* Column 3: Channels & Market */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, minWidth: 0, overflow: 'hidden' }}>
          {/* Live Channels */}
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              minHeight: 0,
              p: 1.25,
              borderRadius: 3,
              border: '1px solid',
              borderColor: (t) => alpha(t.palette.common.white, 0.45),
              bgcolor: (t) => alpha(t.palette.common.white, 0.8),
              boxShadow: '0 18px 48px rgba(14, 45, 98, 0.16)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto',
            }}
          >
            <Box sx={{ minHeight: 32, display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
              <Box sx={{ width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: (t) => alpha(t.palette.primary.main, 0.12), color: 'primary.main' }}>
                <ChannelsTitleIcon sx={{ fontSize: 14 }} />
              </Box>
              <Typography variant="subtitle2" fontWeight={700}>Live Support Channels</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {channelAvailability.map((ch) => (
                <Box
                  key={ch.name}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: (t) => alpha(t.palette.primary.main, 0.2),
                    bgcolor: (t) => alpha(t.palette.common.white, 0.66),
                  }}
                >
                  <Avatar
                    sx={{
                      width: 30,
                      height: 30,
                      bgcolor: (t) => alpha(t.palette.success.main, 0.12),
                      color: 'success.main',
                    }}
                  >
                    {ch.icon}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{ch.label}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>{ch.description}</Typography>
                  </Box>
                  <Chip label="Live" color="success" size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                </Box>
              ))}
            </Box>
          </Paper>

          {/* Best Market Rates */}
          {marketSummary && (
            <Paper elevation={0} sx={{ ...panelShellSx, flexShrink: 0, p: 1.25 }}>
              <Box sx={{ minHeight: 32, display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: (t) => alpha(t.palette.primary.main, 0.12), color: 'primary.main' }}>
                  <MarketTitleIcon sx={{ fontSize: 14 }} />
                </Box>
                <Typography variant="subtitle2" fontWeight={700}>Best Market Rates</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: (t) => alpha(t.palette.primary.main, 0.2),
                    bgcolor: (t) => alpha(t.palette.common.white, 0.66),
                    gap: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">Lowest Fee</Typography>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {marketSummary?.lowestFees?.lowest_send_fee?.provider} ({marketSummary?.lowestFees?.lowest_send_fee?.send_fee_percent}%)
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: (t) => alpha(t.palette.primary.main, 0.2),
                    bgcolor: (t) => alpha(t.palette.common.white, 0.66),
                    gap: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">Cheapest Data</Typography>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {marketSummary?.lowestBundles?.lowest_data_1gb?.provider} (${marketSummary?.lowestBundles?.lowest_data_1gb?.data_1gb_usd})
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>

      <LinkAccountModal
        open={linkAccountOpen}
        onClose={() => setLinkAccountOpen(false)}
        onSuccess={() => setBalanceKey(prev => prev + 1)}
      />
    </Box>
  );
}
