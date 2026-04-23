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
  InputAdornment,
  Stack,
} from '@mui/material'
import {
  ArrowOutward as ArrowOutwardIcon,
  CheckCircleOutline as CheckCircleIcon,
  LockOutlined as LockIcon,
  MailOutline as MailIcon,
  PersonOutline as PersonIcon,
  PhoneOutlined as PhoneIcon,
  TranslateOutlined as LanguageIcon,
} from '@mui/icons-material'
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

  const activeStep = getActiveStep()

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

  const renderStepProgress = (currentStep: number) => (
    <Stack
      direction="row"
      justifyContent="center"
      spacing={{ xs: 0.7, sm: 1.3 }}
      sx={{ mb: 1.8, flexWrap: 'wrap', rowGap: 1 }}
    >
      {STEP_LABELS.map((label, index) => {
        const isActive = currentStep === index
        const isComplete = currentStep > index

        return (
          <Stack key={label} alignItems="center" spacing={0.45}>
            <Box
              sx={{
                width: 27,
                height: 27,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem',
                color: isActive || isComplete ? '#fff' : '#6f7ca7',
                backgroundColor: isActive || isComplete ? '#6280ed' : '#e8edff',
              }}
            >
              {index + 1}
            </Box>
            <Typography sx={{ fontSize: '0.72rem', color: isActive ? '#4f5f9c' : '#7d88b1', fontWeight: isActive ? 700 : 500 }}>
              {label}
            </Typography>
          </Stack>
        )
      })}
    </Stack>
  )

  const renderAuthShell = (rightPanel: React.ReactNode) => (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 2, md: 2.5 },
        px: { xs: 1.25, md: 3 },
        overflow: 'hidden',
        position: 'relative',
        background: 'linear-gradient(135deg, #5f79eb 0%, #94aae8 38%, #eff2fb 100%)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -180,
          right: -120,
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.72), rgba(255,255,255,0.12))',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -120,
          right: 30,
          width: 220,
          height: 220,
          borderRadius: '50%',
          border: '24px solid rgba(111, 139, 236, 0.24)',
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            borderRadius: 5,
            overflow: 'hidden',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '0.95fr 1.05fr' },
            boxShadow: '0 30px 70px rgba(35, 58, 132, 0.24)',
            border: '1px solid rgba(255, 255, 255, 0.55)',
            backgroundColor: 'rgba(246, 248, 255, 0.9)',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              color: '#fff',
              p: { xs: 3.2, md: 4.8 },
              background: 'linear-gradient(160deg, #4f70e9 0%, #6884f1 100%)',
              minHeight: { xs: 220, md: 620 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              fontFamily: 'Manrope, Nunito Sans, sans-serif',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: 18,
                left: 18,
                width: 72,
                height: 72,
                borderRadius: '22px',
                border: '1px solid rgba(255,255,255,0.35)',
                backgroundColor: 'rgba(255,255,255,0.1)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: 44,
                left: 110,
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#8ef0f0',
                boxShadow: '0 0 10px rgba(142, 240, 240, 0.7)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: { xs: 26, md: 38 },
                right: { xs: 20, md: 28 },
                width: { xs: 120, md: 160 },
                height: { xs: 120, md: 160 },
                borderRadius: '50%',
                border: '8px solid rgba(255,255,255,0.75)',
              }}
            />

            <Box sx={{ mt: { xs: 4, md: 8 }, position: 'relative', zIndex: 1 }}>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.04,
                  letterSpacing: '-0.02em',
                  fontSize: { xs: '2rem', md: '3rem' },
                  maxWidth: 360,
                }}
              >
                Create your
                <br />
                support space
              </Typography>
              <Typography
                sx={{
                  mt: 2,
                  fontSize: { xs: '0.94rem', md: '1.02rem' },
                  maxWidth: 325,
                  color: 'rgba(255,255,255,0.9)',
                  fontWeight: 500,
                }}
              >
                Sign up once and get instant access to AI-powered help, updates on your requests, and faster issue resolution.
              </Typography>
            </Box>

            <Button
              component={Link}
              to="/login"
              variant="contained"
              endIcon={<ArrowOutwardIcon />}
              sx={{
                alignSelf: 'flex-start',
                mt: 2,
                px: 2.5,
                py: 0.95,
                borderRadius: 999,
                textTransform: 'none',
                fontWeight: 700,
                color: '#132566',
                backgroundColor: 'rgba(255,255,255,0.92)',
                '&:hover': {
                  backgroundColor: '#ffffff',
                },
              }}
            >
              Back to Sign In
            </Button>
          </Box>

          <Box
            sx={{
              p: { xs: 2.5, md: 3.5 },
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(246, 248, 255, 0.9)',
            }}
          >
            {rightPanel}
          </Box>
        </Paper>
      </Container>
    </Box>
  )

  // Email OTP Verification Step
  if (step === 'email-otp') {
    return renderAuthShell(
      <Box sx={{ width: '100%', maxWidth: 490 }}>
        {renderStepProgress(activeStep)}
        <OTPVerification
          email={formData.email}
          onVerified={handleEmailVerified}
          onBack={handleBackToForm}
        />
      </Box>
    )
  }

  // Phone OTP Verification Step
  if (step === 'phone-otp') {
    return renderAuthShell(
      <Box sx={{ width: '100%', maxWidth: 490 }}>
        {renderStepProgress(activeStep)}
        <PhoneVerification
          email={formData.email}
          initialPhoneNumber={formData.phone_number}
          onVerified={handlePhoneVerified}
          onSkip={handleSkipPhone}
        />
      </Box>
    )
  }

  // Success Step
  if (step === 'success') {
    return renderAuthShell(
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          width: '100%',
          maxWidth: 470,
          textAlign: 'center',
          borderRadius: 3,
          border: '1px solid #dde4fa',
          background: 'linear-gradient(160deg, #ffffff 0%, #f5f8ff 100%)',
          boxShadow: '0 16px 36px rgba(63, 93, 197, 0.15)',
        }}
      >
        {renderStepProgress(activeStep)}
        <Box
          sx={{
            width: 78,
            height: 78,
            borderRadius: '50%',
            backgroundColor: '#e6f6ed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 44, color: '#26a269' }} />
        </Box>
        <Typography variant="h5" sx={{ color: '#2f3350', fontWeight: 700, mb: 1 }}>
          Registration complete
        </Typography>
        <Typography sx={{ mb: 1.5, color: '#4d5b87' }}>
          Your profile was created successfully{formData.phone_number ? ', and your phone is verified too.' : '.'}
        </Typography>
        <Typography sx={{ mb: 3, color: '#6d789c', fontSize: '0.94rem' }}>
          Your account is pending approval. You can sign in as soon as activation is complete.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/login')}
          sx={{
            textTransform: 'none',
            px: 3,
            py: 1,
            borderRadius: 1.7,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #6382f0 0%, #5975df 100%)',
          }}
        >
          Go to Login
        </Button>
      </Paper>
    )
  }

  // Registration Form Step
  return renderAuthShell(
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ width: '100%', maxWidth: 530, fontFamily: 'DM Sans, Manrope, sans-serif' }}
    >
      <Box
        sx={{
          width: 62,
          height: 62,
          borderRadius: 2.5,
          mx: 'auto',
          mb: 1.6,
          background: 'linear-gradient(145deg, #ffffff 0%, #edf1ff 100%)',
          boxShadow: '0 8px 22px rgba(65, 93, 195, 0.18)',
          overflow: 'hidden',
        }}
      >
        <Box
          component="img"
          src="/chatbot-head.jpg"
          alt="Chatbot assistant"
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </Box>

      <Typography
        variant="h5"
        align="center"
        sx={{
          fontWeight: 700,
          color: '#2f3350',
          mb: 0.45,
          letterSpacing: '-0.02em',
        }}
      >
        Create your account
      </Typography>
      <Typography
        align="center"
        sx={{
          color: '#7983a8',
          mb: 1.5,
          fontSize: '0.9rem',
        }}
      >
        Start chatting with our AI assistant and track your support requests in one place.
      </Typography>

      {renderStepProgress(activeStep)}

      <Alert severity="info" sx={{ mb: 1.5, borderRadius: 2 }}>
        Verify your email with OTP. Phone verification is optional and can be skipped later in the flow.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          columnGap: 1.25,
          rowGap: 1.25,
        }}
      >
        <TextField
          required
          fullWidth
          size="small"
          label="Full Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          autoFocus
          sx={{
            '& .MuiOutlinedInput-root': {
              minHeight: 44,
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonIcon sx={{ color: '#7d86ad', fontSize: 18 }} />
              </InputAdornment>
            ),
            sx: {
              borderRadius: 1.5,
              backgroundColor: '#ffffff',
            },
          }}
        />
        <TextField
          required
          fullWidth
          size="small"
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          sx={{
            '& .MuiOutlinedInput-root': {
              minHeight: 44,
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <MailIcon sx={{ color: '#7d86ad', fontSize: 18 }} />
              </InputAdornment>
            ),
            sx: {
              borderRadius: 1.5,
              backgroundColor: '#ffffff',
            },
          }}
        />
        <TextField
          fullWidth
          size="small"
          label="Phone Number (Optional)"
          name="phone_number"
          value={formData.phone_number}
          onChange={handleChange}
          placeholder="+263 77 123 4567"
          sx={{
            '& .MuiOutlinedInput-root': {
              minHeight: 44,
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PhoneIcon sx={{ color: '#7d86ad', fontSize: 18 }} />
              </InputAdornment>
            ),
            sx: {
              borderRadius: 1.5,
              backgroundColor: '#ffffff',
            },
          }}
        />
        <TextField
          required
          fullWidth
          select
          size="small"
          label="Preferred Language"
          name="preferred_language"
          value={formData.preferred_language}
          onChange={handleChange}
          sx={{
            '& .MuiOutlinedInput-root': {
              minHeight: 44,
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LanguageIcon sx={{ color: '#7d86ad', fontSize: 18 }} />
              </InputAdornment>
            ),
            sx: {
              borderRadius: 1.5,
              backgroundColor: '#ffffff',
            },
          }}
        >
          {LANGUAGES.map((lang) => (
            <MenuItem key={lang.value} value={lang.value}>
              {lang.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          required
          fullWidth
          size="small"
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          sx={{
            '& .MuiOutlinedInput-root': {
              minHeight: 44,
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon sx={{ color: '#7d86ad', fontSize: 18 }} />
              </InputAdornment>
            ),
            sx: {
              borderRadius: 1.5,
              backgroundColor: '#ffffff',
            },
          }}
        />
        <TextField
          required
          fullWidth
          size="small"
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          sx={{
            '& .MuiOutlinedInput-root': {
              minHeight: 44,
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon sx={{ color: '#7d86ad', fontSize: 18 }} />
              </InputAdornment>
            ),
            sx: {
              borderRadius: 1.5,
              backgroundColor: '#ffffff',
            },
          }}
        />
      </Box>

      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{
          mt: 2.1,
          mb: 1.35,
          py: 1.05,
          borderRadius: 1.7,
          textTransform: 'none',
          fontWeight: 700,
          fontSize: '0.97rem',
          boxShadow: 'none',
          background: 'linear-gradient(135deg, #6382f0 0%, #5975df 100%)',
          '&:hover': {
            boxShadow: 'none',
            background: 'linear-gradient(135deg, #5975df 0%, #4f6bd4 100%)',
          },
        }}
        disabled={loading}
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </Button>

      <Typography align="center" sx={{ fontSize: '0.9rem', color: '#5b648d' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: '#617fea', fontWeight: 700, textDecoration: 'none' }}>
          Sign In
        </Link>
      </Typography>
    </Box>
  )
}

export default RegisterPage
