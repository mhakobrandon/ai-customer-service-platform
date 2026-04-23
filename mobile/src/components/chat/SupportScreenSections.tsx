import React, { useEffect, useRef } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { ChatSession, ProviderOption } from '../../services/api'

type TopHeaderProps = {
  userName: string
  onLocationPress: () => void
  isLocating?: boolean
  onLogout: () => void
}

type HeaderCardProps = {
  sessionLabel: string
  onNewSession: () => void
}

type ProviderContextCardProps = {
  providers: ProviderOption[]
  selectedProviderName: string
  onSelectProvider: (providerName: string, providerType: string) => void
}

type QuickActionGridProps = {
  prompts: string[]
  onPromptPress: (prompt: string) => void
}

type SessionTabsProps = {
  sessions: ChatSession[]
  activeSessionId: string | null
  onSelectSession: (sessionId: string) => void
}

type SessionHubStatsProps = {
  totalSessions: number
  activeSessions: number
  openTickets: number
  resolutionRate: string
}

type ActionCardProps = {
  rating: number
  onSetRating: (value: number) => void
  comment: string
  onChangeComment: (value: string) => void
  focusCommentSignal: number
  onFocusComment: () => void
  onSubmitRating: () => void
  onMarkResolved: () => void
  onNeedFollowUp: () => void
  isSubmitting: boolean
  onLayout: (y: number) => void
  inputProps: TextInputProps
}

function getProviderBrandPalette(providerName: string) {
  const key = providerName.toLowerCase()

  if (key.includes('eco')) {
    return { strong: '#2f5ff4', soft: '#eaf0ff', text: '#1e3a8a' }
  }

  if (key.includes('one')) {
    return { strong: '#3f73ff', soft: '#edf3ff', text: '#2246a3' }
  }

  if (key.includes('inn')) {
    return { strong: '#375bcf', soft: '#e8eeff', text: '#1d3f99' }
  }

  if (key.includes('cbz')) {
    return { strong: '#5b86ff', soft: '#eff3ff', text: '#2f4faa' }
  }

  return { strong: '#647fb8', soft: '#eef2fb', text: '#2f477f' }
}

function getTimeBasedGreeting(now = new Date()) {
  const hour = now.getHours()

  if (!Number.isFinite(hour) || hour < 0 || hour > 23) {
    return 'Hello'
  }

  if (hour >= 5 && hour < 12) {
    return 'Good morning'
  }

  if (hour >= 12 && hour < 17) {
    return 'Good afternoon'
  }

  if (hour >= 17 && hour < 22) {
    return 'Good evening'
  }

  return 'Hello'
}

function getUserInitials(rawName: string) {
  const normalized = rawName.trim()
  if (!normalized) {
    return '??'
  }

  const withoutEmailDomain = normalized.includes('@') ? normalized.split('@')[0] : normalized
  const parts = withoutEmailDomain.split(/[\s._-]+/).filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
  }

  const token = (parts[0] ?? '').replace(/[^a-zA-Z0-9]/g, '')
  if (!token) {
    return '??'
  }

  return token.slice(0, 2).toUpperCase()
}

export function TopHeader({ userName, onLocationPress, isLocating = false, onLogout }: TopHeaderProps) {
  const displayName = (userName || '').trim()
  const fallbackName = displayName || 'Customer'
  const firstNameSource = fallbackName.includes('@') ? fallbackName.split('@')[0] : fallbackName
  const firstName = firstNameSource.split(/[\s._-]+/).filter(Boolean)[0] || 'Customer'
  const initials = getUserInitials(fallbackName)
  const greeting = getTimeBasedGreeting()

  return (
    <LinearGradient
      colors={['#1e3a8a', '#2f5ff4', '#1e3a8a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.topHeaderShell}
    >
      <View pointerEvents="none" style={styles.headerBgRingLarge} />
      <View pointerEvents="none" style={styles.headerBgRingSmall} />
      <View style={styles.topHeaderRow}>
        <View style={styles.topHeaderLeft}>
          <View style={styles.avatarWrap}>
            <LinearGradient colors={['#3f73ff', '#2f5ff4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{initials}</Text>
            </LinearGradient>
            <View style={styles.avatarOnlineDot} />
          </View>
          <View style={styles.topHeaderTextWrap}>
            <Text style={styles.topHeaderHello}>{greeting}</Text>
            <Text numberOfLines={1} style={styles.topHeaderName}>{firstName}</Text>
          </View>
        </View>

        <View style={styles.topHeaderRight}>
          <Pressable onPress={onLocationPress} style={styles.locationButton} accessibilityLabel="Find nearby locations" hitSlop={12}>
            <View style={styles.headerActionDot} />
            {isLocating ? (
              <ActivityIndicator color="#f8fafc" size="small" />
            ) : (
              <Ionicons name="location-outline" size={18} color="#f8fafc" />
            )}
          </Pressable>
          <Pressable onPress={onLogout} style={styles.logoutButton} accessibilityLabel="Log out" hitSlop={12}>
            <Ionicons name="log-out-outline" size={18} color="#f8fafc" />
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  )
}

export function SessionHubStatsCard({ totalSessions, activeSessions, openTickets, resolutionRate }: SessionHubStatsProps) {
  return (
    <LinearGradient colors={['#3f73ff', '#2f5ff4', '#1e3a8a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statsCard}>
      <View pointerEvents="none" style={styles.statsGlassPanel} />
      <View pointerEvents="none" style={styles.statsGlowBlobOne} />
      <View pointerEvents="none" style={styles.statsGlowBlobTwo} />
      <View pointerEvents="none" style={styles.statsShimmer} />
      <View pointerEvents="none" style={styles.statsCurveWrap}>
        <View style={styles.statsCurveOne} />
        <View style={styles.statsCurveTwo} />
        <View style={styles.statsCurveThree} />
      </View>

      <View style={styles.statsTopRow}>
        <View>
          <Text style={styles.statsLabel}>AI Customer Service</Text>
          <Text style={styles.statsSubLabel}>Real-time support performance</Text>
          <Text style={styles.statsValue}>{totalSessions} sessions</Text>
        </View>
        <View style={styles.statsLiveBadge}>
          <View style={styles.statsLiveDot} />
          <Text style={styles.statsLiveText}>LIVE</Text>
        </View>
      </View>

      <View style={styles.statsActionRow}>
        <View style={styles.statsActionItem}>
          <View style={styles.statsActionIconWrap}>
            <Ionicons color="#ffffff" name="chatbubble-outline" size={14} />
          </View>
          <Text style={styles.statsActionLabel}>Active</Text>
          <Text style={styles.statsActionValue}>{activeSessions}</Text>
        </View>
        <View style={styles.statsActionItem}>
          <View style={styles.statsActionIconWrap}>
            <Ionicons color="#ffffff" name="time-outline" size={14} />
          </View>
          <Text style={styles.statsActionLabel}>Sessions</Text>
          <Text style={styles.statsActionValue}>{totalSessions}</Text>
        </View>
        <View style={styles.statsActionItem}>
          <View style={styles.statsActionIconWrap}>
            <Ionicons color="#ffffff" name="refresh-outline" size={14} />
          </View>
          <Text style={styles.statsActionLabel}>Tickets</Text>
          <Text style={styles.statsActionValue}>{openTickets}</Text>
        </View>
        <View style={styles.statsActionItem}>
          <View style={styles.statsActionIconWrap}>
            <Ionicons color="#ffffff" name="stats-chart-outline" size={14} />
          </View>
          <Text style={styles.statsActionLabel}>Rate</Text>
          <Text style={styles.statsActionValue}>{resolutionRate}</Text>
        </View>
      </View>

      <View pointerEvents="none" style={styles.statsSparklineRow}>
        <View style={[styles.statsSparklineBar, { height: `${Math.max(24, Math.min(100, activeSessions * 8))}%` }]} />
        <View style={[styles.statsSparklineBar, styles.statsSparklineBarMuted, { height: `${Math.max(20, Math.min(92, openTickets * 7))}%` }]} />
        <View style={[styles.statsSparklineBar, { height: `${Math.max(28, Math.min(100, totalSessions * 3.5))}%` }]} />
        <View style={[styles.statsSparklineBar, styles.statsSparklineBarBright, { height: `${Math.max(26, Number.parseFloat(resolutionRate) || 26)}%` }]} />
      </View>

      <View pointerEvents="none" style={styles.cardDotsRow}>
        <View style={[styles.cardDot, styles.cardDotActive]} />
        <View style={styles.cardDot} />
        <View style={styles.cardDot} />
        <View style={styles.cardDot} />
      </View>
    </LinearGradient>
  )
}

export function HeaderCard({ sessionLabel, onNewSession }: HeaderCardProps) {
  return (
    <View style={styles.headerCard}>
      <Text style={styles.headerCardLabel}>Active session</Text>
      <View style={styles.sessionStrip}>
        <Text ellipsizeMode="middle" numberOfLines={1} style={styles.sessionStripText}>
          {sessionLabel}
        </Text>
        <Pressable onPress={onNewSession} style={styles.sessionActionButton}>
          <Ionicons color="#4b5563" name="chevron-forward" size={18} />
        </Pressable>
      </View>
    </View>
  )
}

export function ProviderContextCard({ providers, selectedProviderName, onSelectProvider }: ProviderContextCardProps) {
  if (providers.length === 0) {
    return null
  }

  return (
    <View style={styles.providerPanel}>
      <View style={styles.providerPanelHeader}>
        <Text style={styles.providerPanelTitle}>Providers Status</Text>
        <Text style={styles.providerSeeAll}>See all</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providerRow}>
        {providers.map((option) => {
          const active = selectedProviderName === option.provider
          const brand = getProviderBrandPalette(option.provider)
          return (
              <Pressable
                key={option.provider}
                onPress={() => onSelectProvider(option.provider, option.type)}
                style={[
                  styles.providerChip,
                  {
                    backgroundColor: brand.strong,
                    borderColor: brand.strong,
                  },
                  active && styles.providerChipActive,
                ]}
              >
                <Text style={[styles.providerChipText, active && styles.providerChipTextActive]}>{option.provider}</Text>
              </Pressable>
            )
        })}
      </ScrollView>
    </View>
  )
}

export function QuickActionGrid({ prompts, onPromptPress }: QuickActionGridProps) {
  const getPromptDisplay = (prompt: string) => {
    const lower = prompt.toLowerCase()
    if (lower.includes('balance')) {
      return { label: 'Wallet', icon: 'wallet-outline' as const, tone: 'teal' as const }
    }
    if (lower.includes('dispute')) {
      return { label: 'Transaction', icon: 'card-outline' as const, tone: 'blue' as const }
    }
    if (lower.includes('atm')) {
      return { label: 'ATM', icon: 'business-outline' as const, tone: 'purple' as const }
    }
    if (lower.includes('pin')) {
      return { label: 'PIN reset', icon: 'id-card-outline' as const, tone: 'amber' as const }
    }
    return { label: prompt, icon: 'chatbubble-outline' as const, tone: 'blue' as const }
  }

  return (
    <View style={styles.quickActionCard}>
      <Text style={styles.quickActionTitle}>Chat shortcuts</Text>
      <View style={styles.quickActionGrid}>
        {prompts.map((prompt) => {
          const { label, icon, tone } = getPromptDisplay(prompt)
          const toneStyle =
            tone === 'teal'
              ? styles.quickActionIconBoxTeal
              : tone === 'purple'
                ? styles.quickActionIconBoxPurple
                : tone === 'amber'
                  ? styles.quickActionIconBoxAmber
                  : styles.quickActionIconBoxBlue
          const iconColor =
            tone === 'teal' ? '#2f5ff4' : tone === 'purple' ? '#3f73ff' : tone === 'amber' ? '#1e3a8a' : '#2f5ff4'
          return (
            <Pressable key={prompt} onPress={() => onPromptPress(prompt)} style={styles.quickActionButton}>
              <View style={[styles.quickActionIconBox, toneStyle]}>
                <Ionicons color={iconColor} name={icon} size={18} />
              </View>
              <Text numberOfLines={1} style={styles.quickActionButtonText}>{label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export function SessionTabs({ sessions, activeSessionId, onSelectSession }: SessionTabsProps) {
  return (
    <View style={styles.sessionTabsWrap}>
      <Text style={styles.sessionTabsTitle}>Recent sessions</Text>
      <ScrollView
        style={styles.sessionTabsScroll}
        contentContainerStyle={styles.sessionTabsList}
        showsVerticalScrollIndicator={false}
      >
        {sessions.map((session, index) => {
          const active = session.session_id === activeSessionId
          const displayId = session.session_id.length > 9 ? `...${session.session_id.slice(-4)}` : session.session_id
          const avatarTone = active ? styles.sessionAvatarActive : index % 3 === 2 ? styles.sessionAvatarWarning : styles.sessionAvatarInactive
          return (
            <Pressable
              key={session.session_id}
              onPress={() => onSelectSession(session.session_id)}
              style={[styles.sessionTab, active && styles.sessionTabActive]}
            >
              <View style={[styles.sessionAvatar, avatarTone]}>
                <Text style={styles.sessionAvatarText}>{displayId.replace('...', '').slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={styles.sessionTabBody}>
                <Text numberOfLines={1} style={[styles.sessionTabTitle, active && styles.sessionTabLabelActive]}>
                  Session {displayId}
                </Text>
                <Text numberOfLines={1} style={styles.sessionTabSubtitle}>
                  {session.last_message || 'Tap to continue conversation'}
                </Text>
              </View>
              <View style={[styles.sessionStatusPill, active && styles.sessionStatusPillActive]}>
                <Text style={[styles.sessionStatusText, active && styles.sessionStatusTextActive]}>
                  {active ? 'ACTIVE' : 'OPEN'}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

export function ActionCard({
  rating,
  onSetRating,
  comment,
  onChangeComment,
  focusCommentSignal,
  onFocusComment,
  onSubmitRating,
  onMarkResolved,
  onNeedFollowUp,
  isSubmitting,
  onLayout,
  inputProps,
}: ActionCardProps) {
  const commentInputRef = useRef<TextInput | null>(null)

  useEffect(() => {
    if (focusCommentSignal < 1) {
      return
    }

    const timer = setTimeout(() => {
      commentInputRef.current?.focus()
    }, 120)

    return () => clearTimeout(timer)
  }, [focusCommentSignal])

  return (
    <View style={styles.actionCard} onLayout={(event) => onLayout(event.nativeEvent.layout.y)}>
      <Text style={styles.feedbackTitle}>How was this session?</Text>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((value) => {
          const active = value <= rating
          return (
            <Pressable key={value} onPress={() => onSetRating(value)} style={[styles.ratingChip, active && styles.ratingChipActive]}>
              <Text style={[styles.ratingChipText, active && styles.ratingChipTextActive]}>★ {value}</Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        ref={commentInputRef}
        {...inputProps}
        multiline
        onFocus={onFocusComment}
        onChangeText={onChangeComment}
        placeholder="Optional feedback for support"
        style={[styles.input, styles.feedbackInput]}
        value={comment}
      />
      <View style={styles.feedbackActionRow}>
        <Pressable onPress={onSubmitRating} style={styles.feedbackSecondaryButton}>
          {isSubmitting ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.feedbackSecondaryButtonText}>Save feedback</Text>}
        </Pressable>
        <Pressable onPress={onMarkResolved} style={styles.feedbackPrimaryButton}>
          <Text style={styles.feedbackPrimaryButtonText}>Mark resolved</Text>
        </Pressable>
      </View>
      <Pressable onPress={onNeedFollowUp} style={styles.followUpButton}>
        <Text style={styles.followUpButtonText}>Need follow-up</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  topHeaderShell: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  headerBgRingLarge: {
    position: 'absolute',
    right: -40,
    top: -50,
    width: 200,
    height: 200,
    borderRadius: 999,
    borderWidth: 40,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  headerBgRingSmall: {
    position: 'absolute',
    right: 30,
    top: 10,
    width: 80,
    height: 80,
    borderRadius: 999,
    borderWidth: 20,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  topHeaderTextWrap: {
    flex: 1,
    paddingRight: 4,
    marginLeft: 2,
  },
  topHeaderHello: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 12,
    fontWeight: '600',
  },
  topHeaderName: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 8,
  },
  profileAvatar: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.32)',
    borderRadius: 999,
    borderWidth: 2,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  profileAvatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  avatarOnlineDot: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#bbf7d0',
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderRadius: 999,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderRadius: 999,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
    position: 'relative',
  },
  headerActionDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#e24b4a',
    borderWidth: 1.5,
    borderColor: '#2f5ff4',
  },
  statsCard: {
    marginHorizontal: 14,
    marginTop: 0,
    marginBottom: 14,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    backgroundColor: '#3f73ff',
    shadowColor: '#0a3a34',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  statsGlassPanel: {
    ...StyleSheet.absoluteFillObject,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  statsGlowBlobOne: {
    backgroundColor: 'rgba(96, 129, 255, 0.22)',
    borderRadius: 999,
    height: 170,
    position: 'absolute',
    right: -80,
    top: -60,
    width: 170,
  },
  statsGlowBlobTwo: {
    backgroundColor: 'rgba(133, 163, 255, 0.16)',
    borderRadius: 999,
    height: 120,
    left: -60,
    position: 'absolute',
    top: 56,
    width: 120,
  },
  statsShimmer: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  statsCurveWrap: {
    position: 'absolute',
    right: -36,
    top: -28,
  },
  statsCurveOne: {
    width: 120,
    height: 120,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  statsCurveTwo: {
    width: 164,
    height: 164,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    position: 'absolute',
    top: -22,
    left: -22,
  },
  statsCurveThree: {
    width: 210,
    height: 210,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    position: 'absolute',
    top: -45,
    left: -45,
  },
  statsTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statsLabel: {
    color: 'rgba(228, 236, 255, 0.90)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  statsSubLabel: {
    color: 'rgba(219, 232, 255, 0.84)',
    fontSize: 11,
    marginBottom: 6,
  },
  statsValue: {
    color: '#ffffff',
    fontSize: 31,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statsLiveBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(30, 58, 138, 0.42)',
    borderColor: 'rgba(255,255,255,0.24)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statsLiveDot: {
    backgroundColor: '#22c55e',
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  statsLiveText: {
    color: '#eaf0ff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cardDotsRow: {
    position: 'absolute',
    left: 14,
    bottom: 10,
    flexDirection: 'row',
    gap: 5,
  },
  cardDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  cardDotActive: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  statsActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statsActionItem: {
    alignItems: 'center',
    width: '24%',
  },
  statsActionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    marginBottom: 4,
  },
  statsActionLabel: {
    color: 'rgba(228, 236, 255, 0.90)',
    fontSize: 11,
    fontWeight: '600',
  },
  statsActionValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  statsSparklineRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 6,
    height: 34,
    marginBottom: 4,
  },
  statsSparklineBar: {
    backgroundColor: 'rgba(255,255,255,0.46)',
    borderRadius: 3,
    flex: 1,
    minHeight: 8,
  },
  statsSparklineBarMuted: {
    backgroundColor: 'rgba(191, 219, 254, 0.32)',
  },
  statsSparklineBarBright: {
    backgroundColor: '#22d3ee',
  },
  headerCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#dbe5ef',
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 14,
    marginBottom: 8,
    padding: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  headerCardLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  sessionStrip: {
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sessionStripText: {
    color: '#111827',
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    marginRight: 10,
  },
  sessionActionButton: {
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  providerPanel: {
    backgroundColor: '#f0f4f8',
    borderRadius: 16,
    marginBottom: 10,
    marginHorizontal: 14,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  providerPanelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  providerPanelTitle: {
    color: '#1a1a2e',
    fontSize: 13,
    fontWeight: '500',
  },
  providerSeeAll: {
    color: '#2f5ff4',
    fontSize: 11,
    fontWeight: '600',
  },
  providerRow: {
    gap: 7,
    paddingBottom: 6,
    paddingRight: 0,
  },
  providerChip: {
    borderColor: 'transparent',
    borderRadius: 999,
    borderWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  providerChipActive: {
    transform: [{ translateY: -0.5 }],
  },
  providerChipText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '500',
  },
  providerChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(15,23,42,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  quickActionCard: {
    backgroundColor: '#f0f4f8',
    borderRadius: 16,
    marginBottom: 7,
    marginHorizontal: 14,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  quickActionTitle: {
    color: '#1a1a2e',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 12,
  },
  quickActionIconBox: {
    alignItems: 'center',
    borderRadius: 11,
    height: 38,
    justifyContent: 'center',
    marginBottom: 5,
    width: 38,
  },
  quickActionIconBoxTeal: {
    backgroundColor: '#eaf0ff',
  },
  quickActionIconBoxBlue: {
    backgroundColor: '#ddeef9',
  },
  quickActionIconBoxPurple: {
    backgroundColor: '#e3ecff',
  },
  quickActionIconBoxAmber: {
    backgroundColor: '#dbe8ff',
  },
  quickActionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0,0,0,0.06)',
    borderWidth: 0.5,
    borderRadius: 11,
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: 88,
    paddingHorizontal: 4,
    width: '24%',
  },
  quickActionButtonText: {
    color: '#555555',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
    textAlign: 'center',
  },
  sessionTabsWrap: {
    backgroundColor: '#f0f4f8',
    borderRadius: 16,
    marginBottom: 8,
    marginHorizontal: 14,
    paddingVertical: 12,
    paddingTop: 8,
  },
  sessionTabsTitle: {
    color: '#1a1a2e',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 10,
    paddingHorizontal: 14,
  },
  sessionTabsList: {
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 2,
  },
  sessionTabsScroll: {
    maxHeight: 216,
  },
  sessionTab: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0,0,0,0.06)',
    borderRadius: 11,
    borderWidth: 0.5,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sessionTabActive: {
    borderColor: '#2f5ff4',
    backgroundColor: '#ffffff',
  },
  sessionAvatar: {
    alignItems: 'center',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  sessionAvatarActive: {
    backgroundColor: '#eaf0ff',
  },
  sessionAvatarInactive: {
    backgroundColor: '#ddeef9',
  },
  sessionAvatarWarning: {
    backgroundColor: '#dbe8ff',
  },
  sessionAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2f5ff4',
  },
  sessionTabBody: {
    flex: 1,
    minWidth: 0,
  },
  sessionTabTitle: {
    color: '#1a1a2e',
    fontSize: 13,
    fontWeight: '500',
  },
  sessionTabSubtitle: {
    color: '#111827',
    fontSize: 11,
    marginTop: 2,
  },
  sessionStatusPill: {
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sessionStatusPillActive: {
    backgroundColor: '#eaf0ff',
  },
  sessionStatusText: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '500',
  },
  sessionStatusTextActive: {
    color: '#2f5ff4',
  },
  sessionTabLabel: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },
  sessionTabLabelActive: {
    color: '#111827',
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
  input: {
    backgroundColor: '#edf4fa',
    borderRadius: 16,
    color: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
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
})
