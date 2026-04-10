/**
 * Register Page Component
 * Registration with Email OTP and Phone SMS verification
 * Admin assigns roles after registration and verification
 */

import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { authAPI } from '../../services/apiService'
import OTPVerification from './OTPVerification'
import PhoneVerification from './PhoneVerification'

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'sn', label: 'Shona' },
  { value: 'nd', label: 'Ndebele' },
]

type RegistrationStep = 'form' | 'email-otp' | 'phone-otp' | 'success'

const STEP_LABELS = ['Registration', 'Verify Email', 'Verify Phone', 'Complete']

const RegisterPage: React.FC = () => {
  const theme = useTheme()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone_number: '',
    preferred_language: 'en',
  })
  const [error, setError] = useState('')
  const [step, setStep] = useState<RegistrationStep>('form')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const getActiveStep = () => {
    switch (step) {
      case 'form': return 0
      case 'email-otp': return 1
      case 'phone-otp': return 2
      case 'success': return 3
      default: return 0
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const { confirmPassword, ...submitData } = formData
      const response = await authAPI.register(submitData)
      
      // Check if verification is required
      if (response.data.requires_verification) {
        setStep('email-otp')
      } else {
        setStep('success')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailVerified = () => {
    // After email verification, proceed to phone verification if phone number provided
    if (formData.phone_number) {
      setStep('phone-otp')
    } else {
      setStep('success')
    }
  }

  const handlePhoneVerified = () => {
    setStep('success')
  }

  const handleSkipPhone = () => {
    setStep('success')
  }

  const handleBackToForm = () => {
    setStep('form')
    setError('')
  }

  // Email OTP Verification Step
  if (step === 'email-otp') {
    return (
      <Container maxWidth="sm">
        <Box sx={{ marginTop: 4 }}>
          <Stepper activeStep={getActiveStep()} alternativeLabel sx={{ mb: 4 }}>
            {STEP_LABELS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <OTPVerification
            email={formData.email}
            onVerified={handleEmailVerified}
            onBack={handleBackToForm}
          />
        </Box>
      </Container>
    )
  }

  // Phone OTP Verification Step
  if (step === 'phone-otp') {
    return (
      <Container maxWidth="sm">
        <Box sx={{ marginTop: 4 }}>
          <Stepper activeStep={getActiveStep()} alternativeLabel sx={{ mb: 4 }}>
            {STEP_LABELS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <PhoneVerification
            email={formData.email}
            initialPhoneNumber={formData.phone_number}
            onVerified={handlePhoneVerified}
            onSkip={handleSkipPhone}
          />
        </Box>
      </Container>
    )
  }

  // Success Step
  if (step === 'success') {
    return (
      <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
        <Box sx={{ width: '100%' }}>
          <Stepper activeStep={getActiveStep()} alternativeLabel sx={{ mb: 4 }}>
            {STEP_LABELS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <Paper elevation={6} sx={{ p: 4, width: '100%', textAlign: 'center', borderRadius: 3 }}>
            <Typography variant="h5" color="success.main" gutterBottom>
              Registration Complete!
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Your email {formData.phone_number ? 'and phone number have' : 'has'} been verified 
              and your account is now pending approval.
              An administrator will review and assign your role shortly.
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              You will be able to log in once your account is approved.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>
          </Paper>
        </Box>
      </Container>
    )
  }

  // Registration Form Step
  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <Stepper activeStep={getActiveStep()} alternativeLabel sx={{ mb: 4, width: '100%' }}>
          {STEP_LABELS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <Paper
          elevation={6}
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 3,
            background:
              theme.palette.mode === 'dark'
                ? `linear-gradient(160deg, ${alpha(theme.palette.background.paper, 0.94)}, ${alpha(theme.palette.secondary.main, 0.08)})`
                : `linear-gradient(160deg, ${alpha(theme.palette.background.paper, 1)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
          }}
        >
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Create Account
          </Typography>
          <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
            AI-Powered Customer Service Platform
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            You'll verify your email and phone via OTP. After verification, an administrator will assign your role.
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              autoFocus
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              fullWidth
              label="Phone Number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="+263 77 123 4567"
              helperText="Optional: Add phone for SMS verification"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              select
              label="Preferred Language"
              name="preferred_language"
              value={formData.preferred_language}
              onChange={handleChange}
            >
              {LANGUAGES.map((lang) => (
                <MenuItem key={lang.value} value={lang.value}>
                  {lang.label}
                </MenuItem>
              ))}
            </TextField>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
              size="large"
            >
              {loading ? 'Creating account...' : 'Register'}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Typography color="primary">Already have an account? Sign In</Typography>
              </Link>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  )
}

export default RegisterPage
