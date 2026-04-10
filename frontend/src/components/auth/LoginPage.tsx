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
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { 
  HourglassEmpty as PendingIcon, 
  Warning as WarningIcon
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
  const { login } = useAuth()
  const navigate = useNavigate()
  const theme = useTheme()

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
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <Paper
          elevation={6}
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 3,
            background:
              theme.palette.mode === 'dark'
                ? `linear-gradient(160deg, ${alpha(theme.palette.background.paper, 0.94)}, ${alpha(theme.palette.primary.main, 0.08)})`
                : `linear-gradient(160deg, ${alpha(theme.palette.background.paper, 1)}, ${alpha(theme.palette.primary.main, 0.05)})`,
          }}
        >
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            AI Customer Service Platform
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" mb={3}>
            Sign in to continue
          </Typography>

          {error && (
            <Alert 
              severity={error.includes('verified') ? 'success' : 'error'} 
              sx={{ mb: 2 }} 
              icon={error.includes('verified') ? undefined : <WarningIcon />}
            >
              {error}
            </Alert>
          )}
          
          {isPending && (
            <Alert 
              severity="info" 
              sx={{ mb: 2 }}
              icon={<PendingIcon />}
            >
              <Typography variant="subtitle2" fontWeight="bold">
                Account Pending Approval
              </Typography>
              <Typography variant="body2">
                Your account has been registered and is awaiting administrator approval. 
                You will be able to sign in once an administrator assigns you a role.
              </Typography>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link to="/register" style={{ textDecoration: 'none' }}>
                <Typography color="primary">Don't have an account? Sign Up</Typography>
              </Link>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  )
}

export default LoginPage
