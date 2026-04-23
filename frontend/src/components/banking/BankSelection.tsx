/**
 * Bank Selection Component
 * Postilion-style interface for selecting banking platforms
 * Displays all available platforms in a grid with quick access to features
 */

import React, { useState, useMemo } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Typography,
  Chip,
  Tabs,
  Tab,
  Paper,
  Avatar,
  Badge,
  Tooltip,
  Fade,
} from '@mui/material';
import {
  AccountBalance as BankIcon,
  PhoneAndroid as MobileIcon,
  AccountBalanceWallet as WalletIcon,
  CheckCircle as ActiveIcon,
  WhatsApp as WhatsAppIcon,
  Language as WebIcon,
  Api as ApiIcon,
  Phone as USSDIcon,
} from '@mui/icons-material';
import { BankingPlatform, BankingPlatformType } from '../../types/banking';
import { bankingPlatforms } from '../../data/bankingPlatforms';

interface BankSelectionProps {
  onSelect: (platform: BankingPlatform) => void;
  selectedPlatformId?: string;
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
}

const getTypeIcon = (type: BankingPlatformType) => {
  switch (type) {
    case 'bank':
      return <BankIcon />;
    case 'mobile_money':
      return <MobileIcon />;
    case 'fintech':
      return <WalletIcon />;
    default:
      return <BankIcon />;
  }
};

const getTypeLabel = (type: BankingPlatformType) => {
  switch (type) {
    case 'bank':
      return 'Bank';
    case 'mobile_money':
      return 'Mobile Money';
    case 'fintech':
      return 'Fintech';
    default:
      return 'Other';
  }
};

const BankSelection: React.FC<BankSelectionProps> = ({
  onSelect,
  selectedPlatformId,
  searchQuery,
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  const effectiveSearchQuery = searchQuery || '';

  const filteredPlatforms = useMemo(() => {
    let platforms = bankingPlatforms;

    // Filter by type based on tab
    if (activeTab === 1) {
      platforms = platforms.filter(p => p.type === 'mobile_money');
    } else if (activeTab === 2) {
      platforms = platforms.filter(p => p.type === 'bank');
    } else if (activeTab === 3) {
      platforms = platforms.filter(p => p.type === 'fintech');
    }

    // Filter by search query
    if (effectiveSearchQuery) {
      const query = effectiveSearchQuery.toLowerCase();
      platforms = platforms.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.shortName.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.ussdCodes.some(u => u.code.includes(query))
      );
    }

    return platforms;
  }, [effectiveSearchQuery, activeTab]);

  const platformCounts = useMemo(() => ({
    all: bankingPlatforms.length,
    mobileMoney: bankingPlatforms.filter(p => p.type === 'mobile_money').length,
    banks: bankingPlatforms.filter(p => p.type === 'bank').length,
    fintech: bankingPlatforms.filter(p => p.type === 'fintech').length,
  }), []);

  return (
    <Box>
      {/* Platform Type Tabs */}
      <Paper sx={{ mb: 2.5, borderRadius: 2, overflow: 'hidden', mt: 0.5 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTabs-indicator': {
              height: 2,
              borderRadius: '2px 2px 0 0',
            },
            '& .MuiTab-root': {
              minHeight: 52,
              textTransform: 'none',
              color: 'text.secondary',
              fontWeight: 600,
              fontSize: '0.92rem',
            },
            '& .MuiTab-root.Mui-selected': {
              color: 'primary.main',
              bgcolor: alpha(theme.palette.primary.main, 0.05),
            },
          }}
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>All Platforms</span>
                <Chip label={platformCounts.all} size="small" color="primary" sx={{ fontWeight: 600, height: 24 }} />
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MobileIcon fontSize="small" />
                <span>Mobile Money</span>
                <Chip label={platformCounts.mobileMoney} size="small" />
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BankIcon fontSize="small" />
                <span>Banks</span>
                <Chip label={platformCounts.banks} size="small" />
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WalletIcon fontSize="small" />
                <span>Fintech</span>
                <Chip label={platformCounts.fintech} size="small" />
              </Box>
            } 
          />
        </Tabs>
      </Paper>

      <Box sx={{ pr: 0.5 }}>
        {/* Platform Grid */}
        <Grid container spacing={2}>
          {filteredPlatforms.map((platform) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={platform.id}>
              <Fade in timeout={300}>
                <Card
                  sx={{
                    height: '100%',
                    border: selectedPlatformId === platform.id ? 3 : 1,
                    borderColor: selectedPlatformId === platform.id ? platform.color : 'divider',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4,
                      borderColor: platform.color,
                    },
                  }}
                >
                  <CardActionArea 
                    onClick={() => onSelect(platform)}
                    sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      {/* Platform Header */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.6 }}>
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          badgeContent={
                            platform.apiIntegration.available && (
                              <Tooltip title="API Available">
                                <ActiveIcon 
                                  sx={{ 
                                    width: 16, 
                                    height: 16, 
                                    color: 'success.main',
                                      backgroundColor: 'background.paper',
                                    borderRadius: '50%'
                                  }} 
                                />
                              </Tooltip>
                            )
                          }
                        >
                          <Avatar
                            sx={{
                              width: 52,
                              height: 52,
                              backgroundColor: platform.color,
                              fontSize: '1.1rem',
                              fontWeight: 'bold',
                            }}
                          >
                            {platform.shortName.substring(0, 2).toUpperCase()}
                          </Avatar>
                        </Badge>
                        <Box sx={{ ml: 1.5 }}>
                          <Typography variant="h6" fontWeight="bold" noWrap sx={{ fontSize: '1.05rem' }}>
                            {platform.shortName}
                          </Typography>
                          <Chip
                            icon={getTypeIcon(platform.type)}
                            label={getTypeLabel(platform.type)}
                            size="small"
                            variant="outlined"
                            sx={{ height: 19, fontSize: '0.65rem' }}
                          />
                        </Box>
                      </Box>

                      {/* Main USSD Code */}
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.3,
                          mb: 1.6,
                          backgroundColor: `${platform.color}15`,
                          border: `1px solid ${platform.color}40`,
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.72rem' }}>
                          Main USSD
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" sx={{ color: platform.color, fontSize: '1.08rem' }}>
                          {platform.mainUSSD}
                        </Typography>
                      </Paper>

                      {/* Available Channels */}
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.6 }}>
                        <Tooltip title="USSD Available">
                          <Chip
                            icon={<USSDIcon sx={{ fontSize: 13 }} />}
                            label="USSD"
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ height: 22, fontSize: '0.75rem' }}
                          />
                        </Tooltip>
                        {platform.whatsappBot?.available && (
                          <Tooltip title="WhatsApp Bot">
                            <Chip
                              icon={<WhatsAppIcon sx={{ fontSize: 13 }} />}
                              label="WhatsApp"
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ height: 22, fontSize: '0.75rem' }}
                            />
                          </Tooltip>
                        )}
                        {platform.webApplications.length > 0 && (
                          <Tooltip title="Web Portal">
                            <Chip
                              icon={<WebIcon sx={{ fontSize: 13 }} />}
                              label="Web"
                              size="small"
                              color="info"
                              variant="outlined"
                              sx={{ height: 22, fontSize: '0.75rem' }}
                            />
                          </Tooltip>
                        )}
                        {platform.apiIntegration.available && (
                          <Tooltip title="API Integration">
                            <Chip
                              icon={<ApiIcon sx={{ fontSize: 13 }} />}
                              label="API"
                              size="small"
                              color="secondary"
                              variant="outlined"
                              sx={{ height: 22, fontSize: '0.75rem' }}
                            />
                          </Tooltip>
                        )}
                      </Box>

                      {/* Description */}
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          fontSize: '0.82rem',
                        }}
                      >
                        {platform.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Fade>
            </Grid>
          ))}
        </Grid>

        {/* No Results */}
        {filteredPlatforms.length === 0 && (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="subtitle1" color="text.secondary">
              No platforms found matching "{effectiveSearchQuery}"
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.84rem' }}>
              Try a different search term or category
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default BankSelection;
