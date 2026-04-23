/**
 * Login Page Component
 * With OTP verification support for unverified users
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
  Checkbox,
  FormControlLabel,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
} from '@mui/material'
import { 
  HourglassEmpty as PendingIcon, 
  Warning as WarningIcon,
  MailOutline as MailIcon,
  LockOutlined as LockIcon,
  Google as GoogleIcon,
  Facebook as FacebookIcon,
  GitHub as GitHubIcon,
  ArrowOutward as ArrowOutwardIcon,
} from '@mui/icons-material'
import { useAuth } from '../../services/authService'
import { getDashboardRoute } from '../../utils/dashboardRoute'
import OTPVerification from './OTPVerification'

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [requiresVerification, setRequiresVerification] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsPending(false)
    setRequiresVerification(false)
    setLoading(true)

    const result = await login(email, password)

    if (result.success) {
      navigate(getDashboardRoute(result.user?.role))
    } else {
      // Check if the error is about pending approval
      if (result.error?.toLowerCase().includes('pending')) {
        setIsPending(true)
      } else if (result.error?.toLowerCase().includes('not verified') || 
                 result.error?.toLowerCase().includes('verification otp')) {
        // User needs to verify email
        setRequiresVerification(true)
      } else {
        setError(result.error || 'Login failed')
      }
    }
    setLoading(false)
  }

  const handleVerified = () => {
    // After verification, try to login again
    setRequiresVerification(false)
    setError('')
    // Show success message and prompt to login again
    setError('Email verified! Please sign in again.')
  }

  const handleBackToLogin = () => {
    setRequiresVerification(false)
    setError('')
  }

  const handleForgotPassword = () => {
    setError('Password reset is currently managed by an administrator. Please contact support.')
  }

  // Show OTP verification if required
  if (requiresVerification) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <OTPVerification
            email={email}
            onVerified={handleVerified}
            onBack={handleBackToLogin}
          />
        </Box>
      </Container>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 3, md: 6 },
        px: { xs: 1.5, md: 3 },
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
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            boxShadow: '0 30px 70px rgba(35, 58, 132, 0.24)',
            border: '1px solid rgba(255, 255, 255, 0.55)',
            backgroundColor: 'rgba(246, 248, 255, 0.9)',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              color: '#fff',
              p: { xs: 3.5, md: 6 },
              background: 'linear-gradient(160deg, #4f70e9 0%, #6884f1 100%)',
              minHeight: { xs: 230, md: 620 },
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

            <Box sx={{ mt: { xs: 4, md: 12 }, position: 'relative', zIndex: 1 }}>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.05,
                  letterSpacing: '-0.02em',
                  fontSize: { xs: '2.2rem', md: '3.35rem' },
                  maxWidth: 360,
                }}
              >
                Smarter
                <br />
                support starts here
              </Typography>
              <Typography
                sx={{
                  mt: 2,
                  fontSize: { xs: '0.98rem', md: '1.1rem' },
                  maxWidth: 300,
                  color: 'rgba(255,255,255,0.9)',
                  fontWeight: 500,
                }}
              >
                Get quick answers, personalized help, and seamless support whenever you need it.
              </Typography>
            </Box>

            <Button
              component={Link}
              to="/register"
              variant="contained"
              endIcon={<ArrowOutwardIcon />}
              sx={{
                alignSelf: 'flex-start',
                mt: 3,
                px: 2.5,
                py: 1,
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
              Create Account
            </Button>
          </Box>

          <Box
            sx={{
              p: { xs: 3, md: 6 },
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(246, 248, 255, 0.9)',
            }}
          >
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', maxWidth: 390, fontFamily: 'DM Sans, Manrope, sans-serif' }}>
              <Box
                sx={{
                  width: 66,
                  height: 66,
                  borderRadius: 2.5,
                  mx: 'auto',
                  mb: 2,
                  background: 'linear-gradient(145deg, #ffffff 0%, #edf1ff 100%)',
                  boxShadow: '0 8px 22px rgba(65, 93, 195, 0.18)',
                  overflow: 'hidden',
                }}
              >
                <Box
                  component="img"
                  src="/taur-ai-face.png"
                  alt="Taur.ai multilingual support specialist"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: '63% 18%',
                    transform: 'scale(2.25)',
                    transformOrigin: '63% 18%',
                  }}
                />
              </Box>

              <Typography
                variant="h5"
                align="center"
                sx={{
                  fontWeight: 700,
                  color: '#2f3350',
                  mb: 0.5,
                  letterSpacing: '-0.02em',
                }}
              >
                Welcome back
              </Typography>
              <Typography
                align="center"
                sx={{
                  color: '#7983a8',
                  mb: 2.25,
                  fontSize: '0.92rem',
                }}
              >
                Sign in to chat with our AI assistant, follow your support requests, and get help faster.
              </Typography>

              {error && (
                <Alert
                  severity={error.includes('verified') ? 'success' : 'error'}
                  sx={{ mb: 1.8, borderRadius: 2 }}
                  icon={error.includes('verified') ? undefined : <WarningIcon />}
                >
                  {error}
                </Alert>
              )}

              {isPending && (
                <Alert severity="info" sx={{ mb: 1.8, borderRadius: 2 }} icon={<PendingIcon />}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Account Pending Approval
                  </Typography>
                  <Typography variant="body2">
                    Your account is awaiting administrator approval before you can sign in.
                  </Typography>
                </Alert>
              )}

              <Typography sx={{ fontSize: '0.85rem', mb: 0.4, color: '#4e557a', fontWeight: 600 }}>
                Email
              </Typography>
              <TextField
                required
                fullWidth
                placeholder="Enter your email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                size="small"
                sx={{ mb: 1.5 }}
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

              <Typography sx={{ fontSize: '0.85rem', mb: 0.4, color: '#4e557a', fontWeight: 600 }}>
                Password
              </Typography>
              <TextField
                required
                fullWidth
                placeholder="Enter your password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                size="small"
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

              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.8, mt: 0.4 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      size="small"
                      sx={{ color: '#9aa4cb' }}
                    />
                  }
                  label={<Typography sx={{ fontSize: '0.85rem', color: '#59618b' }}>Remember me</Typography>}
                />
                <Button
                  type="button"
                  variant="text"
                  onClick={handleForgotPassword}
                  sx={{
                    textTransform: 'none',
                    p: 0,
                    minWidth: 0,
                    fontWeight: 600,
                    color: '#6380ed',
                    fontSize: '0.81rem',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      color: '#4f6ee1',
                    },
                  }}
                >
                  Reset Password!
                </Button>
              </Stack>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  py: 1.1,
                  borderRadius: 1.7,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '1rem',
                  boxShadow: 'none',
                  background: 'linear-gradient(135deg, #6382f0 0%, #5975df 100%)',
                  '&:hover': {
                    boxShadow: 'none',
                    background: 'linear-gradient(135deg, #5975df 0%, #4f6bd4 100%)',
                  },
                }}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>

              <Divider sx={{ my: 2.1, color: '#9aa4cb', fontSize: '0.84rem' }}>or</Divider>

              <Stack direction="row" justifyContent="center" spacing={1.3} sx={{ mb: 2 }}>
                <IconButton
                  aria-label="Sign in with Google"
                  sx={{ borderRadius: 1.6, border: '1px solid #dbe1f2', width: 44, height: 44 }}
                >
                  <GoogleIcon sx={{ color: '#d34f44' }} />
                </IconButton>
                <IconButton
                  aria-label="Sign in with Facebook"
                  sx={{ borderRadius: 1.6, border: '1px solid #dbe1f2', width: 44, height: 44 }}
                >
                  <FacebookIcon sx={{ color: '#3a5fb8' }} />
                </IconButton>
                <IconButton
                  aria-label="Sign in with GitHub"
                  sx={{ borderRadius: 1.6, border: '1px solid #dbe1f2', width: 44, height: 44 }}
                >
                  <GitHubIcon sx={{ color: '#111' }} />
                </IconButton>
              </Stack>

              <Typography align="center" sx={{ fontSize: '0.9rem', color: '#5b648d' }}>
                Don&apos;t have an account?{' '}
                <Link to="/register" style={{ color: '#617fea', fontWeight: 700, textDecoration: 'none' }}>
                  Create Account
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

export default LoginPage
