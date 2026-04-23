/**
 * Chat Interface Component
 * Enhanced customer chat interface with multilingual support and chat history
 * Features: Chat history sidebar, typing indicators, intent display, message timestamps, language selection
 * 
 * Author: Brandon K Mhako (R223931W)
 */

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Avatar,
  Select,
  MenuItem,
  FormControl,
  Chip,
  LinearProgress,
  Fade,
  Tooltip,
  IconButton,
  Drawer,
  Divider,
  Badge,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  Collapse,
  CircularProgress,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import PersonIcon from '@mui/icons-material/Person'
import SupportAgentIcon from '@mui/icons-material/SupportAgent'
import TranslateIcon from '@mui/icons-material/Translate'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import HistoryIcon from '@mui/icons-material/History'
import ChatIcon from '@mui/icons-material/Chat'
import AddIcon from '@mui/icons-material/Add'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import LogoutIcon from '@mui/icons-material/Logout'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import StarIcon from '@mui/icons-material/Star'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import DirectionsIcon from '@mui/icons-material/Directions'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import StorefrontIcon from '@mui/icons-material/Storefront'
import { chatAPI, ticketAPI, feedbackAPI } from '../../services/apiService'
import { useAuth } from '../../services/authService'
import { getDashboardRoute } from '../../utils/dashboardRoute'
import { formatTime as formatTimeUtil, formatDate as formatDateUtil } from '../../utils/dateUtils'
import { useLocation, useNavigate } from 'react-router-dom'
import Menu from '@mui/material/Menu'
import { alpha } from '@mui/material/styles'
import NotificationBell from '../common/NotificationBell'
import {
  AppNotification,
  computeCustomerSessionNotifications,
  markAllCustomerSessionsRead,
  markCustomerSessionRead,
} from '../../services/notificationService'
import { getLinkedChatProviders, LINKED_ACCOUNTS_KEY, LINKED_ACCOUNTS_UPDATED_EVENT } from '../../services/linkedPlatformsService'

interface Message {
  id: string
  content: string
  language: string
  is_from_customer: boolean
  is_from_ai: boolean
  is_from_agent?: boolean
  sender_name?: string
  timestamp: string
  intent?: string
  confidence?: number
  needs_escalation?: boolean
  ticket_id?: string
}

interface ChatSession {
  id: string
  session_id: string
  status: string
  initial_language: string
  created_at: string
  last_message?: string
  last_intent?: string
  message_count: number
  updated_at?: string
}

interface Provider {
  id: string
  provider: string
  type: string
  displayName?: string
  accountIdentifier?: string
  isPrimary?: boolean
}

interface NearbyLocation {
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

// Typing indicator component
const TypingIndicator: React.FC = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, p: 1 }}>
    {['-0.32s', '-0.16s', '0s'].map((delay, i) => (
      <Box
        key={i}
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: 'grey.400',
          animation: 'bounce 1.4s infinite ease-in-out both',
          animationDelay: delay,
          '@keyframes bounce': {
            '0%, 80%, 100%': { transform: 'scale(0)' },
            '40%': { transform: 'scale(1)' },
          },
        }}
      />
    ))}
  </Box>
)

// Intent color mapping
const getIntentColor = (intent: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
  const colors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    greeting: 'success',
    goodbye: 'success',
    balance_inquiry: 'info',
    transaction_history: 'info',
    transfer_money: 'warning',
    bill_payment: 'info',
    transaction_dispute: 'error',
    security_pin: 'error',
    escalation_request: 'warning',
    complaint: 'error',
  }
  return colors[intent] || 'default'
}

// Welcome messages per language
const welcomeMessages: Record<string, string> = {
  en: "👋 Hello! Welcome to our AI-powered customer service. I can help you with account inquiries, transactions, bill payments, and more. How can I assist you today?",
  sn: "👋 Mhoro! Titambire kune hushumiro hwedu hweAI. Ndinokubatsira nezvemari, kutumira mari, kubhadhara mabhiri, nezvimwe. Ndingakubatsira sei nhasi?",
  nd: "👋 Sawubona! Wamkelekile kusizakalo lwethu lwe-AI. Ngingakusiza ngokubuza nge-account, imisebenzi yemali, ukukhokha izindleko, njalonjalo. Ngingakusiza ngani namhlanje?"
}

const DRAWER_WIDTH = 320
const HEADER_BAR_HEIGHT = 80

const getLocationOptions = (providerName: string, providerType: string) => {
  if (providerType === 'bank') {
    return [
      { value: 'bank', label: 'Branches' },
      { value: 'atm', label: 'ATMs' },
      { value: 'agency_banking', label: 'Agency Banking' },
    ]
  }

  const providerKey = providerName.toLowerCase()

  if (providerKey.includes('eco')) {
    return [
      { value: 'cashout_agent', label: 'Cash-out Agents' },
      { value: 'econet_shop', label: 'Econet Shops' },
      { value: 'bank', label: 'Partner Banks' },
      { value: 'atm', label: 'ATMs' },
    ]
  }

  if (providerKey.includes('one')) {
    return [
      { value: 'cashout_agent', label: 'Cash-out Agents' },
      { value: 'netone_shop', label: 'NetOne Shops' },
      { value: 'bank', label: 'Partner Banks' },
      { value: 'atm', label: 'ATMs' },
    ]
  }

  if (providerKey.includes('inn')) {
    return [
      { value: 'innbucks_outlet', label: 'InnBucks Outlets' },
      { value: 'cashout_agent', label: 'Cash-out Agents' },
      { value: 'bank', label: 'Partner Banks' },
    ]
  }

  if (providerKey.includes('tele')) {
    return [
      { value: 'telecash_shop', label: 'Telecash Shops' },
      { value: 'cashout_agent', label: 'Cash-out Agents' },
      { value: 'bank', label: 'Partner Banks' },
    ]
  }

  return [
    { value: 'cashout_agent', label: 'Cash-out Agents' },
    { value: 'bank', label: 'Banks' },
    { value: 'atm', label: 'ATMs' },
  ]
}

const extractTicketId = (text: string): string | undefined => {
  const match = text?.match(/TICKET[A-Z0-9]{6,}/)
  return match?.[0]
}

const INTENT_OPTIONS = [
  'balance_inquiry', 'transaction_history', 'transfer_money', 'account_statement',
  'password_reset', 'update_profile', 'loan_inquiry', 'bill_payment', 'mobile_money',
  'transaction_dispute', 'security_pin', 'network_connectivity', 'mobile_wallet_fees',
  'account_closure', 'account_opening', 'card_request', 'atm_location', 'branch_location',
  'escalation_request', 'general_inquiry', 'greeting', 'goodbye', 'complaint',
]

const ChatInterface: React.FC = () => {
  const theme = useTheme()
  const isDarkMode = theme.palette.mode === 'dark'
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const dashboardRoute = getDashboardRoute(user?.role)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [language, setLanguage] = useState('en')
  const [loading, setLoading] = useState(false)
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [connectionError, setConnectionError] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [linkedProviders, setLinkedProviders] = useState<Provider[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState('')
  const [sessionRating, setSessionRating] = useState<number>(0)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [sessionUnreadMap, setSessionUnreadMap] = useState<Record<string, number>>({})
  const [chatNotifications, setChatNotifications] = useState<AppNotification[]>([])
  const [chatUnreadCount, setChatUnreadCount] = useState(0)
  const [agentReplyNotifications, setAgentReplyNotifications] = useState<AppNotification[]>([])
  const [agentReplyUnreadBySession, setAgentReplyUnreadBySession] = useState<Record<string, number>>({})

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      setTimeout(() => {
        messagesContainerRef.current?.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' })
      }, 0)
    }
  }, [messages])
  const [resolutionDialogOpen, setResolutionDialogOpen] = useState(false)
  const [resolutionComment, setResolutionComment] = useState('')
  const [resolutionSubmitting, setResolutionSubmitting] = useState(false)
  const [postCloseAction, setPostCloseAction] = useState<'none' | 'new_session'>('none')
  const [locationPanelOpen, setLocationPanelOpen] = useState(false)
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [userLocationName, setUserLocationName] = useState<string>('')
  const [nearbyLocations, setNearbyLocations] = useState<NearbyLocation[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [locatingUser, setLocatingUser] = useState(false)
  const [nearbyLocationType, setNearbyLocationType] = useState<string>('bank')
  const [correctingMessageId, setCorrectingMessageId] = useState<string | null>(null)
  const [correctedIntent, setCorrectedIntent] = useState<string>('')
  const [correctionSaving, setCorrectionSaving] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeTicketId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].ticket_id) {
        return messages[i].ticket_id
      }
    }
    return undefined
  }, [messages])

  const chatTheme = useMemo(
    () => ({
      headerBg: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.14)}, ${alpha(theme.palette.secondary.main, 0.09)})`,
      headerBorder: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
      headerControlBg: alpha(theme.palette.primary.main, isDarkMode ? 0.18 : 0.1),
      headerControlHoverBg: alpha(theme.palette.primary.main, isDarkMode ? 0.26 : 0.16),
      incomingBubbleBg: isDarkMode ? 'grey.900' : 'background.paper',
      typingBubbleBg: isDarkMode ? 'grey.900' : 'background.paper',
      composerBg: isDarkMode ? 'grey.900' : 'background.paper',
      inputBg: isDarkMode ? 'background.default' : 'grey.50',
      selectedSessionBg: isDarkMode ? 'primary.dark' : 'primary.light',
      emptyStateIconColor: isDarkMode ? 'grey.500' : 'grey.400',
    }),
    [isDarkMode, theme.palette.primary.main, theme.palette.secondary.main]
  )

  const availableProviders = useMemo(() => {
    if (user?.role === 'customer') {
      return linkedProviders
    }

    return linkedProviders.length > 0 ? linkedProviders : providers
  }, [linkedProviders, providers, user?.role])

  const selectedProvider = useMemo(
    () => availableProviders.find((item) => item.id === selectedProviderId) || availableProviders[0] || null,
    [availableProviders, selectedProviderId]
  )

  const requestedSessionId = useMemo(() => {
    const raw = new URLSearchParams(location.search).get('session')
    return raw ? raw.trim() : ''
  }, [location.search])

  const providerName = selectedProvider?.provider || ''
  const providerType = selectedProvider?.type || 'mno'
  const locationOptions = useMemo(
    () => getLocationOptions(providerName, providerType),
    [providerName, providerType]
  )

  const syncUnreadState = (sessions: ChatSession[], activeSession: string | null = sessionId) => {
    const { unreadBySession, notifications, totalUnread } = computeCustomerSessionNotifications(
      sessions,
      user?.id,
      activeSession
    )

    const mergedUnreadBySession = { ...unreadBySession }
    Object.entries(agentReplyUnreadBySession).forEach(([session, count]) => {
      mergedUnreadBySession[session] = (mergedUnreadBySession[session] || 0) + count
    })

    const allNotifications = [...agentReplyNotifications, ...notifications]
    const dedupedNotifications = allNotifications.filter(
      (item, index, arr) => arr.findIndex((entry) => entry.id === item.id) === index
    )

    const agentReplyUnreadTotal = Object.values(agentReplyUnreadBySession).reduce((sum, value) => sum + value, 0)

    setSessionUnreadMap(mergedUnreadBySession)
    setChatNotifications(dedupedNotifications)
    setChatUnreadCount(totalUnread + agentReplyUnreadTotal)
  }

  const clearAgentReplyForSession = (targetSessionId: string) => {
    setAgentReplyUnreadBySession((prev) => {
      if (!prev[targetSessionId]) return prev
      const next = { ...prev }
      delete next[targetSessionId]
      return next
    })
    setAgentReplyNotifications((prev) =>
      prev.filter((item) => String(item.meta?.session_id || '') !== targetSessionId)
    )
  }

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory()
    loadProviders()
    loadLinkedProviders()
  }, [])

  useEffect(() => {
    requestUserLocation()
  }, [])

  useEffect(() => {
    const handleLinkedAccountChange = () => {
      loadLinkedProviders()
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LINKED_ACCOUNTS_KEY) {
        loadLinkedProviders()
      }
    }

    window.addEventListener(LINKED_ACCOUNTS_UPDATED_EVENT, handleLinkedAccountChange)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(LINKED_ACCOUNTS_UPDATED_EVENT, handleLinkedAccountChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  useEffect(() => {
    if (!availableProviders.some((item) => item.id === selectedProviderId)) {
      setSelectedProviderId(availableProviders[0]?.id || '')
    }
  }, [availableProviders, selectedProviderId])

  useEffect(() => {
    if (!locationOptions.some((item) => item.value === nearbyLocationType)) {
      setNearbyLocationType(locationOptions[0]?.value || 'bank')
    }
  }, [locationOptions, nearbyLocationType])

  useEffect(() => {
    if (!isMobile) {
      setHistoryOpen(false)
    }
  }, [isMobile])

  // Fetch nearby locations when provider or location type changes
  const fetchNearbyLocations = async (locType?: string) => {
    const type = locType || nearbyLocationType
    if (!userCoords) return
    setNearbyLoading(true)
    try {
      const areaName = userLocationName || `${userCoords.lat},${userCoords.lon}`
      const response = await chatAPI.getNearbyLocations(
        `nearest ${type} in ${areaName}`,
        type,
        5
      )
      setNearbyLocations(response.data?.results || [])
    } catch {
      setNearbyLocations([])
    } finally {
      setNearbyLoading(false)
    }
  }

  useEffect(() => {
    if (userCoords && locationPanelOpen) {
      fetchNearbyLocations()
    }
  }, [userCoords, locationPanelOpen, nearbyLocationType, providerName])

  // Update welcome message when language changes
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === 'welcome') {
      setMessages([{
        ...messages[0],
        content: welcomeMessages[language],
        language,
      }])
    }
  }, [language])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Poll active session for new messages (supports human-agent replies)
  useEffect(() => {
    if (!sessionId) return

    const interval = setInterval(async () => {
      try {
        const response = await chatAPI.getMessages(sessionId)
        const loadedMessages: Message[] = response.data.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          language: msg.language,
          is_from_customer: msg.is_from_customer,
          is_from_ai: msg.is_from_ai,
          is_from_agent: msg.is_from_agent,
          sender_name: msg.sender_name,
          timestamp: msg.timestamp,
          intent: msg.detected_intent,
          confidence: msg.confidence_score ? parseFloat(msg.confidence_score) : undefined,
          ticket_id: extractTicketId(msg.content),
        }))

        setMessages((prev) => {
          const previousIds = new Set(prev.map((message) => message.id))
          const newAgentReplies = loadedMessages.filter((message) => message.is_from_agent && !previousIds.has(message.id))

          if (newAgentReplies.length > 0) {
            setAgentReplyUnreadBySession((map) => ({
              ...map,
              [sessionId]: (map[sessionId] || 0) + newAgentReplies.length,
            }))
            setAgentReplyNotifications((existing) => {
              const next = [...existing]
              newAgentReplies.forEach((reply) => {
                const notificationId = `customer-agent-reply-${reply.id}`
                if (!next.some((item) => item.id === notificationId)) {
                  next.unshift({
                    id: notificationId,
                    title: 'Agent replied to your chat',
                    description: reply.content,
                    route: `/chat?session=${sessionId}`,
                    createdAt: reply.timestamp,
                    meta: { session_id: sessionId },
                  })
                }
              })
              return next
            })
          }

          return loadedMessages.length !== prev.length ? loadedMessages : prev
        })
        markCustomerSessionRead(user?.id, sessionId, loadedMessages.length)
        await loadChatHistory(sessionId, { silent: true })
      } catch {
        // ignore polling errors
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [sessionId, user?.id])

  // Open a requested session when arriving through /chat?session=<session_id>
  useEffect(() => {
    if (!requestedSessionId || chatHistory.length === 0) {
      return
    }

    const targetSession = chatHistory.find(
      (session) => session.session_id === requestedSessionId || session.id === requestedSessionId
    )

    if (!targetSession || sessionId === targetSession.session_id) {
      return
    }

    void loadSessionMessages(targetSession)
  }, [requestedSessionId, chatHistory, sessionId])

  const loadChatHistory = async (
    activeSession: string | null = sessionId,
    options: { silent?: boolean } = {}
  ) => {
    if (!options.silent) {
      setLoadingHistory(true)
    }
    try {
      const response = await chatAPI.getSessions()
      const sessions: ChatSession[] = response.data || []
      setChatHistory(sessions)
      syncUnreadState(sessions, activeSession)
      return sessions
    } catch (error) {
      console.error('Failed to load chat history:', error)
      return []
    } finally {
      if (!options.silent) {
        setLoadingHistory(false)
      }
    }
  }

  const loadLinkedProviders = () => {
    setLinkedProviders(getLinkedChatProviders())
  }

  const loadProviders = async () => {
    try {
      const response = await chatAPI.getProviders()
      const list: Provider[] = (response.data?.providers || []).map((item: any) => ({
        id: `${item.provider}-${item.type}`,
        provider: item.provider,
        type: item.type,
        displayName: item.provider,
      }))
      setProviders(list)
    } catch (error) {
      console.error('Failed to load providers:', error)
    }
  }

  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      setUserCoords(null)
      setUserLocationName('')
      return
    }

    setLocatingUser(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = { lat: position.coords.latitude, lon: position.coords.longitude }
        setUserCoords(coords)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lon}&format=json`,
            { headers: { 'User-Agent': 'ai-customer-service-platform/1.0' } }
          )
          const data = await res.json()
          const addr = data.address || {}
          setUserLocationName(
            addr.suburb || addr.town || addr.city || addr.county || data.display_name?.split(',')[0] || 'Your location'
          )
        } catch {
          setUserLocationName('Your location')
        } finally {
          setLocatingUser(false)
        }
      },
      () => {
        setUserCoords(null)
        setUserLocationName('')
        setLocatingUser(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    )
  }

  const createNewSession = async (force = false) => {
    if (!force && sessionId && messages.length > 1) {
      setPostCloseAction('new_session')
      setResolutionDialogOpen(true)
      return
    }

    try {
      const response = await chatAPI.createSession()
      const newSessionId = response.data.session_id
      setSessionId(newSessionId)
      setConnectionError(false)
      
      // Add welcome message
      const welcomeMsg: Message = {
        id: 'welcome',
        content: welcomeMessages[language],
        language,
        is_from_customer: false,
        is_from_ai: true,
        timestamp: new Date().toISOString(),
        intent: 'greeting',
        confidence: 1.0,
      }
      setMessages([welcomeMsg])
      
      // Refresh history
      await loadChatHistory(newSessionId)
    } catch (error) {
      console.error('Failed to create session:', error)
      setConnectionError(true)
    }
  }

  const completeCurrentSession = async (resolved: boolean) => {
    if (!sessionId) {
      setResolutionDialogOpen(false)
      return
    }

    setResolutionSubmitting(true)
    try {
      await chatAPI.completeSession(sessionId, {
        resolved,
        rating: sessionRating > 0 ? sessionRating : undefined,
        comment: resolutionComment.trim() || undefined,
      })

      if (activeTicketId) {
        if (resolved) {
          await ticketAPI.confirmResolution(activeTicketId, sessionRating > 0 ? sessionRating : undefined)
        } else {
          await ticketAPI.markUnresolved(activeTicketId)
        }
      }

      await loadChatHistory(resolved ? null : sessionId)

      if (resolved) {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}_closure`,
            content: language === 'sn'
              ? 'Ndatenda. Taisa nyaya yenyu seyakagadziriswa. Munogona kudzoka chero nguva kana muchida rumwe rubatsiro.'
              : language === 'nd'
              ? 'Ngiyabonga. Icala lenu selibekwe njengelixazululiweyo. Lingabuya noma nini uma lisadinga usizo.'
              : 'Thank you. We have marked this issue as resolved. You can return anytime if you need more help.',
            language,
            is_from_customer: false,
            is_from_ai: true,
            timestamp: new Date().toISOString(),
          },
        ])
      }
    } catch (error) {
      console.error('Failed to complete session:', error)
      setConnectionError(true)
    } finally {
      setResolutionSubmitting(false)
      setResolutionDialogOpen(false)
      setResolutionComment('')

      if (postCloseAction === 'new_session') {
        setPostCloseAction('none')
        if (resolved) {
          setSessionId(null)
          setMessages([])
        }
        await createNewSession(true)
      }
    }
  }

  const submitIntentCorrection = async (message: Message) => {
    if (!correctedIntent || correctedIntent === message.intent) return
    setCorrectionSaving(true)
    try {
      await feedbackAPI.submitCorrection({
        message_text: message.content,
        predicted_intent: message.intent || 'unknown',
        predicted_confidence: message.confidence || 0,
        corrected_intent: correctedIntent,
        language: message.language,
        session_id: sessionId || undefined,
      })
      setCorrectingMessageId(null)
      setCorrectedIntent('')
    } catch (err) {
      console.error('Failed to submit intent correction:', err)
    } finally {
      setCorrectionSaving(false)
    }
  }

  const isStaffRole = user?.role === 'agent' || user?.role === 'supervisor' || user?.role === 'admin'

  const loadSessionMessages = async (session: ChatSession) => {
    setLoading(true)
    try {
      const response = await chatAPI.getMessages(session.session_id)
      const loadedMessages: Message[] = response.data.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        language: msg.language,
        is_from_customer: msg.is_from_customer,
        is_from_ai: msg.is_from_ai,
        is_from_agent: msg.is_from_agent,
        sender_name: msg.sender_name,
        timestamp: msg.timestamp,
        intent: msg.detected_intent,
        confidence: msg.confidence_score ? parseFloat(msg.confidence_score) : undefined,
        ticket_id: extractTicketId(msg.content),
      }))
      
      setSessionId(session.session_id)
      setMessages(loadedMessages.length > 0 ? loadedMessages : [{
        id: 'welcome',
        content: welcomeMessages[session.initial_language || 'en'],
        language: session.initial_language || 'en',
        is_from_customer: false,
        is_from_ai: true,
        timestamp: session.created_at,
        intent: 'greeting',
        confidence: 1.0,
      }])
      setLanguage(session.initial_language || 'en')
      setConnectionError(false)
      setRatingSubmitted(false)
      markCustomerSessionRead(user?.id, session.session_id, loadedMessages.length)
      clearAgentReplyForSession(session.session_id)
      await loadChatHistory(session.session_id, { silent: true })
      
      // Close drawer on mobile after selection
      if (isMobile) {
        setHistoryOpen(false)
      }
    } catch (error) {
      console.error('Failed to load session messages:', error)
      setConnectionError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !sessionId) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      language,
      is_from_customer: true,
      is_from_ai: false,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage('')
    setLoading(true)
    setConnectionError(false)

    try {
      const response = await chatAPI.sendMessage(sessionId, inputMessage, language, providerName || undefined, providerType)
      const aiMessage: Message = {
        id: response.data.message_id || Date.now().toString() + '_ai',
        content: response.data.content || response.data.response,
        language: response.data.language,
        is_from_customer: false,
        is_from_ai: true,
        timestamp: response.data.timestamp || new Date().toISOString(),
        intent: response.data.intent,
        confidence: response.data.confidence,
        needs_escalation: response.data.needs_escalation,
        ticket_id: response.data.ticket_id || extractTicketId(response.data.content || response.data.response || ''),
      }
      setMessages((prev) => [...prev, aiMessage])
      
      // Refresh chat history to update last message
      await loadChatHistory(sessionId, { silent: true })
    } catch (error) {
      console.error('Failed to send message:', error)
      setConnectionError(true)
      const errorMessage: Message = {
        id: Date.now().toString() + '_error',
        content: language === 'sn' 
          ? '⚠️ Pane dambudziko rekubatana. Ndapota edza zvakare.'
          : language === 'nd'
          ? '⚠️ Kulenkinga yokuxhumana. Sicela uzame futhi.'
          : '⚠️ Connection error. Please try again.',
        language,
        is_from_customer: false,
        is_from_ai: true,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitRating = async (rating: number) => {
    if (!sessionId) return
    try {
      await chatAPI.submitRating(sessionId, rating)
      setSessionRating(rating)
      setRatingSubmitted(true)
    } catch (error) {
      console.error('Failed to submit rating:', error)
    }
  }

  const handleRetry = async () => {
    setConnectionError(false)
    if (sessionId) {
      const activeSession = chatHistory.find((session) => session.session_id === sessionId)
      if (activeSession) {
        await loadSessionMessages(activeSession)
      }
    }
  }

  const formatTime = (timestamp: string) => {
    return formatTimeUtil(timestamp);
  }

  const formatDate = (dateStr: string) => {
    return formatDateUtil(dateStr);
  }

  const handleOpenChatNotification = (item: AppNotification) => {
    const targetSessionId = String(item.meta?.session_id || '').trim()
    const targetSession = chatHistory.find((entry) => entry.session_id === targetSessionId)
    if (targetSession) {
      loadSessionMessages(targetSession)
      return
    }
    if (item.route) {
      navigate(item.route)
    }
  }

  const handleMarkAllChatNotificationsRead = () => {
    markAllCustomerSessionsRead(user?.id, chatHistory)
    setAgentReplyNotifications([])
    setAgentReplyUnreadBySession({})
    syncUnreadState(chatHistory, sessionId)
  }

  // Chat history sidebar content
  const historyDrawerContent = (
    <Box sx={{ width: DRAWER_WIDTH, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* History Header */}
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'flex-start',
        height: HEADER_BAR_HEIGHT,
        boxSizing: 'border-box',
        background: chatTheme.headerBg,
        borderBottom: chatTheme.headerBorder,
        color: 'text.primary',
      }}>
        {isMobile && (
          <IconButton
            color="inherit"
            onClick={() => setHistoryOpen(false)}
            sx={{ mr: 1 }}
          >
            <CloseIcon />
          </IconButton>
        )}

        <HistoryIcon sx={{ fontSize: 32 }} />
        <Box sx={{ ml: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
            Chat History
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2, whiteSpace: 'nowrap' }}>
            Saved Sessions • Unread Updates
          </Typography>
        </Box>
      </Box>
      
      {/* New Chat Button */}
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => createNewSession()}
          sx={{ borderRadius: 2 }}
        >
          New Conversation
        </Button>
      </Box>
      
      <Divider />
      
      {/* Chat Sessions List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {loadingHistory && chatHistory.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              Loading conversations...
            </Typography>
          </Box>
        ) : chatHistory.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <ChatIcon sx={{ fontSize: 48, color: chatTheme.emptyStateIconColor, mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No previous conversations
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {chatHistory.map((session) => (
              <ListItemButton
                key={session.id}
                selected={sessionId === session.session_id}
                onClick={() => loadSessionMessages(session)}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&.Mui-selected': {
                    bgcolor: chatTheme.selectedSessionBg,
                    '&:hover': {
                      bgcolor: chatTheme.selectedSessionBg,
                    }
                  }
                }}
              >
                <ListItemIcon>
                  <Badge 
                    badgeContent={sessionUnreadMap[session.session_id] || 0}
                    color="primary"
                    max={99}
                  >
                    <ChatIcon color={sessionId === session.session_id ? 'primary' : 'action'} />
                  </Badge>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight="medium" noWrap sx={{ maxWidth: 150 }}>
                        {session.last_intent 
                          ? session.last_intent.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                          : 'New Chat'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(session.updated_at || session.created_at)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ 
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {session.last_message || 'No messages yet'}
                    </Typography>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>
      
      {/* Footer */}
      <Divider />
      <Box sx={{ p: 1.5, bgcolor: 'action.hover' }}>
        <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
          {chatHistory.length} conversation{chatHistory.length !== 1 ? 's' : ''} saved
        </Typography>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
      {/* Chat History Drawer - Permanent on desktop, temporary on mobile */}
      {isMobile ? (
        <Drawer
          anchor="left"
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
        >
          {historyDrawerContent}
        </Drawer>
      ) : (
        <Paper
          elevation={2}
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            overflow: 'hidden',
            borderRadius: 0,
          }}
        >
          {historyDrawerContent}
        </Paper>
      )}

      {/* Main Chat Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <Paper
          elevation={3}
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: HEADER_BAR_HEIGHT,
            boxSizing: 'border-box',
            background: chatTheme.headerBg,
            color: 'text.primary',
            borderBottom: chatTheme.headerBorder,
            borderRadius: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isMobile && (
              <IconButton 
                color="inherit" 
                onClick={() => setHistoryOpen(!historyOpen)}
                sx={{ mr: 1 }}
              >
                {historyOpen ? <CloseIcon /> : <MenuIcon />}
              </IconButton>
            )}
            
            <SmartToyIcon sx={{ fontSize: 32 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                AI Customer Service
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                Multilingual Support • {selectedProvider?.displayName || 'Link an account'} • Banking
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Nearby locations toggle */}
            <Tooltip title={
              locatingUser
                ? 'Detecting your location...'
                : userLocationName
                ? `Your location: ${userLocationName}`
                : 'Open location finder'
            }>
              <IconButton
                color={locationPanelOpen || locatingUser ? 'primary' : 'inherit'}
                onClick={() => {
                  const nextOpen = !locationPanelOpen
                  setLocationPanelOpen(nextOpen)
                  if (nextOpen && !userCoords && !locatingUser) {
                    requestUserLocation()
                  }
                }}
              >
                {locatingUser ? <CircularProgress size={20} color="inherit" /> : <LocationOnIcon />}
              </IconButton>
            </Tooltip>
            <NotificationBell
              items={chatNotifications}
              unreadCount={chatUnreadCount}
              onOpenItem={handleOpenChatNotification}
              onMarkAllRead={handleMarkAllChatNotificationsRead}
              tooltip="Unread chat notifications"
            />
            {/* Debug toggle */}
            <Tooltip title="Show AI debug info">
              <IconButton 
                color="inherit" 
                onClick={() => setShowDebug(!showDebug)}
                sx={{ opacity: showDebug ? 1 : 0.6 }}
              >
                <InfoOutlinedIcon />
              </IconButton>
            </Tooltip>
            
            {/* Language selector */}
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <Select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                sx={{ 
                  bgcolor: chatTheme.headerControlBg,
                  color: 'text.primary',
                  '.MuiSelect-icon': { color: 'text.primary' },
                  '&:hover': { bgcolor: chatTheme.headerControlHoverBg },
                }}
                startAdornment={<TranslateIcon sx={{ mr: 1, fontSize: 20 }} />}
              >
                <MenuItem value="en">🇬🇧 English</MenuItem>
                <MenuItem value="sn">🇿🇼 Shona</MenuItem>
                <MenuItem value="nd">🇿🇼 Ndebele</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={selectedProvider?.id || ''}
                onChange={(e) => setSelectedProviderId(e.target.value)}
                displayEmpty
                disabled={availableProviders.length === 0}
                sx={{
                  bgcolor: chatTheme.headerControlBg,
                  color: 'text.primary',
                  '.MuiSelect-icon': { color: 'text.primary' },
                  '&:hover': { bgcolor: chatTheme.headerControlHoverBg },
                }}
              >
                {availableProviders.length === 0 ? (
                  <MenuItem value="" disabled>
                    Link an account first
                  </MenuItem>
                ) : availableProviders.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={item.isPrimary ? 700 : 500} noWrap>
                        {item.displayName || item.provider}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {item.accountIdentifier || item.provider} {item.isPrimary ? '- Primary' : ''}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* User Menu */}
            <Tooltip title="Account">
              <IconButton 
                color="inherit" 
                onClick={(e) => setUserMenuAnchor(e.currentTarget)}
              >
                <AccountCircleIcon />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={() => setUserMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {user?.name || 'User'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>
              <MenuItem onClick={() => { setUserMenuAnchor(null); navigate(dashboardRoute); }}>
                <ListItemIcon><DashboardIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Dashboard</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem 
                onClick={() => { 
                  setUserMenuAnchor(null); 
                  logout(); 
                  navigate('/login'); 
                }}
                sx={{ color: 'error.main' }}
              >
                <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
                <ListItemText>Logout</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Paper>

        {/* Connection error banner */}
        {connectionError && (
          <Paper sx={{ 
            p: 1.5, 
            bgcolor: 'error.light', 
            color: 'error.contrastText',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            borderRadius: 0,
          }}>
            <Typography variant="body2">
              ⚠️ Connection issue. Server may be offline.
            </Typography>
            <Button 
              size="small" 
              variant="contained" 
              color="inherit"
              startIcon={<RefreshIcon />}
              onClick={handleRetry}
            >
              Retry
            </Button>
          </Paper>
        )}

        {/* Messages Area */}
        <Box
          ref={messagesContainerRef}
          sx={{ 
            flexGrow: 1, 
            overflow: 'auto', 
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          <Collapse in={locationPanelOpen} timeout="auto" unmountOnExit>
            <Box sx={{ position: 'sticky', top: 0, zIndex: 3, width: '100%', maxWidth: 800, mx: 'auto', pb: 2 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.18),
                  bgcolor: alpha(theme.palette.background.paper, 0.96),
                  backdropFilter: 'blur(16px)',
                  boxShadow: `0 24px 48px ${alpha(theme.palette.common.black, 0.12)}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.12), color: 'primary.main', width: 40, height: 40 }}>
                      <MyLocationIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {userLocationName ? `Nearby help around ${userLocationName}` : 'Location finder'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedProvider?.displayName
                          ? `Showing useful places for ${selectedProvider.displayName}`
                          : 'Link a wallet or bank account to tailor nearby help points.'}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {selectedProvider?.displayName && (
                      <Chip
                        label={selectedProvider.displayName}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <Select
                        value={nearbyLocationType}
                        onChange={(e) => {
                          setNearbyLocationType(e.target.value)
                          fetchNearbyLocations(e.target.value)
                        }}
                        sx={{ height: 38, fontSize: '0.85rem' }}
                      >
                        {locationOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <IconButton size="small" onClick={() => (userCoords ? fetchNearbyLocations() : requestUserLocation())} disabled={nearbyLoading || locatingUser}>
                      {nearbyLoading || locatingUser ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                    </IconButton>
                    <IconButton size="small" onClick={() => setLocationPanelOpen(false)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                {!userCoords ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      borderStyle: 'dashed',
                      display: 'flex',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      justifyContent: 'space-between',
                      gap: 2,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Turn on location to see nearby branches, agents, or stores.
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        The panel stays inside the chat so your messages scroll underneath it instead of jumping above it.
                      </Typography>
                    </Box>
                    <Button variant="contained" onClick={requestUserLocation} disabled={locatingUser}>
                      {locatingUser ? 'Detecting...' : 'Use My Location'}
                    </Button>
                  </Paper>
                ) : nearbyLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : nearbyLocations.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 1 }}>
                    No locations found nearby. Try a different category or refresh your location.
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1.5,
                      overflowX: 'auto',
                      overflowY: 'hidden',
                      pb: 0.5,
                      scrollSnapType: 'x proximity',
                      '&::-webkit-scrollbar': {
                        height: 8,
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.3),
                        borderRadius: 8,
                      },
                    }}
                  >
                    {nearbyLocations.map((loc, idx) => (
                      <Paper
                        key={idx}
                        variant="outlined"
                        sx={{
                          p: 1.75,
                          borderRadius: 3,
                          minWidth: { xs: 260, sm: 300 },
                          maxWidth: { xs: 280, sm: 340 },
                          flex: '0 0 auto',
                          scrollSnapAlign: 'start',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                          <Avatar sx={{ width: 34, height: 34, bgcolor: alpha(theme.palette.primary.main, 0.12), color: 'primary.main' }}>
                            <StorefrontIcon fontSize="small" />
                          </Avatar>
                          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                            <Typography variant="body2" fontWeight={700} noWrap>
                              {loc.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                              {loc.distance_km} km away
                            </Typography>
                            {loc.address && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {loc.address}
                              </Typography>
                            )}
                            {loc.opening_hours && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {loc.opening_hours}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1.25, flexWrap: 'wrap' }}>
                          {userCoords && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<DirectionsIcon />}
                              href={`https://www.google.com/maps/dir/${userCoords.lat},${userCoords.lon}/${loc.latitude},${loc.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ fontSize: '0.72rem', textTransform: 'none' }}
                            >
                              Directions
                            </Button>
                          )}
                          {loc.contact && (
                            <Button
                              size="small"
                              variant="text"
                              href={`tel:${loc.contact}`}
                              sx={{ fontSize: '0.72rem', textTransform: 'none' }}
                            >
                              Call
                            </Button>
                          )}
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Paper>
            </Box>
          </Collapse>

          {!sessionId ? (
            <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto', textAlign: 'center', mt: 8 }}>
              <SmartToyIcon sx={{ fontSize: 52, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Start a new chat session
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Click <strong>New Conversation</strong> in the left panel to create a chat session.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => createNewSession()}>
                New Conversation
              </Button>
            </Box>
          ) : (
          <List sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
            {messages.map((message) => (
              <Fade in key={message.id}>
                <ListItem
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: message.is_from_customer ? 'flex-end' : 'flex-start',
                    mb: 1,
                    px: 0,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: message.is_from_customer ? 'row-reverse' : 'row',
                      alignItems: 'flex-end',
                      maxWidth: '80%',
                      gap: 1,
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: message.is_from_customer ? 'primary.main' : message.is_from_agent ? 'warning.main' : 'secondary.main',
                        width: 36,
                        height: 36,
                      }}
                    >
                      {message.is_from_customer ? <PersonIcon /> : message.is_from_agent ? <SupportAgentIcon /> : <SmartToyIcon />}
                    </Avatar>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Paper
                        elevation={1}
                        sx={{
                          p: 2,
                          bgcolor: message.is_from_customer 
                            ? 'primary.main' 
                            : chatTheme.incomingBubbleBg,
                          color: message.is_from_customer ? 'white' : 'text.primary',
                          borderRadius: 2,
                          borderTopLeftRadius: message.is_from_customer ? 16 : 4,
                          borderTopRightRadius: message.is_from_customer ? 4 : 16,
                        }}
                      >
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.5,
                          }}
                        >
                          {message.content}
                        </Typography>
                        {!message.is_from_customer && message.is_from_agent && message.sender_name && (
                          <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.8 }}>
                            Human agent: {message.sender_name}
                          </Typography>
                        )}
                      </Paper>
                      
                      {/* Message metadata */}
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        px: 1,
                        flexDirection: message.is_from_customer ? 'row-reverse' : 'row',
                      }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatTime(message.timestamp)}
                        </Typography>

                        {!message.is_from_customer && message.ticket_id && (
                          <>
                            <Chip
                              size="small"
                              label={`Ticket Ref: ${message.ticket_id}`}
                              color="warning"
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                            <Button
                              size="small"
                              variant="text"
                              color="warning"
                              onClick={() => navigate(`/tickets/${message.ticket_id}`)}
                              sx={{ minWidth: 'auto', px: 0.75, fontSize: '0.7rem', lineHeight: 1 }}
                            >
                              View Ticket
                            </Button>
                          </>
                        )}
                        
                        {/* Debug info for AI messages */}
                        {showDebug && !message.is_from_customer && message.intent && (
                          <>
                            <Chip
                              size="small"
                              label={message.intent}
                              color={getIntentColor(message.intent)}
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                            {message.confidence !== undefined && (
                              <Chip
                                size="small"
                                label={`${(message.confidence * 100).toFixed(0)}%`}
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            )}
                            {message.needs_escalation && (
                              <Chip
                                size="small"
                                label="escalated"
                                color="warning"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            )}
                          </>
                        )}

                        {/* Intent correction widget for agents/supervisors/admins */}
                        {isStaffRole && !message.is_from_customer && message.intent && (
                          correctingMessageId === message.id ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Select
                                value={correctedIntent}
                                onChange={e => setCorrectedIntent(e.target.value)}
                                size="small"
                                sx={{ height: 24, fontSize: '0.7rem', minWidth: 130 }}
                              >
                                {INTENT_OPTIONS.map(i => (
                                  <MenuItem key={i} value={i} sx={{ fontSize: '0.75rem' }}>{i.replace(/_/g, ' ')}</MenuItem>
                                ))}
                              </Select>
                              <IconButton size="small" color="primary" onClick={() => submitIntentCorrection(message)} disabled={correctionSaving || !correctedIntent || correctedIntent === message.intent}>
                                {correctionSaving ? <CircularProgress size={14} /> : <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>✓</span>}
                              </IconButton>
                              <IconButton size="small" onClick={() => { setCorrectingMessageId(null); setCorrectedIntent('') }}>
                                <CloseIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Box>
                          ) : (
                            <Tooltip title="Correct intent classification">
                              <Button
                                size="small"
                                variant="text"
                                color="warning"
                                onClick={() => { setCorrectingMessageId(message.id); setCorrectedIntent(message.intent || '') }}
                                sx={{ minWidth: 'auto', px: 0.5, fontSize: '0.65rem', lineHeight: 1, textTransform: 'none' }}
                              >
                                Fix AI
                              </Button>
                            </Tooltip>
                          )
                        )}
                      </Box>
                    </Box>
                  </Box>
                </ListItem>
              </Fade>
            ))}
            
            {/* Typing indicator */}
            {loading && (
              <ListItem sx={{ px: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36 }}>
                    <SmartToyIcon />
                  </Avatar>
                  <Paper sx={{ p: 1.5, bgcolor: chatTheme.typingBubbleBg, borderRadius: 2 }}>
                    <TypingIndicator />
                  </Paper>
                </Box>
              </ListItem>
            )}
            
            <div ref={messagesEndRef} />
          </List>
          )}
        </Box>

        {/* Loading bar */}
        {loading && (
          <LinearProgress sx={{ height: 2 }} />
        )}

        {/* Input Area */}
        <Paper 
          elevation={4} 
          sx={{ 
            p: 2, 
            borderRadius: 0,
            bgcolor: chatTheme.composerBg,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            gap: 1.5, 
            maxWidth: 800, 
            mx: 'auto',
            alignItems: 'flex-end',
          }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder={
                !sessionId ? "Click 'New Conversation' to begin chatting..." :
                language === 'sn' ? "Nyora mashoko ako pano..." :
                language === 'nd' ? "Bhala umlayezo wakho lapha..." :
                "Type your message here..."
              }
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              disabled={loading || !sessionId}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  bgcolor: chatTheme.inputBg,
                }
              }}
            />
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => setResolutionDialogOpen(true)}
              disabled={!sessionId || loading}
              sx={{
                borderRadius: 3,
                minWidth: 96,
                height: 56,
              }}
            >
              End Chat
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSendMessage}
              disabled={loading || !inputMessage.trim() || !sessionId}
              sx={{ 
                borderRadius: 3,
                minWidth: 56,
                height: 56,
              }}
            >
              <SendIcon />
            </Button>
          </Box>
          
          {/* Quick actions */}
          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            mt: 1.5, 
            maxWidth: 800, 
            mx: 'auto',
            flexWrap: 'wrap',
          }}>
            <Typography variant="caption" color="text.secondary" sx={{ width: '100%' }}>
              Quick actions:
            </Typography>
            {language === 'en' ? (
              <>
                <Chip label="Check balance" size="small" onClick={() => setInputMessage("What is my balance?")} clickable />
                <Chip label="Transaction history" size="small" onClick={() => setInputMessage("Show my recent transactions")} clickable />
                <Chip label="Pay bill" size="small" onClick={() => setInputMessage("I want to pay my ZESA bill")} clickable />
                <Chip label="Transfer money" size="small" onClick={() => setInputMessage("I want to transfer money")} clickable />
              </>
            ) : language === 'sn' ? (
              <>
                <Chip label="Tarisa mari" size="small" onClick={() => setInputMessage("Mari yangu yakamira sei?")} clickable />
                <Chip label="Zvandakaita" size="small" onClick={() => setInputMessage("Ndiratidze transactions dzangu")} clickable />
                <Chip label="Bhadhara ZESA" size="small" onClick={() => setInputMessage("Ndoda kubhadhara ZESA")} clickable />
                <Chip label="Tumira mari" size="small" onClick={() => setInputMessage("Ndoda kutumira mari")} clickable />
              </>
            ) : (
              <>
                <Chip label="Khangela imali" size="small" onClick={() => setInputMessage("Imali yami ingakanani?")} clickable />
                <Chip label="Imisebenzi" size="small" onClick={() => setInputMessage("Ngitshengise imisebenzi yami")} clickable />
                <Chip label="Khokhela ZESA" size="small" onClick={() => setInputMessage("Ngifuna ukukhokhela i-ZESA")} clickable />
                <Chip label="Thumela imali" size="small" onClick={() => setInputMessage("Ngifuna ukuthumela imali")} clickable />
              </>
            )}
          </Box>

          {sessionId && (
            <Box sx={{ maxWidth: 800, mx: 'auto', mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Rate your AI experience:
              </Typography>
              {[1, 2, 3, 4, 5].map((value) => (
                <IconButton
                  key={value}
                  size="small"
                  color={value <= sessionRating ? 'warning' : 'default'}
                  onClick={() => handleSubmitRating(value)}
                >
                  <StarIcon fontSize="small" />
                </IconButton>
              ))}
              {ratingSubmitted && (
                <Typography variant="caption" color="success.main">
                  Thanks for your rating!
                </Typography>
              )}
            </Box>
          )}
        </Paper>
      </Box>

      <Dialog open={resolutionDialogOpen} onClose={() => !resolutionSubmitting && setResolutionDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Issue Resolution</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Before we close this chat, did we resolve your issue?
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Optional feedback:
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            placeholder="Add any short feedback"
            value={resolutionComment}
            onChange={(e) => setResolutionComment(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Satisfaction rating (optional)
          </Typography>
          <Rating
            value={sessionRating}
            onChange={(_, value) => setSessionRating(value || 0)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolutionDialogOpen(false)} disabled={resolutionSubmitting}>Cancel</Button>
          <Button color="warning" onClick={() => completeCurrentSession(false)} disabled={resolutionSubmitting}>
            Not Yet Resolved
          </Button>
          <Button variant="contained" onClick={() => completeCurrentSession(true)} disabled={resolutionSubmitting}>
            Yes, Resolve & Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ChatInterface
