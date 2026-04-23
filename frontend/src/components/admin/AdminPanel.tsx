/**
 * Admin Panel Component
 * Comprehensive dashboard for system analytics and management
 * 
 * Author: Brandon K Mhako (R223931W)
 */

import { useState, useEffect, useMemo, type ChangeEvent, type MouseEvent } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  Button,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  ChatBubble as ChatIcon,
  ConfirmationNumber as TicketIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Psychology as AIIcon,
  Speed as SpeedIcon,
  Star as StarIcon,
  Timeline as TimelineIcon,
  Block as BlockIcon,
  PersonOff as PersonOffIcon,
  Logout as LogoutIcon,
  AccountBalance as BankingIcon,
  ReportProblem as OverdueIcon,
  PersonSearch as UnassignedIcon,
  FilterList as FilterIcon,
  Assessment as ReportsIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  AccountCircle as ProfileIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { analyticsAPI, adminAPI, ticketAPI } from '../../services/apiService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/authService';
import { getDashboardRoute } from '../../utils/dashboardRoute';
import { downloadCsv, filterByDateRange, getDateRangeForPeriod, ReportPeriod } from '../../utils/reporting';
import { formatDateTime, formatDateOnly, formatDateMediumShort } from '../../utils/dateUtils';
import NotificationBell from '../common/NotificationBell';
import DashboardShell, { type DashboardShellNavSection, toInitials } from '../dashboard/DashboardShell';
import {
  AppNotification,
  computeAdminTicketCreatedNotifications,
  computeAdminOverdueNotifications,
  markAdminTicketCreatedNotificationsRead,
  markAdminOverdueNotificationsRead,
} from '../../services/notificationService';
import Switch from '@mui/material/Switch';

// Types
interface LLMStatus {
  enabled: boolean;
  available: boolean;
  provider: string;
  model: string;
  has_api_key: boolean;
  temperature: number;
  max_tokens: number;
}

interface DashboardData {
  tickets: {
    total: number;
    open: number;
    resolved: number;
    closed: number;
    resolution_rate: number;
  };
  chat_sessions: {
    total: number;
    active: number;
  };
  messages: {
    total: number;
    ai_handled: number;
    ai_resolution_rate: number;
  };
  ratings: {
    average: number;
    total: number;
  };
  system_health: {
    status: string;
    uptime: string;
  };
}

interface PerformanceData {
  period_days: number;
  average_resolution_time_hours: number;
  average_customer_satisfaction: number;
  first_contact_resolution_rate: number;
  escalation_rate: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface IntentDistribution {
  intent: string;
  count: number;
  percentage: number;
}

interface FrequentQuery {
  query: string;
  count: number;
  percentage: number;
}

interface ChannelStatus {
  name: string;
  status: string;
  description: string;
  phone?: string;
  webhook?: string;
}

interface ProviderIntegration {
  provider: string;
  type: string;
  chat_assistant: string;
  escalation: string;
  fees_comparison: string;
  bundles_comparison: string;
  channels: {
    web: string;
    whatsapp: string;
  };
}

interface RecentEscalation {
  id: string;
  user_name: string;
  user_email: string;
  reason: string;
  escalated_at: string;
  priority: string;
}

interface AdminTicket {
  id: string;
  ticket_id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  assigned_agent_id?: string | null;
  agent_name: string | null;
  agent_email: string | null;
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null;
  resolution_due: string | null;
  response_due: string | null;
  is_overdue: boolean;
  customer_satisfaction: number | null;
}

interface ResolutionTrendPoint {
  period: string;
  avg_resolution_time_hours: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Tab Panel Component
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  const active = value === index;
  return (
    <div
      role="tabpanel"
      hidden={!active}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      style={active ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' } : {}}
      {...other}
    >
      {active && (
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', pt: 1, pb: { xs: 1, md: 1.25 } }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Stat Card Component — vibrant gradient design matching platform UI language
function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color = 'primary',
  trend 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  trend?: { value: number; positive: boolean };
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const DARK_GRADIENTS: Record<string, string> = {
    primary:   'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
    success:   'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
    warning:   'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
    error:     'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
    info:      'linear-gradient(135deg, #0c4a6e 0%, #0284c7 100%)',
  };

  const palette = theme.palette[color];
  const isPrimaryHighlight = !isDark && color === 'primary';

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        borderRadius: 0.5,
        position: 'relative',
        overflow: 'hidden',
        background: isPrimaryHighlight
          ? 'linear-gradient(135deg, #2f5ff4 0%, #3f73ff 100%)'
          : isDark
            ? DARK_GRADIENTS[color]
            : '#ffffff',
        border: `1px solid ${
          isPrimaryHighlight
            ? alpha('#3f73ff', 0.5)
            : isDark
              ? alpha(palette.light || palette.main, 0.28)
              : alpha('#0f172a', 0.08)
        }`,
        boxShadow: isPrimaryHighlight
          ? '0 8px 20px rgba(47, 95, 244, 0.24)'
          : isDark
            ? `0 4px 20px ${alpha(palette.main, 0.35)}`
            : '0 2px 8px rgba(15, 23, 42, 0.06)',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: isPrimaryHighlight
            ? '0 10px 24px rgba(47, 95, 244, 0.3)'
            : isDark
              ? `0 8px 28px ${alpha(palette.main, 0.5)}`
              : '0 6px 16px rgba(15, 23, 42, 0.1)',
        },
      }}
    >
      <CardContent sx={{ p: { xs: 1.35, md: 1.55 }, position: 'relative' }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={0.8}>
          <Box flex={1} minWidth={0}>
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: '0.73rem',
                color: isPrimaryHighlight
                  ? 'rgba(241, 245, 255, 0.95)'
                  : isDark
                    ? 'rgba(255,255,255,0.68)'
                    : '#4b5563',
                mb: 0.65,
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h5"
              fontWeight={700}
              lineHeight={1.05}
              sx={{
                color: isPrimaryHighlight ? '#dbe8ff' : isDark ? '#fff' : '#111827',
                fontSize: { xs: '1.55rem', md: '1.68rem' },
              }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography
                sx={{
                  color: isPrimaryHighlight
                    ? 'rgba(232, 240, 255, 0.9)'
                    : isDark
                      ? 'rgba(255,255,255,0.55)'
                      : '#6b7280',
                  display: 'block',
                  mt: 0.35,
                  lineHeight: 1.2,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              >
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box display="flex" alignItems="center" sx={{ mt: 0.45 }}>
                {trend.positive ? (
                  <TrendingUpIcon
                    fontSize="small"
                    sx={{ color: isPrimaryHighlight ? '#86efac' : isDark ? '#34d399' : 'success.main', mr: 0.4 }}
                  />
                ) : (
                  <TrendingDownIcon
                    fontSize="small"
                    sx={{ color: isPrimaryHighlight ? '#fecaca' : isDark ? '#f87171' : 'error.main', mr: 0.4 }}
                  />
                )}
                <Typography
                  sx={{
                    color: trend.positive
                      ? isPrimaryHighlight
                        ? '#86efac'
                        : isDark
                          ? '#34d399'
                          : 'success.main'
                      : isPrimaryHighlight
                        ? '#fecaca'
                        : isDark
                          ? '#f87171'
                          : 'error.main',
                    fontWeight: 700,
                    fontSize: '0.74rem',
                  }}
                >
                  {trend.value}%
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: isPrimaryHighlight
                ? 'rgba(236, 243, 255, 0.22)'
                : isDark
                  ? alpha('#fff', 0.15)
                  : alpha(palette.main, 0.1),
              color: isPrimaryHighlight ? '#e4ecff' : isDark ? '#fff' : palette.main,
              width: { xs: 30, md: 32 },
              height: { xs: 30, md: 32 },
              border: `1px solid ${
                isPrimaryHighlight ? 'rgba(236, 243, 255, 0.4)' : alpha(palette.main, isDark ? 0.28 : 0.18)
              }`,
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

// Main Admin Panel Component
interface AdminPanelProps {
  defaultTab?: number;
}

const ADMIN_USERS_ROWS_PER_PAGE = 6;
const ADMIN_ESCALATIONS_ROWS_PER_PAGE = 6;
const ADMIN_TICKETS_ROWS_PER_PAGE = 6;

export default function AdminPanel({ defaultTab = 0 }: AdminPanelProps) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const theme = useTheme();
  const dashboardRoute = getDashboardRoute(user?.role);
  const [tabValue, setTabValue] = useState(defaultTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    setProfileName(user?.name || 'Admin User');
    setProfileEmail(user?.email || '');
    setProfileRole(user?.role || 'admin');
  }, [user?.name, user?.email, user?.role]);

  const handleOpenProfileMenu = (event: MouseEvent<HTMLElement>) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleCloseProfileMenu = () => {
    setProfileAnchorEl(null);
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
  const [performancePeriod, setPerformancePeriod] = useState(7);
  const [refreshing, setRefreshing] = useState(false);
  const [intentDistribution, setIntentDistribution] = useState<IntentDistribution[]>([]);
  const [recentEscalations, setRecentEscalations] = useState<RecentEscalation[]>([]);
  const [frequentQueries, setFrequentQueries] = useState<FrequentQuery[]>([]);
  const [channelStatus, setChannelStatus] = useState<ChannelStatus[]>([]);
  const [providerIntegrations, setProviderIntegrations] = useState<ProviderIntegration[]>([]);
  const [allTickets, setAllTickets] = useState<AdminTicket[]>([]);
  const [resolutionTrend, setResolutionTrend] = useState<ResolutionTrendPoint[]>([]);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('');
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState<string>('');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [notificationFocusTicketId, setNotificationFocusTicketId] = useState<string | null>(null);
  const [adminNotifications, setAdminNotifications] = useState<AppNotification[]>([]);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('weekly');
  const [reportStartDate, setReportStartDate] = useState(getDateRangeForPeriod('weekly').startDate);
  const [reportEndDate, setReportEndDate] = useState(getDateRangeForPeriod('weekly').endDate);
  const [assigningTicketId, setAssigningTicketId] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [llmStatus, setLlmStatus] = useState<LLMStatus | null>(null);
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmSaving, setLlmSaving] = useState(false);

  // WhatsApp integration
  const [waStatus, setWaStatus] = useState<any>(null);
  const [waSaving, setWaSaving] = useState(false);
  const [waAccessToken, setWaAccessToken] = useState('');
  const [waPhoneId, setWaPhoneId] = useState('');
  const [waBusinessId, setWaBusinessId] = useState('');

  // WhatsApp token management
  const [waTokenStatus, setWaTokenStatus] = useState<{ valid: boolean; expired: boolean; reason: string | null; name: string | null } | null>(null);
  const [waTokenChecking, setWaTokenChecking] = useState(false);
  const [waNewToken, setWaNewToken] = useState('');
  const [waTokenSaving, setWaTokenSaving] = useState(false);
  const [waTokenMessage, setWaTokenMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profileAnchorEl, setProfileAnchorEl] = useState<HTMLElement | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileRole, setProfileRole] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMessageType, setProfileMessageType] = useState<'success' | 'error'>('success');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [usersPage, setUsersPage] = useState(0);
  const [usersRowsPerPage, setUsersRowsPerPage] = useState(ADMIN_USERS_ROWS_PER_PAGE);
  const [escalationsPage, setEscalationsPage] = useState(0);
  const [escalationsRowsPerPage, setEscalationsRowsPerPage] = useState(ADMIN_ESCALATIONS_ROWS_PER_PAGE);
  const [ticketsPage, setTicketsPage] = useState(0);
  const [ticketsRowsPerPage, setTicketsRowsPerPage] = useState(ADMIN_TICKETS_ROWS_PER_PAGE);

  useEffect(() => {
    setTabValue(defaultTab);
  }, [defaultTab]);

  // Load data
  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllTickets();
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // Refresh performance data when period changes
  useEffect(() => {
    fetchPerformanceData();
  }, [performancePeriod]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchDashboardData(),
        fetchPerformanceData(),
        fetchUsers(),
        fetchIntentDistribution(),
        fetchRecentEscalations(),
        fetchFrequentQueries(),
        fetchIntegrationStatus(),
        fetchAllTickets(),
        fetchResolutionTrend(),
        fetchLLMStatus(),
        fetchWhatsAppStatus(),
      ]);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLLMStatus = async () => {
    try {
      const res = await adminAPI.getLLMStatus();
      setLlmStatus(res.data);
    } catch {
      // LLM status endpoint may not exist yet — ignore silently
    }
  };

  const handleLLMToggle = async () => {
    if (!llmStatus) return;
    setLlmSaving(true);
    try {
      const res = await adminAPI.updateLLMConfig({ enabled: !llmStatus.enabled });
      setLlmStatus((prev) => prev ? { ...prev, ...res.data } : prev);
    } catch (err) {
      console.error('Failed to toggle LLM:', err);
    } finally {
      setLlmSaving(false);
    }
  };

  const handleLLMSaveKey = async () => {
    if (!llmApiKey.trim()) return;
    setLlmSaving(true);
    try {
      const res = await adminAPI.updateLLMConfig({ api_key: llmApiKey, enabled: true });
      setLlmStatus((prev) => prev ? { ...prev, ...res.data, has_api_key: true } : prev);
      setLlmApiKey('');
    } catch (err) {
      console.error('Failed to save LLM API key:', err);
    } finally {
      setLlmSaving(false);
    }
  };

  const handleLLMModelChange = async (model: string) => {
    setLlmSaving(true);
    try {
      const res = await adminAPI.updateLLMConfig({ model });
      setLlmStatus((prev) => prev ? { ...prev, ...res.data } : prev);
    } catch (err) {
      console.error('Failed to update LLM model:', err);
    } finally {
      setLlmSaving(false);
    }
  };

  const fetchWhatsAppStatus = async () => {
    try {
      const res = await adminAPI.getWhatsAppStatus();
      setWaStatus(res.data);
    } catch {
      // WhatsApp status endpoint may not exist yet
    }
  };

  const checkWaTokenStatus = async () => {
    setWaTokenChecking(true);
    try {
      const res = await adminAPI.getWhatsAppTokenStatus();
      setWaTokenStatus(res.data);
    } catch {
      setWaTokenStatus({ valid: false, expired: false, reason: 'Could not reach server', name: null });
    } finally {
      setWaTokenChecking(false);
    }
  };

  const handleWaTokenSave = async () => {
    if (!waNewToken.trim()) return;
    setWaTokenSaving(true);
    setWaTokenMessage(null);
    try {
      const res = await adminAPI.updateWhatsAppToken(waNewToken.trim());
      if (res.data.success) {
        setWaTokenStatus({ valid: true, expired: false, reason: null, name: res.data.name });
        setWaTokenMessage({ type: 'success', text: `Token saved & validated. App: ${res.data.name}` });
        setWaNewToken('');
      } else {
        setWaTokenMessage({ type: 'error', text: res.data.reason || 'Token validation failed' });
      }
    } catch {
      setWaTokenMessage({ type: 'error', text: 'Failed to update token' });
    } finally {
      setWaTokenSaving(false);
    }
  };

  const handleWhatsAppSave = async () => {
    setWaSaving(true);
    try {
      const config: any = {};
      if (waAccessToken.trim()) config.access_token = waAccessToken;
      if (waPhoneId.trim()) config.phone_number_id = waPhoneId;
      if (waBusinessId.trim()) config.business_account_id = waBusinessId;
      const res = await adminAPI.updateWhatsAppConfig(config);
      setWaStatus(res.data);
      setWaAccessToken('');
      setWaPhoneId('');
      setWaBusinessId('');
    } catch (err) {
      console.error('Failed to save WhatsApp config:', err);
    } finally {
      setWaSaving(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const response = await analyticsAPI.getDashboard();
      setDashboardData(response.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setDashboardData(null);
    }
  };

  const fetchPerformanceData = async () => {
    try {
      const response = await analyticsAPI.getPerformance(performancePeriod);
      setPerformanceData(response.data);
    } catch (err) {
      console.error('Failed to fetch performance data:', err);
      setPerformanceData(null);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getUsers();
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setUsers([]);
    }
  };

  const fetchIntentDistribution = async () => {
    try {
      const response = await analyticsAPI.getIntentDistribution(30);
      setIntentDistribution(response.data.intent_distribution || []);
    } catch (err) {
      console.error('Failed to fetch intent distribution:', err);
      setIntentDistribution([]);
    }
  };

  const fetchRecentEscalations = async () => {
    try {
      const response = await analyticsAPI.getRecentEscalations(100);
      setRecentEscalations(response.data.escalations || []);
    } catch (err) {
      console.error('Failed to fetch recent escalations:', err);
      setRecentEscalations([]);
    }
  };

  const fetchFrequentQueries = async () => {
    try {
      const response = await analyticsAPI.getFrequentQueries(30, 10);
      setFrequentQueries(response.data.items || []);
    } catch (err) {
      console.error('Failed to fetch frequent queries:', err);
      setFrequentQueries([]);
    }
  };

  const fetchAllTickets = async () => {
    try {
      const response = await adminAPI.getAllTickets();
      setAllTickets(response.data || []);
    } catch (err) {
      console.error('Failed to fetch all tickets:', err);
      setAllTickets([]);
    }
  };

  const fetchIntegrationStatus = async () => {
    try {
      const response = await analyticsAPI.getIntegrationStatus();
      setChannelStatus(response.data.channels || []);
      setProviderIntegrations(response.data.provider_integrations || []);
    } catch (err) {
      console.error('Failed to fetch integration status:', err);
      setChannelStatus([]);
      setProviderIntegrations([]);
    }
  };

  const fetchResolutionTrend = async () => {
    try {
      const periods = [7, 14, 30];
      const responses = await Promise.all(periods.map((days) => analyticsAPI.getPerformance(days)));
      const trend = responses.map((response, index) => ({
        period: `${periods[index]}d`,
        avg_resolution_time_hours: Number(response.data?.average_resolution_time_hours || 0),
      }));
      setResolutionTrend(trend);
    } catch (err) {
      console.error('Failed to fetch resolution trend:', err);
      setResolutionTrend([]);
    }
  };

  const userDistributionData = useMemo(() => {
    const grouped = users.reduce<Record<string, number>>((acc, currentUser) => {
      const role = (currentUser.role || 'unknown').toLowerCase();
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([role, count]) => ({
      name: role.charAt(0).toUpperCase() + role.slice(1),
      value: count,
    }));
  }, [users]);

  const userDistributionColors = useMemo(
    () => [
      theme.palette.primary.main,
      theme.palette.info.main,
      theme.palette.warning.main,
      theme.palette.success.main,
      theme.palette.error.main,
    ],
    [
      theme.palette.error.main,
      theme.palette.info.main,
      theme.palette.primary.main,
      theme.palette.success.main,
      theme.palette.warning.main,
    ]
  );

  const totalUsersInDistribution = useMemo(
    () => userDistributionData.reduce((sum, entry) => sum + entry.value, 0),
    [userDistributionData]
  );

  const activeAgentUsers = useMemo(
    () => users.filter((currentUser) => currentUser.role === 'agent' && currentUser.is_active),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return users;
    }

    return users.filter((currentUser) => {
      const name = currentUser.name?.toLowerCase() || '';
      const email = currentUser.email?.toLowerCase() || '';
      const role = currentUser.role?.toLowerCase() || '';
      return (
        name.includes(normalizedQuery)
        || email.includes(normalizedQuery)
        || role.includes(normalizedQuery)
      );
    });
  }, [users, searchQuery]);

  const paginatedUsers = useMemo(() => {
    const start = usersPage * usersRowsPerPage;
    return filteredUsers.slice(start, start + usersRowsPerPage);
  }, [filteredUsers, usersPage, usersRowsPerPage]);

  const filteredTickets = useMemo(() => {
    return allTickets.filter((ticket) => {
      if (ticketStatusFilter && ticket.status !== ticketStatusFilter) return false;
      if (ticketPriorityFilter && ticket.priority !== ticketPriorityFilter) return false;
      if (showOverdueOnly && !ticket.is_overdue) return false;
      return true;
    });
  }, [allTickets, ticketStatusFilter, ticketPriorityFilter, showOverdueOnly]);

  const paginatedEscalations = useMemo(() => {
    const start = escalationsPage * escalationsRowsPerPage;
    return recentEscalations.slice(start, start + escalationsRowsPerPage);
  }, [recentEscalations, escalationsPage, escalationsRowsPerPage]);

  const paginatedFilteredTickets = useMemo(() => {
    const start = ticketsPage * ticketsRowsPerPage;
    return filteredTickets.slice(start, start + ticketsRowsPerPage);
  }, [filteredTickets, ticketsPage, ticketsRowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredUsers.length / usersRowsPerPage) - 1);
    if (usersPage > maxPage) {
      setUsersPage(maxPage);
    }
  }, [filteredUsers.length, usersPage, usersRowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(recentEscalations.length / escalationsRowsPerPage) - 1);
    if (escalationsPage > maxPage) {
      setEscalationsPage(maxPage);
    }
  }, [recentEscalations.length, escalationsPage, escalationsRowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredTickets.length / ticketsRowsPerPage) - 1);
    if (ticketsPage > maxPage) {
      setTicketsPage(maxPage);
    }
  }, [filteredTickets.length, ticketsPage, ticketsRowsPerPage]);

  useEffect(() => {
    setTicketsPage(0);
  }, [ticketStatusFilter, ticketPriorityFilter, showOverdueOnly]);

  useEffect(() => {
    if (!notificationFocusTicketId) {
      return;
    }

    const focusedIndex = filteredTickets.findIndex((ticket) => (ticket.ticket_id || ticket.id) === notificationFocusTicketId);
    if (focusedIndex < 0) {
      return;
    }

    const focusedPage = Math.floor(focusedIndex / ticketsRowsPerPage);
    if (focusedPage !== ticketsPage) {
      setTicketsPage(focusedPage);
    }
  }, [notificationFocusTicketId, filteredTickets, ticketsRowsPerPage, ticketsPage]);

  const handleUsersPageChange = (_event: unknown, newPage: number) => {
    setUsersPage(newPage);
  };

  const handleUsersRowsPerPageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUsersRowsPerPage(Number.parseInt(event.target.value, 10));
    setUsersPage(0);
  };

  const handleEscalationsPageChange = (_event: unknown, newPage: number) => {
    setEscalationsPage(newPage);
  };

  const handleEscalationsRowsPerPageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEscalationsRowsPerPage(Number.parseInt(event.target.value, 10));
    setEscalationsPage(0);
  };

  const handleTicketsPageChange = (_event: unknown, newPage: number) => {
    setTicketsPage(newPage);
  };

  const handleTicketsRowsPerPageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTicketsRowsPerPage(Number.parseInt(event.target.value, 10));
    setTicketsPage(0);
  };

  const handleAssignTicket = async (ticketId: string, agentId: string) => {
    if (!agentId) return;
    setAssignmentError(null);
    setAssigningTicketId(ticketId);
    try {
      await ticketAPI.assignTicket(ticketId, agentId);
      await fetchAllTickets();
    } catch (err) {
      console.error('Failed to assign ticket:', err);
      setAssignmentError('Failed to assign ticket. Please try again.');
    } finally {
      setAssigningTicketId(null);
    }
  };

  const issuesGraphData = useMemo(() => {
    const groupedByDate = allTickets.reduce<Record<string, number>>((acc, ticket) => {
      const dateKey = new Date(ticket.created_at).toISOString().slice(0, 10);
      acc[dateKey] = (acc[dateKey] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(groupedByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, issues]) => ({
        date: date.slice(5),
        issues,
      }));
  }, [allTickets]);

  const ratingDistributionData = useMemo(() => {
    const buckets: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allTickets.forEach((ticket) => {
      const score = ticket.customer_satisfaction;
      if (typeof score === 'number' && buckets[score] !== undefined) {
        buckets[score] += 1;
      }
    });

    return [1, 2, 3, 4, 5].map((rating) => ({
      rating: `${rating} Star`,
      count: buckets[rating],
    }));
  }, [allTickets]);

  const ratingCoverageStats = useMemo(() => {
    const totalRatedTickets = allTickets.filter((ticket) => typeof ticket.customer_satisfaction === 'number').length;
    const positiveRatings = allTickets.filter((ticket) => (ticket.customer_satisfaction || 0) >= 4).length;
    const positiveRate = totalRatedTickets > 0 ? Math.round((positiveRatings / totalRatedTickets) * 1000) / 10 : 0;

    return {
      totalRatedTickets,
      positiveRate,
    };
  }, [allTickets]);

  const uptimePercent = useMemo(() => {
    const uptimeRaw = dashboardData?.system_health?.uptime;
    if (!uptimeRaw) return 0;
    const parsed = Number.parseFloat(String(uptimeRaw).replace('%', '').trim());
    if (Number.isNaN(parsed)) return 0;
    return Math.max(0, Math.min(100, parsed));
  }, [dashboardData?.system_health?.uptime]);

  const aiModelPerformancePercent = useMemo(() => {
    const value = dashboardData?.messages?.ai_resolution_rate;
    if (typeof value !== 'number' || Number.isNaN(value)) return 0;
    return Math.max(0, Math.min(100, value));
  }, [dashboardData?.messages?.ai_resolution_rate]);

  const totalMessagesProcessedPercent = useMemo(() => {
    const total = dashboardData?.messages?.total;
    if (typeof total !== 'number' || Number.isNaN(total) || total <= 0) return 0;
    // Use a stable 1000-message reference so the bar communicates relative volume.
    return Math.max(0, Math.min(100, (total / 1000) * 100));
  }, [dashboardData?.messages?.total]);

  const aiHandledMessagesPercent = useMemo(() => {
    const total = dashboardData?.messages?.total;
    const handled = dashboardData?.messages?.ai_handled;
    if (typeof total !== 'number' || Number.isNaN(total) || total <= 0) return 0;
    if (typeof handled !== 'number' || Number.isNaN(handled) || handled <= 0) return 0;
    return Math.max(0, Math.min(100, (handled / total) * 100));
  }, [dashboardData?.messages?.total, dashboardData?.messages?.ai_handled]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  useEffect(() => {
    const overdue = computeAdminOverdueNotifications(allTickets, user?.id);
    const created = computeAdminTicketCreatedNotifications(allTickets, user?.id);
    const merged = [...created.notifications, ...overdue.notifications];

    setAdminNotifications(merged);
    setAdminUnreadCount(created.totalUnread + overdue.totalUnread);
  }, [allTickets, user?.id]);

  useEffect(() => {
    if (tabValue !== 4 || !notificationFocusTicketId) {
      return;
    }

    const row = document.getElementById(`admin-ticket-row-${notificationFocusTicketId}`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const timer = window.setTimeout(() => setNotificationFocusTicketId(null), 1800);
      return () => window.clearTimeout(timer);
    }
  }, [tabValue, notificationFocusTicketId, allTickets, ticketStatusFilter, ticketPriorityFilter, showOverdueOnly]);

  useEffect(() => {
    if (reportPeriod === 'custom') return;
    const range = getDateRangeForPeriod(reportPeriod);
    setReportStartDate(range.startDate);
    setReportEndDate(range.endDate);
  }, [reportPeriod]);

  const filteredUsersForReport = useMemo(
    () => filterByDateRange(users, (entry) => entry.created_at, reportStartDate, reportEndDate),
    [users, reportStartDate, reportEndDate]
  );

  const filteredTicketsForReport = useMemo(
    () => filterByDateRange(allTickets, (entry) => entry.created_at, reportStartDate, reportEndDate),
    [allTickets, reportStartDate, reportEndDate]
  );

  const filteredIssuesForReport = useMemo(() => {
    const grouped = filteredTicketsForReport.reduce<Record<string, number>>((acc, ticket) => {
      const key = new Date(ticket.created_at).toISOString().slice(0, 10);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, issue_count]) => ({ date, issue_count }));
  }, [filteredTicketsForReport]);

  const resolvedTodayCount = useMemo(() => {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    return allTickets.filter((ticket) => {
      if (!ticket.resolved_at) return false;
      return new Date(ticket.resolved_at).toISOString().slice(0, 10) === todayKey;
    }).length;
  }, [allTickets]);

  const pendingTicketsCount = useMemo(() => {
    return allTickets.filter((ticket) => {
      const status = (ticket.status || '').toLowerCase();
      return status === 'open' || status === 'pending';
    }).length;
  }, [allTickets]);

  const ticketResolutionStats = useMemo(() => {
    const resolvedOrClosedFromList = allTickets.filter((ticket) => {
      const status = (ticket.status || '').toLowerCase();
      return status === 'resolved' || status === 'closed';
    });

    const totalTicketCount = allTickets.length > 0
      ? allTickets.length
      : (dashboardData?.tickets?.total || 0);

    const resolvedOrClosedCount = allTickets.length > 0
      ? resolvedOrClosedFromList.length
      : ((dashboardData?.tickets?.resolved || 0) + (dashboardData?.tickets?.closed || 0));

    const aiResolvedCount = resolvedOrClosedFromList.filter((ticket) => !ticket.assigned_agent_id).length;

    const resolutionRate = totalTicketCount > 0
      ? (resolvedOrClosedCount / totalTicketCount) * 100
      : 0;

    const aiResolutionRate = resolvedOrClosedCount > 0
      ? (aiResolvedCount / resolvedOrClosedCount) * 100
      : 0;

    return {
      totalTicketCount,
      resolvedOrClosedCount,
      aiResolvedCount,
      resolutionRate,
      aiResolutionRate,
    };
  }, [allTickets, dashboardData?.tickets?.closed, dashboardData?.tickets?.resolved, dashboardData?.tickets?.total]);

  const downloadAdminUsersReport = () => {
    downloadCsv(
      `admin-users-report-${reportStartDate}-to-${reportEndDate}.csv`,
      filteredUsersForReport.map((entry) => ({
        id: entry.id,
        name: entry.name,
        email: entry.email,
        role: entry.role,
        active: entry.is_active,
        created_at: entry.created_at,
      }))
    );
  };

  const downloadAdminTicketsReport = () => {
    downloadCsv(
      `admin-tickets-report-${reportStartDate}-to-${reportEndDate}.csv`,
      filteredTicketsForReport.map((entry) => ({
        ticket_id: entry.ticket_id,
        subject: entry.subject,
        category: entry.category,
        priority: entry.priority,
        status: entry.status,
        customer_name: entry.customer_name || '',
        agent_name: entry.agent_name || '',
        created_at: entry.created_at,
        resolution_due: entry.resolution_due || '',
        is_overdue: entry.is_overdue,
      }))
    );
  };

  const downloadAdminIssuesReport = () => {
    downloadCsv(
      `admin-issues-report-${reportStartDate}-to-${reportEndDate}.csv`,
      filteredIssuesForReport
    );
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      await adminAPI.toggleUserStatus(userId);
      fetchUsers();
    } catch (err) {
      console.error('Failed to toggle user status:', err);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'agent': return 'primary';
      case 'customer': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  const overviewCardHeaderSx = {
    py: 0.5,
    px: 1.25,
    '& .MuiCardHeader-action': {
      m: 0,
      alignSelf: 'center',
    },
    '& .MuiCardHeader-title': {
      fontWeight: 650,
      fontSize: '0.82rem',
    },
    '& .MuiCardHeader-subheader': {
      fontSize: '0.68rem',
    },
  };
  const displayName = profileName || user?.name || 'Admin User';

  const adminSidebarSections: DashboardShellNavSection[] = [
    {
      id: 'main',
      title: 'Main',
      items: [
        { id: 'admin-overview', label: 'Overview', icon: <DashboardIcon sx={{ fontSize: 13 }} />, active: tabValue === 0, onClick: () => setTabValue(0) },
        { id: 'admin-ai', label: 'AI Analytics', icon: <AIIcon sx={{ fontSize: 13 }} />, active: tabValue === 1, onClick: () => setTabValue(1) },
        { id: 'admin-users', label: 'Users', icon: <PeopleIcon sx={{ fontSize: 13 }} />, active: tabValue === 2, onClick: () => setTabValue(2) },
        { id: 'admin-escalations', label: 'Escalations', icon: <WarningIcon sx={{ fontSize: 13 }} />, active: tabValue === 3, onClick: () => setTabValue(3) },
        { id: 'admin-tickets', label: 'Tickets', icon: <TicketIcon sx={{ fontSize: 13 }} />, active: tabValue === 4, onClick: () => setTabValue(4) },
        { id: 'admin-reports', label: 'Reports', icon: <ReportsIcon sx={{ fontSize: 13 }} />, active: tabValue === 5, onClick: () => setTabValue(5) },
        { id: 'admin-config', label: 'Configuration', icon: <SettingsIcon sx={{ fontSize: 13 }} />, active: tabValue === 6, onClick: () => setTabValue(6) },
        { id: 'admin-intergartions', label: 'Intergartions', icon: <SpeedIcon sx={{ fontSize: 13 }} />, active: tabValue === 7, onClick: () => setTabValue(7) },
      ],
    },
    {
      id: 'operations',
      title: 'Operations',
      items: [
        { id: 'admin-dashboard-home', label: 'Dashboard Home', icon: <DashboardIcon sx={{ fontSize: 13 }} />, onClick: () => navigate(dashboardRoute) },
        { id: 'admin-console', label: 'Agent Console', icon: <ChatIcon sx={{ fontSize: 13 }} />, onClick: () => navigate('/agent/console') },
        { id: 'admin-chat', label: 'Chat', icon: <ChatIcon sx={{ fontSize: 13 }} />, onClick: () => navigate('/chat') },
        { id: 'admin-banking', label: 'Banking', icon: <BankingIcon sx={{ fontSize: 13 }} />, onClick: () => navigate('/banking') },
        { id: 'admin-locations', label: 'Locations', icon: <FilterIcon sx={{ fontSize: 13 }} />, onClick: () => navigate('/admin/locations') },
        { id: 'admin-nlp', label: 'NLP Review', icon: <AIIcon sx={{ fontSize: 13 }} />, onClick: () => navigate('/admin/nlp-feedback') },
      ],
    },
    {
      id: 'account',
      title: 'Account',
      items: [
        { id: 'admin-profile', label: 'Profile', icon: <ProfileIcon sx={{ fontSize: 13 }} />, onClick: handleOpenProfileDialog },
        { id: 'admin-logout', label: 'Logout', icon: <LogoutIcon sx={{ fontSize: 13 }} />, onClick: handleLogout },
      ],
    },
  ];

  const adminTopActions = (
    <>
      <NotificationBell
        items={adminNotifications}
        unreadCount={adminUnreadCount}
        onOpenItem={(item) => {
          const ticketId = typeof item.meta?.ticket_id === 'string' ? item.meta.ticket_id : null;
          setTabValue(4);
          setTicketStatusFilter('');
          setTicketPriorityFilter('');
          setShowOverdueOnly(item.route === '#overdue-tickets');
          setNotificationFocusTicketId(ticketId);
        }}
        onMarkAllRead={() => {
          markAdminOverdueNotificationsRead(user?.id, allTickets);
          markAdminTicketCreatedNotificationsRead(user?.id, allTickets);
          setAdminNotifications([]);
          setAdminUnreadCount(0);
        }}
        tooltip="Overdue ticket alerts"
      />

      <button type="button" className="btn" onClick={(event) => handleOpenProfileMenu(event)}>
        <ProfileIcon sx={{ fontSize: 12 }} /> {profileName || 'Admin'}
      </button>
      <button type="button" className="btn" onClick={handleRefresh} disabled={refreshing}>
        <RefreshIcon sx={{ fontSize: 12 }} className={refreshing ? 'rotating' : ''} /> Refresh
      </button>
      <button type="button" className="btn" onClick={handleLogout}>
        <LogoutIcon sx={{ fontSize: 12 }} /> Logout
      </button>
    </>
  );

  return (
    <DashboardShell
      roleClassName="role-dashboard-admin"
      brandLabel="Taur.ai Admin"
      brandIcon={<DashboardIcon sx={{ fontSize: 13 }} />}
      sidebarSections={adminSidebarSections}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search analytics, users, tickets, and reports..."
      topActions={adminTopActions}
      userName={displayName}
      userMeta="Admin control room"
      userInitials={toInitials(displayName, 'AD')}
      onUserCardClick={handleOpenProfileDialog}
    >
      <Menu
        anchorEl={profileAnchorEl}
        open={Boolean(profileAnchorEl)}
        onClose={handleCloseProfileMenu}
      >
        <Box sx={{ px: 2, py: 1.25, minWidth: 240 }}>
          <Typography variant="subtitle2" fontWeight={700}>{profileName || 'Admin User'}</Typography>
          <Typography variant="caption" color="text.secondary" display="block">{profileEmail || 'No email'}</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ textTransform: 'capitalize' }}>
            Role: {profileRole || 'admin'}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleOpenProfileDialog}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Update Profile
        </MenuItem>
        <MenuItem onClick={() => { handleCloseProfileMenu(); handleLogout(); }}>
          <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>

      <Dialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Admin Profile</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            label="Full Name"
            size="small"
            fullWidth
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            sx={{ mb: 1.5 }}
          />
          <TextField
            label="Email"
            size="small"
            fullWidth
            value={profileEmail}
            onChange={(e) => setProfileEmail(e.target.value)}
            sx={{ mb: 1.5 }}
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
            onChange={(e) => setCurrentPassword(e.target.value)}
            sx={{ mb: 1 }}
          />
          <TextField
            label="New Password"
            type="password"
            size="small"
            fullWidth
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            sx={{ mb: 1 }}
          />
          <TextField
            label="Confirm New Password"
            type="password"
            size="small"
            fullWidth
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveProfile}>Save</Button>
        </DialogActions>
      </Dialog>

      {profileMessage && (
        <Alert severity={profileMessageType} sx={{ mb: 1.25 }} onClose={() => setProfileMessage(null)}>
          {profileMessage}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}

      {/* Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={1} mb={0.9}>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              title="Total Tickets"
              value={dashboardData?.tickets.total || 0}
              subtitle={`${dashboardData?.tickets.open || 0} open`}
              icon={<TicketIcon />}
              color="primary"
              trend={{ value: 12, positive: true }}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              title="Resolution Rate"
              value={`${ticketResolutionStats.resolutionRate.toFixed(1)}%`}
              subtitle={`${ticketResolutionStats.resolvedOrClosedCount}/${ticketResolutionStats.totalTicketCount} resolved or closed`}
              icon={<CheckCircleIcon />}
              color="success"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              title="Active Chat Sessions"
              value={dashboardData?.chat_sessions.active || 0}
              subtitle={`${dashboardData?.chat_sessions.total || 0} total`}
              icon={<ChatIcon />}
              color="info"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              title="AI Resolution Rate"
              value={`${ticketResolutionStats.aiResolutionRate.toFixed(1)}%`}
              subtitle={`${ticketResolutionStats.aiResolvedCount}/${ticketResolutionStats.resolvedOrClosedCount} resolved without handoff`}
              icon={<AIIcon />}
              color="warning"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              title="Avg Customer Rating"
              value={`${dashboardData?.ratings?.average?.toFixed(2) || '0.00'}/5`}
              subtitle={`${dashboardData?.ratings?.total || 0} ratings`}
              icon={<StarIcon />}
              color="info"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              title="Positive Ratings"
              value={`${ratingCoverageStats.positiveRate.toFixed(1)}%`}
              subtitle={`${ratingCoverageStats.totalRatedTickets} rated tickets`}
              icon={<TrendingUpIcon />}
              color="success"
            />
          </Grid>
        </Grid>

        <Grid container spacing={1} alignItems="stretch">
          <Grid item xs={12} lg={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
              <Card elevation={1} sx={{ borderRadius: 0.75, display: 'flex', flexDirection: 'column', flex: { lg: 1 } }}>
                <CardHeader title="Users Distribution" subheader="By role" sx={overviewCardHeaderSx} />
                <CardContent
                  sx={{
                    height: { xs: 198, lg: 'auto' },
                    flex: { lg: 1 },
                    minHeight: 0,
                    px: { xs: 1, sm: 1.25 },
                    pt: 0.5,
                    pb: 0.25,
                  }}
                >
                  {userDistributionData.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" py={6}>
                      No user data available.
                    </Typography>
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'stretch',
                        gap: 0.35,
                        height: '100%',
                      }}
                    >
                      <Box sx={{ flex: '1 1 auto', minWidth: 0, height: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 0, right: 0, left: -12, bottom: 0 }}>
                            <Pie
                              data={userDistributionData}
                              dataKey="value"
                              nameKey="name"
                              cx="43%"
                              cy="50%"
                              outerRadius={72}
                              label={false}
                              labelLine={false}
                            >
                              {userDistributionData.map((entry, index) => (
                                <Cell key={`${entry.name}-${index}`} fill={userDistributionColors[index % userDistributionColors.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>

                      <Box
                        sx={{
                          width: { xs: 138, sm: 154 },
                          pr: { sm: 0.5 },
                          pl: { sm: 0.25 },
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Box sx={{ width: '100%' }}>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', mb: 0.6 }}>
                            Key
                          </Typography>
                          {userDistributionData.map((entry, index) => {
                            const percentage = totalUsersInDistribution > 0
                              ? Math.round((entry.value / totalUsersInDistribution) * 100)
                              : 0;

                            return (
                              <Box
                                key={`${entry.name}-legend-${index}`}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 0.8,
                                  py: 0.35,
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                                  <Box
                                    sx={{
                                      width: 10,
                                      height: 10,
                                      borderRadius: '50%',
                                      backgroundColor: userDistributionColors[index % userDistributionColors.length],
                                      mr: 0.7,
                                      flexShrink: 0,
                                    }}
                                  />
                                  <Typography
                                    sx={{
                                      fontSize: '0.78rem',
                                      color: 'text.secondary',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {entry.name}
                                  </Typography>
                                </Box>
                                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'text.primary' }}>
                                  {entry.value} ({percentage}%)
                                </Typography>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>

              <Card elevation={1} sx={{ borderRadius: 0.75, display: 'flex', flexDirection: 'column', flex: { lg: 1 } }}>
                <CardHeader
                  title="Average Resolution Time"
                  subheader="Trend by time window"
                  sx={overviewCardHeaderSx}
                />
                <CardContent sx={{ height: { xs: 198, lg: 'auto' }, flex: { lg: 1 }, minHeight: 0, pt: 0.5, pb: 0.25 }}>
                  {resolutionTrend.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" py={6}>
                      No resolution trend data available.
                    </Typography>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={resolutionTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="period"
                          tick={{ fontSize: 10 }}
                          label={{ value: 'Time Window', position: 'insideBottom', offset: -3, style: { fontSize: 10 } }}
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
                        />
                        <RechartsTooltip />
                        <Line
                          type="monotone"
                          dataKey="avg_resolution_time_hours"
                          stroke={theme.palette.primary.main}
                          strokeWidth={3}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
              <Card elevation={1} sx={{ borderRadius: 0.75, display: 'flex', flexDirection: 'column', flex: { lg: 1 } }}>
                <CardHeader
                  title="Issues Graph"
                  subheader="Tickets created (last 14 records)"
                  sx={overviewCardHeaderSx}
                />
                <CardContent sx={{ height: { xs: 198, lg: 'auto' }, flex: { lg: 1 }, minHeight: 0, pt: 0.5, pb: 0.25 }}>
                  {issuesGraphData.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" py={6}>
                      No ticket issue data available.
                    </Typography>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={issuesGraphData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          label={{ value: 'Date (MM-DD)', position: 'insideBottom', offset: -3, style: { fontSize: 10 } }}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 10 }}
                          label={{ value: 'Issue Count', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
                        />
                        <RechartsTooltip />
                        <Bar dataKey="issues" fill={theme.palette.warning.main} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card
                elevation={1}
                sx={{
                  borderRadius: 0.75,
                  display: 'flex',
                  flexDirection: 'column',
                  flex: { lg: 1 },
                  overflow: 'hidden',
                  border: `1px solid ${alpha('#3f73ff', 0.32)}`,
                  boxShadow: '0 8px 16px rgba(47, 95, 244, 0.12)',
                }}
              >
                <CardHeader
                  title="Customer Ratings Distribution"
                  subheader="Ratings captured from ticket feedback"
                  sx={overviewCardHeaderSx}
                />
                <CardContent
                  sx={{
                    height: { xs: 198, lg: 'auto' },
                    flex: { lg: 1 },
                    minHeight: 0,
                    pt: 0.5,
                    pb: 0.25,
                    background: 'linear-gradient(180deg, rgba(234, 240, 255, 0.55) 0%, #ffffff 70%)',
                  }}
                >
                  {ratingDistributionData.every((entry) => entry.count === 0) ? (
                    <Typography color="text.secondary" textAlign="center" py={6}>
                      No customer rating data available yet.
                    </Typography>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ratingDistributionData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={alpha('#3f73ff', 0.22)} />
                        <XAxis dataKey="rating" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                        <RechartsTooltip />
                        <Bar dataKey="count" fill="#3f73ff" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Grid>

          <Grid item xs={12} lg={3}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Card elevation={1} sx={{ borderRadius: 0.75, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardHeader
                  title="Performance Metrics"
                  sx={overviewCardHeaderSx}
                  action={
                    <FormControl size="small" sx={{ minWidth: 96 }}>
                      <InputLabel>Period</InputLabel>
                      <Select
                        value={performancePeriod}
                        label="Period"
                        onChange={(e) => setPerformancePeriod(e.target.value as number)}
                      >
                        <MenuItem value={7}>7d</MenuItem>
                        <MenuItem value={14}>14d</MenuItem>
                        <MenuItem value={30}>30d</MenuItem>
                      </Select>
                    </FormControl>
                  }
                />
                <CardContent
                  sx={{
                    height: { xs: 'auto', lg: 420 },
                    pt: 0.5,
                    pb: 0.75,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.1,
                  }}
                >
                  <List
                    dense
                    sx={{
                      py: 0,
                      '& .MuiListItemText-primary': { fontSize: '0.76rem' },
                      '& .MuiListItemText-secondary': { fontSize: '0.7rem' },
                    }}
                  >
                    <ListItem sx={{ py: 0 }}>
                      <ListItemAvatar sx={{ minWidth: 30 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 24, height: 24 }}>
                          <SpeedIcon sx={{ fontSize: 14 }} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Avg. Resolution Time"
                        secondary={`${performanceData?.average_resolution_time_hours || 0} hours`}
                      />
                    </ListItem>
                    <Divider component="li" />
                    <ListItem sx={{ py: 0 }}>
                      <ListItemAvatar sx={{ minWidth: 30 }}>
                        <Avatar sx={{ bgcolor: 'success.main', width: 24, height: 24 }}>
                          <StarIcon sx={{ fontSize: 14 }} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Customer Satisfaction"
                        secondary={`${performanceData?.average_customer_satisfaction || 0}/5`}
                      />
                    </ListItem>
                    <Divider component="li" />
                    <ListItem sx={{ py: 0 }}>
                      <ListItemAvatar sx={{ minWidth: 30 }}>
                        <Avatar sx={{ bgcolor: 'info.main', width: 24, height: 24 }}>
                          <CheckCircleIcon sx={{ fontSize: 14 }} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="First Contact Resolution"
                        secondary={`${performanceData?.first_contact_resolution_rate || 0}%`}
                      />
                    </ListItem>
                    <Divider component="li" />
                    <ListItem sx={{ py: 0 }}>
                      <ListItemAvatar sx={{ minWidth: 30 }}>
                        <Avatar sx={{ bgcolor: 'warning.main', width: 24, height: 24 }}>
                          <WarningIcon sx={{ fontSize: 14 }} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="Escalation Rate"
                        secondary={`${performanceData?.escalation_rate || 0}%`}
                      />
                    </ListItem>
                  </List>

                  <Box sx={{ pt: 0.85, borderTop: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, mb: 0.1 }}>System Health</Typography>
                    <Box>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography sx={{ fontSize: '0.76rem', fontWeight: 500, color: 'text.secondary' }}>System Uptime</Typography>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }}>
                          {dashboardData?.system_health.uptime || 'N/A'}
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={uptimePercent} color="success" sx={{ height: 6, borderRadius: 6 }} />
                    </Box>

                    <Box>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography sx={{ fontSize: '0.76rem', fontWeight: 500, color: 'text.secondary' }}>AI Model Performance</Typography>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }}>{aiModelPerformancePercent.toFixed(1)}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={aiModelPerformancePercent} color="primary" sx={{ height: 6, borderRadius: 6 }} />
                    </Box>

                    <Box sx={{ pt: 0.75, mt: 0.2, borderTop: 1, borderColor: 'divider' }}>
                      <Box display="flex" justifyContent="space-between" mb={0.6}>
                        <Typography sx={{ fontSize: '0.76rem', fontWeight: 500, color: 'text.secondary' }}>Total Messages Processed</Typography>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }}>
                          {dashboardData?.messages.total?.toLocaleString() || 0}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={totalMessagesProcessedPercent}
                        color="info"
                        sx={{ height: 6, borderRadius: 6, mb: 0.9 }}
                      />
                      <Box display="flex" justifyContent="space-between" mb={0.6}>
                        <Typography sx={{ fontSize: '0.76rem', fontWeight: 500, color: 'text.secondary' }}>AI Handled Messages</Typography>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: 'success.main' }}>
                          {dashboardData?.messages.ai_handled?.toLocaleString() || 0}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={aiHandledMessagesPercent}
                        color="success"
                        sx={{ height: 6, borderRadius: 6 }}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>
      </TabPanel>

      {/* AI Analytics Tab */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3} alignItems="stretch">
          {/* Row 1: Most Frequent Queries — full width */}
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardHeader title="Most Frequent Customer Queries" avatar={<TrendingUpIcon color="primary" />} />
              <CardContent>
                <TableContainer sx={{ borderRadius: 2 }}>
                  <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
                    <TableHead>
                      <TableRow sx={{ '& .MuiTableCell-head': { backgroundColor: alpha(theme.palette.primary.main, 0.07) } }}>
                        <TableCell sx={{ width: '46%' }}>Query</TableCell>
                        <TableCell align="right" sx={{ width: 90 }}>Count</TableCell>
                        <TableCell align="right" sx={{ width: 110 }}>Percentage</TableCell>
                        <TableCell sx={{ width: '30%' }}>Frequency</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {frequentQueries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <Typography color="text.secondary" textAlign="center" py={3}>
                              No frequent query data available yet.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        frequentQueries.map((item, index) => (
                          <TableRow key={`${item.query}-${index}`} sx={{ '&:nth-of-type(odd)': { backgroundColor: alpha(theme.palette.primary.main, 0.025) } }}>
                            <TableCell>
                              <Tooltip title={item.query}>
                                <Typography variant="body2" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                                  {item.query}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell align="right">{item.count}</TableCell>
                            <TableCell align="right">{item.percentage?.toFixed(1)}%</TableCell>
                            <TableCell>
                              <LinearProgress variant="determinate" value={item.percentage || 0} sx={{ height: 8, borderRadius: 4 }} />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Row 2: Intent Distribution (wide) + Model Statistics (narrow) — equal height */}
          <Grid item xs={12} lg={8} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Card elevation={3} sx={{ flex: 1 }}>
              <CardHeader
                title="Intent Distribution"
                subheader="Most common customer intents detected by AI"
                avatar={<AIIcon color="primary" />}
              />
              <CardContent>
                <TableContainer sx={{ borderRadius: 2 }}>
                  <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
                    <TableHead>
                      <TableRow sx={{ '& .MuiTableCell-head': { backgroundColor: alpha(theme.palette.primary.main, 0.07) } }}>
                        <TableCell sx={{ width: '42%' }}>Intent</TableCell>
                        <TableCell align="right" sx={{ width: 90 }}>Count</TableCell>
                        <TableCell align="right" sx={{ width: 110 }}>Percentage</TableCell>
                        <TableCell sx={{ width: '30%' }}>Distribution</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {intentDistribution.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <Typography color="text.secondary" textAlign="center" py={3}>
                              No intent data yet. Send some chat messages to populate.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        intentDistribution.map((item) => (
                          <TableRow key={item.intent} sx={{ '&:nth-of-type(odd)': { backgroundColor: alpha(theme.palette.primary.main, 0.025) } }}>
                            <TableCell>
                              <Chip label={item.intent.replace(/_/g, ' ')} size="small" variant="outlined" sx={{ textTransform: 'capitalize', maxWidth: '100%' }} />
                            </TableCell>
                            <TableCell align="right">{item.count}</TableCell>
                            <TableCell align="right">{item.percentage?.toFixed(1)}%</TableCell>
                            <TableCell>
                              <LinearProgress variant="determinate" value={item.percentage || 0} sx={{ height: 8, borderRadius: 4 }} />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Card elevation={3} sx={{ flex: 1 }}>
              <CardHeader title="Model Statistics" avatar={<TimelineIcon color="primary" />} />
              <CardContent sx={{ pt: 0 }}>
                <List dense disablePadding>
                  {[
                    { label: 'Model', value: 'XLM-RoBERTa (multilingual)' },
                    { label: 'Training Samples', value: '729' },
                    { label: 'Intent Categories', value: '23' },
                    { label: 'Languages', value: 'English, Shona, Ndebele' },
                    { label: 'Confidence Threshold', value: '45%' },
                    { label: 'Fallback', value: 'Rule-based classification' },
                  ].map(({ label, value }, i, arr) => (
                    <Box key={label}>
                      <ListItem sx={{ py: 1.2 }}>
                        <ListItemText
                          primary={<Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>{label}</Typography>}
                          secondary={<Typography variant="body2" fontWeight={500}>{value}</Typography>}
                        />
                      </ListItem>
                      {i < arr.length - 1 && <Divider />}
                    </Box>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Configuration Tab */}
      <TabPanel value={tabValue} index={6}>
        {/* ── Row 1: LLM settings + WhatsApp settings, equal height ── */}
        <Grid container spacing={3} alignItems="stretch" mb={0}>
          <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Card elevation={3} sx={{ flex: 1 }}>
              <CardHeader
                title="LLM Personalised Responses"
                subheader="Use AI (GPT) for natural, context-aware replies"
                avatar={<AIIcon color="primary" />}
                action={
                  llmStatus && (
                    <Switch
                      checked={llmStatus.enabled && llmStatus.available}
                      onChange={handleLLMToggle}
                      disabled={llmSaving || !llmStatus.has_api_key}
                      color="success"
                    />
                  )
                }
              />
              <CardContent>
                {llmStatus ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Chip
                        label={llmStatus.available ? 'Active' : llmStatus.enabled ? 'Enabled (no key)' : 'Disabled'}
                        color={llmStatus.available ? 'success' : llmStatus.enabled ? 'warning' : 'default'}
                        size="small"
                      />
                      <Chip label={`Model: ${llmStatus.model}`} variant="outlined" size="small" />
                      <Chip label={`Provider: ${llmStatus.provider}`} variant="outlined" size="small" />
                    </Box>
                    {!llmStatus.available && (
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                        <TextField label="OpenAI API Key" type="password" size="small" value={llmApiKey} onChange={(e) => setLlmApiKey(e.target.value)} placeholder="sk-..." sx={{ flex: 1 }} />
                        <Button variant="contained" size="small" onClick={handleLLMSaveKey} disabled={llmSaving || !llmApiKey.trim()}>Save & Enable</Button>
                      </Box>
                    )}
                    <FormControl size="small" sx={{ maxWidth: 280 }}>
                      <InputLabel>Model</InputLabel>
                      <Select value={llmStatus.model} label="Model" onChange={(e) => handleLLMModelChange(e.target.value)} disabled={llmSaving}>
                        <MenuItem value="gpt-4o-mini">GPT-4o Mini (fast, cheap)</MenuItem>
                        <MenuItem value="gpt-4o">GPT-4o (best quality)</MenuItem>
                        <MenuItem value="gpt-4.1-mini">GPT-4.1 Mini</MenuItem>
                        <MenuItem value="gpt-4.1-nano">GPT-4.1 Nano (fastest)</MenuItem>
                      </Select>
                    </FormControl>
                    <Typography variant="caption" color="text.secondary">
                      When enabled, the LLM enhances template responses with natural, personalised language.
                      Intent classification and escalation logic remain rule-based. Falls back to templates if LLM is unavailable.
                    </Typography>
                  </Box>
                ) : (
                  <Typography color="text.secondary">Loading LLM status...</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Card elevation={3} sx={{ flex: 1 }}>
              <CardHeader
                title="WhatsApp Business Integration"
                subheader="Meta Cloud API · WhatsApp chatbot channel"
                avatar={<SpeedIcon color="primary" />}
              />
              <CardContent>
                {waStatus ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Chip label={waStatus.configured ? 'Connected' : 'Not Connected'} color={waStatus.configured ? 'success' : 'default'} size="small" />
                      <Chip label={`Provider: ${waStatus.provider}`} variant="outlined" size="small" />
                      {waStatus.phone_number_id && <Chip label={`Phone ID: ${waStatus.phone_number_id}`} variant="outlined" size="small" />}
                    </Box>
                    <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight="bold" display="block" gutterBottom>Webhook URL (set in Meta Developer Portal):</Typography>
                      <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                        https://your-domain.com/api/v1/integrations/whatsapp/webhook
                      </Typography>
                    </Box>
                    {!waStatus.configured && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">Enter your Meta WhatsApp Business API credentials:</Typography>
                        <TextField label="Permanent Access Token" type="password" size="small" value={waAccessToken} onChange={(e) => setWaAccessToken(e.target.value)} placeholder="EAAx..." fullWidth />
                        <TextField label="Phone Number ID" size="small" value={waPhoneId} onChange={(e) => setWaPhoneId(e.target.value)} placeholder="e.g. 123456789012345" fullWidth />
                        <TextField label="Business Account ID (optional)" size="small" value={waBusinessId} onChange={(e) => setWaBusinessId(e.target.value)} placeholder="e.g. 987654321" fullWidth />
                        <Button variant="contained" size="small" onClick={handleWhatsAppSave} disabled={waSaving || (!waAccessToken.trim() && !waPhoneId.trim())} sx={{ alignSelf: 'flex-start' }}>
                          Save & Connect
                        </Button>
                      </Box>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      WhatsApp messages are processed by the same NLP + LLM pipeline as web chat.
                      Customers are auto-registered and sessions are persisted across messages.
                    </Typography>
                  </Box>
                ) : (
                  <Typography color="text.secondary">Loading WhatsApp status...</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── Token Management — full width ── */}
        <Grid container spacing={3} alignItems="stretch" mt={0}>
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardHeader
                title="WhatsApp Access Token"
                subheader="Check token validity and update when expired — no server restart needed"
                avatar={<SpeedIcon color="warning" />}
              />
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Token status banner */}
                  {waTokenStatus && (
                    <Box sx={{
                      p: 1.5, borderRadius: 1,
                      bgcolor: waTokenStatus.valid ? 'success.50' : waTokenStatus.expired ? 'error.50' : 'warning.50',
                      border: 1,
                      borderColor: waTokenStatus.valid ? 'success.300' : waTokenStatus.expired ? 'error.300' : 'warning.300',
                      display: 'flex', alignItems: 'center', gap: 1.5,
                    }}>
                      <Chip
                        label={waTokenStatus.valid ? 'Valid' : waTokenStatus.expired ? 'Expired' : 'Invalid'}
                        color={waTokenStatus.valid ? 'success' : 'error'}
                        size="small"
                      />
                      {waTokenStatus.valid && waTokenStatus.name && (
                        <Typography variant="body2">App: <strong>{waTokenStatus.name}</strong></Typography>
                      )}
                      {!waTokenStatus.valid && waTokenStatus.reason && (
                        <Typography variant="body2" color="error.main">{waTokenStatus.reason}</Typography>
                      )}
                    </Box>
                  )}

                  {/* Feedback message after save */}
                  {waTokenMessage && (
                    <Box sx={{
                      p: 1.5, borderRadius: 1,
                      bgcolor: waTokenMessage.type === 'success' ? 'success.50' : 'error.50',
                      border: 1,
                      borderColor: waTokenMessage.type === 'success' ? 'success.300' : 'error.300',
                    }}>
                      <Typography variant="body2" color={waTokenMessage.type === 'success' ? 'success.main' : 'error.main'}>
                        {waTokenMessage.text}
                      </Typography>
                    </Box>
                  )}

                  {/* Actions row */}
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={checkWaTokenStatus}
                      disabled={waTokenChecking}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      {waTokenChecking ? 'Checking…' : 'Check Token Status'}
                    </Button>

                    <Box sx={{ display: 'flex', gap: 1, flex: 1, minWidth: 280 }}>
                      <TextField
                        label="New Access Token"
                        type="password"
                        size="small"
                        value={waNewToken}
                        onChange={(e) => { setWaNewToken(e.target.value); setWaTokenMessage(null); }}
                        placeholder="EAAx..."
                        sx={{ flex: 1 }}
                        helperText="Paste a new token from Meta Developer Portal"
                      />
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleWaTokenSave}
                        disabled={waTokenSaving || !waNewToken.trim()}
                        sx={{ whiteSpace: 'nowrap', alignSelf: 'flex-start', mt: 0.1 }}
                      >
                        {waTokenSaving ? 'Saving…' : 'Validate & Save'}
                      </Button>
                    </Box>
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    Meta temporary tokens expire every few hours. A <strong>System User permanent token</strong> from Meta Business Suite never expires.
                    Get one via: Business Settings → System Users → Generate New Token → grant <em>whatsapp_business_messaging</em>.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

      </TabPanel>

      {/* Intergartions Tab */}
      <TabPanel value={tabValue} index={7}>
        <Grid container spacing={3} alignItems="stretch" mt={0}>
          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Card elevation={3} sx={{ flex: 1 }}>
              <CardHeader title="AI Confidence Levels" avatar={<AIIcon color="primary" />} />
              <CardContent>
                {[
                  { label: 'High Confidence (>70%)', value: 78, color: 'success' as const },
                  { label: 'Medium (45–70%)', value: 15, color: 'warning' as const },
                  { label: 'Low (<45%, rule-based)', value: 7, color: 'info' as const },
                ].map(({ label, value, color }) => (
                  <Box key={label} mb={2}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2">{label}</Typography>
                      <Typography variant="body2" color={`${color}.main`} fontWeight={700}>{value}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={value} color={color} sx={{ height: 8, borderRadius: 4 }} />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Card elevation={3} sx={{ flex: 1 }}>
              <CardHeader title="Channel Integrations" avatar={<ChatIcon color="primary" />} />
              <CardContent sx={{ pt: 0 }}>
                <List dense disablePadding>
                  {channelStatus.length === 0 ? (
                    <ListItem><ListItemText primary="No integration status available" /></ListItem>
                  ) : (
                    channelStatus.map((channel, i) => (
                      <Box key={channel.name}>
                        <ListItem sx={{ py: 1.5 }}>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2" fontWeight={600}>{channel.name.toUpperCase()}</Typography>
                                <Chip label={channel.status} size="small" color="success" variant="outlined" />
                              </Box>
                            }
                            secondary={channel.phone ? `${channel.description} (${channel.phone})` : channel.description}
                          />
                        </ListItem>
                        {i < channelStatus.length - 1 && <Divider />}
                      </Box>
                    ))
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Card elevation={3} sx={{ flex: 1 }}>
              <CardHeader title="Provider Integration Readiness" avatar={<BankingIcon color="primary" />} />
              <CardContent sx={{ pt: 0 }}>
                <List dense disablePadding>
                  {providerIntegrations.length === 0 ? (
                    <ListItem><ListItemText primary="No provider integration data available" /></ListItem>
                  ) : (
                    providerIntegrations.map((provider, i) => (
                      <Box key={`${provider.provider}-${provider.type}`}>
                        <ListItem sx={{ py: 1 }}>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2" fontWeight={600}>{provider.provider}</Typography>
                                <Chip label={provider.type.toUpperCase()} size="small" variant="outlined" />
                              </Box>
                            }
                            secondary={`Web: ${provider.channels.web} • WhatsApp: ${provider.channels.whatsapp} • Escalation: ${provider.escalation}`}
                          />
                        </ListItem>
                        {i < providerIntegrations.length - 1 && <Divider />}
                      </Box>
                    ))
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Users Tab */}
      <TabPanel value={tabValue} index={2}>
        <Card elevation={3}>
          <CardHeader 
            title="User Management" 
            subheader={`Showing ${paginatedUsers.length} of ${filteredUsers.length} users`}
            avatar={<PeopleIcon color="primary" />}
            action={
              <Button 
                variant="contained" 
                onClick={() => navigate('/admin/users')}
              >
                Full User Management
              </Button>
            }
          />
          <CardContent>
            <TableContainer sx={{ borderRadius: 3 }}>
              <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-head': { backgroundColor: alpha(theme.palette.primary.main, 0.07) } }}>
                    <TableCell sx={{ width: '28%' }}>User</TableCell>
                    <TableCell sx={{ width: '28%' }}>Email</TableCell>
                    <TableCell sx={{ width: 120 }}>Role</TableCell>
                    <TableCell sx={{ width: 120 }}>Status</TableCell>
                    <TableCell sx={{ width: 110 }}>Created</TableCell>
                    <TableCell align="center" sx={{ width: 96 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary" py={2.5}>
                          No users match your search.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers.map((user) => (
                      <TableRow key={user.id} sx={{ '&:nth-of-type(odd)': { backgroundColor: alpha(theme.palette.primary.main, 0.022) } }}>
                        <TableCell>
                          <Box display="flex" alignItems="center" sx={{ minWidth: 0 }}>
                            <Avatar sx={{ mr: 2, bgcolor: user.is_active ? 'primary.main' : 'grey.400' }}>
                              {user.name?.[0] || 'U'}
                            </Avatar>
                            <Typography sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {user.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={user.email}>
                            <Typography sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {user.email}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.role}
                            size="small"
                            color={getRoleColor(user.role) as any}
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.is_active ? 'Active' : 'Inactive'}
                            size="small"
                            color={user.is_active ? 'success' : 'default'}
                            variant={user.is_active ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell>{formatDateOnly(user.created_at)}</TableCell>
                        <TableCell align="center">
                          <Box display="flex" justifyContent="center" alignItems="center" gap={0.5}>
                            <Tooltip title={user.is_active ? 'Deactivate User' : 'Activate User'}>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleUserStatus(user.id)}
                                color={user.is_active ? 'error' : 'success'}
                              >
                                {user.is_active ? <BlockIcon /> : <PersonOffIcon />}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filteredUsers.length}
              page={usersPage}
              onPageChange={handleUsersPageChange}
              rowsPerPage={usersRowsPerPage}
              onRowsPerPageChange={handleUsersRowsPerPageChange}
              rowsPerPageOptions={[ADMIN_USERS_ROWS_PER_PAGE]}
              showFirstButton
              showLastButton
            />
          </CardContent>
        </Card>
      </TabPanel>

      {/* Escalations Tab */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card elevation={3}>
              <CardHeader 
                title="Recent Escalations" 
                subheader="Cases requiring human intervention"
                avatar={<WarningIcon color="warning" />}
                sx={{
                  pb: 0.5,
                  '& .MuiCardHeader-subheader': {
                    mt: 0.25,
                  },
                }}
              />
              <CardContent sx={{ pt: 0.5 }}>
                <List sx={{ pt: 0 }}>
                  {recentEscalations.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" py={2}>
                      No recent escalations
                    </Typography>
                  ) : (
                    paginatedEscalations.map((escalation, index) => (
                      <Box key={escalation.id}>
                        <ListItem
                          secondaryAction={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Chip
                                label={escalation.priority || 'medium'}
                                size="small"
                                color={getPriorityColor(escalation.priority || 'medium') as any}
                              />
                              <Button size="small" variant="outlined">
                                Handle
                              </Button>
                            </Box>
                          }
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'warning.main' }}>
                              {escalation.user_name?.[0] || 'U'}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={escalation.reason || 'Escalated issue'}
                            secondary={`${escalation.user_name || escalation.user_email} • ${formatDateTime(escalation.escalated_at)}`}
                          />
                        </ListItem>
                        {index < paginatedEscalations.length - 1 && <Divider variant="inset" component="li" />}
                      </Box>
                    ))
                  )}
                </List>
                <TablePagination
                  component="div"
                  count={recentEscalations.length}
                  page={escalationsPage}
                  onPageChange={handleEscalationsPageChange}
                  rowsPerPage={escalationsRowsPerPage}
                  onRowsPerPageChange={handleEscalationsRowsPerPageChange}
                  rowsPerPageOptions={[ADMIN_ESCALATIONS_ROWS_PER_PAGE]}
                  showFirstButton
                  showLastButton
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={3}>
              <CardHeader title="Escalation Summary" />
              <CardContent>
                <Box mb={3}>
                  <Typography variant="h3" fontWeight="bold" color="warning.main" textAlign="center">
                    {performanceData?.escalation_rate || 15.3}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    Current Escalation Rate
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h5" fontWeight="bold">{pendingTicketsCount}</Typography>
                      <Typography variant="body2" color="text.secondary">Pending</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h5" fontWeight="bold" color="success.main">{resolvedTodayCount}</Typography>
                      <Typography variant="body2" color="text.secondary">Resolved Today</Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Box mt={3}>
                  <Typography variant="subtitle2" gutterBottom>Common Escalation Reasons</Typography>
                  <Chip label="Transaction Disputes" size="small" sx={{ m: 0.5 }} />
                  <Chip label="PIN Issues" size="small" sx={{ m: 0.5 }} />
                  <Chip label="Failed Transfers" size="small" sx={{ m: 0.5 }} />
                  <Chip label="Network Errors" size="small" sx={{ m: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ═══════════════════════════════════════ TICKETS TAB ═══════════════════════════════════════ */}
      <TabPanel value={tabValue} index={4}>
        {(() => {
          const filtered = filteredTickets;
          const paginated = paginatedFilteredTickets;

          const totalCount = allTickets.length;
          const openCount = allTickets.filter((t) =>
            ['new', 'assigned', 'in_progress', 'pending_customer', 'escalated', 'reopened'].includes(t.status)
          ).length;
          const overdueCount = allTickets.filter((t) => t.is_overdue).length;
          const unassignedCount = allTickets.filter((t) => !t.agent_name).length;

          const statusColor = (s: string): 'default' | 'warning' | 'error' | 'success' | 'info' | 'primary' | 'secondary' => {
            switch (s) {
              case 'new': return 'info';
              case 'assigned': return 'primary';
              case 'in_progress': return 'warning';
              case 'pending_customer': return 'secondary';
              case 'escalated': return 'error';
              case 'resolved': return 'success';
              case 'closed': return 'default';
              case 'reopened': return 'warning';
              default: return 'default';
            }
          };

          const priorityColor = (p: string): 'default' | 'warning' | 'error' | 'info' | 'success' => {
            switch (p) {
              case 'critical': return 'error';
              case 'high': return 'error';
              case 'medium': return 'warning';
              case 'low': return 'info';
              default: return 'default';
            }
          };

          const formatDate = (iso: string | null) => {
            if (!iso) return '—';
            return formatDateMediumShort(iso);
          };

          const relativeDate = (iso: string | null) => {
            if (!iso) return '—';
            const diff = Date.now() - new Date(iso).getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 60) return `${mins}m ago`;
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return `${hrs}h ago`;
            return `${Math.floor(hrs / 24)}d ago`;
          };

          return (
            <>
              {/* Summary Mini-KPIs */}
              <Grid container spacing={2} mb={2.5}>
                {[
                  { label: 'Total Tickets', value: totalCount, color: theme.palette.primary.main },
                  { label: 'Open / Active', value: openCount, color: theme.palette.warning.main },
                  { label: 'Overdue', value: overdueCount, color: theme.palette.error.main },
                  { label: 'Unassigned', value: unassignedCount, color: theme.palette.info.main },
                ].map((card) => (
                  <Grid item xs={6} md={3} key={card.label}>
                    <Paper
                      sx={{
                        p: 2,
                        borderLeft: `3px solid ${card.color}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.68rem', fontWeight: 500, mb: 0.35 }}
                        >
                          {card.label}
                        </Typography>
                        <Typography variant="h5" fontWeight={700} sx={{ color: card.color }}>
                          {card.value}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              {/* Filter Toolbar */}
              <Paper sx={{ p: 1.5, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                <FilterIcon color="action" sx={{ fontSize: 20 }} />
                <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mr: 0.75, fontSize: '0.85rem' }}>
                  Filters
                </Typography>

                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={ticketStatusFilter}
                    label="Status"
                    onChange={(e) => setTicketStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    <MenuItem value="new">New</MenuItem>
                    <MenuItem value="assigned">Assigned</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="pending_customer">Pending Customer</MenuItem>
                    <MenuItem value="escalated">Escalated</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                    <MenuItem value="closed">Closed</MenuItem>
                    <MenuItem value="reopened">Reopened</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={ticketPriorityFilter}
                    label="Priority"
                    onChange={(e) => setTicketPriorityFilter(e.target.value)}
                  >
                    <MenuItem value="">All Priorities</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                  </Select>
                </FormControl>

                <Button
                  variant={showOverdueOnly ? 'contained' : 'outlined'}
                  color="error"
                  size="small"
                  startIcon={<OverdueIcon />}
                  onClick={() => setShowOverdueOnly((v) => !v)}
                >
                  Overdue Only
                </Button>

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchAllTickets}
                >
                  Refresh
                </Button>

                <Box ml="auto">
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                    Showing {paginated.length} of {filtered.length} tickets
                  </Typography>
                </Box>
              </Paper>

              {/* Ticket Table */}
              <Paper>
                {assignmentError && (
                  <Alert severity="error" sx={{ m: 2 }}>
                    {assignmentError}
                  </Alert>
                )}
                <TableContainer sx={{ borderRadius: 2 }}>
                  <Table
                    size="small"
                    stickyHeader
                    sx={{
                      tableLayout: 'fixed',
                      '& .MuiTableCell-root': {
                        py: 0.9,
                        px: 1.2,
                      },
                    }}
                  >
                    <TableHead>
                      <TableRow
                        sx={{
                          '& .MuiTableCell-head': {
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.045em',
                            backgroundColor: alpha(theme.palette.primary.main, 0.07),
                          },
                        }}
                      >
                        <TableCell sx={{ width: 112 }}>Ticket ID</TableCell>
                        <TableCell sx={{ width: '20%' }}>Subject</TableCell>
                        <TableCell sx={{ width: '16%' }}>Customer</TableCell>
                        <TableCell sx={{ width: '16%' }}>Assigned To</TableCell>
                        <TableCell sx={{ width: '11%' }}>Category</TableCell>
                        <TableCell align="center" sx={{ width: 96 }}>Priority</TableCell>
                        <TableCell align="center" sx={{ width: 116 }}>Status</TableCell>
                        <TableCell sx={{ width: 90 }}>Created</TableCell>
                        <TableCell sx={{ width: 140 }}>Due By</TableCell>
                        <TableCell align="center" sx={{ width: 96 }}>SLA</TableCell>
                        <TableCell sx={{ width: 220 }}>Assign Agent</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={11} sx={{ py: 4, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                              No tickets match the selected filters.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                      {paginated.map((ticket) => {
                        const rowTicketId = ticket.ticket_id || ticket.id;
                        const isFocusedFromNotification = rowTicketId === notificationFocusTicketId;

                        return (
                        <TableRow
                          key={ticket.id}
                          id={`admin-ticket-row-${rowTicketId}`}
                          sx={{
                            '&:nth-of-type(odd)': {
                              backgroundColor: ticket.is_overdue
                                ? alpha(theme.palette.error.main, 0.055)
                                : alpha(theme.palette.primary.main, 0.02),
                            },
                            ...(isFocusedFromNotification && {
                              backgroundColor: alpha(theme.palette.warning.main, 0.18),
                              outline: `2px solid ${alpha(theme.palette.warning.main, 0.7)}`,
                              outlineOffset: '-2px',
                            }),
                            backgroundColor: ticket.is_overdue
                              ? alpha(theme.palette.error.main, 0.04)
                              : undefined,
                          }}
                        >
                          <TableCell>
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              sx={{ fontFamily: 'monospace', color: 'primary.main', fontSize: '0.78rem' }}
                            >
                              {ticket.ticket_id}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ maxWidth: 200 }}>
                            <Tooltip title={ticket.description || ticket.subject} placement="top">
                              <Typography
                                variant="body2"
                                fontWeight={500}
                                sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 170, fontSize: '0.84rem' }}
                              >
                                {ticket.subject}
                              </Typography>
                            </Tooltip>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" fontWeight={500} sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.84rem' }}>
                              {ticket.customer_name || '—'}
                            </Typography>
                            {ticket.customer_email && (
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.72rem' }}>
                                {ticket.customer_email}
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell>
                            {ticket.agent_name ? (
                              <>
                                <Typography variant="body2" fontWeight={500} sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.84rem' }}>
                                  {ticket.agent_name}
                                </Typography>
                                {ticket.agent_email && (
                                  <Typography variant="caption" color="text.secondary" display="block" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.72rem' }}>
                                    {ticket.agent_email}
                                  </Typography>
                                )}
                              </>
                            ) : (
                              <Chip
                                icon={<UnassignedIcon sx={{ fontSize: '14px !important' }} />}
                                label="Unassigned"
                                size="small"
                                color="default"
                                variant="outlined"
                              />
                            )}
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" sx={{ textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.84rem' }}>
                              {(ticket.category || '').replace(/_/g, ' ')}
                            </Typography>
                          </TableCell>

                          <TableCell align="center">
                            <Chip
                              label={ticket.priority}
                              size="small"
                              color={priorityColor(ticket.priority)}
                              variant="outlined"
                              sx={{ textTransform: 'capitalize', fontWeight: 600, minWidth: 72 }}
                            />
                          </TableCell>

                          <TableCell align="center">
                            <Chip
                              label={(ticket.status || '').replace(/_/g, ' ')}
                              size="small"
                              color={statusColor(ticket.status)}
                              sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                            />
                          </TableCell>

                          <TableCell>
                            <Tooltip title={formatDate(ticket.created_at)}>
                              <Typography variant="body2" sx={{ whiteSpace: 'nowrap', fontSize: '0.84rem' }}>
                                {relativeDate(ticket.created_at)}
                              </Typography>
                            </Tooltip>
                          </TableCell>

                          <TableCell>
                            {ticket.resolution_due ? (
                              <Tooltip title={formatDate(ticket.resolution_due)}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    whiteSpace: 'nowrap',
                                    fontSize: '0.84rem',
                                    color: ticket.is_overdue ? 'error.main' : 'text.primary',
                                    fontWeight: ticket.is_overdue ? 600 : 400,
                                  }}
                                >
                                  {formatDate(ticket.resolution_due)}
                                </Typography>
                              </Tooltip>
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.84rem' }}>—</Typography>
                            )}
                          </TableCell>

                          <TableCell align="center">
                            {['resolved', 'closed'].includes(ticket.status) ? (
                              <CheckCircleIcon fontSize="small" color="success" />
                            ) : ticket.is_overdue ? (
                              <Chip label="Overdue" size="small" color="error" icon={<OverdueIcon />} />
                            ) : (
                              <Chip label="On Track" size="small" color="success" variant="outlined" />
                            )}
                          </TableCell>

                          <TableCell>
                            <FormControl size="small" fullWidth>
                              <Select
                                value={ticket.assigned_agent_id || ''}
                                displayEmpty
                                disabled={assigningTicketId === ticket.ticket_id || ticket.status === 'closed'}
                                onChange={(event) => handleAssignTicket(ticket.ticket_id, event.target.value as string)}
                              >
                                <MenuItem value="">
                                  <em>Unassigned</em>
                                </MenuItem>
                                {ticket.assigned_agent_id && !activeAgentUsers.some((agentUser) => agentUser.id === ticket.assigned_agent_id) && (
                                  <MenuItem value={ticket.assigned_agent_id}>
                                    {ticket.agent_name || 'Current Agent'} (inactive)
                                  </MenuItem>
                                )}
                                {activeAgentUsers.map((agentUser) => (
                                  <MenuItem key={agentUser.id} value={agentUser.id}>
                                    {agentUser.name} ({agentUser.email})
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={filtered.length}
                  page={ticketsPage}
                  onPageChange={handleTicketsPageChange}
                  rowsPerPage={ticketsRowsPerPage}
                  onRowsPerPageChange={handleTicketsRowsPerPageChange}
                  rowsPerPageOptions={[ADMIN_TICKETS_ROWS_PER_PAGE]}
                  showFirstButton
                  showLastButton
                />
              </Paper>
            </>
          );
        })()}
      </TabPanel>

      <TabPanel value={tabValue} index={5}>
        <Grid container spacing={2.5} mb={3}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Period</InputLabel>
              <Select
                value={reportPeriod}
                label="Period"
                onChange={(event) => setReportPeriod(event.target.value as ReportPeriod)}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="custom">Custom Range</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Start Date"
              type="date"
              value={reportStartDate}
              onChange={(event) => {
                setReportPeriod('custom');
                setReportStartDate(event.target.value);
              }}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              label="End Date"
              type="date"
              value={reportEndDate}
              onChange={(event) => {
                setReportPeriod('custom');
                setReportEndDate(event.target.value);
              }}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: { md: 'flex-end' } }}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchAllData}>
              Refresh Data
            </Button>
          </Grid>
        </Grid>

        <Grid container spacing={2.5} mb={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2.5 }}>
              <Typography variant="overline" color="text.secondary">User Records</Typography>
              <Typography variant="h4" fontWeight={700}>{filteredUsersForReport.length}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Users created in selected range</Typography>
              <Button fullWidth variant="contained" startIcon={<DownloadIcon />} onClick={downloadAdminUsersReport} disabled={!filteredUsersForReport.length}>
                Download Users CSV
              </Button>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2.5 }}>
              <Typography variant="overline" color="text.secondary">Ticket Records</Typography>
              <Typography variant="h4" fontWeight={700}>{filteredTicketsForReport.length}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Tickets created in selected range</Typography>
              <Button fullWidth variant="contained" color="warning" startIcon={<DownloadIcon />} onClick={downloadAdminTicketsReport} disabled={!filteredTicketsForReport.length}>
                Download Tickets CSV
              </Button>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2.5 }}>
              <Typography variant="overline" color="text.secondary">Issues Summary</Typography>
              <Typography variant="h4" fontWeight={700}>{filteredIssuesForReport.reduce((total, row) => total + Number(row.issue_count || 0), 0)}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Issue volume grouped by day</Typography>
              <Button fullWidth variant="contained" color="secondary" startIcon={<DownloadIcon />} onClick={downloadAdminIssuesReport} disabled={!filteredIssuesForReport.length}>
                Download Issues CSV
              </Button>
            </Paper>
          </Grid>
        </Grid>

        <Grid container spacing={2.5} mb={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                User Records Preview
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUsersForReport.slice(0, 8).map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.name}</TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{entry.role}</TableCell>
                        <TableCell>{formatDateOnly(entry.created_at)}</TableCell>
                      </TableRow>
                    ))}
                    {filteredUsersForReport.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} sx={{ textAlign: 'center', color: 'text.secondary' }}>
                          No user records in selected range.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Ticket Records Preview
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ticket</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTicketsForReport.slice(0, 8).map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.ticket_id}</TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{(entry.status || '').replace(/_/g, ' ')}</TableCell>
                        <TableCell>{formatDateOnly(entry.created_at)}</TableCell>
                      </TableRow>
                    ))}
                    {filteredTicketsForReport.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} sx={{ textAlign: 'center', color: 'text.secondary' }}>
                          No ticket records in selected range.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Issues Preview
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Issue Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredIssuesForReport.slice(0, 8).map((entry) => (
                      <TableRow key={entry.date}>
                        <TableCell>{entry.date}</TableCell>
                        <TableCell align="right">{entry.issue_count}</TableCell>
                      </TableRow>
                    ))}
                    {filteredIssuesForReport.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} sx={{ textAlign: 'center', color: 'text.secondary' }}>
                          No issue records in selected range.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>

        <Paper sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Report Range
          </Typography>
          <Typography variant="body2" color="text.secondary">
            From {reportStartDate || '—'} to {reportEndDate || '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Choose Daily, Weekly, Monthly, or set a custom start/end date range before downloading reports.
          </Typography>
        </Paper>
      </TabPanel>

      {/* CSS for rotating refresh icon */}
      <style>
        {`
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .rotating {
            animation: rotate 1s linear infinite;
          }
        `}
      </style>
    </DashboardShell>
  );
}
