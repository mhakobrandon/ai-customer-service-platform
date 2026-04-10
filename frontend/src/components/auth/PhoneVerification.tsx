/**
 * Phone Verification Component
 * Handles phone number verification via SMS OTP
 * 
 * @author AI Customer Service Platform
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Link,
  Snackbar,
  InputAdornment
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  VerifiedUser as VerifiedIcon,
  Phone as PhoneIcon,
  Refresh as RefreshIcon,
  Sms as SmsIcon
} from '@mui/icons-material';
import { authAPI } from '../../services/apiService';

interface PhoneVerificationProps {
  email: string;
  initialPhoneNumber?: string;
  onVerified: () => void;
  onSkip?: () => void;
}

const PhoneVerification: React.FC<PhoneVerificationProps> = ({ 
  email, 
  initialPhoneNumber = '', 
  onVerified,
  onSkip 
}) => {
  const theme = useTheme();
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first OTP input when OTP is sent
  useEffect(() => {
    if (otpSent && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [otpSent]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await authAPI.sendPhoneOtp(email, phoneNumber);
      
      if (response.data.success && response.data.otp_sent) {
        setOtpSent(true);
        setResendCooldown(60);
        setSnackbarMessage('OTP sent to your phone');
        setSnackbarOpen(true);
      } else {
        if (response.data.expires_in_seconds) {
          setResendCooldown(Math.ceil(response.data.expires_in_seconds / 10));
        }
        setError(response.data.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d+$/.test(value)) return;
    
    const newOtp = [...otp];
    
    // Handle paste
    if (value.length > 1) {
      const pastedDigits = value.slice(0, 6).split('');
      pastedDigits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      
      const lastIndex = Math.min(index + pastedDigits.length - 1, 5);
      inputRefs.current[lastIndex]?.focus();
      return;
    }
    
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await authAPI.verifyPhoneOtp(phoneNumber, otpCode);
      
      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          onVerified();
        }, 2000);
      } else {
        setError(response.data.message || 'Verification failed');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to verify OTP.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await authAPI.sendPhoneOtp(email, phoneNumber);
      
      if (response.data.success && response.data.otp_sent) {
        setSnackbarMessage('New OTP sent to your phone');
        setSnackbarOpen(true);
        setResendCooldown(60);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        if (response.data.expires_in_seconds) {
          setResendCooldown(Math.ceil(response.data.expires_in_seconds / 10));
        }
        setSnackbarMessage(response.data.message || 'Please wait before requesting new OTP');
        setSnackbarOpen(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Paper 
        elevation={6} 
        sx={{ 
          p: 4, 
          maxWidth: 400, 
          mx: 'auto',
          textAlign: 'center',
          borderRadius: 3
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: 'success.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3
          }}
        >
          <VerifiedIcon sx={{ fontSize: 48, color: 'success.main' }} />
        </Box>
        <Typography variant="h5" gutterBottom color="success.main">
          Phone Verified!
        </Typography>
        <Typography color="text.secondary">
          Your phone number has been verified successfully.
        </Typography>
        <CircularProgress sx={{ mt: 3 }} size={24} />
      </Paper>
    );
  }

  return (
    <Paper 
      elevation={6} 
      sx={{ 
        p: 4, 
        maxWidth: 450, 
        mx: 'auto',
        borderRadius: 3
      }}
    >
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.success.main} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2
          }}
        >
          {otpSent ? (
            <SmsIcon sx={{ fontSize: 32, color: 'white' }} />
          ) : (
            <PhoneIcon sx={{ fontSize: 32, color: 'white' }} />
          )}
        </Box>
        
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          {otpSent ? 'Verify Your Phone' : 'Phone Verification'}
        </Typography>
        
        {otpSent ? (
          <>
            <Typography color="text.secondary">
              We've sent a 6-digit code to
            </Typography>
            <Typography fontWeight="medium" color="primary.main">
              {phoneNumber}
            </Typography>
          </>
        ) : (
          <Typography color="text.secondary">
            Enter your phone number to receive a verification code
          </Typography>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!otpSent ? (
        // Phone number input
        <>
          <TextField
            fullWidth
            label="Phone Number"
            placeholder="+263 77 123 4567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />
          
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleSendOtp}
            disabled={loading || !phoneNumber}
            sx={{
              py: 1.5,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.success.main} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.96)} 0%, ${alpha(theme.palette.success.dark, 0.96)} 100%)`
              }
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Verification Code'}
          </Button>
          
          {onSkip && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button
                variant="outlined"
                onClick={onSkip}
                fullWidth
                sx={{ mt: 1 }}
              >
                Skip Phone Verification
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                You can verify your phone number later from settings
              </Typography>
            </Box>
          )}
        </>
      ) : (
        // OTP input
        <>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3 }}>
            {otp.map((digit, index) => (
              <TextField
                key={index}
                inputRef={(el) => (inputRefs.current[index] = el)}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e as React.KeyboardEvent<HTMLInputElement>)}
                inputProps={{
                  maxLength: 6,
                  style: { 
                    textAlign: 'center', 
                    fontSize: '24px', 
                    fontWeight: 'bold',
                    padding: '12px 8px'
                  }
                }}
                sx={{
                  width: 50,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'success.main'
                      }
                    }
                  }
                }}
                disabled={loading}
              />
            ))}
          </Box>

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleVerify}
            disabled={loading || otp.some(d => !d)}
            sx={{
              py: 1.5,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.success.main} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.96)} 0%, ${alpha(theme.palette.success.dark, 0.96)} 100%)`
              }
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify Phone'}
          </Button>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Didn't receive the code?{' '}
              {resendCooldown > 0 ? (
                <Typography component="span" color="text.secondary">
                  Resend in {resendCooldown}s
                </Typography>
              ) : (
                <Link
                  component="button"
                  variant="body2"
                  onClick={handleResendOtp}
                  sx={{ 
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  <RefreshIcon fontSize="small" />
                  Resend OTP
                </Link>
              )}
            </Typography>
          </Box>
          
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Link
              component="button"
              variant="body2"
              onClick={() => setOtpSent(false)}
              color="text.secondary"
            >
              ← Change phone number
            </Link>
          </Box>
          
          {onSkip && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button
                variant="outlined"
                onClick={onSkip}
                fullWidth
                sx={{ mt: 1 }}
              >
                Skip Phone Verification
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                You can verify your phone number later
              </Typography>
            </Box>
          )}
        </>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Paper>
  );
};

export default PhoneVerification;
