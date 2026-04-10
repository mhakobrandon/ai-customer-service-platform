export interface AppNotification {
  id: string
  title: string
  description: string
  route?: string
  createdAt?: string
  meta?: Record<string, string | number | boolean>
}

interface CustomerSessionLike {
  session_id: string
  message_count: number
  updated_at?: string
  created_at?: string
  last_message?: string
}

interface AgentTicketLike {
  id?: string
  ticket_id?: string
  subject?: string
  status?: string
  created_at?: string
}

interface AdminTicketLike {
  id?: string
  ticket_id?: string
  subject?: string
  status?: string
  created_at?: string
  is_overdue?: boolean
  resolution_due?: string | null
}

const customerSeenKey = (userId: string) => `notif_customer_seen_counts_${userId}`
const agentSeenKey = (userId: string) => `notif_agent_seen_ticket_ids_${userId}`
const adminSeenKey = (userId: string) => `notif_admin_seen_overdue_ids_${userId}`
const adminCreatedSeenKey = (userId: string) => `notif_admin_seen_created_ticket_ids_${userId}`
const supervisorCreatedSeenKey = (userId: string) => `notif_supervisor_seen_created_ticket_ids_${userId}`

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const readStorage = <T>(key: string, fallback: T): T => safeParse<T>(localStorage.getItem(key), fallback)

const writeStorage = <T>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value))
}

export const getCustomerSeenCounts = (userId?: string | null): Record<string, number> => {
  if (!userId) return {}
  return readStorage<Record<string, number>>(customerSeenKey(userId), {})
}

export const markCustomerSessionRead = (userId: string | undefined, sessionId: string, messageCount: number) => {
  if (!userId) return
  const existing = getCustomerSeenCounts(userId)
  existing[sessionId] = Math.max(existing[sessionId] || 0, messageCount)
  writeStorage(customerSeenKey(userId), existing)
}

export const markAllCustomerSessionsRead = (
  userId: string | undefined,
  sessions: CustomerSessionLike[]
) => {
  if (!userId) return
  const existing = getCustomerSeenCounts(userId)
  sessions.forEach((session) => {
    existing[session.session_id] = session.message_count || 0
  })
  writeStorage(customerSeenKey(userId), existing)
}

export const computeCustomerSessionNotifications = (
  sessions: CustomerSessionLike[],
  userId?: string | null,
  activeSessionId?: string | null
) => {
  const seenCounts = getCustomerSeenCounts(userId)
  const unreadBySession: Record<string, number> = {}
  const notifications: AppNotification[] = []
  let totalUnread = 0

  sessions.forEach((session) => {
    const seen = seenCounts[session.session_id] || 0
    const rawUnread = Math.max((session.message_count || 0) - seen, 0)
    const unread = activeSessionId && activeSessionId === session.session_id ? 0 : rawUnread

    unreadBySession[session.session_id] = unread
    if (unread > 0) {
      totalUnread += unread
      notifications.push({
        id: `customer-session-${session.session_id}`,
        title: `New message${unread > 1 ? 's' : ''}`,
        description: session.last_message || 'You have unread chat updates.',
        route: `/chat?session=${session.session_id}`,
        createdAt: session.updated_at || session.created_at,
        meta: { session_id: session.session_id, unread_count: unread },
      })
    }
  })

  notifications.sort((a, b) => (new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()))

  return { unreadBySession, notifications, totalUnread }
}

const pendingAgentStatuses = new Set(['new', 'assigned', 'in_progress', 'pending_customer', 'escalated', 'reopened'])

export const computeAgentAssignmentNotifications = (tickets: AgentTicketLike[], userId?: string | null) => {
  if (!userId) return { notifications: [] as AppNotification[], totalUnread: 0 }

  const seen = readStorage<string[]>(agentSeenKey(userId), [])
  const seenSet = new Set(seen)

  const notifications = tickets
    .filter((ticket) => pendingAgentStatuses.has((ticket.status || '').toLowerCase()))
    .map((ticket) => {
      const id = ticket.ticket_id || ticket.id || ''
      return {
        id,
        ticket,
      }
    })
    .filter((entry) => entry.id && !seenSet.has(entry.id))
    .map(({ id, ticket }) => ({
      id: `agent-ticket-${id}`,
      title: 'New ticket created',
      description: ticket.subject || id,
      route: ticket.ticket_id ? `/tickets/${ticket.ticket_id}` : undefined,
      createdAt: ticket.created_at,
      meta: { ticket_id: ticket.ticket_id || id },
    }))

  notifications.sort((a, b) => (new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()))

  return { notifications, totalUnread: notifications.length }
}

export const markAgentTicketNotificationsRead = (userId: string | undefined, tickets: AgentTicketLike[]) => {
  if (!userId) return
  const ids = tickets
    .filter((ticket) => pendingAgentStatuses.has((ticket.status || '').toLowerCase()))
    .map((ticket) => ticket.ticket_id || ticket.id)
    .filter(Boolean) as string[]
  writeStorage(agentSeenKey(userId), Array.from(new Set(ids)))
}

export const computeAdminTicketCreatedNotifications = (tickets: AdminTicketLike[], userId?: string | null) => {
  if (!userId) return { notifications: [] as AppNotification[], totalUnread: 0 }

  const seen = readStorage<string[]>(adminCreatedSeenKey(userId), [])
  const seenSet = new Set(seen)

  const notifications = tickets
    .map((ticket) => {
      const id = ticket.ticket_id || ticket.id || ''
      return { id, ticket }
    })
    .filter((entry) => entry.id && !seenSet.has(entry.id))
    .map(({ id, ticket }) => ({
      id: `admin-created-${id}`,
      title: 'New ticket created',
      description: ticket.subject || id,
      route: '#tickets',
      createdAt: ticket.created_at || undefined,
      meta: { ticket_id: ticket.ticket_id || id },
    }))

  notifications.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  return { notifications, totalUnread: notifications.length }
}

export const markAdminTicketCreatedNotificationsRead = (userId: string | undefined, tickets: AdminTicketLike[]) => {
  if (!userId) return
  const ids = tickets.map((ticket) => ticket.ticket_id || ticket.id).filter(Boolean) as string[]
  writeStorage(adminCreatedSeenKey(userId), Array.from(new Set(ids)))
}

export const computeSupervisorTicketCreatedNotifications = (tickets: AdminTicketLike[], userId?: string | null) => {
  if (!userId) return { notifications: [] as AppNotification[], totalUnread: 0 }

  const seen = readStorage<string[]>(supervisorCreatedSeenKey(userId), [])
  const seenSet = new Set(seen)

  const notifications = tickets
    .map((ticket) => {
      const id = ticket.ticket_id || ticket.id || ''
      return { id, ticket }
    })
    .filter((entry) => entry.id && !seenSet.has(entry.id))
    .map(({ id, ticket }) => ({
      id: `supervisor-created-${id}`,
      title: 'New ticket created',
      description: ticket.subject || id,
      route: '/admin',
      createdAt: ticket.created_at || undefined,
      meta: { ticket_id: ticket.ticket_id || id },
    }))

  notifications.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  return { notifications, totalUnread: notifications.length }
}

export const markSupervisorTicketCreatedNotificationsRead = (userId: string | undefined, tickets: AdminTicketLike[]) => {
  if (!userId) return
  const ids = tickets.map((ticket) => ticket.ticket_id || ticket.id).filter(Boolean) as string[]
  writeStorage(supervisorCreatedSeenKey(userId), Array.from(new Set(ids)))
}

const resolvedStatuses = new Set(['resolved', 'closed'])

export const computeAdminOverdueNotifications = (tickets: AdminTicketLike[], userId?: string | null) => {
  if (!userId) return { notifications: [] as AppNotification[], totalUnread: 0 }

  const seen = readStorage<string[]>(adminSeenKey(userId), [])
  const seenSet = new Set(seen)

  const overdue = tickets
    .filter((ticket) => Boolean(ticket.is_overdue))
    .filter((ticket) => !resolvedStatuses.has((ticket.status || '').toLowerCase()))
    .map((ticket) => {
      const id = ticket.ticket_id || ticket.id || ''
      return { id, ticket }
    })
    .filter((entry) => entry.id)

  const notifications = overdue
    .filter((entry) => !seenSet.has(entry.id))
    .map(({ id, ticket }) => ({
      id: `admin-overdue-${id}`,
      title: 'Overdue ticket alert',
      description: ticket.subject || id,
      route: '#overdue-tickets',
      createdAt: ticket.resolution_due || undefined,
      meta: { ticket_id: ticket.ticket_id || id },
    }))

  return { notifications, totalUnread: notifications.length }
}

export const markAdminOverdueNotificationsRead = (userId: string | undefined, tickets: AdminTicketLike[]) => {
  if (!userId) return
  const ids = tickets
    .filter((ticket) => Boolean(ticket.is_overdue))
    .filter((ticket) => !resolvedStatuses.has((ticket.status || '').toLowerCase()))
    .map((ticket) => ticket.ticket_id || ticket.id)
    .filter(Boolean) as string[]

  writeStorage(adminSeenKey(userId), Array.from(new Set(ids)))
}
