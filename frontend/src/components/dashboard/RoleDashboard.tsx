import { Navigate } from 'react-router-dom'
import { useAuth } from '../../services/authService'
import CustomerDashboard from './CustomerDashboard'
import AgentDashboard from './AgentDashboard'
import SupervisorDashboard from './SupervisorDashboard'
import AdminDashboard from './AdminDashboard'

export default function RoleDashboard() {
  const { user } = useAuth()

  if (!user?.role) {
    return <Navigate to="/login" />
  }

  if (user.role === 'admin') {
    return <AdminDashboard />
  }

  if (user.role === 'supervisor') {
    return <SupervisorDashboard />
  }

  if (user.role === 'agent') {
    return <AgentDashboard />
  }

  return <CustomerDashboard />
}
