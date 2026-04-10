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
  TextField,
  InputAdornment,
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
  Search as SearchIcon,
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

const BankSelection: React.FC<BankSelectionProps> = ({ onSelect, selectedPlatformId }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);

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
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      platforms = platforms.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.shortName.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.ussdCodes.some(u => u.code.includes(query))
      );
    }

    return platforms;
  }, [searchQuery, activeTab]);

  const platformCounts = useMemo(() => ({
    all: bankingPlatforms.length,
    mobileMoney: bankingPlatforms.filter(p => p.type === 'mobile_money').length,
    banks: bankingPlatforms.filter(p => p.type === 'bank').length,
    fintech: bankingPlatforms.filter(p => p.type === 'fintech').length,
  }), []);

  return (
    <Box>
      {/* Header Section */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3.5,
          mb: 3.5,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.92)} 0%, ${alpha(theme.palette.secondary.main, 0.88)} 100%)`,
          color: 'common.white',
          borderRadius: 3,
          boxShadow: theme.palette.mode === 'dark' ? '0 14px 30px rgba(2,6,23,0.42)' : '0 12px 26px rgba(15,23,42,0.12)',
        }}
      >
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Banking Platform Selector
        </Typography>
          <Typography variant="body1" sx={{ opacity: 0.92, mb: 2.25 }}>
          Select a financial institution to view integration details, USSD codes, and API information
        </Typography>
        
        {/* Search Bar */}
        <TextField
          fullWidth
          placeholder="Search by name, USSD code, or service..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            backgroundColor: alpha(theme.palette.background.paper, 0.96),
            borderRadius: 3,
            '& .MuiOutlinedInput-root': {
              '& fieldset': { border: 'none' },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Platform Type Tabs */}
      <Paper sx={{ mb: 3.5, borderRadius: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>All Platforms</span>
                <Chip label={platformCounts.all} size="small" color="primary" />
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

      {/* Platform Grid */}
      <Grid container spacing={2.5}>
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
                    transform: 'translateY(-5px)',
                    boxShadow: 8,
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
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
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
                            width: 56,
                            height: 56,
                            backgroundColor: platform.color,
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                          }}
                        >
                          {platform.shortName.substring(0, 2).toUpperCase()}
                        </Avatar>
                      </Badge>
                      <Box sx={{ ml: 2 }}>
                        <Typography variant="h6" fontWeight="bold" noWrap>
                          {platform.shortName}
                        </Typography>
                        <Chip
                          icon={getTypeIcon(platform.type)}
                          label={getTypeLabel(platform.type)}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                    </Box>

                    {/* Main USSD Code */}
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.5,
                        mb: 2,
                        backgroundColor: `${platform.color}15`,
                        border: `1px solid ${platform.color}40`,
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" display="block">
                        Main USSD
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" sx={{ color: platform.color }}>
                        {platform.mainUSSD}
                      </Typography>
                    </Paper>

                    {/* Available Channels */}
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                      <Tooltip title="USSD Available">
                        <Chip
                          icon={<USSDIcon sx={{ fontSize: 14 }} />}
                          label="USSD"
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ height: 24 }}
                        />
                      </Tooltip>
                      {platform.whatsappBot?.available && (
                        <Tooltip title="WhatsApp Bot">
                          <Chip
                            icon={<WhatsAppIcon sx={{ fontSize: 14 }} />}
                            label="WhatsApp"
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ height: 24 }}
                          />
                        </Tooltip>
                      )}
                      {platform.webApplications.length > 0 && (
                        <Tooltip title="Web Portal">
                          <Chip
                            icon={<WebIcon sx={{ fontSize: 14 }} />}
                            label="Web"
                            size="small"
                            color="info"
                            variant="outlined"
                            sx={{ height: 24 }}
                          />
                        </Tooltip>
                      )}
                      {platform.apiIntegration.available && (
                        <Tooltip title="API Integration">
                          <Chip
                            icon={<ApiIcon sx={{ fontSize: 14 }} />}
                            label="API"
                            size="small"
                            color="secondary"
                            variant="outlined"
                            sx={{ height: 24 }}
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
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No platforms found matching "{searchQuery}"
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try a different search term or category
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default BankSelection;
