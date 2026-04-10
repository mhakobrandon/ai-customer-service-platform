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
    return { strong: '#00A1DE', soft: '#E6F6FC', text: '#007AA8' }
  }

  if (key.includes('one')) {
    return { strong: '#F58220', soft: '#FFF1E6', text: '#C85F09' }
  }

  if (key.includes('inn')) {
    return { strong: '#1E63B6', soft: '#EAF2FD', text: '#174C8D' }
  }

  if (key.includes('cbz')) {
    return { strong: '#CE1126', soft: '#FDEBED', text: '#9B0D1D' }
  }

  return { strong: '#64748b', soft: '#f1f5f9', text: '#334155' }
}

export function TopHeader({ userName, onLocationPress, isLocating = false, onLogout }: TopHeaderProps) {
  const firstName = (userName || 'Customer').trim().split(/\s+/)[0]
  const initials = (userName || 'CU')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <LinearGradient
      colors={["#0f8d72", "#10b981", "#0f766e"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.topHeaderShell}
    >
      <View style={styles.topHeaderRow}>
        <View style={styles.topHeaderLeft}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initials || 'CU'}</Text>
          </View>
          <View style={styles.topHeaderTextWrap}>
            <Text style={styles.topHeaderHello}>Hello,</Text>
            <Text numberOfLines={1} style={styles.topHeaderName}>{firstName}</Text>
          </View>
        </View>

        <View style={styles.topHeaderRight}>
          <Pressable onPress={onLocationPress} style={styles.locationButton} accessibilityLabel="Find nearby locations" hitSlop={12}>
            {isLocating ? (
              <ActivityIndicator color="#f8fafc" size="small" />
            ) : (
              <Ionicons name="location-outline" size={24} color="#f8fafc" />
            )}
          </Pressable>
          <Pressable onPress={onLogout} style={styles.logoutButton} accessibilityLabel="Log out" hitSlop={12}>
            <Ionicons name="log-out-outline" size={26} color="#f8fafc" />
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  )
}

export function SessionHubStatsCard({ totalSessions, activeSessions, openTickets, resolutionRate }: SessionHubStatsProps) {
  return (
    <View style={styles.statsCard}>
        <View style={styles.statsGridRow}>
          <View style={styles.statsCell}>
            <View style={styles.statsIconBubble}>
              <Ionicons color="#2563eb" name="refresh-circle" size={29} />
            </View>
            <Text style={styles.statsLabel}>Total sessions</Text>
            <Text style={styles.statsValue}>{totalSessions}</Text>
            <View pointerEvents="none" style={[styles.statsFullOverlay, styles.statsTopOverlayBlue]} />
          </View>

        <View style={styles.statsCell}>
          <View style={styles.statsIconBubble}>
            <Ionicons color="#10b981" name="chatbubble" size={28} />
          </View>
          <Text style={styles.statsLabel}>Active sessions</Text>
          <Text style={styles.statsValue}>{activeSessions}</Text>
          <View pointerEvents="none" style={[styles.statsFullOverlay, styles.statsTopOverlayGreen]} />
        </View>
      </View>

      <View style={[styles.statsGridRow, styles.statsGridRowLast]}>
        <View style={styles.statsCell}>
          <View style={styles.statsIconBubble}>
            <Ionicons color="#d97706" name="alert-circle" size={28} />
          </View>
          <Text style={styles.statsLabel}>Open tickets</Text>
          <Text style={styles.statsValue}>{openTickets}</Text>
          <View pointerEvents="none" style={[styles.statsFullOverlay, styles.statsTopOverlayOrange]} />
        </View>

        <View style={styles.statsCell}>
          <View style={styles.statsIconBubble}>
            <Ionicons color="#0284c7" name="star" size={28} />
          </View>
          <Text style={styles.statsLabel}>Resolution rate</Text>
          <Text style={styles.statsValue}>{resolutionRate}</Text>
          <View pointerEvents="none" style={[styles.statsFullOverlay, styles.statsTopOverlaySky]} />
        </View>
      </View>
    </View>
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
      return { label: 'Wallet', icon: 'wallet-outline' as const }
    }
    if (lower.includes('dispute')) {
      return { label: 'Transaction', icon: 'card-outline' as const }
    }
    if (lower.includes('atm')) {
      return { label: 'ATM', icon: 'business-outline' as const }
    }
    if (lower.includes('pin')) {
      return { label: 'PIN reset', icon: 'id-card-outline' as const }
    }
    return { label: prompt, icon: 'chatbubble-outline' as const }
  }

  return (
    <View style={styles.quickActionCard}>
      <Text style={styles.quickActionTitle}>Quick services</Text>
      <View style={styles.quickActionGrid}>
        {prompts.map((prompt) => {
          const { label, icon } = getPromptDisplay(prompt)
          return (
            <Pressable key={prompt} onPress={() => onPromptPress(prompt)} style={styles.quickActionButton}>
              <View style={styles.quickActionIconBox}>
                <Ionicons color="#2463ab" name={icon} size={20} />
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
        {sessions.map((session) => {
          const active = session.session_id === activeSessionId
          const displayId = session.session_id.length > 9 ? `...${session.session_id.slice(-4)}` : session.session_id
          return (
            <Pressable
              key={session.session_id}
              onPress={() => onSelectSession(session.session_id)}
              style={[styles.sessionTab, active && styles.sessionTabActive]}
            >
              <View style={styles.sessionTabIconWrap}>
                <Ionicons color="#2f7ec8" name="chatbubble-ellipses-outline" size={16} />
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
    borderBottomWidth: 2,
    borderBottomColor: '#d6f0e3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
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
  },
  topHeaderHello: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  topHeaderName: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  profileAvatar: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: 'rgba(15,23,42,0.08)',
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
    marginRight: 8,
  },
  profileAvatarText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  logoutButton: {
    backgroundColor: 'rgba(15,23,42,0.13)',
    borderRadius: 999,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButton: {
    backgroundColor: 'rgba(15,23,42,0.13)',
    borderRadius: 999,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  statsCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 13.36,
    borderWidth: 1,
    marginHorizontal: 14.72,
    marginBottom: 14.72,
    padding: 10.33,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3.09 },
    shadowOpacity: 0.05,
    shadowRadius: 8.30,
    elevation: 2.09,
  },
  statsGridRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statsGridRowLast: {
    marginBottom: 0,
  },
  statsCell: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 14.44,
    borderWidth: 1,
    flex: 1,
    minHeight: 52.11,
    paddingHorizontal: 12.23,
    paddingVertical: 8.30,
    paddingRight: 59.08,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  statsFullOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 14,
    zIndex: 3,
  },
  statsTopOverlayBlue: {
    backgroundColor: 'rgba(37,99,235,0.16)',
  },
  statsTopOverlayGreen: {
    backgroundColor: 'rgba(16,185,129,0.16)',
  },
  statsTopOverlayOrange: {
    backgroundColor: 'rgba(217,119,6,0.16)',
  },
  statsTopOverlaySky: {
    backgroundColor: 'rgba(2,132,199,0.16)',
  },
  statsCellHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  statsLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flex: 1,
  },
  statsIconBubble: {
    alignItems: 'center',
    backgroundColor: '#e7eefc',
    borderRadius: 999,
    height: 44,
    justifyContent: 'center',
    width: 44,
    position: 'absolute',
    right: 6,
    top: '50%',
    transform: [{ translateY: -22 }],
  },
  statsValue: {
    color: '#0f172a',
    fontSize: 29.51,
    fontWeight: '800',
    lineHeight: 34.61,
    marginTop: 8.30,
    paddingLeft: 2.09,
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
    backgroundColor: '#f8fafc',
    borderRadius: 0,
    marginBottom: 10,
    marginHorizontal: 14,
    paddingHorizontal: 14,
    paddingVertical: 0,
  },
  providerPanelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  providerPanelTitle: {
    color: '#1f2937',
    fontSize: 18,
    fontWeight: '700',
  },
  providerSeeAll: {
    color: '#35658f',
    fontSize: 13,
    fontWeight: '600',
  },
  providerRow: {
    gap: 7,
    paddingBottom: 6,
    paddingRight: 0,
  },
  providerChip: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  providerChipActive: {
    borderColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1.5,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    transform: [{ translateY: -1 }],
  },
  providerChipText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
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
    backgroundColor: '#f8fafc',
    borderRadius: 0,
    marginBottom: 7,
    marginHorizontal: 14,
    paddingHorizontal: 14,
    paddingVertical: 0,
  },
  quickActionTitle: {
    color: '#1f2937',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  quickActionIconBox: {
    alignItems: 'center',
    backgroundColor: '#e5eef8',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    marginBottom: 8,
    width: 52,
  },
  quickActionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: 94,
    paddingHorizontal: 4,
    width: '24%',
  },
  quickActionButtonText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 14,
    textAlign: 'center',
  },
  sessionTabsWrap: {
    backgroundColor: '#f8fafc',
    borderRadius: 0,
    marginBottom: 8,
    marginHorizontal: 14,
    paddingVertical: 12,
    paddingTop: 10,
  },
  sessionTabsTitle: {
    color: '#1f2937',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
    paddingHorizontal: 14,
  },
  sessionTabsList: {
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 2,
  },
  sessionTabsScroll: {
    maxHeight: 124,
  },
  sessionTab: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  sessionTabActive: {
    borderColor: '#cde5d6',
    backgroundColor: '#f8fffb',
  },
  sessionTabIconWrap: {
    alignItems: 'center',
    backgroundColor: '#eaf1fa',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  sessionTabBody: {
    flex: 1,
    minWidth: 0,
  },
  sessionTabTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  sessionTabSubtitle: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  sessionStatusPill: {
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sessionStatusPillActive: {
    backgroundColor: '#dcfce7',
  },
  sessionStatusText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  sessionStatusTextActive: {
    color: '#15803d',
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
    backgroundColor: '#164e63',
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
    backgroundColor: '#0f766e',
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
