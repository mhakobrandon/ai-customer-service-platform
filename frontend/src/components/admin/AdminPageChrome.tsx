import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dashboard as DashboardIcon,
  ManageAccounts as ManageAccountsIcon,
  LocationOn as LocationIcon,
  Psychology as AIIcon,
  AccountBalance as BankingIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useAuth } from '../../services/authService';
import DashboardShell, { type DashboardShellNavSection, toInitials } from '../dashboard/DashboardShell';

type AdminPageKey = 'locations' | 'nlp-feedback' | 'banking';

interface AdminPageChromeProps {
  activePage: AdminPageKey;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  topActions?: ReactNode;
  children: ReactNode;
}

export default function AdminPageChrome({
  activePage,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  topActions,
  children,
}: AdminPageChromeProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const displayName = user?.name || user?.email || 'Admin User';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarSections: DashboardShellNavSection[] = [
    {
      id: 'admin',
      title: 'Admin',
      items: [
        {
          id: 'admin-overview',
          label: 'Admin Panel',
          icon: <DashboardIcon sx={{ fontSize: 13 }} />,
          active: false,
          onClick: () => navigate('/admin'),
        },
        {
          id: 'admin-users',
          label: 'User Management',
          icon: <ManageAccountsIcon sx={{ fontSize: 13 }} />,
          active: false,
          onClick: () => navigate('/admin/users'),
        },
        {
          id: 'admin-locations',
          label: 'Locations',
          icon: <LocationIcon sx={{ fontSize: 13 }} />,
          active: activePage === 'locations',
          onClick: () => navigate('/admin/locations'),
        },
        {
          id: 'admin-nlp',
          label: 'NLP Review',
          icon: <AIIcon sx={{ fontSize: 13 }} />,
          active: activePage === 'nlp-feedback',
          onClick: () => navigate('/admin/nlp-feedback'),
        },
        {
          id: 'admin-banking',
          label: 'Banking',
          icon: <BankingIcon sx={{ fontSize: 13 }} />,
          active: activePage === 'banking',
          onClick: () => navigate('/banking'),
        },
      ],
    },
    {
      id: 'account',
      title: 'Account',
      items: [
        {
          id: 'admin-logout',
          label: 'Logout',
          icon: <LogoutIcon sx={{ fontSize: 13 }} />,
          active: false,
          onClick: handleLogout,
        },
      ],
    },
  ];

  const composedTopActions = (
    <>
      <button type="button" className="btn" onClick={() => navigate('/admin')}>
        <DashboardIcon sx={{ fontSize: 12 }} /> Admin Panel
      </button>
      {topActions}
      <button type="button" className="btn" onClick={handleLogout}>
        <LogoutIcon sx={{ fontSize: 12 }} /> Logout
      </button>
    </>
  );

  return (
    <DashboardShell
      roleClassName="role-dashboard-admin"
      brandLabel="BotAssist Admin"
      brandIcon={<DashboardIcon sx={{ fontSize: 13 }} />}
      sidebarSections={sidebarSections}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder={searchPlaceholder}
      topActions={composedTopActions}
      userName={displayName}
      userMeta="Admin workspace"
      userInitials={toInitials(displayName, 'AD')}
      onUserCardClick={() => navigate('/admin')}
    >
      {children}
    </DashboardShell>
  );
}
