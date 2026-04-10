type UserRole = 'customer' | 'agent' | 'supervisor' | 'admin' | string | undefined

export function getDashboardRoute(role: UserRole): string {
  if (role === 'admin') return '/dashboard/admin'
  if (role === 'supervisor') return '/dashboard/supervisor'
  if (role === 'agent') return '/dashboard/agent'
  return '/dashboard/customer'
}
