/**
 * API Service
 * Handles HTTP requests to backend API
 */

import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  
  register: (userData: any) =>
    apiClient.post('/auth/register', userData),
  
  verifyOtp: (email: string, otp: string) =>
    apiClient.post('/auth/verify-otp', { email, otp }),
  
  resendOtp: (email: string) =>
    apiClient.post('/auth/resend-otp', { email }),
  
  getOtpStatus: (email: string) =>
    apiClient.get(`/auth/otp-status/${encodeURIComponent(email)}`),
  
  // Phone verification
  sendPhoneOtp: (email: string, phone_number: string) =>
    apiClient.post('/auth/send-phone-otp', { email, phone_number }),
  
  verifyPhoneOtp: (phone_number: string, otp: string) =>
    apiClient.post('/auth/verify-phone-otp', { phone_number, otp }),
  
  getPhoneOtpStatus: (phone_number: string) =>
    apiClient.get(`/auth/phone-otp-status/${encodeURIComponent(phone_number)}`),
}

// Chat endpoints
export const chatAPI = {
  createSession: () =>
    apiClient.post('/chat/sessions', {}),
  
  getSessions: () =>
    apiClient.get('/chat/sessions'),
  
  sendMessage: (sessionId: string, content: string, language?: string, providerName?: string, providerType?: string) =>
    apiClient.post('/chat/messages', {
      session_id: sessionId,
      content,
      language,
      provider_name: providerName,
      provider_type: providerType,
    }),
  
  getMessages: (sessionId: string) =>
    apiClient.get(`/chat/sessions/${sessionId}/messages`),

  getProviders: () =>
    apiClient.get('/chat/providers'),

  submitRating: (sessionId: string, rating: number, comment?: string) =>
    apiClient.post(`/chat/sessions/${sessionId}/rating`, { rating, comment }),

  completeSession: (sessionId: string, payload: { resolved: boolean; rating?: number; comment?: string }) =>
    apiClient.post(`/chat/sessions/${sessionId}/complete`, payload),

  getRating: (sessionId: string) =>
    apiClient.get(`/chat/sessions/${sessionId}/rating`),

  getEscalationInbox: () =>
    apiClient.get('/chat/escalations/inbox'),

  assignAgent: (sessionId: string) =>
    apiClient.post(`/chat/sessions/${sessionId}/assign-agent`, {}),

  sendAgentMessage: (sessionId: string, content: string) =>
    apiClient.post(`/chat/sessions/${sessionId}/agent-message`, { content }),

  getNearbyLocations: (query: string, locationType: string, limit: number = 5) =>
    apiClient.post('/chat/locations/nearby', { query, location_type: locationType, limit }),
}

// Ticket endpoints
export const ticketAPI = {
  createTicket: (ticketData: any) =>
    apiClient.post('/tickets', ticketData),
  
  getTickets: (status?: string) =>
    apiClient.get('/tickets', { params: { status_filter: status } }),
  
  getTicketDetails: (ticketId: string) =>
    apiClient.get(`/tickets/${ticketId}`),
  
  updateTicket: (ticketId: string, updateData: any) =>
    apiClient.patch(`/tickets/${ticketId}`, updateData),

  requestConfirmation: (ticketId: string) =>
    apiClient.post(`/tickets/${ticketId}/request-confirmation`, {}),

  confirmResolution: (ticketId: string, customer_satisfaction?: number) =>
    apiClient.post(`/tickets/${ticketId}/confirm-resolution`, { customer_satisfaction }),

  markUnresolved: (ticketId: string) =>
    apiClient.post(`/tickets/${ticketId}/mark-unresolved`, {}),

  reopenTicket: (ticketId: string) =>
    apiClient.post(`/tickets/${ticketId}/reopen`, {}),

  closeTicket: (ticketId: string, reason?: string) =>
    apiClient.post(`/tickets/${ticketId}/close`, { reason }),

  assignTicket: (ticketId: string, agentId: string) =>
    apiClient.post(`/tickets/${ticketId}/assign`, null, { params: { agent_id: agentId } }),
}

// Analytics endpoints
export const analyticsAPI = {
  getDashboard: () =>
    apiClient.get('/analytics/dashboard'),
  
  getPerformance: (days: number = 7) =>
    apiClient.get('/analytics/performance', { params: { days } }),
  
  getIntentDistribution: (days: number = 30) =>
    apiClient.get('/analytics/intent-distribution', { params: { days } }),

  getFrequentQueries: (days: number = 30, limit: number = 10) =>
    apiClient.get('/analytics/frequent-queries', { params: { days, limit } }),

  getAgentTicketOverview: () =>
    apiClient.get('/analytics/agent-ticket-overview'),

  getMarketComparison: () =>
    apiClient.get('/analytics/market-comparison'),

  getIntegrationStatus: () =>
    apiClient.get('/analytics/integration-status'),
  
  getUserStats: () =>
    apiClient.get('/analytics/user-stats'),
  
  getRecentEscalations: (limit: number = 10) =>
    apiClient.get('/analytics/recent-escalations', { params: { limit } }),
}

// Admin endpoints
export const adminAPI = {
  // User management
  getUsers: (roleFilter?: string, statusFilter?: string) =>
    apiClient.get('/admin/users', { params: { role_filter: roleFilter, status_filter: statusFilter } }),
  
  getPendingUsers: () =>
    apiClient.get('/admin/users/pending'),
  
  getUserDetails: (userId: string) =>
    apiClient.get(`/admin/users/${userId}`),
  
  createUser: (userData: any) =>
    apiClient.post('/admin/users', userData),
  
  updateUser: (userId: string, updateData: any) =>
    apiClient.patch(`/admin/users/${userId}`, updateData),
  
  assignRole: (userId: string, roleData: { role: string; department?: string; specialization?: string; languages?: string }) =>
    apiClient.patch(`/admin/users/${userId}/assign-role`, roleData),
  
  toggleUserStatus: (userId: string) =>
    apiClient.patch(`/admin/users/${userId}/toggle-status`),
  
  deleteUser: (userId: string) =>
    apiClient.delete(`/admin/users/${userId}`),
  
  // Ticket management (admin view)
  getAllTickets: (statusFilter?: string, priorityFilter?: string) =>
    apiClient.get('/tickets/admin/all', {
      params: {
        status_filter: statusFilter || undefined,
        priority_filter: priorityFilter || undefined,
      },
    }),

  // System stats
  getSystemStats: () =>
    apiClient.get('/admin/system-stats'),

  // Location directory management
  getLocations: (locationType?: string, activeOnly?: boolean) =>
    apiClient.get('/admin/locations', { params: { location_type: locationType, active_only: activeOnly } }),

  createLocation: (locationData: any) =>
    apiClient.post('/admin/locations', locationData),

  updateLocation: (itemId: string, locationData: any) =>
    apiClient.patch(`/admin/locations/${itemId}`, locationData),

  deleteLocation: (itemId: string) =>
    apiClient.delete(`/admin/locations/${itemId}`),

  exportLocations: (format: 'csv' | 'json' = 'csv', locationType?: string) =>
    apiClient.get('/admin/locations/export', {
      params: { format, location_type: locationType },
      responseType: 'blob',
    }),

  downloadLocationTemplate: () =>
    apiClient.get('/admin/locations/template', {
      responseType: 'blob',
    }),

  importLocations: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post('/admin/locations/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  previewLocationImport: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post('/admin/locations/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // Market rates management
  getMarketRates: () =>
    apiClient.get('/admin/market-rates'),

  updateMarketFees: (fees: any[]) =>
    apiClient.put('/admin/market-rates/fees', fees),

  updateMarketBundles: (bundles: any[]) =>
    apiClient.put('/admin/market-rates/bundles', bundles),

  // NLP Feedback management
  getNLPFeedback: (params?: {
    reviewed?: boolean;
    intent?: string;
    language?: string;
    min_confidence?: number;
    max_confidence?: number;
    limit?: number;
  }) =>
    apiClient.get('/admin/nlp-feedback', { params }),

  updateNLPFeedback: (feedbackId: string, data: {
    corrected_intent?: string;
    reviewer_notes?: string;
    reviewed?: boolean;
  }) =>
    apiClient.patch(`/admin/nlp-feedback/${feedbackId}`, data),

  exportNLPFeedback: (format: 'csv' | 'json' = 'json', reviewedOnly: boolean = false) =>
    apiClient.get('/admin/nlp-feedback/export', {
      params: { format, reviewed_only: reviewedOnly },
      responseType: format === 'csv' ? 'blob' : 'json',
    }),

  triggerRetraining: () =>
    apiClient.post('/admin/nlp-feedback/retrain', {}),

  // LLM configuration
  getLLMStatus: () =>
    apiClient.get('/chat/llm/status'),

  updateLLMConfig: (config: { enabled?: boolean; api_key?: string; model?: string; temperature?: number; max_tokens?: number }) =>
    apiClient.put('/chat/llm/config', config),

  // WhatsApp configuration
  getWhatsAppStatus: () =>
    apiClient.get('/integrations/whatsapp/status'),

  getWhatsAppTokenStatus: () =>
    apiClient.get('/integrations/whatsapp/token-status'),

  updateWhatsAppToken: (access_token: string) =>
    apiClient.post('/integrations/whatsapp/token', { access_token }),

  updateWhatsAppConfig: (config: {
    provider?: string;
    access_token?: string;
    phone_number_id?: string;
    business_account_id?: string;
    verify_token?: string;
    app_secret?: string;
  }) =>
    apiClient.put('/integrations/whatsapp/config', config),
}

// Chat feedback (for agents to flag misclassifications)
export const feedbackAPI = {
  submitCorrection: (data: {
    message_text: string;
    predicted_intent: string;
    predicted_confidence: number;
    corrected_intent: string;
    language?: string;
    session_id?: string;
  }) =>
    apiClient.post('/chat/feedback/correct-intent', data),
}

export default apiClient
