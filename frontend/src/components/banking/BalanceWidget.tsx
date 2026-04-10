/**
 * Balance Widget Component
 * Displays user's linked platform balances on dashboard
 * Supports Shona/English queries and shows personalized balance info
 */

import React, { useState, useEffect } from 'react';
import { alpha } from '@mui/material/styles';
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Button,
  Chip,
  Skeleton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Visibility as ShowIcon,
  VisibilityOff as HideIcon,
  MoreVert as MoreIcon,
  Add as AddIcon,
  Star as PrimaryIcon,
  Delete as DeleteIcon,
  AccountBalanceWallet as WalletIcon,
} from '@mui/icons-material';
import { LinkedPlatformAccount, BalanceInquiry } from '../../types/banking';
import { 
  getLinkedAccounts, 
  getAccountBalance, 
  setPrimaryAccount,
  unlinkAccount,
} from '../../services/linkedPlatformsService';
import { getPlatformById } from '../../data/bankingPlatforms';

interface BalanceWidgetProps {
  onAddAccount?: () => void;
  compact?: boolean;
}

interface AccountBalanceState {
  loading: boolean;
  balance: BalanceInquiry | null;
  error?: string;
  showBalance: boolean;
}

const BalanceWidget: React.FC<BalanceWidgetProps> = ({ onAddAccount }) => {
  const [accounts, setAccounts] = useState<LinkedPlatformAccount[]>([]);
  const [balances, setBalances] = useState<Record<string, AccountBalanceState>>({});
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; accountId: string } | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);

  const linkedCount = accounts.length;
  const primaryCount = accounts.filter((account) => account.isPrimary).length;
  const balancesReadyCount = accounts.filter((account) => Boolean(balances[account.id]?.balance)).length;

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = () => {
    const linkedAccounts = getLinkedAccounts();
    setAccounts(linkedAccounts);
    
    // Initialize balance states
    const initialBalances: Record<string, AccountBalanceState> = {};
    linkedAccounts.forEach(account => {
      initialBalances[account.id] = {
        loading: false,
        balance: account.cachedBalance ? {
          platformId: account.platformId,
          accountIdentifier: account.accountIdentifier,
          balance: account.cachedBalance.amount,
          currency: account.cachedBalance.currency,
          lastUpdated: account.cachedBalance.updatedAt
        } : null,
        showBalance: true
      };
    });
    setBalances(initialBalances);
  };

  const refreshBalance = async (accountId: string) => {
    setBalances(prev => ({
      ...prev,
      [accountId]: { ...prev[accountId], loading: true, error: undefined }
    }));

    try {
      const balance = await getAccountBalance(accountId);
      setBalances(prev => ({
        ...prev,
        [accountId]: { ...prev[accountId], loading: false, balance }
      }));
      // Reload accounts to get cached balances
      loadAccounts();
    } catch (error) {
      setBalances(prev => ({
        ...prev,
        [accountId]: {
          ...prev[accountId],
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch balance'
        }
      }));
    }
  };

  const refreshAllBalances = async () => {
    setRefreshingAll(true);
    await Promise.all(accounts.map(account => refreshBalance(account.id)));
    setRefreshingAll(false);
  };

  const toggleBalanceVisibility = (accountId: string) => {
    setBalances(prev => ({
      ...prev,
      [accountId]: { ...prev[accountId], showBalance: !prev[accountId]?.showBalance }
    }));
  };

  const handleSetPrimary = (accountId: string) => {
    setPrimaryAccount(accountId);
    loadAccounts();
    setMenuAnchor(null);
  };

  const handleUnlink = (accountId: string) => {
    unlinkAccount(accountId);
    loadAccounts();
    setMenuAnchor(null);
  };

  const formatBalance = (balance: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(balance);
  };

  const formatLastUpdated = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString('en-ZW', { timeZone: 'Africa/Harare' });
  };

  if (accounts.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <WalletIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
        <Typography variant="body2" color="text.secondary" gutterBottom>
          No linked accounts
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
          Link your EcoCash, OneMoney, or bank to view balances
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={onAddAccount}
          sx={{ fontSize: '0.75rem' }}
        >
          Link Account
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, height: '100%' }}>
      <Box
        sx={{
          p: 1,
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: (t) => alpha(t.palette.primary.main, 0.07),
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 1,
          flexShrink: 0,
        }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">Linked</Typography>
          <Typography variant="body2" fontWeight={700}>{linkedCount}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">Primary</Typography>
          <Typography variant="body2" fontWeight={700}>{primaryCount}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">Ready</Typography>
          <Typography variant="body2" fontWeight={700}>{balancesReadyCount}</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, flexShrink: 0 }}>
        <Tooltip title="Refresh all">
          <IconButton onClick={refreshAllBalances} disabled={refreshingAll} size="small" sx={{ p: 0.5 }}>
            {refreshingAll ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Add account">
          <IconButton onClick={onAddAccount} size="small" sx={{ p: 0.5 }}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {accounts.map((account) => {
          const platform = getPlatformById(account.platformId);
          const balanceState = balances[account.id];

          return (
            <Box
              key={account.id}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                p: 1,
                borderRadius: 1.5,
                backgroundColor: `${platform?.color || '#2563eb'}10`,
                border: '1px solid',
                borderColor: `${platform?.color || '#2563eb'}30`,
                flexShrink: 0,
              }}
            >
              {/* Platform Avatar */}
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  backgroundColor: platform?.color || '#666',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}
              >
                {platform?.shortName.substring(0, 2).toUpperCase() || '??'}
              </Avatar>

              {/* Account Info & Balance */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                  <Typography variant="body2" fontWeight="bold" noWrap>
                    {account.nickname || platform?.shortName}
                  </Typography>
                  {account.isPrimary && (
                    <Chip
                      icon={<PrimaryIcon sx={{ fontSize: 11 }} />}
                      label="Primary"
                      size="small"
                      color="primary"
                      sx={{ height: 16, fontSize: '0.55rem', ml: 'auto' }}
                    />
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                  {account.accountIdentifier}
                </Typography>
                {balanceState?.loading ? (
                  <Skeleton width={100} height={18} />
                ) : balanceState?.balance ? (
                  <>
                    <Typography variant="body2" fontWeight="bold" sx={{ color: platform?.color, mb: 0.25 }}>
                      {balanceState.showBalance
                        ? formatBalance(balanceState.balance.balance, balanceState.balance.currency)
                        : '••••••'
                      }
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {formatLastUpdated(balanceState.balance.lastUpdated)}
                    </Typography>
                  </>
                ) : (
                  <Button
                    size="small"
                    onClick={() => refreshBalance(account.id)}
                    sx={{ fontSize: '0.7rem', p: 0 }}
                  >
                    Check
                  </Button>
                )}
              </Box>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 0, flexShrink: 0 }}>
                {balanceState?.balance && (
                  <IconButton
                    size="small"
                    onClick={() => toggleBalanceVisibility(account.id)}
                    sx={{ p: 0.5 }}
                  >
                    {balanceState.showBalance ? <HideIcon fontSize="small" /> : <ShowIcon fontSize="small" />}
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  onClick={() => refreshBalance(account.id)}
                  disabled={balanceState?.loading}
                  sx={{ p: 0.5 }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => setMenuAnchor({ el: e.currentTarget, accountId: account.id })}
                  sx={{ p: 0.5 }}
                >
                  <MoreIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          );
        })}
      </Box>

        {/* Context Menu */}
        <Menu
          anchorEl={menuAnchor?.el}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem onClick={() => menuAnchor && handleSetPrimary(menuAnchor.accountId)}>
            <ListItemIcon>
              <PrimaryIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Set as Primary</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => menuAnchor && handleUnlink(menuAnchor.accountId)}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText sx={{ color: 'error.main' }}>Unlink Account</ListItemText>
          </MenuItem>
        </Menu>
    </Box>
  );
};

export default BalanceWidget;
