/**
 * Link Account Modal
 * Allows users to link their banking/mobile money accounts
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Avatar,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Chip,
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  Phone as PhoneIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { bankingPlatforms } from '../../data/bankingPlatforms';
import { BankingPlatform } from '../../types/banking';
import { linkPlatformAccount } from '../../services/linkedPlatformsService';

interface LinkAccountModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const LinkAccountModal: React.FC<LinkAccountModalProps> = ({ open, onClose, onSuccess }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPlatform, setSelectedPlatform] = useState<BankingPlatform | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [nickname, setNickname] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [error, setError] = useState('');

  const steps = ['Select Platform', 'Enter Details', 'Confirm'];

  const handleSelectPlatform = (platform: BankingPlatform) => {
    setSelectedPlatform(platform);
    setActiveStep(1);
  };

  const handleNext = () => {
    if (activeStep === 1) {
      // Validate account number
      if (!accountNumber.trim()) {
        setError('Please enter your account/phone number');
        return;
      }
      if (accountNumber.length < 6) {
        setError('Please enter a valid account/phone number');
        return;
      }
      setError('');
    }
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    setError('');
  };

  const handleLink = () => {
    if (!selectedPlatform) return;

    try {
      linkPlatformAccount({
        platformId: selectedPlatform.id,
        platformName: selectedPlatform.name,
        accountIdentifier: accountNumber,
        accountType: selectedPlatform.type,
        isPrimary,
        nickname: nickname || undefined,
      });

      // Reset and close
      handleReset();
      onSuccess?.();
      onClose();
    } catch (err) {
      setError('Failed to link account. Please try again.');
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setSelectedPlatform(null);
    setAccountNumber('');
    setNickname('');
    setIsPrimary(false);
    setError('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Filter to show only relevant platforms
  const mobileMoneyPlatforms = bankingPlatforms.filter(p => p.type === 'mobile_money');
  const bankPlatforms = bankingPlatforms.filter(p => p.type === 'bank');
  const fintechPlatforms = bankingPlatforms.filter(p => p.type === 'fintech');

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WalletIcon color="primary" />
          <Typography variant="h6">Link Your Account</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 1: Select Platform */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Mobile Money
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {mobileMoneyPlatforms.map(platform => (
                <Grid item xs={6} sm={4} md={3} key={platform.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderColor: selectedPlatform?.id === platform.id ? platform.color : 'divider',
                      borderWidth: selectedPlatform?.id === platform.id ? 2 : 1,
                    }}
                  >
                    <CardActionArea onClick={() => handleSelectPlatform(platform)}>
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Avatar
                          sx={{
                            width: 48,
                            height: 48,
                            mx: 'auto',
                            mb: 1,
                            backgroundColor: platform.color,
                            fontSize: '1rem',
                            fontWeight: 'bold',
                          }}
                        >
                          {platform.shortName.substring(0, 2).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" fontWeight="medium">
                          {platform.shortName}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Banks
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {bankPlatforms.map(platform => (
                <Grid item xs={6} sm={4} md={3} key={platform.id}>
                  <Card variant="outlined">
                    <CardActionArea onClick={() => handleSelectPlatform(platform)}>
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Avatar
                          sx={{
                            width: 48,
                            height: 48,
                            mx: 'auto',
                            mb: 1,
                            backgroundColor: platform.color,
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                          }}
                        >
                          {platform.shortName.substring(0, 3).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" fontWeight="medium" noWrap>
                          {platform.shortName}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Fintech
            </Typography>
            <Grid container spacing={2}>
              {fintechPlatforms.map(platform => (
                <Grid item xs={6} sm={4} md={3} key={platform.id}>
                  <Card variant="outlined">
                    <CardActionArea onClick={() => handleSelectPlatform(platform)}>
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Avatar
                          sx={{
                            width: 48,
                            height: 48,
                            mx: 'auto',
                            mb: 1,
                            backgroundColor: platform.color,
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                          }}
                        >
                          {platform.shortName.substring(0, 3).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" fontWeight="medium">
                          {platform.shortName}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Step 2: Enter Details */}
        {activeStep === 1 && selectedPlatform && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  backgroundColor: selectedPlatform.color,
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                }}
              >
                {selectedPlatform.shortName.substring(0, 2).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h6">{selectedPlatform.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedPlatform.type === 'mobile_money' ? 'Mobile Money' : 
                   selectedPlatform.type === 'bank' ? 'Bank' : 'Fintech'}
                </Typography>
              </Box>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              fullWidth
              label={selectedPlatform.type === 'bank' ? 'Account Number' : 'Phone Number'}
              placeholder={selectedPlatform.type === 'bank' ? 'Enter your account number' : '07XXXXXXXX'}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: selectedPlatform.type !== 'bank' && (
                  <PhoneIcon color="action" sx={{ mr: 1 }} />
                ),
              }}
            />

            <TextField
              fullWidth
              label="Nickname (Optional)"
              placeholder="e.g., My EcoCash, Main Account"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Alert severity="info" variant="outlined">
              <Typography variant="body2">
                <strong>Quick Balance Check:</strong> Dial{' '}
                <Chip 
                  label={selectedPlatform.mainUSSD} 
                  size="small" 
                  sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                /> 
                to check your balance directly.
              </Typography>
            </Alert>
          </Box>
        )}

        {/* Step 3: Confirm */}
        {activeStep === 2 && selectedPlatform && (
          <Box sx={{ textAlign: 'center' }}>
            <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Ready to Link
            </Typography>
            
            <Card variant="outlined" sx={{ maxWidth: 300, mx: 'auto', mt: 3 }}>
              <CardContent>
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    mx: 'auto',
                    mb: 2,
                    backgroundColor: selectedPlatform.color,
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                  }}
                >
                  {selectedPlatform.shortName.substring(0, 2).toUpperCase()}
                </Avatar>
                <Typography variant="h6">
                  {nickname || selectedPlatform.name}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {accountNumber}
                </Typography>
                <Chip
                  label={selectedPlatform.type.replace('_', ' ').toUpperCase()}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>

            <Alert severity="success" sx={{ mt: 3, maxWidth: 400, mx: 'auto' }}>
              After linking, you can check your balance by saying:
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" fontStyle="italic">
                  "Ndikuda kuona mari yangu" (Shona)
                </Typography>
                <Typography variant="body2" fontStyle="italic">
                  "Check my balance" (English)
                </Typography>
              </Box>
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Box sx={{ flex: 1 }} />
        {activeStep > 0 && (
          <Button onClick={handleBack}>
            Back
          </Button>
        )}
        {activeStep === 1 && (
          <Button variant="contained" onClick={handleNext}>
            Continue
          </Button>
        )}
        {activeStep === 2 && (
          <Button variant="contained" color="success" onClick={handleLink}>
            Link Account
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default LinkAccountModal;
