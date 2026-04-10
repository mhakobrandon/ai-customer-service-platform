/**
 * Banking Platforms Page
 * Main page for viewing and selecting banking platforms
 * Postilion-style interface for financial institution management
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
} from '@mui/material';
import {
  AccountBalance as BankingIcon,
  ArrowBack as BackIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/authService'
import { getDashboardRoute } from '../../utils/dashboardRoute'
import BankSelection from './BankSelection';
import BankDetails from './BankDetails';
import { BankingPlatform } from '../../types/banking';

const BankingPage: React.FC = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<BankingPlatform | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth()

  const dashboardRoute = getDashboardRoute(user?.role)

  const handleSelectPlatform = (platform: BankingPlatform) => {
    setSelectedPlatform(platform);
  };

  const handleBack = () => {
    setSelectedPlatform(null);
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* App Bar */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          backgroundColor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={() => navigate(dashboardRoute)}
            sx={{ mr: 2, color: 'text.primary' }}
          >
            <BackIcon />
          </IconButton>
          <BankingIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" color="text.primary" sx={{ flexGrow: 1 }}>
            Banking Platforms Integration Hub
          </Typography>
          <Button
            startIcon={<DashboardIcon />}
            onClick={() => navigate(dashboardRoute)}
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          >
            Dashboard
          </Button>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {selectedPlatform ? (
          <BankDetails platform={selectedPlatform} onBack={handleBack} />
        ) : (
          <BankSelection
            onSelect={handleSelectPlatform}
            selectedPlatformId={undefined}
          />
        )}
      </Container>
    </Box>
  );
};

export default BankingPage;
