import 'react-native-gesture-handler'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import * as Location from 'expo-location'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { IMessage } from 'react-native-gifted-chat'
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  AuthSession,
  ChatSession,
  CustomerTicketSummary,
  MobileApiClient,
  MobileChatMessage,
  NearbyLocation,
  ProviderOption,
  RegisterPayload,
  UserProfile,
  describeApiError,
  getHealthUrl,
  normalizeApiBaseUrl,
} from './src/services/api'
import {
  ActionCard,
  QuickActionGrid,
  SessionHubStatsCard,
  SessionTabs,
  TopHeader,
} from './src/components/chat/SupportScreenSections'

type AuthMode = 'login' | 'register' | 'otp'
type LanguageCode = 'en' | 'sn' | 'nd'
type AnalyticsPeriod = 'today' | 'week' | 'month' | 'all'

type ChatMessage = IMessage & {
  intent?: string
  ticketId?: string | null
  requiresEscalation?: boolean
}

type MobileNotification = {
  id: string
  title: string
  description: string
  createdAt?: string
  sessionId: string
  unreadCount: number
}

type UserCoords = {
  lat: number
  lon: number
}

const RootTabs = createBottomTabNavigator()
type RootTabParamList = {
  'Session Hub': undefined
  Analytics: undefined
  'Chat Session': undefined
  Notifications: undefined
  Profile: undefined
}
const rootNavigationRef = createNavigationContainerRef<RootTabParamList>()

const STORAGE_KEYS = {
  apiBaseUrl: 'mobile_api_base_url',
  authSession: 'mobile_auth_session',
  activeSessionId: 'mobile_active_session_id',
  themeMode: 'mobile_theme_mode',
}

const customerNotificationSeenKey = (userId: string) => `notif_customer_seen_counts_${userId}`

function parseSeenCounts(raw: string | null): Record<string, number> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, number>
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }
    return parsed
  } catch {
    return {}
  }
}

function computeCustomerNotifications(
  allSessions: ChatSession[],
  seenCounts: Record<string, number>,
  activeId?: string | null
): { notifications: MobileNotification[]; totalUnread: number } {
  let totalUnread = 0
  const notifications = allSessions.reduce<MobileNotification[]>((accumulator, session) => {
      const seen = seenCounts[session.session_id] || 0
      const rawUnread = Math.max((session.message_count || 0) - seen, 0)
      const unread = activeId && activeId === session.session_id ? 0 : rawUnread

      if (unread <= 0) {
        return accumulator
      }

      totalUnread += unread
      accumulator.push({
        id: `customer-session-${session.session_id}`,
        title: `New message${unread > 1 ? 's' : ''}`,
        description: session.last_message || 'You have unread chat updates.',
        createdAt: session.updated_at || session.created_at,
        sessionId: session.session_id,
        unreadCount: unread,
      })

      return accumulator
    }, [])

  notifications.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

  return { notifications, totalUnread }
}

const quickPrompts = [
  'Check my account balance',
  'I need help with a transaction dispute',
  'Where is the nearest ATM in Avondale?',
  'How do I reset my mobile wallet PIN?',
]

const languageOptions: Array<{ code: LanguageCode; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'sn', label: 'Shona' },
  { code: 'nd', label: 'Ndebele' },
]

const defaultDraftUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? ''

const LOGIN_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1534723328310-e82dad3ee43f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=1200&q=80',
]

const SESSION_HUB_BACKGROUND =
  'https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=1600&q=80'

const INPUT_PROPS = {
  cursorColor: '#0f172a',
  placeholderTextColor: '#6f7c91',
  selectionColor: '#3f73ff',
  underlineColorAndroid: 'transparent' as const,
}

function buildWelcomeMessage(language: LanguageCode): ChatMessage {
  const copy = {
    en: 'Welcome. Sign in, connect your backend, and start chatting with the existing FastAPI service from your phone.',
    sn: 'Mauya. Pindai muapp, batidzai backend, motanga kukurukura neFastAPI service muchishandisa foni yenyu.',
    nd: 'Wamukelekile. Ngenani ku-app, xhumanisani i-backend, bese liqala ukuxoxa le-FastAPI service lisebenzisa ifoni yenu.',
  }

  return {
    _id: 'welcome-message',
    text: copy[language],
    createdAt: new Date(),
    user: { _id: 'assistant', name: 'AI Assistant' },
  }
}

function mapBackendMessage(message: MobileChatMessage, currentUserId?: string, currentUserName?: string): ChatMessage {
  let userId = 'assistant'
  let name = 'AI Assistant'

  if (message.is_from_customer) {
    userId = currentUserId ?? 'customer'
    name = currentUserName ?? 'You'
  } else if (message.is_from_agent) {
    userId = 'agent'
    name = message.sender_name ?? 'Support Agent'
  }

  return {
    _id: message.id,
    text: message.content,
    createdAt: new Date(message.timestamp),
    user: {
      _id: userId,
      name,
    },
    intent: message.detected_intent ?? undefined,
  }
}

function AppContent() {
  const insets = useSafeAreaInsets()
  const isPromptingLeaveChat = useRef(false)
  const loadSessionRequestRef = useRef(0)
  const activeSessionIdRef = useRef<string | null>(null)
  const isCreatingSessionRef = useRef(false)
  const chatListRef = useRef<FlatList<ChatMessage> | null>(null)
  const chatInputRef = useRef<TextInput | null>(null)
  const draftMessageRef = useRef('')
  const [apiBaseUrl, setApiBaseUrl] = useState('')
  const [backendDraftUrl, setBackendDraftUrl] = useState(defaultDraftUrl)
  const [authSession, setAuthSession] = useState<AuthSession | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [language, setLanguage] = useState<LanguageCode>('en')
  const [messages, setMessages] = useState<ChatMessage[]>([buildWelcomeMessage('en')])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [tickets, setTickets] = useState<CustomerTicketSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [connectionNote, setConnectionNote] = useState<string | null>(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerPhone, setRegisterPhone] = useState('')
  const [otpEmail, setOtpEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [providers, setProviders] = useState<ProviderOption[]>([])
  const [selectedProviderName, setSelectedProviderName] = useState<string>('')
  const [selectedProviderType, setSelectedProviderType] = useState<string>('mno')
  const [sessionRating, setSessionRating] = useState<number>(0)
  const [sessionComment, setSessionComment] = useState('')
  const [feedbackRatingDraft, setFeedbackRatingDraft] = useState<number>(0)
  const [feedbackCommentDraft, setFeedbackCommentDraft] = useState('')
  const [focusFeedbackSignal, setFocusFeedbackSignal] = useState(0)
  const [isSubmittingRating, setIsSubmittingRating] = useState(false)
  const [isSetupConfigExpanded, setIsSetupConfigExpanded] = useState(false)
  const [showLeaveFeedbackModal, setShowLeaveFeedbackModal] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [loginBackgroundIndex] = useState(0)
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
  const [profileLanguage, setProfileLanguage] = useState<LanguageCode>('en')
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false)
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>('today')
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [themeMode, setThemeMode] = useState<'light' | 'blue'>('light')
  const [customerSeenCounts, setCustomerSeenCounts] = useState<Record<string, number>>({})
  const [mobileNotifications, setMobileNotifications] = useState<MobileNotification[]>([])
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0)
  const [isLocatingUser, setIsLocatingUser] = useState(false)
  const [isLoadingNearbyLocations, setIsLoadingNearbyLocations] = useState(false)
  const [nearbyLocations, setNearbyLocations] = useState<NearbyLocation[]>([])
  const [userLocationName, setUserLocationName] = useState('')
  const [locationPanelOpen, setLocationPanelOpen] = useState(false)
  const [userCoords, setUserCoords] = useState<UserCoords | null>(null)
  const [nearbyLocationType, setNearbyLocationType] = useState<string>('bank')
  const [locationError, setLocationError] = useState<string | null>(null)
  const [currentRoute, setCurrentRoute] = useState('Session Hub')

  const isBlueTheme = themeMode === 'blue'

  const locationOptions = useMemo(() => {
    if (selectedProviderType === 'bank') {
      return [
        { value: 'bank', label: 'Branches' },
        { value: 'atm', label: 'ATMs' },
        { value: 'agency_banking', label: 'Agency' },
      ]
    }

    const providerKey = selectedProviderName.toLowerCase()
    if (providerKey.includes('eco')) {
      return [
        { value: 'cashout_agent', label: 'Agents' },
        { value: 'econet_shop', label: 'Econet' },
        { value: 'bank', label: 'Banks' },
        { value: 'atm', label: 'ATMs' },
      ]
    }
    if (providerKey.includes('one')) {
      return [
        { value: 'cashout_agent', label: 'Agents' },
        { value: 'netone_shop', label: 'NetOne' },
        { value: 'bank', label: 'Banks' },
        { value: 'atm', label: 'ATMs' },
      ]
    }
    if (providerKey.includes('inn')) {
      return [
        { value: 'innbucks_outlet', label: 'Outlets' },
        { value: 'cashout_agent', label: 'Agents' },
        { value: 'bank', label: 'Banks' },
      ]
    }

    return [
      { value: 'atm', label: 'ATMs' },
      { value: 'bank', label: 'Branches' },
      { value: 'cashout_agent', label: 'Agents' },
    ]
  }, [selectedProviderName, selectedProviderType])

  const apiClient = useMemo(() => {
    if (!apiBaseUrl) {
      return null
    }

    return new MobileApiClient(apiBaseUrl, authSession?.access_token)
  }, [apiBaseUrl, authSession?.access_token])

  useEffect(() => {
    void hydrateApp()
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatListRef.current && messages.length > 0) {
      setTimeout(() => {
        chatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages])

  // Auto-scroll when keyboard opens/closes
  useEffect(() => {
    const keyboardShowListener = Keyboard.addListener('keyboardDidShow', () => {
      if (chatListRef.current && messages.length > 0) {
        setTimeout(() => {
          chatListRef.current?.scrollToEnd({ animated: true })
        }, 100)
      }
    })

    const keyboardHideListener = Keyboard.addListener('keyboardDidHide', () => {
      if (chatListRef.current && messages.length > 0) {
        setTimeout(() => {
          chatListRef.current?.scrollToEnd({ animated: true })
        }, 100)
      }
    })

    return () => {
      keyboardShowListener.remove()
      keyboardHideListener.remove()
    }
  }, [messages])

  useEffect(() => {
    setMessages((current) => {
      if (current.length === 1 && current[0]._id === 'welcome-message') {
        return [buildWelcomeMessage(language)]
      }

      return current
    })
  }, [language])

  useEffect(() => {
    if (!apiClient || !authSession) {
      return
    }

    void bootstrapChat()
    void hydrateProfile()
  }, [apiClient, authSession])

  useEffect(() => {
    const userId = authSession?.user.id
    if (!userId) {
      setCustomerSeenCounts({})
      return
    }

    let isMounted = true
    void AsyncStorage.getItem(customerNotificationSeenKey(userId)).then((raw) => {
      if (!isMounted) {
        return
      }
      setCustomerSeenCounts(parseSeenCounts(raw))
    })

    return () => {
      isMounted = false
    }
  }, [authSession?.user.id])

  useEffect(() => {
    const { notifications, totalUnread } = computeCustomerNotifications(sessions, customerSeenCounts, activeSessionId)
    setMobileNotifications(notifications)
    setNotificationUnreadCount(totalUnread)
  }, [sessions, customerSeenCounts, activeSessionId])

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId
  }, [activeSessionId])

  useEffect(() => {
    const selected = providers.find((provider) => provider.provider === selectedProviderName)
    if (selected) {
      setSelectedProviderType(selected.type)
    }
  }, [providers, selectedProviderName])

  useEffect(() => {
    if (!locationOptions.some((item) => item.value === nearbyLocationType)) {
      setNearbyLocationType(locationOptions[0]?.value || 'bank')
    }
  }, [locationOptions, nearbyLocationType])

  useEffect(() => {
    if (!isSubmittingAuth) {
      return
    }

    const timeout = setTimeout(() => {
      setIsSubmittingAuth(false)
      const message =
        'Authentication is taking too long. Check backend reachability and use your PC LAN IP instead of localhost when testing on a phone.'
      setConnectionNote(message)
      Alert.alert('Authentication timeout', message)
    }, 20000)

    return () => clearTimeout(timeout)
  }, [isSubmittingAuth])

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height)
      setTimeout(() => {
        chatListRef.current?.scrollToEnd({ animated: true })
      }, 80)
    })

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0)
    })

    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [])

  useEffect(() => {
    setTimeout(() => {
      chatListRef.current?.scrollToEnd({ animated: true })
    }, 30)
  }, [messages.length])

  useEffect(() => {
    const userId = authSession?.user.id
    if (!userId || !activeSessionId) {
      return
    }

    const activeSession = sessions.find((session) => session.session_id === activeSessionId)
    if (!activeSession) {
      return
    }

    setCustomerSeenCounts((current) => {
      const currentSeen = current[activeSessionId] || 0
      const nextSeen = Math.max(currentSeen, activeSession.message_count || 0)
      if (nextSeen === currentSeen) {
        return current
      }

      const next = { ...current, [activeSessionId]: nextSeen }
      void AsyncStorage.setItem(customerNotificationSeenKey(userId), JSON.stringify(next))
      return next
    })
  }, [authSession?.user.id, activeSessionId, sessions])

  async function hydrateApp() {
    try {
      const [storedBaseUrl, storedSession, storedSessionId, storedThemeMode] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.apiBaseUrl),
        AsyncStorage.getItem(STORAGE_KEYS.authSession),
        AsyncStorage.getItem(STORAGE_KEYS.activeSessionId),
        AsyncStorage.getItem(STORAGE_KEYS.themeMode),
      ])

      if (storedThemeMode === 'light' || storedThemeMode === 'blue') {
        setThemeMode(storedThemeMode)
      } else if (storedThemeMode === 'dark') {
        // Migrate legacy dark mode preference to the new blue theme.
        setThemeMode('blue')
      }

      const normalizedUrl = normalizeApiBaseUrl(storedBaseUrl ?? defaultDraftUrl)
      if (normalizedUrl) {
        setApiBaseUrl(normalizedUrl)
        setBackendDraftUrl(normalizedUrl)
      }

      if (storedSession) {
        const parsed = JSON.parse(storedSession) as AuthSession
        setAuthSession(parsed)
        if (parsed.user?.preferred_language) {
          setLanguage(parsed.user.preferred_language as LanguageCode)
        }
      }

      if (storedSessionId) {
        setActiveSessionId(storedSessionId)
      }
    } finally {
      setIsBootstrapping(false)
    }
  }

  async function bootstrapChat() {
    if (!apiClient || !authSession) {
      return
    }

    try {
      const [sessionList, providerList, ticketList] = await Promise.all([
        apiClient.getSessions(),
        apiClient.getProviders(),
        apiClient.getTickets(),
      ])
      setSessions(sessionList)
      setProviders(providerList)
      setTickets(ticketList)

      if (providerList.length > 0) {
        setSelectedProviderName((current) => current || providerList[0].provider)
        setSelectedProviderType(providerList[0].type)
      }

      if (isCreatingSessionRef.current) {
        return
      }

      const preferredSessionId = activeSessionIdRef.current ?? sessionList[0]?.session_id ?? null
      if (preferredSessionId) {
        await loadSession(preferredSessionId, sessionList)
        return
      }

      await startNewSession()
    } catch (error) {
      setConnectionNote(describeApiError(error))
    }
  }

  async function persistApiBaseUrl(nextUrl: string) {
    const normalized = normalizeApiBaseUrl(nextUrl)
    setApiBaseUrl(normalized)
    setBackendDraftUrl(normalized)
    await AsyncStorage.setItem(STORAGE_KEYS.apiBaseUrl, normalized)
  }

  async function testAndSaveConnection() {
    const normalized = normalizeApiBaseUrl(backendDraftUrl)
    if (!normalized) {
      Alert.alert('Backend URL required', 'Enter your PC LAN URL, for example http://192.168.1.15:8000/api/v1')
      return
    }

    setIsTestingConnection(true)
    try {
      const client = new MobileApiClient(normalized)
      const health = await client.healthCheck()
      await persistApiBaseUrl(normalized)
      setConnectionNote(`Connected to ${health.app_name} v${health.version}`)
    } catch (error) {
      setConnectionNote(describeApiError(error))
    } finally {
      setIsTestingConnection(false)
    }
  }

  async function handleLogin() {
    if (!apiBaseUrl || !apiClient) {
      Alert.alert('Connect backend first', 'Save and test your backend URL before signing in.')
      return
    }

    const email = loginEmail.trim()
    if (!email || !loginPassword) {
      Alert.alert('Missing credentials', 'Enter both your email and password.')
      return
    }

    if (!email.includes('@')) {
      Alert.alert('Invalid email', 'Use your registered email address to sign in.')
      return
    }

    setIsSubmittingAuth(true)
    try {
      const nextSession = await apiClient.login(email, loginPassword)
      Keyboard.dismiss()
      await AsyncStorage.setItem(STORAGE_KEYS.authSession, JSON.stringify(nextSession))
      setAuthSession(nextSession)
      setLanguage((nextSession.user.preferred_language as LanguageCode) ?? 'en')
      setConnectionNote(`Signed in as ${nextSession.user.name}`)
    } catch (error: any) {
      const requiresVerification = error?.response?.headers?.['x-requires-verification'] === 'true'
      if (requiresVerification) {
        setOtpEmail(email)
        setAuthMode('otp')
      }
      Alert.alert('Login failed', describeApiError(error))
    } finally {
      setIsSubmittingAuth(false)
    }
  }

  async function handleRegister() {
    if (!apiClient) {
      Alert.alert('Connect backend first', 'Save and test your backend URL before registering.')
      return
    }

    const payload: RegisterPayload = {
      name: registerName.trim(),
      email: registerEmail.trim(),
      password: registerPassword,
      phone_number: registerPhone.trim() || undefined,
      preferred_language: language,
    }

    setIsSubmittingAuth(true)
    try {
      const result = await apiClient.register(payload)
      setOtpEmail(payload.email)
      setAuthMode('otp')
      Alert.alert('Registration complete', result.message)
    } catch (error) {
      Alert.alert('Registration failed', describeApiError(error))
    } finally {
      setIsSubmittingAuth(false)
    }
  }

  async function handleVerifyOtp() {
    if (!apiClient) {
      Alert.alert('Connect backend first', 'Save and test your backend URL before verifying OTP.')
      return
    }

    setIsSubmittingAuth(true)
    try {
      const result = await apiClient.verifyOtp(otpEmail.trim(), otpCode.trim())
      setAuthMode('login')
      setLoginEmail(otpEmail.trim())
      Alert.alert('Verification successful', result.message)
    } catch (error) {
      Alert.alert('Verification failed', describeApiError(error))
    } finally {
      setIsSubmittingAuth(false)
    }
  }

  async function handleResendOtp() {
    if (!apiClient) {
      Alert.alert('Connect backend first', 'Save and test your backend URL before requesting another OTP.')
      return
    }

    const email = otpEmail.trim()
    if (!email || !email.includes('@')) {
      Alert.alert('Email required', 'Enter the same email used during registration.')
      return
    }

    setIsSubmittingAuth(true)
    try {
      const result = await apiClient.resendOtp(email)
      Alert.alert('OTP status', result.message)
    } catch (error) {
      Alert.alert('Unable to resend OTP', describeApiError(error))
    } finally {
      setIsSubmittingAuth(false)
    }
  }

  async function handleLogout() {
    await AsyncStorage.multiRemove([STORAGE_KEYS.authSession, STORAGE_KEYS.activeSessionId])
    setAuthSession(null)
    setActiveSessionId(null)
    setSessions([])
    setMessages([buildWelcomeMessage(language)])
    setProfileName('')
    setProfileEmail('')
    setProfilePhone('')
    setProfileLanguage('en')
    setCustomerSeenCounts({})
    setMobileNotifications([])
    setNotificationUnreadCount(0)
    setConnectionNote('Signed out on this device.')
  }

  async function requestUserLocation(): Promise<{ coords: UserCoords; areaName: string } | null> {
    if (!apiClient) {
      setLocationError('Connect to backend first so nearby locations can be fetched.')
      return null
    }

    try {
      setLocationError(null)
      setIsLocatingUser(true)

      const permission = await Location.requestForegroundPermissionsAsync()
      if (permission.status !== 'granted') {
        setLocationError('Allow location access to find nearby branches, agents, or ATMs.')
        return null
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest })
      const coords = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      }
      setUserCoords(coords)

      let areaName = `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`
      try {
        const reverse = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lon })
        const primary = reverse[0]
        const bestName =
          primary?.district ||
          primary?.subregion ||
          primary?.city ||
          primary?.region ||
          primary?.name

        if (bestName) {
          areaName = bestName
        }
      } catch {
        // Keep coordinate-based fallback name.
      }

      setUserLocationName(areaName)
      return { coords, areaName }
    } catch (error) {
      setLocationError(describeApiError(error))
      return null
    } finally {
      setIsLocatingUser(false)
    }
  }

  async function fetchNearbyLocations(locType?: string) {
    if (!apiClient) {
      return
    }

    setLocationError(null)
    const type = locType || nearbyLocationType
    let areaName = userLocationName
    let coords = userCoords

    if (!coords) {
      const located = await requestUserLocation()
      if (!located) {
        setNearbyLocations([])
        return
      }
      areaName = located.areaName
      coords = located.coords
    }

    try {
      setIsLoadingNearbyLocations(true)
      const queryArea = areaName || `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`
      const results = await apiClient.getNearbyLocations(`nearest ${type} in ${queryArea}`, type, 5)
      setNearbyLocations(results)
    } catch (error) {
      setNearbyLocations([])
      setLocationError(describeApiError(error))
    } finally {
      setIsLoadingNearbyLocations(false)
    }
  }

  async function handleOpenLocationFinder() {
    if (!apiClient) {
      Alert.alert('Backend required', 'Connect to backend first so nearby locations can be fetched.')
      return
    }

    const nextOpen = !locationPanelOpen
    setLocationPanelOpen(nextOpen)

    if (!nextOpen) {
      return
    }

    if (!userCoords) {
      await requestUserLocation()
    }

    await fetchNearbyLocations(locationOptions[0]?.value || nearbyLocationType)
  }

  async function handleMarkAllNotificationsRead() {
    const userId = authSession?.user.id
    if (!userId) {
      return
    }

    const nextSeen: Record<string, number> = {}
    sessions.forEach((session) => {
      nextSeen[session.session_id] = session.message_count || 0
    })

    setCustomerSeenCounts(nextSeen)
    await AsyncStorage.setItem(customerNotificationSeenKey(userId), JSON.stringify(nextSeen))
  }

  async function hydrateProfile() {
    if (!apiClient || !authSession) {
      return
    }

    setIsLoadingProfile(true)
    try {
      const profile = await apiClient.getCurrentUserProfile()
      syncProfileState(profile)
    } catch {
      setProfileName(authSession.user.name)
      setProfileEmail(authSession.user.email)
      setProfilePhone('')
      setProfileLanguage((authSession.user.preferred_language as LanguageCode) ?? 'en')
    } finally {
      setIsLoadingProfile(false)
    }
  }

  function syncProfileState(profile: UserProfile) {
    setProfileName(profile.name ?? '')
    setProfileEmail(profile.email ?? '')
    setProfilePhone(profile.phone_number ?? '')
    const normalizedLanguage = (profile.preferred_language as LanguageCode) ?? 'en'
    setProfileLanguage(normalizedLanguage)
    setLanguage(normalizedLanguage)
    setAuthSession((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        user: {
          ...current.user,
          name: profile.name,
          email: profile.email,
          preferred_language: profile.preferred_language,
        },
      }
    })
  }

  async function handleSaveProfile() {
    if (!apiClient) {
      Alert.alert('Profile unavailable', 'Connect backend and login before updating your profile.')
      return
    }

    setIsSavingProfile(true)
    try {
      const updated = await apiClient.updateCurrentUserProfile({
        name: profileName.trim() || undefined,
        phone_number: profilePhone.trim() || undefined,
        preferred_language: profileLanguage,
      })

      syncProfileState(updated)
      Alert.alert('Profile updated', 'Your profile details were saved successfully.')
    } catch (error) {
      Alert.alert('Unable to update profile', describeApiError(error))
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function toggleTheme(enabled: boolean) {
    const nextMode: 'light' | 'blue' = enabled ? 'blue' : 'light'
    setThemeMode(nextMode)
    await AsyncStorage.setItem(STORAGE_KEYS.themeMode, nextMode)
  }

  function closeLeaveFeedbackModal() {
    isPromptingLeaveChat.current = false
    setShowLeaveFeedbackModal(false)
  }

  async function startNewSession(openChat = false) {
    if (!apiClient) {
      return
    }

    isCreatingSessionRef.current = true
    try {
      // Invalidate any in-flight session history request so it cannot overwrite a fresh session.
      loadSessionRequestRef.current += 1
      const session = await apiClient.createSession()
      setSessions((current) => [session, ...current])
      activeSessionIdRef.current = session.session_id
      setActiveSessionId(session.session_id)
      await AsyncStorage.setItem(STORAGE_KEYS.activeSessionId, session.session_id)
      setMessages([buildWelcomeMessage(language)])
      setSessionRating(0)
      setSessionComment('')
      if (openChat && rootNavigationRef.isReady()) {
        rootNavigationRef.navigate('Chat Session')
      }
    } catch (error) {
      Alert.alert('Unable to create session', describeApiError(error))
    } finally {
      isCreatingSessionRef.current = false
    }
  }

  async function loadSession(sessionId: string, sessionList: ChatSession[] = sessions) {
    if (!apiClient) {
      return
    }

    setIsLoadingMessages(true)
    try {
      const requestId = ++loadSessionRequestRef.current
      const [history, currentRating] = await Promise.all([apiClient.getMessages(sessionId), apiClient.getRating(sessionId)])

      if (requestId !== loadSessionRequestRef.current) {
        return
      }

      const mapped = history
        .map((message) => mapBackendMessage(message, authSession?.user.id, authSession?.user.name))
        .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())

      setMessages(mapped.length > 0 ? mapped : [buildWelcomeMessage(language)])
      setSessionRating(currentRating.rating ?? 0)
      setSessionComment(currentRating.comment ?? '')
      activeSessionIdRef.current = sessionId
      setActiveSessionId(sessionId)
      await AsyncStorage.setItem(STORAGE_KEYS.activeSessionId, sessionId)
    } catch (error) {
      Alert.alert('Unable to load messages', describeApiError(error))
    } finally {
      setIsLoadingMessages(false)
    }
  }

  async function ensureSessionId() {
    if (activeSessionIdRef.current) {
      return activeSessionIdRef.current
    }

    if (!apiClient) {
      return null
    }

    const session = await apiClient.createSession()
    setSessions((current) => [session, ...current])
    activeSessionIdRef.current = session.session_id
    setActiveSessionId(session.session_id)
    await AsyncStorage.setItem(STORAGE_KEYS.activeSessionId, session.session_id)
    return session.session_id
  }

  async function handleSendText(content: string) {
    const trimmed = content.trim()
    if (!apiClient || !authSession || !trimmed || isSending) {
      return
    }

    const outgoing: ChatMessage = {
      _id: `local-${Date.now()}`,
      text: trimmed,
      createdAt: new Date(),
      user: {
        _id: authSession.user.id,
        name: authSession.user.name,
      },
    }

    const resolvedSessionId = await ensureSessionId()
    if (!resolvedSessionId) {
      return
    }

    setIsSending(true)
    draftMessageRef.current = ''
    chatInputRef.current?.clear()
    setMessages((current) => [...current, outgoing])

    try {
      const response = await apiClient.sendMessage(
        resolvedSessionId,
        outgoing.text,
        language,
        selectedProviderName || undefined,
        selectedProviderType || undefined
      )
      const aiMessage: ChatMessage = {
        _id: response.message_id,
        text: response.content,
        createdAt: new Date(response.timestamp),
        user: {
          _id: 'assistant',
          name: response.requires_escalation ? 'AI + Handoff' : 'AI Assistant',
        },
        intent: response.intent,
        ticketId: response.ticket_id,
        requiresEscalation: response.requires_escalation,
      }

      setMessages((current) => [...current, aiMessage])

      const refreshedSessions = await apiClient.getSessions()
      setSessions(refreshedSessions)
      const refreshedTickets = await apiClient.getTickets()
      setTickets(refreshedTickets)
    } catch (error) {
      Alert.alert('Message failed', describeApiError(error))
    } finally {
      setIsSending(false)
    }
  }

  async function handleSubmitRating(ratingValue: number = feedbackRatingDraft, commentValue: string = feedbackCommentDraft) {
    const resolvedSessionId = activeSessionIdRef.current

    if (!apiClient || !resolvedSessionId) {
      return
    }

    if (ratingValue < 1 || ratingValue > 5) {
      Alert.alert('Choose a rating', 'Tap 1 to 5 stars before submitting feedback.')
      return
    }

    setIsSubmittingRating(true)
    try {
      await apiClient.submitRating(resolvedSessionId, ratingValue, commentValue.trim() || undefined)
      setSessionRating(ratingValue)
      setSessionComment(commentValue)
      closeLeaveFeedbackModal()
      if (rootNavigationRef.isReady()) {
        rootNavigationRef.navigate('Session Hub')
      }
      Alert.alert('Thanks for your feedback', 'Your session rating has been saved.')
    } catch (error) {
      Alert.alert('Unable to save rating', describeApiError(error))
    } finally {
      setIsSubmittingRating(false)
    }
  }

  async function handleCompleteSession(resolved: boolean) {
    const resolvedSessionId = activeSessionIdRef.current

    if (!apiClient || !resolvedSessionId) {
      return
    }

    setIsSubmittingRating(true)
    try {
      const completion = await apiClient.completeSession(resolvedSessionId, {
        resolved,
        rating: feedbackRatingDraft > 0 ? feedbackRatingDraft : undefined,
        comment: feedbackCommentDraft.trim() || undefined,
      })
      setSessionRating(feedbackRatingDraft)
      setSessionComment(feedbackCommentDraft)
      closeLeaveFeedbackModal()
      if (rootNavigationRef.isReady()) {
        rootNavigationRef.navigate('Session Hub')
      }
      Alert.alert('Session updated', completion.message)
      const refreshedSessions = await apiClient.getSessions()
      setSessions(refreshedSessions)
    } catch (error) {
      Alert.alert('Unable to complete session', describeApiError(error))
    } finally {
      setIsSubmittingRating(false)
    }
  }

  const connectionHint = apiBaseUrl ? getHealthUrl(apiBaseUrl) : 'No backend connected yet.'
  const sessionLabel = activeSessionId ? `Session ${activeSessionId}` : 'No active session'
  const openTicketStatuses = ['new', 'assigned', 'in_progress', 'pending_customer', 'escalated', 'reopened']
  const totalSessionsCount = sessions.length
  const activeSessionsCount = sessions.filter((session) => session.status?.toLowerCase() === 'active').length
  const openTicketsCount = tickets.filter((ticket) => openTicketStatuses.includes(ticket.status.toLowerCase())).length
  const resolvedTicketsCount = tickets.filter((ticket) => {
    const status = ticket.status?.toLowerCase() ?? ''
    return status === 'resolved' || status === 'closed'
  }).length
  const resolutionRate = tickets.length > 0 ? `${((resolvedTicketsCount / tickets.length) * 100).toFixed(1)}%` : '0.0%'

  function getAnalyticsRange(period: AnalyticsPeriod) {
    const now = new Date()
    if (period === 'all') {
      return { currentStart: null as Date | null, previousStart: null as Date | null }
    }

    const currentStart = new Date(now)
    if (period === 'today') {
      currentStart.setHours(0, 0, 0, 0)
      const previousStart = new Date(currentStart)
      previousStart.setDate(previousStart.getDate() - 1)
      return { currentStart, previousStart }
    }

    if (period === 'week') {
      currentStart.setDate(currentStart.getDate() - 6)
      currentStart.setHours(0, 0, 0, 0)
      const previousStart = new Date(currentStart)
      previousStart.setDate(previousStart.getDate() - 7)
      return { currentStart, previousStart }
    }

    currentStart.setDate(1)
    currentStart.setHours(0, 0, 0, 0)
    const previousStart = new Date(currentStart)
    previousStart.setMonth(previousStart.getMonth() - 1)
    return { currentStart, previousStart }
  }

  function isWithinRange(dateValue: string | null | undefined, start: Date | null, endExclusive: Date | null) {
    if (!dateValue || !start || !endExclusive) {
      return true
    }
    const parsed = new Date(dateValue)
    if (Number.isNaN(parsed.getTime())) {
      return false
    }
    return parsed >= start && parsed < endExclusive
  }

  const analyticsData = useMemo(() => {
    const range = getAnalyticsRange(analyticsPeriod)
    const now = new Date()

    const currentSessions = sessions.filter((session) =>
      isWithinRange(session.updated_at || session.created_at, range.currentStart, analyticsPeriod === 'all' ? null : now)
    )

    const currentTickets = tickets.filter((ticket) =>
      isWithinRange(ticket.created_at, range.currentStart, analyticsPeriod === 'all' ? null : now)
    )

    const previousEnd = range.currentStart
    const previousSessions = analyticsPeriod === 'all' || !range.previousStart || !previousEnd
      ? []
      : sessions.filter((session) => isWithinRange(session.updated_at || session.created_at, range.previousStart, previousEnd))

    const previousTickets = analyticsPeriod === 'all' || !range.previousStart || !previousEnd
      ? []
      : tickets.filter((ticket) => isWithinRange(ticket.created_at, range.previousStart, previousEnd))

    const openStatuses = ['new', 'assigned', 'in_progress', 'pending_customer', 'escalated', 'reopened']
    const activeSessionsCurrent = currentSessions.filter((session) => session.status?.toLowerCase() === 'active').length
    const openTicketsCurrent = currentTickets.filter((ticket) => openStatuses.includes((ticket.status || '').toLowerCase())).length
    const resolvedTicketsCurrent = currentTickets.filter((ticket) => {
      const status = (ticket.status || '').toLowerCase()
      return status === 'resolved' || status === 'closed'
    }).length
    const resolutionRateCurrent = currentTickets.length > 0 ? (resolvedTicketsCurrent / currentTickets.length) * 100 : 0

    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    const sessionSeries = Array.from({ length: 7 }, () => 0)
    const activeSeries = Array.from({ length: 7 }, () => 0)
    const openTicketSeries = Array.from({ length: 7 }, () => 0)
    const resolutionSeries = Array.from({ length: 7 }, () => 0)

    const getDayIndex = (rawDate: string | null | undefined) => {
      if (!rawDate) {
        return -1
      }
      const parsed = new Date(rawDate)
      if (Number.isNaN(parsed.getTime())) {
        return -1
      }
      const bucketDate = new Date(parsed)
      bucketDate.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((bucketDate.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000))
      const index = diffDays + 6
      return index >= 0 && index < 7 ? index : -1
    }

    currentSessions.forEach((session) => {
      const index = getDayIndex(session.updated_at || session.created_at)
      if (index < 0) {
        return
      }
      sessionSeries[index] += 1
      if ((session.status || '').toLowerCase() === 'active') {
        activeSeries[index] += 1
      }
    })

    currentTickets.forEach((ticket) => {
      const index = getDayIndex(ticket.created_at)
      if (index < 0) {
        return
      }
      const status = (ticket.status || '').toLowerCase()
      if (openStatuses.includes(status)) {
        openTicketSeries[index] += 1
      }
      if (status === 'resolved' || status === 'closed') {
        resolutionSeries[index] += 1
      }
    })

    return {
      totalSessionsCurrent: currentSessions.length,
      totalSessionsDelta: currentSessions.length - previousSessions.length,
      activeSessionsCurrent,
      activeSessionsDelta:
        activeSessionsCurrent - previousSessions.filter((session) => session.status?.toLowerCase() === 'active').length,
      openTicketsCurrent,
      openTicketsDelta:
        openTicketsCurrent - previousTickets.filter((ticket) => openStatuses.includes((ticket.status || '').toLowerCase())).length,
      resolutionRateCurrent,
      resolvedTicketsCurrent,
      totalTicketsCurrent: currentTickets.length,
      resolutionRateDelta: resolutionRateCurrent - (
        previousTickets.length > 0
          ? (previousTickets.filter((ticket) => {
              const status = (ticket.status || '').toLowerCase()
              return status === 'resolved' || status === 'closed'
            }).length / previousTickets.length) * 100
          : 0
      ),
      filteredSessionPreview: currentSessions
        .slice()
        .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
        .slice(0, 4),
      sessionSeries,
      activeSeries,
      openTicketSeries,
      resolutionSeries,
    }
  }, [analyticsPeriod, sessions, tickets])

  function formatDateBadge(dateValue: Date) {
    const now = new Date()
    const sameDay =
      now.getFullYear() === dateValue.getFullYear() &&
      now.getMonth() === dateValue.getMonth() &&
      now.getDate() === dateValue.getDate()

    if (sameDay) {
      return 'Today'
    }

    return dateValue.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  function isSameDay(left: Date, right: Date) {
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    )
  }

  function renderModePill(mode: AuthMode, label: string) {
    const active = authMode === mode
    return (
      <Pressable key={mode} onPress={() => setAuthMode(mode)} style={[styles.modePill, active && styles.modePillActive]}>
        <Text style={[styles.modePillText, active && styles.modePillTextActive]}>{label}</Text>
      </Pressable>
    )
  }

  function renderLanguageChip(option: { code: LanguageCode; label: string }) {
    const active = language === option.code
    return (
      <Pressable
        key={option.code}
        onPress={() => setLanguage(option.code)}
        style={[styles.languageChip, active && styles.languageChipActive]}
      >
        <Text style={[styles.languageChipText, active && styles.languageChipTextActive]}>{option.label}</Text>
      </Pressable>
    )
  }

  function renderProfileLanguageChip(option: { code: LanguageCode; label: string }) {
    const active = profileLanguage === option.code
    return (
      <Pressable
        key={`profile-${option.code}`}
        onPress={() => setProfileLanguage(option.code)}
        style={[styles.languageChip, active && styles.languageChipActive]}
      >
        <Text style={[styles.languageChipText, active && styles.languageChipTextActive]}>{option.label}</Text>
      </Pressable>
    )
  }

  function renderAuthCard() {
    return (
      <View style={[styles.card, styles.authCardElevated]}>
        <Text style={styles.cardTitle}>Customer Service Platform</Text>

        <Text style={styles.authSectionLabel}>Sign in options</Text>
        <View style={styles.modeRow}>
          {renderModePill('login', 'Login')}
          {renderModePill('register', 'Register')}
          {renderModePill('otp', 'Verify OTP')}
        </View>

        {authMode === 'login' ? (
          <>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setLoginEmail}
              placeholder="Email"
              {...INPUT_PROPS}
              style={styles.input}
              value={loginEmail}
            />
            <TextInput
              {...INPUT_PROPS}
              onChangeText={setLoginPassword}
              placeholder="Password"
              secureTextEntry
              style={styles.input}
              value={loginPassword}
            />
            <Pressable onPress={handleLogin} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{isSubmittingAuth ? 'Signing in...' : 'Sign in'}</Text>
            </Pressable>
          </>
        ) : null}

        {authMode === 'register' ? (
          <>
            <TextInput
              {...INPUT_PROPS}
              onChangeText={setRegisterName}
              placeholder="Full name"
              style={styles.input}
              value={registerName}
            />
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setRegisterEmail}
              placeholder="Email"
              {...INPUT_PROPS}
              style={styles.input}
              value={registerEmail}
            />
            <TextInput
              {...INPUT_PROPS}
              onChangeText={setRegisterPhone}
              placeholder="Phone number (optional)"
              style={styles.input}
              value={registerPhone}
            />
            <TextInput
              {...INPUT_PROPS}
              onChangeText={setRegisterPassword}
              placeholder="Password"
              secureTextEntry
              style={styles.input}
              value={registerPassword}
            />
            <Pressable onPress={handleRegister} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{isSubmittingAuth ? 'Creating account...' : 'Create customer account'}</Text>
            </Pressable>
          </>
        ) : null}

        {authMode === 'otp' ? (
          <>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setOtpEmail}
              placeholder="Email"
              {...INPUT_PROPS}
              style={styles.input}
              value={otpEmail}
            />
            <TextInput
              {...INPUT_PROPS}
              keyboardType="number-pad"
              onChangeText={setOtpCode}
              placeholder="OTP code"
              style={styles.input}
              value={otpCode}
            />
            <Pressable onPress={handleVerifyOtp} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{isSubmittingAuth ? 'Verifying OTP...' : 'Verify email OTP'}</Text>
            </Pressable>
            <Pressable onPress={handleResendOtp} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Resend OTP</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    )
  }

  function renderSetupScreen() {
    return (
      <ImageBackground
        source={{
          uri: LOGIN_BACKGROUNDS[loginBackgroundIndex],
        }}
        resizeMode="cover"
        style={styles.loginBackground}
      >
        <View style={styles.loginOverlay}>
          <ScrollView
            contentContainerStyle={styles.setupScrollContent}
            style={styles.setupScrollView}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          >
            {renderAuthCard()}

            {connectionNote ? <Text style={styles.authStatusText}>{connectionNote}</Text> : null}
          </ScrollView>
        </View>
      </ImageBackground>
    )
  }

  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#3f73ff" />
        <Text style={styles.loadingText}>Preparing mobile workspace...</Text>
      </SafeAreaView>
    )
  }

  if (!authSession) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 28 : 0}
          style={styles.setupKeyboardWrap}
        >
          {renderSetupScreen()}
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  const currentUser = authSession.user

  function ChatSessionTabScreen(navigation: any) {
    const iosKeyboardLift =
      Platform.OS === 'ios' && keyboardHeight > 0
        ? Math.max(0, keyboardHeight - insets.bottom)
        : 0
    const androidKeyboardLift =
      Platform.OS === 'android' && keyboardHeight > 0
        ? Math.max(0, keyboardHeight + Math.max(8, insets.bottom))
        : 0
    const keyboardLift = Platform.OS === 'ios' ? iosKeyboardLift : androidKeyboardLift
    // Keep the composer flush with the tab bar when keyboard is closed.
    const inputBottomPadding = keyboardHeight > 0 ? 4 : 0
    const goToDashboard = () => {
      if (typeof navigation?.jumpTo === 'function') {
        navigation.jumpTo('Session Hub')
        return
      }

      navigation.navigate('Session Hub')
    }

    return (
      <SafeAreaView edges={['left', 'right']} style={styles.tabSafeArea}>
        <View style={styles.chatScreen}>
          <View style={styles.chatSubHeaderCard}>
            <View style={styles.chatTopBar}>
              <Pressable
                style={styles.chatBackIconButton}
                onPress={goToDashboard}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Go back to dashboard"
              >
                <Ionicons name="arrow-back" size={28} color="#0f172a" />
              </Pressable>

              <View style={styles.chatTopBarCenter}>
                <View style={styles.chatTopBarAvatar}>
                  <Ionicons name="person" size={16} color="#ef476f" />
                </View>
                <Text numberOfLines={1} style={styles.chatTopBarTitle}>AI Powered Customer Service</Text>
              </View>
            </View>
          </View>

        <KeyboardAvoidingView
          behavior={undefined}
          keyboardVerticalOffset={0}
          style={styles.chatContentWrap}
        >
          <FlatList
            ref={chatListRef}
            data={messages}
            keyExtractor={(item) => String(item._id)}
            style={styles.messageList}
            contentContainerStyle={[styles.messageListContent, { paddingBottom: 12 }]}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => {
              const currentDate = new Date(item.createdAt)
              const previous = index > 0 ? messages[index - 1] : null
              const shouldShowDateBadge = !previous || !isSameDay(new Date(previous.createdAt), currentDate)
              const isMine = item.user._id === currentUser.id

              return (
                <View>
                  {shouldShowDateBadge ? (
                    <View style={styles.dateBadgeWrap}>
                      <Text style={styles.dateBadgeText}>{formatDateBadge(currentDate)}</Text>
                    </View>
                  ) : null}
                  <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowOther]}>
                    <View style={[styles.messageBubble, isMine ? styles.messageBubbleMine : styles.messageBubbleOther]}>
                      <Text style={[styles.messageText, isMine ? styles.messageTextMine : styles.messageTextOther]}>{item.text}</Text>
                    </View>
                  </View>
                  {item.user._id === 'assistant' && item.intent ? (
                    <Text style={styles.messageMetaText}>
                      Intent: {item.intent}
                      {item.ticketId ? ` | Ticket: ${item.ticketId}` : ''}
                    </Text>
                  ) : null}
                </View>
              )
            }}
            onContentSizeChange={() => chatListRef.current?.scrollToEnd({ animated: true })}
          />

          <View style={[styles.stickyInputContainer, { marginBottom: keyboardLift, paddingBottom: inputBottomPadding }]}>
            <TextInput
              ref={chatInputRef}
              {...INPUT_PROPS}
              autoFocus={false}
              blurOnSubmit={false}
              onChangeText={(text) => {
                draftMessageRef.current = text
              }}
              placeholder="Ask about your account, tickets, disputes, or nearby service points"
              style={styles.stickyInputField}
            />
            <Pressable
              style={[styles.stickySendButton, isSending && styles.stickySendButtonDisabled]}
              onPress={() => void handleSendText(draftMessageRef.current)}
              disabled={isSending}
            >
              {isSending ? <ActivityIndicator color="#f8fafc" size="small" /> : <Text style={styles.stickySendButtonText}>Send</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
        </View>
      </SafeAreaView>
    )
  }

  function SessionInfoTabScreen(navigation: any) {
    return (
      <SafeAreaView edges={['left', 'right']} style={styles.tabSafeArea}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', android: undefined })}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          style={styles.chatScreen}
        >
          <ScrollView contentContainerStyle={styles.infoScrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.sessionHubPage}>
              <View style={styles.sessionHubSurface}>
                <SessionHubStatsCard
                  totalSessions={totalSessionsCount}
                  activeSessions={activeSessionsCount}
                  openTickets={openTicketsCount}
                  resolutionRate={resolutionRate}
                />

                <QuickActionGrid
                  prompts={quickPrompts}
                  onPromptPress={(prompt) => {
                    void handleSendText(prompt)
                    navigation.navigate('Chat Session')
                  }}
                />

                <SessionTabs
                  sessions={sessions}
                  activeSessionId={activeSessionId}
                  onSelectSession={(sessionId) => {
                    void loadSession(sessionId)
                    navigation.navigate('Chat Session')
                  }}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  function ProfileTabScreen(navigation: any) {
    return (
      <SafeAreaView edges={['left', 'right']} style={styles.tabSafeArea}>
        <ScrollView contentContainerStyle={styles.infoScrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.backButtonContainer}>
            <Pressable
              style={styles.backButton}
              onPress={() => {
                if (typeof navigation?.jumpTo === 'function') {
                  navigation.jumpTo('Session Hub')
                  return
                }

                navigation.navigate('Session Hub')
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#0f172a" />
              <Text style={styles.backButtonText}>Dashboard</Text>
            </Pressable>
          </View>
          <View style={[styles.profileCard, isBlueTheme && styles.profileCardBlue]}>
            <Text style={[styles.profileTitle, isBlueTheme && styles.profileTitleBlue]}>Profile settings</Text>
            <Text style={[styles.profileCopy, isBlueTheme && styles.profileCopyBlue]}>Update your display details and preferred language for responses.</Text>

            <View style={[styles.themeToggleRow, isBlueTheme && styles.themeToggleRowBlue]}>
              <View style={styles.themeToggleTextWrap}>
                <Text style={[styles.themeToggleTitle, isBlueTheme && styles.themeToggleTitleBlue]}>Blue theme</Text>
                <Text style={[styles.themeToggleCopy, isBlueTheme && styles.themeToggleCopyBlue]}>Switch between default and blue appearance.</Text>
              </View>
              <Switch
                value={isBlueTheme}
                onValueChange={(value) => {
                  void toggleTheme(value)
                }}
                trackColor={{ false: '#cbd5e1', true: '#3f73ff' }}
                thumbColor={isBlueTheme ? '#eaf0ff' : '#ffffff'}
              />
            </View>

            <Text style={styles.profileFieldLabel}>Full name</Text>
            <TextInput {...INPUT_PROPS} value={profileName} onChangeText={setProfileName} style={styles.input} placeholder="Your full name" />

            <Text style={styles.profileFieldLabel}>Email</Text>
            <TextInput {...INPUT_PROPS} value={profileEmail} editable={false} style={[styles.input, styles.inputReadOnly]} />

            <Text style={styles.profileFieldLabel}>Phone number</Text>
            <TextInput
              {...INPUT_PROPS}
              value={profilePhone}
              onChangeText={setProfilePhone}
              keyboardType="phone-pad"
              style={styles.input}
              placeholder="Optional"
            />

            <Text style={styles.profileFieldLabel}>Current provider</Text>
            <Pressable
              style={[styles.providerSelectButton, isBlueTheme && styles.providerSelectButtonBlue]}
              onPress={() => setIsProviderDropdownOpen((current) => !current)}
              disabled={providers.length === 0}
            >
              <Text
                style={[
                  styles.providerSelectText,
                  isBlueTheme && styles.providerSelectTextBlue,
                  !selectedProviderName && styles.providerSelectPlaceholder,
                ]}
              >
                {selectedProviderName || (providers.length > 0 ? 'Select provider' : 'No providers available')}
              </Text>
              <Ionicons
                name={isProviderDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={isBlueTheme ? '#2f5ff4' : '#334155'}
              />
            </Pressable>

            {isProviderDropdownOpen && providers.length > 0 ? (
              <View style={[styles.providerSelectMenu, isBlueTheme && styles.providerSelectMenuBlue]}>
                {providers.map((provider) => {
                  const active = selectedProviderName === provider.provider
                  return (
                    <Pressable
                      key={provider.provider}
                      style={[styles.providerSelectOption, active && styles.providerSelectOptionActive]}
                      onPress={() => {
                        setSelectedProviderName(provider.provider)
                        setSelectedProviderType(provider.type)
                        setIsProviderDropdownOpen(false)
                      }}
                    >
                      <Text style={[styles.providerSelectOptionText, active && styles.providerSelectOptionTextActive]}>{provider.provider}</Text>
                    </Pressable>
                  )
                })}
              </View>
            ) : null}

            <Text style={styles.profileFieldLabel}>Preferred language</Text>
            <View style={styles.languageRow}>{languageOptions.map((option) => renderProfileLanguageChip({ code: option.code, label: option.label }))}</View>

            <Pressable
              style={[styles.primaryButton, isSavingProfile && styles.primaryButtonDisabled]}
              onPress={() => void handleSaveProfile()}
              disabled={isSavingProfile}
            >
              <Text style={styles.primaryButtonText}>{isSavingProfile ? 'Saving profile...' : 'Save profile'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  function AnalyticsTabScreen(navigation: any) {
    const periodOptions: Array<{ key: AnalyticsPeriod; label: string }> = [
      { key: 'today', label: 'Today' },
      { key: 'week', label: 'Week' },
      { key: 'month', label: 'Month' },
      { key: 'all', label: 'All time' },
    ]

    const formatDelta = (value: number, suffix: string) => {
      const rounded = Math.round(value * 10) / 10
      if (rounded > 0) {
        return `+${rounded}${suffix}`
      }
      if (rounded < 0) {
        return `${rounded}${suffix}`
      }
      return `0${suffix}`
    }

    const normalizeSeries = (series: number[]) => {
      const max = Math.max(1, ...series)
      return series.map((value) => Math.max(18, Math.round((value / max) * 100)))
    }

    const sessionBarHeights = normalizeSeries(analyticsData.sessionSeries)
    const resolutionBarHeights = normalizeSeries(analyticsData.resolutionSeries)
    const openTicketPoints = normalizeSeries(analyticsData.openTicketSeries)
    const activePoints = normalizeSeries(analyticsData.activeSeries)

    const compactFive = (series: number[]) => {
      if (series.length <= 5) {
        return series
      }
      return [series[0], series[2], series[3], series[5], series[6]]
    }

    const sessionBarHeightsFive = compactFive(sessionBarHeights)
    const resolutionBarHeightsFive = compactFive(resolutionBarHeights)

    const buildLinePoints = (series: number[]) => {
      const picked = compactFive(series)
      const max = Math.max(1, ...picked)
      return picked.map((value, index) => {
        const x = 6 + index * 22
        const y = 92 - Math.round((value / max) * 58)
        return { x, y }
      })
    }

    const activeLinePoints = buildLinePoints(activePoints)
    const ticketLinePoints = buildLinePoints(openTicketPoints)
    const totalTicketsForCard = Math.max(analyticsData.totalTicketsCurrent, 1)
    const resolvedTicketShare = analyticsData.totalTicketsCurrent > 0
      ? (analyticsData.resolvedTicketsCurrent / analyticsData.totalTicketsCurrent) * 100
      : 0
    const openTicketShare = analyticsData.totalTicketsCurrent > 0
      ? (analyticsData.openTicketsCurrent / analyticsData.totalTicketsCurrent) * 100
      : 0
    const remainingTicketShare = Math.max(0, 100 - resolvedTicketShare - openTicketShare)
    const openArcOpacity = openTicketShare > 0 ? 1 : 0.68
    const resolvedArcOpacity = resolvedTicketShare > 0 ? 1 : 0.68
    const totalArcOpacity = remainingTicketShare > 0 ? 1 : 0.62

    const getSegmentStyle = (start: { x: number; y: number }, end: { x: number; y: number }) => {
      const dx = end.x - start.x
      const dy = end.y - start.y
      const length = Math.sqrt(dx * dx + dy * dy)
      const angle = Math.atan2(dy, dx)
      return {
        left: (start.x + end.x) / 2 - length / 2,
        top: (start.y + end.y) / 2 - 1,
        width: length,
        transform: [{ rotateZ: `${angle}rad` }],
      }
    }

    return (
      <SafeAreaView edges={['left', 'right']} style={styles.tabSafeArea}>
        <ScrollView contentContainerStyle={styles.analyticsScrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.analyticsTitle}>Session Analytics</Text>

          <View style={styles.analyticsPeriodGrid}>
            {periodOptions.map((option) => {
              const active = analyticsPeriod === option.key
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setAnalyticsPeriod(option.key)}
                  style={[styles.analyticsPeriodButton, active && styles.analyticsPeriodButtonActive]}
                >
                  <Text style={[styles.analyticsPeriodButtonText, active && styles.analyticsPeriodButtonTextActive]}>{option.label}</Text>
                </Pressable>
              )
            })}
          </View>

          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsCard}>
              <View style={styles.analyticsCardLabelRow}>
                <Text style={styles.analyticsCardLabel}>Total sessions</Text>
                <View style={styles.analyticsCardIconCircle}><Ionicons name="refresh" size={23} color="#2f5ff4" /></View>
              </View>
              <Text style={styles.analyticsCardValue}>{analyticsData.totalSessionsCurrent}</Text>
              <Text style={styles.analyticsCardUnit}>sessions</Text>
              <View style={styles.analyticsBarsRow}>
                {sessionBarHeightsFive.map((height, index) => (
                  <View
                    key={`sessions-bar-${index}`}
                    style={[
                      styles.analyticsBar,
                      { height: `${Math.max(20, height)}%` },
                      index === 1 || index >= 3 ? styles.analyticsBarActive : styles.analyticsBarMuted,
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.analyticsCardTrend}>{formatDelta(analyticsData.totalSessionsDelta, analyticsPeriod === 'today' ? ' today' : analyticsPeriod === 'month' ? ' this month' : ' this week')}</Text>
            </View>

            <View style={[styles.analyticsCard, styles.analyticsCardAccent]}>
              <View style={styles.analyticsCardLabelRow}>
                <Text style={[styles.analyticsCardLabel, styles.analyticsCardLabelAccent]}>Active sessions</Text>
                <View style={[styles.analyticsCardIconCircle, styles.analyticsCardIconCircleAccent]}><Ionicons name="chatbubble-outline" size={23} color="#ffffff" /></View>
              </View>
              <Text style={[styles.analyticsCardValue, styles.analyticsCardValueAccent]}>{analyticsData.activeSessionsCurrent}</Text>
              <Text style={[styles.analyticsCardUnit, styles.analyticsCardUnitAccent]}>
                {analyticsData.totalSessionsCurrent > 0 ? `${Math.round((analyticsData.activeSessionsCurrent / analyticsData.totalSessionsCurrent) * 100)}% of total` : '0% of total'}
              </Text>
              <View style={styles.analyticsWaveRow}>
                <View style={styles.analyticsLineCanvas}>
                  {activeLinePoints.slice(0, -1).map((point, index) => {
                    const next = activeLinePoints[index + 1]
                    return (
                      <View
                        key={`active-line-${index}`}
                        style={[
                          styles.analyticsLineSegment,
                          styles.analyticsLineSegmentAccent,
                          getSegmentStyle(point, next),
                        ]}
                      />
                    )
                  })}
                  {activeLinePoints.map((point, index) => (
                    <View
                      key={`active-dot-${index}`}
                      style={[
                        styles.analyticsLinePoint,
                        styles.analyticsLinePointAccent,
                        { left: point.x - 2.5, top: point.y - 2.5 },
                      ]}
                    />
                  ))}
                </View>
              </View>
              <Text style={[styles.analyticsCardTrend, styles.analyticsCardTrendAccent]}>{formatDelta(analyticsData.activeSessionsDelta, analyticsPeriod === 'today' ? ' today' : analyticsPeriod === 'month' ? ' this month' : ' since yesterday')}</Text>
            </View>

            <View style={styles.analyticsCard}>
              <View style={styles.analyticsCardLabelRow}>
                <Text style={styles.analyticsCardLabel}>Open tickets</Text>
                <View style={[styles.analyticsCardIconCircle, styles.analyticsCardIconCircleWarn]}><Ionicons name="alert-circle-outline" size={23} color="#2f5ff4" /></View>
              </View>
              <Text style={[styles.analyticsCardValue, styles.analyticsCardValueSmall]}>{analyticsData.openTicketsCurrent}</Text>
              <Text style={styles.analyticsCardUnit}>open tickets</Text>
              <Text style={styles.analyticsReferenceLine}>{analyticsData.resolutionRateCurrent.toFixed(1)}% resolved</Text>
              <View style={styles.analyticsWaveRowTall}>
                <View style={styles.analyticsLineCanvas}>
                  {ticketLinePoints.slice(0, -1).map((point, index) => {
                    const next = ticketLinePoints[index + 1]
                    return (
                      <View
                        key={`ticket-line-${index}`}
                        style={[
                          styles.analyticsLineSegment,
                          styles.analyticsLineSegmentOpen,
                          getSegmentStyle(point, next),
                        ]}
                      />
                    )
                  })}
                  {ticketLinePoints.map((point, index) => (
                    <View
                      key={`ticket-dot-${index}`}
                      style={[
                        styles.analyticsLinePoint,
                        styles.analyticsLinePointOpen,
                        { left: point.x - 2.8, top: point.y - 2.8 },
                      ]}
                    />
                  ))}
                </View>
              </View>
              <Text style={[styles.analyticsCardTrend, analyticsData.openTicketsDelta > 0 && styles.analyticsCardTrendWarn]}>
                {formatDelta(analyticsData.openTicketsDelta, analyticsPeriod === 'today' ? ' today' : analyticsPeriod === 'month' ? ' this month' : ' from last week')}
              </Text>
            </View>

            <View style={styles.analyticsCard}>
              <View style={styles.analyticsCardLabelRow}>
                <Text style={styles.analyticsCardLabel}>Resolution</Text>
                <View style={[styles.analyticsCardIconCircle, styles.analyticsCardIconCircleBlue]}><Ionicons name="star-outline" size={23} color="#2f5ff4" /></View>
              </View>
              <Text style={[styles.analyticsCardValue, styles.analyticsCardValueSmall]}>{analyticsData.resolutionRateCurrent.toFixed(1)}%</Text>
              <Text style={styles.analyticsCardUnit}>{analyticsData.resolvedTicketsCurrent}/{analyticsData.totalTicketsCurrent} resolved</Text>
              <View style={styles.analyticsBarsTallRow}>
                {resolutionBarHeightsFive.map((height, index) => (
                  <View
                    key={`resolution-bar-${index}`}
                    style={[
                      styles.analyticsTallBar,
                      { height: `${Math.max(20, height)}%` },
                      index >= 3 ? styles.analyticsTallBarActive : styles.analyticsTallBarMuted,
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.analyticsCardTrend}>{formatDelta(analyticsData.resolutionRateDelta, analyticsPeriod === 'today' ? '% today' : analyticsPeriod === 'month' ? '% this month' : '% this week')}</Text>
            </View>
          </View>

          <LinearGradient
            colors={['#3f73ff', '#2f5ff4', '#1e3a8a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.analyticsTicketStatsCard}
          >
            <View pointerEvents="none" style={styles.analyticsTicketStatsGlowOne} />
            <View pointerEvents="none" style={styles.analyticsTicketStatsGlowTwo} />
            <View style={styles.analyticsTicketStatsHeader}>
              <Text style={styles.analyticsTicketStatsTitle}>Ticket Statistics</Text>
              <View style={styles.analyticsTicketStatsPeriodPill}>
                <Text style={styles.analyticsTicketStatsPeriodText}>{periodOptions.find((option) => option.key === analyticsPeriod)?.label || 'Today'}</Text>
                <Ionicons name="chevron-down" size={12} color="#dbe8ff" />
              </View>
            </View>

            <View style={styles.analyticsTicketStatsBody}>
              <View style={styles.analyticsDonutWrap}>
                <View style={styles.analyticsDonutRing}>
                  <View style={[styles.analyticsDonutArcPrimary, { transform: [{ rotate: `${-90 + Math.round(openTicketShare * 3.6)}deg` }], opacity: openArcOpacity }]} />
                  <View style={[styles.analyticsDonutArcSecondary, { transform: [{ rotate: `${-90 + Math.round((openTicketShare + resolvedTicketShare) * 3.6)}deg` }], opacity: resolvedArcOpacity }]} />
                  <View style={[styles.analyticsDonutArcTertiary, { transform: [{ rotate: `${-90 + Math.round((openTicketShare + resolvedTicketShare + remainingTicketShare) * 3.6)}deg` }], opacity: totalArcOpacity }]} />
                  <View style={styles.analyticsDonutCenter}>
                    <Text style={styles.analyticsDonutCenterText}>
                      {Math.round(resolvedTicketShare)}%
                    </Text>
                  </View>
                </View>

                <View style={[styles.analyticsDonutBadge, styles.analyticsDonutBadgeLeft]}>
                  <Text style={styles.analyticsDonutBadgeText}>
                    {Math.round(openTicketShare)}%
                  </Text>
                </View>

                <View style={[styles.analyticsDonutBadge, styles.analyticsDonutBadgeRight]}>
                  <Text style={styles.analyticsDonutBadgeText}>
                    {Math.round(resolvedTicketShare)}%
                  </Text>
                </View>
              </View>

              <View style={styles.analyticsTicketStatsLegend}>
                <View style={styles.analyticsLegendItem}>
                  <View style={[styles.analyticsLegendIcon, styles.analyticsLegendIconOpen]}>
                    <Ionicons name="time-outline" size={24} color="#facc15" />
                  </View>
                  <View style={styles.analyticsLegendTextWrap}>
                    <Text style={styles.analyticsLegendLabel}>Open</Text>
                    <Text style={styles.analyticsLegendValue}>{analyticsData.openTicketsCurrent}</Text>
                    <Text style={styles.analyticsLegendMeta}>{Math.round(openTicketShare)}%</Text>
                  </View>
                </View>

                <View style={styles.analyticsLegendItem}>
                  <View style={[styles.analyticsLegendIcon, styles.analyticsLegendIconResolved]}>
                    <Ionicons name="checkmark-done-outline" size={24} color="#22c55e" />
                  </View>
                  <View style={styles.analyticsLegendTextWrap}>
                    <Text style={styles.analyticsLegendLabel}>Resolved</Text>
                    <Text style={styles.analyticsLegendValue}>{analyticsData.resolvedTicketsCurrent}</Text>
                    <Text style={styles.analyticsLegendMeta}>{Math.round(resolvedTicketShare)}%</Text>
                  </View>
                </View>

                <View style={styles.analyticsLegendItem}>
                  <View style={[styles.analyticsLegendIcon, styles.analyticsLegendIconTotal]}>
                    <Ionicons name="layers-outline" size={24} color="#ffffff" />
                  </View>
                  <View style={styles.analyticsLegendTextWrap}>
                    <Text style={styles.analyticsLegendLabel}>Total</Text>
                    <Text style={styles.analyticsLegendValue}>{totalTicketsForCard}</Text>
                    <Text style={styles.analyticsLegendMeta}>100%</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.analyticsTicketMixRow}>
              <View style={[styles.analyticsTicketMixSegment, { flex: Math.max(openTicketShare, 5), backgroundColor: '#facc15' }]} />
              <View style={[styles.analyticsTicketMixSegment, { flex: Math.max(resolvedTicketShare, 5), backgroundColor: '#22c55e' }]} />
              <View style={[styles.analyticsTicketMixSegment, { flex: Math.max(remainingTicketShare, 5), backgroundColor: '#ffffff' }]} />
            </View>
          </LinearGradient>
        </ScrollView>
      </SafeAreaView>
    )
  }

  function NotificationsTabScreen(navigation: any) {
    return (
      <SafeAreaView edges={['left', 'right']} style={styles.tabSafeArea}>
        <ScrollView contentContainerStyle={styles.notificationsScrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.notificationsHeaderRow}>
            <Pressable
              style={styles.backButton}
              onPress={() => {
                if (typeof navigation?.jumpTo === 'function') {
                  navigation.jumpTo('Session Hub')
                  return
                }

                navigation.navigate('Session Hub')
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#0f172a" />
              <Text style={styles.backButtonText}>Dashboard</Text>
            </Pressable>
            <Pressable
              style={[styles.notificationsMarkAllButton, notificationUnreadCount === 0 && styles.notificationsMarkAllButtonDisabled]}
              onPress={() => void handleMarkAllNotificationsRead()}
              disabled={notificationUnreadCount === 0}
            >
              <Text style={styles.notificationsMarkAllText}>Mark all read</Text>
            </Pressable>
          </View>

          {mobileNotifications.length === 0 ? (
            <View style={styles.notificationsEmptyCard}>
              <Text style={styles.notificationsEmptyTitle}>No new notifications</Text>
              <Text style={styles.notificationsEmptyCopy}>When a session has new messages, alerts will show up here.</Text>
            </View>
          ) : (
            mobileNotifications.map((item) => (
              <Pressable
                key={item.id}
                style={styles.notificationItemCard}
                onPress={() => {
                  void loadSession(item.sessionId)
                  navigation.navigate('Chat Session')
                }}
              >
                <View style={styles.notificationItemHeader}>
                  <Text style={styles.notificationItemTitle}>{item.title}</Text>
                  <View style={styles.notificationItemBadge}>
                    <Text style={styles.notificationItemBadgeText}>{item.unreadCount}</Text>
                  </View>
                </View>
                <Text style={styles.notificationItemDescription}>{item.description}</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
      <SafeAreaView style={[styles.safeArea, isBlueTheme && styles.safeAreaBlue]}>

      <StatusBar style="light" />
      {currentRoute === 'Session Hub' && (
        <View style={[styles.chatHeader, { backgroundColor: 'transparent', shadowColor: 'transparent', elevation: 0 }]}> 
          <View style={[styles.chatHeaderOverlay, { backgroundColor: 'transparent' }]}> 
            <TopHeader userName={profileName || currentUser.name} onLocationPress={() => void handleOpenLocationFinder()} isLocating={isLocatingUser || isLoadingNearbyLocations} onLogout={handleLogout} />
          </View>
        </View>
      )}

      {locationPanelOpen ? (
        <View style={styles.locationPanelWrap}>
          <View style={styles.locationPanelHeaderRow}>
            <View style={styles.locationPanelTitleWrap}>
              <Text style={styles.locationPanelTitle}>{userLocationName ? `Nearby help around ${userLocationName}` : 'Location finder'}</Text>
              <Text style={styles.locationPanelSubtitle}>
                {selectedProviderName
                  ? `Showing useful places for ${selectedProviderName}`
                  : 'Select a provider to tailor nearby help points.'}
              </Text>
            </View>
            <View style={styles.locationPanelActions}>
              <Pressable style={styles.locationPanelIconButton} onPress={() => void fetchNearbyLocations()} disabled={isLocatingUser || isLoadingNearbyLocations}>
                {isLocatingUser || isLoadingNearbyLocations ? (
                  <ActivityIndicator color="#0f172a" size="small" />
                ) : (
                  <Ionicons color="#0f172a" name="refresh" size={18} />
                )}
              </Pressable>
              <Pressable style={styles.locationPanelIconButton} onPress={() => setLocationPanelOpen(false)}>
                <Ionicons color="#0f172a" name="close" size={18} />
              </Pressable>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.locationTypeRow}>
            {locationOptions.map((option) => {
              const active = nearbyLocationType === option.value
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setNearbyLocationType(option.value)
                    void fetchNearbyLocations(option.value)
                  }}
                  style={[styles.locationTypeChip, active && styles.locationTypeChipActive]}
                >
                  <Text style={[styles.locationTypeChipText, active && styles.locationTypeChipTextActive]}>{option.label}</Text>
                </Pressable>
              )
            })}
          </ScrollView>

          {!userCoords ? (
            <View style={styles.locationEmptyState}>
              <Text style={styles.locationEmptyTitle}>Turn on location to see nearby branches, agents, or stores.</Text>
              <Pressable style={styles.locationPrimaryButton} onPress={() => void requestUserLocation()} disabled={isLocatingUser}>
                <Text style={styles.locationPrimaryButtonText}>{isLocatingUser ? 'Detecting...' : 'Use my location'}</Text>
              </Pressable>
            </View>
          ) : isLoadingNearbyLocations ? (
            <View style={styles.locationLoadingWrap}>
              <ActivityIndicator color="#3f73ff" size="small" />
            </View>
          ) : nearbyLocations.length === 0 ? (
            <Text style={styles.locationEmptyCopy}>No locations found nearby. Try a different category or refresh your location.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.locationCardRow}>
              {nearbyLocations.map((loc, index) => (
                <View key={`${loc.name}-${index}`} style={styles.locationCard}>
                  <View style={styles.locationCardHead}>
                    <View style={styles.locationCardIcon}>
                      <Ionicons color="#3f73ff" name="business-outline" size={16} />
                    </View>
                    <Text numberOfLines={1} style={styles.locationCardTitle}>{loc.name}</Text>
                  </View>
                  <Text style={styles.locationCardDistance}>{`${Number(loc.distance_km || 0).toFixed(1)} km away`}</Text>
                  {loc.address ? <Text numberOfLines={2} style={styles.locationCardMeta}>{loc.address}</Text> : null}
                  {loc.opening_hours ? <Text numberOfLines={1} style={styles.locationCardMeta}>{loc.opening_hours}</Text> : null}
                </View>
              ))}
            </ScrollView>
          )}

          {locationError ? <Text style={styles.locationErrorText}>{locationError}</Text> : null}
        </View>
      ) : null}

      <View style={styles.navigationWrap}>
        <NavigationContainer
          ref={rootNavigationRef}
          onReady={() => {
            const initialState = rootNavigationRef.getRootState()
            if (initialState && initialState.routes && initialState.index !== undefined) {
              const route = initialState.routes[initialState.index]
              if (route && route.name) {
                setCurrentRoute(route.name)
              }
            }
          }}
          onStateChange={(state) => {
            if (state && state.routes && state.index !== undefined) {
              const route = state.routes[state.index]
              if (route && route.name) {
                setCurrentRoute(route.name)
              }
            }
          }}
        >
          <RootTabs.Navigator
            initialRouteName="Session Hub"
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarStyle: [styles.tabBar, isBlueTheme && styles.tabBarBlue],
              tabBarLabelStyle: styles.tabLabel,
              tabBarActiveTintColor: '#ffffff',
              tabBarInactiveTintColor: 'rgba(255,255,255,0.58)',
              tabBarHideOnKeyboard: true,
              tabBarIcon: ({ color, size, focused }) => {
                const iconName = route.name === 'Session Hub'
                  ? focused
                    ? 'home'
                    : 'home-outline'
                  : route.name === 'Analytics'
                    ? focused
                      ? 'analytics'
                      : 'analytics-outline'
                  : route.name === 'Chat Session'
                    ? focused
                      ? 'chatbubble-outline'
                      : 'chatbubble-outline'
                    : route.name === 'Notifications'
                      ? focused
                        ? 'notifications'
                        : 'notifications-outline'
                      : focused
                        ? 'person'
                        : 'person-outline'
                const iconSize = route.name === 'Chat Session' ? 22 : 18
                return <Ionicons color={color} name={iconName} size={iconSize} />
              },
            })}
          >
            <RootTabs.Screen
              name="Session Hub"
              options={{ tabBarLabel: 'Home' }}
              listeners={({ navigation }) => ({
                tabPress: (event) => {
                  const state = navigation.getState()
                  const activeRouteName = state.routes[state.index]?.name

                  if (activeRouteName !== 'Chat Session' || isPromptingLeaveChat.current) {
                    return
                  }

                  event.preventDefault()
                  isPromptingLeaveChat.current = true
                  setFeedbackRatingDraft(sessionRating)
                  setFeedbackCommentDraft(sessionComment)
                  setFocusFeedbackSignal((current) => current + 1)
                  setShowLeaveFeedbackModal(true)
                },
              })}
            >
              {(props) => SessionInfoTabScreen(props.navigation)}
            </RootTabs.Screen>
            <RootTabs.Screen name="Analytics" options={{ tabBarLabel: 'Analytics' }}>
              {(props) => AnalyticsTabScreen(props.navigation)}
            </RootTabs.Screen>
            <RootTabs.Screen
              name="Chat Session"
              options={{
                tabBarLabel: 'New chat',
                tabBarLabelStyle: [styles.tabLabel, styles.chatTabLabel],
                tabBarItemStyle: styles.chatTabItem,
                tabBarIconStyle: styles.chatTabIconWrap,
                tabBarActiveTintColor: '#ffffff',
                tabBarInactiveTintColor: '#ffffff',
              }}
            >
              {(props) => ChatSessionTabScreen(props.navigation)}
            </RootTabs.Screen>
            <RootTabs.Screen
              name="Notifications"
              options={{
                tabBarLabel: 'Notifications',
                tabBarBadge: notificationUnreadCount > 0 ? (notificationUnreadCount > 99 ? '99+' : notificationUnreadCount) : undefined,
              }}
            >
              {(props) => NotificationsTabScreen(props.navigation)}
            </RootTabs.Screen>
            <RootTabs.Screen name="Profile" options={{ tabBarLabel: 'Profile' }}>
              {(props) => ProfileTabScreen(props.navigation)}
            </RootTabs.Screen>
          </RootTabs.Navigator>
        </NavigationContainer>
      </View>

      <Modal animationType="slide" transparent visible={showLeaveFeedbackModal} onRequestClose={closeLeaveFeedbackModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={16}
          style={styles.modalKav}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalPanel}>
              <Text style={styles.modalTitle}>How was this session?</Text>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScrollContent}>
                <ActionCard
                  rating={feedbackRatingDraft}
                  onSetRating={setFeedbackRatingDraft}
                  comment={feedbackCommentDraft}
                  onChangeComment={setFeedbackCommentDraft}
                  focusCommentSignal={focusFeedbackSignal}
                  onFocusComment={() => undefined}
                  onSubmitRating={() => void handleSubmitRating()}
                  onMarkResolved={() => void handleCompleteSession(true)}
                  onNeedFollowUp={() => void handleCompleteSession(false)}
                  isSubmitting={isSubmittingRating}
                  onLayout={() => undefined}
                  inputProps={INPUT_PROPS}
                />
              </ScrollView>
              <View style={styles.modalActionRow}>
                <Pressable
                  style={styles.modalSecondaryButton}
                  onPress={closeLeaveFeedbackModal}
                >
                  <Text style={styles.modalSecondaryButtonText}>Stay on chat</Text>
                </Pressable>
                <Pressable
                  style={styles.modalPrimaryButton}
                  onPress={() => {
                    if (feedbackRatingDraft >= 1 && feedbackRatingDraft <= 5) {
                      void handleSubmitRating()
                      return
                    }

                    closeLeaveFeedbackModal()
                  }}
                >
                  <Text style={styles.modalPrimaryButtonText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safeAreaBlue: {
    backgroundColor: '#ffffff',
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#07111d',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#d6e4f0',
    fontSize: 16,
  },
  setupScrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  setupScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 28,
    paddingTop: 18,
    gap: 16,
  },
  loginBackground: {
    flex: 1,
  },
  loginOverlay: {
    backgroundColor: 'rgba(7,17,29,0.74)',
    flex: 1,
  },
  setupKeyboardWrap: {
    flex: 1,
  },
  loginShell: {
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  loginTitle: {
    color: '#f8fafc',
    fontSize: 33,
    fontWeight: '900',
    letterSpacing: 0.2,
    lineHeight: 40,
    marginBottom: 8,
    textShadowColor: 'rgba(2,6,23,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  loginSubtitle: {
    color: '#c7d2fe',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: '94%',
  },
  authStatusText: {
    color: '#dbeafe',
    fontSize: 12,
    paddingHorizontal: 6,
    textAlign: 'center',
    textShadowColor: 'rgba(2,6,23,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroPanel: {
    borderRadius: 28,
    padding: 24,
    overflow: 'hidden',
    minHeight: 220,
    justifyContent: 'flex-end',
  },
  heroOrbLarge: {
    position: 'absolute',
    top: -20,
    right: -8,
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroOrbSmall: {
    position: 'absolute',
    bottom: 52,
    left: -24,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroEyebrow: {
    color: '#cffafe',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  heroTitle: {
    color: '#f8fafc',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    marginBottom: 10,
  },
  heroCopy: {
    color: '#dbeafe',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: '92%',
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  authCardElevated: {
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 10,
  },
  cardTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
  },
  cardCopy: {
    color: '#42536a',
    fontSize: 14,
    lineHeight: 20,
  },
  authSectionLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  authDivider: {
    backgroundColor: '#e2e8f0',
    height: 1,
    marginVertical: 4,
  },
  input: {
    backgroundColor: '#edf4fa',
    borderRadius: 16,
    color: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2f5ff4',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
  },
  primaryButtonDisabled: {
    opacity: 0.76,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#c6d3e1',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#284053',
    fontSize: 14,
    fontWeight: '700',
  },
  metaText: {
    color: '#42536a',
    fontSize: 13,
  },
  statusText: {
    color: '#3f73ff',
    fontSize: 14,
    fontWeight: '700',
  },
  languageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  languageChip: {
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  languageChipActive: {
    backgroundColor: '#1e3a8a',
  },
  languageChipText: {
    color: '#284053',
    fontWeight: '700',
  },
  languageChipTextActive: {
    color: '#f8fafc',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modePill: {
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modePillActive: {
    backgroundColor: '#3f73ff',
  },
  modePillText: {
    color: '#284053',
    fontWeight: '700',
  },
  modePillTextActive: {
    color: '#f8fafc',
  },
  collapsibleHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  collapsibleHeaderText: {
    color: '#3f73ff',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  chatScreen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  navigationWrap: {
    flex: 1,
  },
  tabSafeArea: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  infoScrollContent: {
    flexGrow: 1,
    paddingBottom: 10,
    paddingTop: 0,
    backgroundColor: '#f0f4f8',
  },
  pageBackground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  pageBackgroundImage: {
    borderRadius: 0,
  },
  sessionHubPage: {
    backgroundColor: '#f0f4f8',
    flex: 1,
    marginTop: 0,
  },
  sessionHubBackground: {
    flex: 1,
    marginHorizontal: 0,
    minHeight: 0,
  },
  sessionHubBackgroundImage: {
    borderRadius: 0,
  },
  sessionHubOverlay: {
    backgroundColor: '#ffffff',
    paddingTop: 0,
    paddingBottom: 0,
  },
  sessionHubSurface: {
    backgroundColor: '#f0f4f8',
    marginTop: 0,
    paddingTop: 4,
    paddingBottom: 6,
    zIndex: 1,
  },
  sessionHubStartButton: {
    alignItems: 'center',
    backgroundColor: '#3f73ff',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginHorizontal: 14,
    marginBottom: 8,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  sessionHubStartButtonText: {
    color: '#dbe8ff',
    fontSize: 20,
    fontWeight: '800',
  },
  tabBar: {
    backgroundColor: '#2f5ff4',
    borderTopColor: '#2f5ff4',
    borderTopWidth: 0,
    height: 74,
    paddingBottom: 12,
    paddingTop: 8,
    elevation: 0,
  },
  tabBarBlue: {
    backgroundColor: '#2f5ff4',
    borderTopColor: '#2f5ff4',
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: -2,
  },
  chatTabLabel: {
    alignSelf: 'center',
    marginLeft: 0,
    textAlign: 'center',
    width: '100%',
  },
  chatTabItem: {
    marginTop: 0,
  },
  chatTabIconWrap: {
    width: 50,
    height: 50,
    marginTop: -24,
    borderRadius: 999,
    backgroundColor: '#2f5ff4',
    borderWidth: 3,
    borderColor: '#dbe8ff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 4,
  },
  analyticsScrollContent: {
    backgroundColor: '#f5f6fa',
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  analyticsHeaderWrap: {
    alignItems: 'center',
    backgroundColor: '#2f5ff4',
    flexDirection: 'row',
    gap: 12,
    minHeight: 94,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  analyticsAvatarWrap: {
    height: 44,
    position: 'relative',
    width: 44,
  },
  analyticsAvatar: {
    alignItems: 'center',
    backgroundColor: '#dbe8ff',
    borderColor: 'rgba(255,255,255,0.26)',
    borderRadius: 22,
    borderWidth: 2,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  analyticsAvatarText: {
    color: '#2f5ff4',
    fontSize: 14,
    fontWeight: '800',
  },
  analyticsAvatarDot: {
    backgroundColor: '#93b8ff',
    borderColor: '#2f5ff4',
    borderRadius: 6,
    borderWidth: 2,
    bottom: -1,
    height: 12,
    position: 'absolute',
    right: -1,
    width: 12,
  },
  analyticsHeaderTextWrap: {
    flex: 1,
  },
  analyticsHeaderGreeting: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    marginBottom: 2,
  },
  analyticsHeaderName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  analyticsHeaderIcons: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  analyticsHeaderIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    position: 'relative',
    width: 28,
  },
  analyticsHeaderNotifDot: {
    backgroundColor: '#ef4444',
    borderColor: '#2f5ff4',
    borderRadius: 4,
    borderWidth: 1,
    height: 8,
    position: 'absolute',
    right: 4,
    top: 4,
    width: 8,
  },
  analyticsTitle: {
    color: '#1a1a2e',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 2,
  },
  analyticsSubtitle: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 10,
  },
  analyticsPeriodGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  analyticsPeriodButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#bfc3c8',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  analyticsPeriodButtonActive: {
    backgroundColor: '#eaf0ff',
    borderColor: '#93b8ff',
  },
  analyticsPeriodButtonText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
    textAlign: 'center',
  },
  analyticsPeriodButtonTextActive: {
    color: '#0f172a',
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  analyticsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    minHeight: 192,
    overflow: 'hidden',
    paddingHorizontal: 11,
    paddingTop: 11,
    paddingBottom: 9,
    width: '48.5%',
  },
  analyticsCardAccent: {
    backgroundColor: '#2f5ff4',
  },
  analyticsCardLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  analyticsCardIconCircle: {
    alignItems: 'center',
    backgroundColor: '#eaf0ff',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  analyticsCardIconCircleAccent: {
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  analyticsCardIconCircleWarn: {
    backgroundColor: '#fdeccf',
  },
  analyticsCardIconCircleBlue: {
    backgroundColor: '#dbeafe',
  },
  analyticsCardLabel: {
    color: '#999999',
    fontSize: 10,
    fontWeight: '700',
  },
  analyticsCardLabelAccent: {
    color: 'rgba(255,255,255,0.7)',
  },
  analyticsCardValue: {
    color: '#1a1a2e',
    fontSize: 38,
    fontWeight: '500',
    letterSpacing: -1,
    lineHeight: 40,
    marginTop: 2,
  },
  analyticsCardValueAccent: {
    color: '#ffffff',
    fontSize: 32,
  },
  analyticsCardValueSmall: {
    fontSize: 34,
    lineHeight: 36,
  },
  analyticsCardUnit: {
    color: '#aaaaaa',
    fontSize: 11,
    marginTop: 1,
  },
  analyticsCardUnitAccent: {
    color: 'rgba(255,255,255,0.65)',
  },
  analyticsReferenceLine: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 1,
  },
  analyticsBarsRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
    height: 48,
    marginTop: 6,
    width: '100%',
  },
  analyticsBar: {
    backgroundColor: '#93b8ff',
    borderRadius: 3,
    flex: 1,
    minHeight: 8,
  },
  analyticsBarMuted: {
    backgroundColor: '#e8eceb',
  },
  analyticsBarActive: {
    backgroundColor: '#2f5ff4',
  },
  analyticsWaveRow: {
    height: 36,
    marginTop: 6,
    position: 'relative',
    width: '100%',
  },
  analyticsWaveRowTall: {
    height: 44,
    marginTop: 6,
    position: 'relative',
    width: '100%',
  },
  analyticsLineCanvas: {
    height: '100%',
    position: 'absolute',
    width: '100%',
  },
  analyticsLineSegment: {
    borderRadius: 1.5,
    height: 2,
    position: 'absolute',
  },
  analyticsLineSegmentAccent: {
    backgroundColor: 'rgba(150, 245, 207, 0.9)',
  },
  analyticsLineSegmentOpen: {
    backgroundColor: '#3f73ff',
  },
  analyticsLinePoint: {
    borderRadius: 2.5,
    height: 5,
    position: 'absolute',
    width: 5,
  },
  analyticsLinePointAccent: {
    backgroundColor: '#ffffff',
  },
  analyticsLinePointOpen: {
    backgroundColor: '#4f83ff',
    borderColor: '#f5f6fa',
    borderWidth: 1,
  },
  analyticsBarsTallRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
    height: 48,
    marginTop: 6,
    width: '100%',
  },
  analyticsTallBar: {
    backgroundColor: '#cde2f7',
    borderRadius: 3,
    flex: 1,
    minHeight: 8,
  },
  analyticsTallBarActive: {
    backgroundColor: '#2f5ff4',
  },
  analyticsTallBarMuted: {
    backgroundColor: '#dbe8ff',
  },
  analyticsCardTrend: {
    alignSelf: 'flex-start',
    backgroundColor: '#eaf0ff',
    borderRadius: 20,
    color: '#2f5ff4',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    minHeight: 22,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  analyticsCardTrendAccent: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#ffffff',
  },
  analyticsCardTrendWarn: {
    backgroundColor: '#eaf0ff',
    color: '#2f5ff4',
  },
  analyticsTicketStatsCard: {
    borderRadius: 16,
    marginTop: 8,
    minHeight: 152,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 9,
    position: 'relative',
  },
  analyticsTicketStatsGlowOne: {
    backgroundColor: 'rgba(122, 165, 255, 0.24)',
    borderRadius: 999,
    height: 130,
    position: 'absolute',
    right: -70,
    top: -60,
    width: 130,
  },
  analyticsTicketStatsGlowTwo: {
    backgroundColor: 'rgba(173, 201, 255, 0.18)',
    borderRadius: 999,
    height: 90,
    left: -50,
    position: 'absolute',
    top: 28,
    width: 90,
  },
  analyticsTicketStatsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  analyticsTicketStatsTitle: {
    color: '#f8fbff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  analyticsTicketStatsPeriodPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  analyticsTicketStatsPeriodText: {
    color: '#dbe8ff',
    fontSize: 9,
    fontWeight: '600',
  },
  analyticsTicketStatsBody: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 4,
  },
  analyticsDonutWrap: {
    alignItems: 'center',
    height: 150,
    justifyContent: 'center',
    position: 'relative',
    width: 182,
  },
  analyticsDonutRing: {
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.32)',
    borderRadius: 63,
    borderWidth: 8,
    height: 126,
    justifyContent: 'center',
    marginLeft: 0,
    width: 126,
  },
  analyticsDonutArcPrimary: {
    borderColor: 'transparent',
    borderLeftColor: '#facc15',
    borderRadius: 63,
    borderTopColor: '#facc15',
    borderWidth: 8,
    height: 126,
    left: -8,
    position: 'absolute',
    top: -8,
    transform: [{ rotate: '42deg' }],
    width: 126,
  },
  analyticsDonutArcSecondary: {
    borderColor: 'transparent',
    borderRadius: 63,
    borderRightColor: '#22c55e',
    borderTopColor: '#22c55e',
    borderWidth: 8,
    height: 126,
    left: -8,
    position: 'absolute',
    top: -8,
    transform: [{ rotate: '-10deg' }],
    width: 126,
  },
  analyticsDonutArcTertiary: {
    borderBottomColor: '#ffffff',
    borderColor: 'transparent',
    borderRadius: 63,
    borderLeftColor: '#ffffff',
    borderWidth: 8,
    height: 126,
    left: -8,
    position: 'absolute',
    top: -8,
    transform: [{ rotate: '208deg' }],
    width: 126,
  },
  analyticsDonutCenter: {
    alignItems: 'center',
    backgroundColor: 'rgba(30, 58, 138, 0.94)',
    borderRadius: 39,
    height: 78,
    justifyContent: 'center',
    width: 78,
  },
  analyticsDonutCenterText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  analyticsDonutBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(30, 58, 138, 0.72)',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    width: 24,
  },
  analyticsDonutBadgeLeft: {
    left: 18,
    top: 22,
  },
  analyticsDonutBadgeRight: {
    left: 160,
    top: 68,
  },
  analyticsDonutBadgeText: {
    color: '#f8fafc',
    fontSize: 9,
    fontWeight: '700',
  },
  analyticsTicketStatsLegend: {
    alignItems: 'center',
    gap: 5,
    justifyContent: 'center',
    marginLeft: 0,
    width: 122,
  },
  analyticsLegendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minWidth: 116,
  },
  analyticsLegendTextWrap: {
    alignItems: 'center',
    minWidth: 56,
  },
  analyticsLegendIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  analyticsLegendIconOpen: {
    backgroundColor: 'rgba(250, 204, 21, 0.22)',
  },
  analyticsLegendIconResolved: {
    backgroundColor: 'rgba(34, 197, 94, 0.22)',
  },
  analyticsLegendIconTotal: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  analyticsLegendLabel: {
    color: 'rgba(236, 243, 255, 0.76)',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  analyticsLegendValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  analyticsLegendMeta: {
    color: 'rgba(236, 243, 255, 0.76)',
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  analyticsTicketMixRow: {
    borderRadius: 999,
    flexDirection: 'row',
    gap: 3,
    height: 6,
    marginTop: 6,
    overflow: 'hidden',
  },
  analyticsTicketMixSegment: {
    borderRadius: 999,
    height: '100%',
  },
  analyticsRecentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  analyticsRecentTitle: {
    color: '#1a1a2e',
    fontSize: 14,
    fontWeight: '600',
  },
  analyticsSeeAll: {
    color: '#2f5ff4',
    fontSize: 11,
    fontWeight: '600',
  },
  analyticsRecentList: {
    gap: 8,
  },
  analyticsRecentItem: {
    backgroundColor: '#ffffff',
    borderRadius: 11,
    borderColor: 'rgba(0,0,0,0.06)',
    borderWidth: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  analyticsRecentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eaf0ff',
  },
  analyticsRecentAvatarText: {
    color: '#2f5ff4',
    fontSize: 11,
    fontWeight: '700',
  },
  analyticsRecentBody: {
    flex: 1,
    minWidth: 0,
  },
  analyticsRecentName: {
    color: '#1a1a2e',
    fontSize: 12,
    fontWeight: '600',
  },
  analyticsRecentMeta: {
    color: '#2f5ff4',
    fontSize: 10,
    marginTop: 2,
  },
  analyticsRecentRight: {
    alignItems: 'flex-end',
  },
  analyticsRecentStatus: {
    color: '#2f5ff4',
    fontSize: 10,
    fontWeight: '600',
  },
  analyticsRecentTime: {
    color: '#999999',
    fontSize: 10,
    marginTop: 2,
  },
  analyticsRecentEmpty: {
    backgroundColor: '#ffffff',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  analyticsRecentEmptyText: {
    color: '#64748b',
    fontSize: 12,
  },
  notificationsScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
  },
  notificationsHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationsTitle: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
  },
  notificationsMarkAllButton: {
    backgroundColor: '#e0f2fe',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  notificationsMarkAllButtonDisabled: {
    opacity: 0.5,
  },
  notificationsMarkAllText: {
    color: '#075985',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  notificationsEmptyCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  notificationsEmptyTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  notificationsEmptyCopy: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
  },
  notificationItemCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe5ef',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  notificationItemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  notificationItemTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    marginRight: 10,
  },
  notificationItemBadge: {
    alignItems: 'center',
    backgroundColor: '#3f73ff',
    borderRadius: 999,
    justifyContent: 'center',
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  notificationItemBadgeText: {
    color: '#dbe8ff',
    fontSize: 11,
    fontWeight: '800',
  },
  notificationItemDescription: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 18,
  },
  talkToAgentCard: {
    backgroundColor: '#2f5ff4',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    marginHorizontal: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  talkToAgentTitle: {
    color: '#0f172a',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 2,
  },
  talkToAgentCopy: {
    color: '#1f2937',
    fontSize: 10,
    lineHeight: 12,
    marginBottom: 6,
  },
  talkToAgentButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 14,
  },
  talkToAgentButtonText: {
    color: '#dbe8ff',
    fontSize: 13,
    fontWeight: '800',
  },
  chatHeader: {
    marginBottom: 0,
    paddingHorizontal: 18,
    paddingBottom: 3,
    paddingTop: 1.5,
    minHeight: 29,
    backgroundColor: '#2f5ff4',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
  },
  chatHeaderImage: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  chatHeaderOverlay: {
    backgroundColor: 'rgba(8,113,170,0.3)',
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    marginHorizontal: -18,
    marginTop: -1.5,
    paddingHorizontal: 18,
    paddingTop: 1.5,
    paddingBottom: 3,
  },
  locationPanelWrap: {
    backgroundColor: '#f8fafc',
    borderColor: '#dbe5ef',
    borderWidth: 1,
    borderRadius: 16,
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 8,
    padding: 12,
    gap: 10,
  },
  locationPanelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  locationPanelTitleWrap: {
    flex: 1,
  },
  locationPanelTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  locationPanelSubtitle: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 16,
  },
  locationPanelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationPanelIconButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTypeRow: {
    gap: 8,
  },
  locationTypeChip: {
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  locationTypeChipActive: {
    backgroundColor: '#3f73ff',
  },
  locationTypeChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  locationTypeChipTextActive: {
    color: '#dbe8ff',
  },
  locationEmptyState: {
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  locationEmptyTitle: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 18,
  },
  locationPrimaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#3f73ff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  locationPrimaryButtonText: {
    color: '#f0fdfa',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  locationLoadingWrap: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationEmptyCopy: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 4,
  },
  locationCardRow: {
    gap: 10,
    paddingRight: 4,
  },
  locationCard: {
    width: 245,
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 5,
  },
  locationCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationCardIcon: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbe8ff',
  },
  locationCardTitle: {
    flex: 1,
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
  },
  locationCardDistance: {
    color: '#3f73ff',
    fontSize: 12,
    fontWeight: '700',
  },
  locationCardMeta: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 15,
  },
  locationErrorText: {
    color: '#b91c1c',
    fontSize: 12,
    lineHeight: 16,
  },
  chatSubHeaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginLeft: 0,
    marginRight: 16,
    marginBottom: 10,
    marginTop: 10,
    paddingLeft: 0,
    paddingRight: 14,
    paddingVertical: 12,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  chatTopBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  chatBackIconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  chatTopBarCenter: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginLeft: 4,
    marginRight: 0,
  },
  chatTopBarAvatar: {
    alignItems: 'center',
    backgroundColor: '#ffe4ea',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    marginRight: 8,
    width: 36,
  },
  chatTopBarTitle: {
    color: '#0f172a',
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  chatSubHeaderLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  chatSubHeaderValue: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chatHeaderTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  chatHeaderTitleWrap: {
    flex: 1,
    paddingRight: 12,
  },
  chatHeaderEyebrow: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  chatHeaderTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
  },
  secondaryHeaderButton: {
    borderColor: 'rgba(248,250,252,0.2)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryHeaderButtonText: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  headerCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
  },
  headerCardLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sessionStrip: {
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sessionStripText: {
    color: '#1e293b',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  sessionActionButton: {
    backgroundColor: '#2f5ff4',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sessionActionButtonText: {
    color: '#f8fafc',
    fontWeight: '800',
  },
  providerPanel: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 16,
    padding: 16,
  },
  providerPanelTitle: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  providerRow: {
    gap: 8,
  },
  providerChip: {
    backgroundColor: '#e2e8f0',
    borderColor: '#d4dee8',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  providerChipActive: {
    backgroundColor: '#2f5ff4',
    borderColor: '#2f5ff4',
  },
  providerChipText: {
    color: '#1e293b',
    fontSize: 12,
    fontWeight: '700',
  },
  providerChipTextActive: {
    color: '#f8fafc',
  },
  quickActionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 16,
    padding: 16,
  },
  quickActionTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionButton: {
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    borderColor: '#bae6fd',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 64,
    paddingHorizontal: 10,
    width: '48%',
  },
  quickActionButtonText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  sessionSectionHeaderWrap: {
    marginHorizontal: 20,
    marginBottom: 2,
    marginTop: -2,
  },
  sessionSectionHeaderText: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sessionTabsWrap: {
    marginBottom: 12,
  },
  sessionTabsRow: {
    gap: 10,
    paddingHorizontal: 16,
  },
  sessionTab: {
    backgroundColor: '#d8e3ed',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  sessionTabActive: {
    backgroundColor: '#3f73ff',
  },
  sessionTabLabel: {
    color: '#34475a',
    fontSize: 12,
    fontWeight: '700',
  },
  sessionTabLabelActive: {
    color: '#f8fafc',
  },
  loadingMessagesWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    paddingHorizontal: 18,
  },
  loadingMessagesText: {
    color: '#42536a',
  },
  actionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
  },
  feedbackTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  ratingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingChip: {
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ratingChipActive: {
    backgroundColor: '#1e3a8a',
  },
  ratingChipText: {
    color: '#334155',
    fontWeight: '700',
  },
  ratingChipTextActive: {
    color: '#f8fafc',
  },
  feedbackInput: {
    maxHeight: 96,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  feedbackActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  feedbackSecondaryButton: {
    alignItems: 'center',
    backgroundColor: '#dbe5ef',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  feedbackSecondaryButtonText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  feedbackPrimaryButton: {
    alignItems: 'center',
    backgroundColor: '#3f73ff',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  feedbackPrimaryButtonText: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  followUpButton: {
    alignItems: 'center',
    borderColor: '#cbd5e1',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
  },
  followUpButtonText: {
    color: '#334155',
    fontWeight: '700',
  },
  chatCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    height: 460,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  chatCardExpanded: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    flex: 1,
    marginBottom: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  inputToolbar: {
    borderTopColor: '#d4dee8',
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 2,
  },
  inputToolbarPrimary: {
    alignItems: 'center',
  },
  chatComposerInput: {
    backgroundColor: '#edf4fa',
    borderRadius: 16,
    color: '#0f172a',
    fontSize: 15,
    marginLeft: 4,
    marginRight: 8,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  sendButtonWrap: {
    justifyContent: 'center',
    marginBottom: 0,
    marginRight: 8,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#2f5ff4',
    borderRadius: 999,
    justifyContent: 'center',
    minWidth: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendButtonText: {
    color: '#f8fafc',
    fontWeight: '800',
  },
  messageMetaText: {
    color: '#42536a',
    fontSize: 11,
    marginLeft: 24,
    marginVertical: 4,
    marginTop: 4,
  },
  messageList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  chatContentWrap: {
    flex: 1,
    flexDirection: 'column',
  },
  messageListContent: {
    paddingBottom: 8,
    paddingTop: 6,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  messageBubbleMine: {
    backgroundColor: '#3f73ff',
    borderBottomRightRadius: 6,
  },
  messageBubbleOther: {
    backgroundColor: '#f8fafc',
    borderBottomLeftRadius: 6,
    borderColor: '#d9e5f0',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextMine: {
    color: '#f8fafc',
  },
  messageTextOther: {
    color: '#0f172a',
  },
  dateBadgeWrap: {
    alignItems: 'center',
    marginVertical: 6,
  },
  dateBadgeText: {
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  stickyInputContainer: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopColor: '#dbe5ef',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 0,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  stickyInputField: {
    backgroundColor: '#edf4fa',
    borderRadius: 20,
    color: '#0f172a',
    flex: 1,
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  stickySendButton: {
    alignItems: 'center',
    backgroundColor: '#3f73ff',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 72,
    paddingHorizontal: 14,
  },
  stickySendButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  stickySendButtonText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(15,23,42,0.5)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: 12,
  },
  modalPanel: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    maxHeight: '88%',
    paddingTop: 14,
    paddingBottom: 12,
  },
  modalKav: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 6,
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
    paddingHorizontal: 18,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  modalSecondaryButton: {
    alignItems: 'center',
    backgroundColor: '#dbe5ef',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  modalSecondaryButtonText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  modalPrimaryButton: {
    alignItems: 'center',
    backgroundColor: '#3f73ff',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  modalPrimaryButtonText: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    gap: 10,
  },
  profileCardBlue: {
    backgroundColor: '#eaf0ff',
  },
  profileTitle: {
    color: '#1e293b',
    fontSize: 20,
    fontWeight: '800',
  },
  profileTitleBlue: {
    color: '#1e3a8a',
  },
  profileCopy: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },
  profileCopyBlue: {
    color: '#2f4f9a',
  },
  profileFieldLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  providerSelectButton: {
    alignItems: 'center',
    backgroundColor: '#edf4fa',
    borderColor: '#dbe5ef',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  providerSelectButtonBlue: {
    backgroundColor: '#dbe8ff',
    borderColor: '#93b8ff',
  },
  providerSelectText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  providerSelectTextBlue: {
    color: '#1e3a8a',
  },
  providerSelectPlaceholder: {
    color: '#64748b',
    fontWeight: '500',
  },
  providerSelectMenu: {
    backgroundColor: '#f8fafc',
    borderColor: '#dbe5ef',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 8,
  },
  providerSelectMenuBlue: {
    backgroundColor: '#eef4ff',
    borderColor: '#93b8ff',
  },
  providerSelectOption: {
    backgroundColor: '#edf4fa',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  providerSelectOptionActive: {
    backgroundColor: '#3f73ff',
  },
  providerSelectOptionText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  providerSelectOptionTextActive: {
    color: '#dbe8ff',
  },
  inputReadOnly: {
    color: '#64748b',
    backgroundColor: '#e2e8f0',
  },
  profileMeta: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },
  themeToggleRow: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#dbe5ef',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  themeToggleRowBlue: {
    backgroundColor: '#dbe8ff',
    borderColor: '#93b8ff',
  },
  themeToggleTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  themeToggleTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  themeToggleTitleBlue: {
    color: '#1e3a8a',
  },
  themeToggleCopy: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  themeToggleCopyBlue: {
    color: '#2f4f9a',
  },
})
