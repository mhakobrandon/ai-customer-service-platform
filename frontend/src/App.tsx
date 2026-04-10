/**
 * Main Application Component
 * Handles routing and layout with role-based access control
 * 
 * Roles:
 * - Customer: Access to chat and dashboard
 * - Agent: Access to chat, dashboard, and escalation handling
 * - Supervisor: Access to all agent features + analytics and agent management
 * - Admin: Full system access
 */

import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'
import LoginPage from './components/auth/LoginPage'
import RegisterPage from './components/auth/RegisterPage'
import ChatInterface from './components/chat/ChatInterface'
import RoleDashboard from './components/dashboard/RoleDashboard'
import CustomerDashboard from './components/dashboard/CustomerDashboard'
import AgentDashboard from './components/dashboard/AgentDashboard'
import SupervisorDashboard from './components/dashboard/SupervisorDashboard'
import AdminDashboard from './components/dashboard/AdminDashboard'
import AdminPanel from './components/admin/AdminPanel'
import UserManagement from './components/admin/UserManagement'
import AgentConsole from './components/admin/AgentConsole'
import LocationManagement from './components/admin/LocationManagement'
import NLPFeedbackReview from './components/admin/NLPFeedbackReview'
import TicketDetails from './components/tickets/TicketDetails'
import { BankingPage } from './components/banking'
import { useAuth } from './services/authService'
import ThemeModeToggle from './components/common/ThemeModeToggle'

// Role-based access helper
const hasAccess = (userRole: string | undefined, allowedRoles: string[]): boolean => {
  if (!userRole) return false
  return allowedRoles.includes(userRole)
}

function App() {
  const { isAuthenticated, user } = useAuth()

  // Role hierarchy for access control
  const canViewAnalytics = hasAccess(user?.role, ['supervisor', 'admin'])
  const canHandleEscalations = hasAccess(user?.role, ['agent', 'supervisor', 'admin'])
  const canAccessBanking = hasAccess(user?.role, ['admin'])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes - All authenticated users */}
        <Route
          path="/chat"
          element={isAuthenticated ? <ChatInterface /> : <Navigate to="/login" />}
        />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <RoleDashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/dashboard/customer"
          element={
            isAuthenticated ? (
              user?.role === 'customer' ? <CustomerDashboard /> : <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/dashboard/agent"
          element={
            isAuthenticated ? (
              user?.role === 'agent' ? <AgentDashboard /> : <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/dashboard/supervisor"
          element={
            isAuthenticated ? (
              user?.role === 'supervisor' ? <SupervisorDashboard /> : <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/dashboard/admin"
          element={
            isAuthenticated ? (
              user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        
        {/* Admin Panel - Supervisors and Admins only */}
        <Route
          path="/admin"
          element={
            isAuthenticated && canViewAnalytics ? (
              <AdminPanel />
            ) : isAuthenticated ? (
              <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        
        {/* User Management - Supervisors and Admins only */}
        <Route
          path="/admin/users"
          element={
            isAuthenticated && canViewAnalytics ? (
              <UserManagement />
            ) : isAuthenticated ? (
              <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Location Directory Management - Supervisors and Admins only */}
        <Route
          path="/admin/locations"
          element={
            isAuthenticated && canViewAnalytics ? (
              <LocationManagement />
            ) : isAuthenticated ? (
              <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* NLP Feedback Review - Supervisors and Admins only */}
        <Route
          path="/admin/nlp-feedback"
          element={
            isAuthenticated && canViewAnalytics ? (
              <NLPFeedbackReview />
            ) : isAuthenticated ? (
              <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Agent Console - Agents, Supervisors and Admins */}
        <Route
          path="/agent/console"
          element={
            isAuthenticated && canHandleEscalations ? (
              <AgentConsole />
            ) : isAuthenticated ? (
              <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Banking Platforms - Admin only */}
        <Route
          path="/banking"
          element={
            isAuthenticated && canAccessBanking ? (
              <BankingPage />
            ) : isAuthenticated ? (
              <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Ticket Details - All authenticated users */}
        <Route
          path="/tickets/:ticketId"
          element={isAuthenticated ? <TicketDetails /> : <Navigate to="/login" />}
        />

        {/* Default route - redirect based on role */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              user?.role === 'admin' ? (
                <Navigate to="/dashboard/admin" />
              ) : user?.role === 'supervisor' ? (
                <Navigate to="/dashboard/supervisor" />
              ) : user?.role === 'agent' ? (
                <Navigate to="/dashboard/agent" />
              ) : (
                <Navigate to="/dashboard/customer" />
              )
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
      </Routes>
      <ThemeModeToggle />
    </Box>
  )
}

export default App
