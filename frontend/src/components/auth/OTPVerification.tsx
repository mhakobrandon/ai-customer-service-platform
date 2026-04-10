/**
 * OTP Verification Component
 * Handles email verification via OTP code input
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
  Snackbar
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  VerifiedUser as VerifiedIcon,
  Email as EmailIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { authAPI } from '../../services/apiService';

interface OTPVerificationProps {
  email: string;
  onVerified: () => void;
  onBack: () => void;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({ email, onVerified, onBack }) => {
  const theme = useTheme();
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

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
      
      // Focus last filled input or next empty
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
      // Move to previous input on backspace if current is empty
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
      const response = await authAPI.verifyOtp(email, otpCode);
      
      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          onVerified();
        }, 2000);
      } else {
        setError(response.data.message || 'Verification failed');
        // Clear OTP on error
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to verify OTP. Please try again.');
      // Clear OTP on error
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
      const response = await authAPI.resendOtp(email);
      
      if (response.data.success && response.data.otp_sent) {
        setSnackbarMessage('New OTP sent to your email');
        setSnackbarOpen(true);
        setResendCooldown(60); // 60 seconds cooldown
        // Clear current OTP
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        if (response.data.expires_in_seconds) {
          setResendCooldown(Math.ceil(response.data.expires_in_seconds / 10)); // Approximate cooldown
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
          Email Verified!
        </Typography>
        <Typography color="text.secondary">
          Your account has been verified. Redirecting to login...
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
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2
          }}
        >
          <EmailIcon sx={{ fontSize: 32, color: 'white' }} />
        </Box>
        
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Verify Your Email
        </Typography>
        
        <Typography color="text.secondary">
          We've sent a 6-digit code to
        </Typography>
        <Typography fontWeight="medium" color="primary.main">
          {email}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

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
                    borderColor: 'primary.main'
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
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.96)} 0%, ${alpha(theme.palette.secondary.dark, 0.96)} 100%)`
          }
        }}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify Email'}
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
          onClick={onBack}
          color="text.secondary"
        >
          ← Back to Registration
        </Link>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Paper>
  );
};

export default OTPVerification;
