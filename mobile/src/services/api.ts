import axios from 'axios'

export type RegisterPayload = {
  name: string
  email: string
  password: string
  phone_number?: string
  preferred_language: string
}

export type AuthSession = {
  access_token: string
  refresh_token: string
  token_type: string
  user: {
    id: string
    name: string
    email: string
    role: string
    preferred_language: string
  }
}

export type ChatSession = {
  id: string
  session_id: string
  status: string
  initial_language: string
  created_at: string
  last_message?: string | null
  last_intent?: string | null
  message_count: number
  updated_at?: string | null
}

export type MobileChatMessage = {
  id: string
  content: string
  language: string
  is_from_customer: boolean
  is_from_ai: boolean
  is_from_agent: boolean
  sender_name?: string | null
  detected_intent?: string | null
  confidence_score?: string | null
  timestamp: string
}

export type SendMessageResponse = {
  message_id: string
  content: string
  language: string
  intent: string
  confidence: number
  requires_escalation: boolean
  ticket_id?: string | null
  timestamp: string
}

export type ProviderOption = {
  provider: string
  type: string
}

export type NearbyLocation = {
  name: string
  type: string
  distance_km: number
  address?: string
  contact?: string
  opening_hours?: string
  latitude: number
  longitude: number
  map_url?: string
}

export type SessionRating = {
  rating: number | null
  comment: string | null
}

export type SessionCompletionResult = {
  session_id: string
  session_status: string
  ticket_id?: string | null
  ticket_status?: string | null
  message: string
}

export type CustomerTicketSummary = {
  id: string
  ticket_id: string
  subject: string
  description: string
  category: string
  priority: string
  status: string
  created_at: string
}

export type UserProfile = {
  id: string
  name: string
  email: string
  phone_number?: string | null
  role: string
  preferred_language: string
  is_active: boolean
}

export type UserProfileUpdatePayload = {
  name?: string
  phone_number?: string
  preferred_language?: string
}

export type HealthResponse = {
  status: string
  app_name: string
  version: string
  supported_languages: string[]
}

export type NearbyLocationsResponse = {
  results: NearbyLocation[]
}

export function normalizeApiBaseUrl(value: string): string {
  const trimmed = (value ?? '').trim().replace(/\/+$/, '')
  if (!trimmed) {
    return ''
  }

  if (trimmed.endsWith('/api/v1')) {
    return trimmed
  }

  if (trimmed.endsWith('/api')) {
    return `${trimmed}/v1`
  }

  return `${trimmed}/api/v1`
}

export function getHealthUrl(apiBaseUrl: string): string {
  return normalizeApiBaseUrl(apiBaseUrl).replace(/\/api\/v1$/, '/health')
}

export function describeApiError(error: any): string {
  const errorCode = error?.code
  if (errorCode === 'ECONNABORTED' || /timeout/i.test(String(error?.message ?? ''))) {
    return 'Request timed out. Check backend URL, ensure the server is running, and confirm your phone and PC are on the same Wi-Fi.'
  }

  const detail = error?.response?.data?.detail

  if (Array.isArray(detail) && detail.length > 0) {
    const message = detail
      .map((item: any) => {
        const fieldPath = Array.isArray(item?.loc)
          ? item.loc.filter((part: string) => part !== 'body').join('.')
          : ''
        const fieldLabel = fieldPath ? `${fieldPath}: ` : ''
        return `${fieldLabel}${item?.msg ?? 'Invalid value'}`
      })
      .join('\n')

    if (message.length > 0) {
      return message
    }
  }

  if (typeof detail === 'string' && detail.length > 0) {
    return detail
  }

  const message = error?.response?.data?.message
  if (typeof message === 'string' && message.length > 0) {
    return message
  }

  if (typeof error?.message === 'string' && error.message.length > 0) {
    return error.message
  }

  return 'Unable to reach the backend. Confirm both devices are on the same Wi-Fi and use your PC LAN IP instead of localhost.'
}

export class MobileApiClient {
  private readonly client

  constructor(apiBaseUrl: string, accessToken?: string) {
    this.client = axios.create({
      baseURL: normalizeApiBaseUrl(apiBaseUrl),
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    })
  }

  async healthCheck(): Promise<HealthResponse> {
    const response = await axios.get<HealthResponse>(getHealthUrl(this.client.defaults.baseURL ?? ''))
    return response.data
  }

  async login(email: string, password: string): Promise<AuthSession> {
    try {
      const response = await this.client.post<AuthSession>('/auth/login', { email, password })
      return response.data
    } catch (error: any) {
      const statusCode = error?.response?.status
      const shouldTryFormLogin = [404, 405, 415, 422].includes(statusCode)

      if (!shouldTryFormLogin) {
        throw error
      }

      const form = new URLSearchParams()
      form.append('username', email)
      form.append('password', password)
      form.append('grant_type', 'password')

      const formResponse = await this.client.post<AuthSession>('/auth/token', form, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      return formResponse.data
    }
  }

  async register(payload: RegisterPayload): Promise<{ success: boolean; message: string; email: string }> {
    const response = await this.client.post('/auth/register', payload)
    return response.data
  }

  async resendOtp(email: string): Promise<{ success: boolean; message: string; otp_sent?: boolean }> {
    const response = await this.client.post('/auth/resend-otp', { email })
    return response.data
  }

  async verifyOtp(email: string, otp: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post('/auth/verify-otp', { email, otp })
    return response.data
  }

  async getSessions(): Promise<ChatSession[]> {
    const response = await this.client.get<ChatSession[]>('/chat/sessions')
    return response.data
  }

  async createSession(): Promise<ChatSession> {
    const response = await this.client.post<ChatSession>('/chat/sessions', {})
    return response.data
  }

  async getMessages(sessionId: string): Promise<MobileChatMessage[]> {
    const response = await this.client.get<MobileChatMessage[]>(`/chat/sessions/${sessionId}/messages`)
    return response.data
  }

  async sendMessage(
    sessionId: string,
    content: string,
    language: string,
    providerName?: string,
    providerType?: string
  ): Promise<SendMessageResponse> {
    const response = await this.client.post<SendMessageResponse>('/chat/messages', {
      session_id: sessionId,
      content,
      language,
      provider_name: providerName,
      provider_type: providerType,
    })
    return response.data
  }

  async getProviders(): Promise<ProviderOption[]> {
    const response = await this.client.get<{ providers: ProviderOption[] }>('/chat/providers')
    return response.data.providers ?? []
  }

  async getNearbyLocations(query: string, locationType: string, limit: number = 5): Promise<NearbyLocation[]> {
    const response = await this.client.post<NearbyLocationsResponse>('/chat/locations/nearby', {
      query,
      location_type: locationType,
      limit,
    })
    return response.data?.results ?? []
  }

  async submitRating(sessionId: string, rating: number, comment?: string): Promise<{ rating: number; comment?: string | null }> {
    const response = await this.client.post(`/chat/sessions/${sessionId}/rating`, { rating, comment })
    return response.data
  }

  async getRating(sessionId: string): Promise<SessionRating> {
    const response = await this.client.get<SessionRating>(`/chat/sessions/${sessionId}/rating`)
    return response.data
  }

  async completeSession(
    sessionId: string,
    payload: { resolved: boolean; rating?: number; comment?: string }
  ): Promise<SessionCompletionResult> {
    const response = await this.client.post<SessionCompletionResult>(`/chat/sessions/${sessionId}/complete`, payload)
    return response.data
  }

  async getTickets(limit: number = 100): Promise<CustomerTicketSummary[]> {
    const response = await this.client.get<CustomerTicketSummary[]>('/tickets/', {
      params: { limit },
    })
    return response.data
  }

  async getCurrentUserProfile(): Promise<UserProfile> {
    const response = await this.client.get<UserProfile>('/users/me')
    return response.data
  }

  async updateCurrentUserProfile(payload: UserProfileUpdatePayload): Promise<UserProfile> {
    const response = await this.client.patch<UserProfile>('/users/me', payload)
    return response.data
  }
}
