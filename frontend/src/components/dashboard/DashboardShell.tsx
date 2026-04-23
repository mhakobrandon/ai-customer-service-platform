import { type ChangeEvent, type ReactNode } from 'react'
import { ChatBubble as ChatIcon, Search as SearchIcon } from '@mui/icons-material'
import './Dashboard.css'

export interface DashboardShellNavItem {
  id: string
  label: string
  icon: ReactNode
  active?: boolean
  onClick: () => void
}

export interface DashboardShellNavSection {
  id: string
  title: string
  items: DashboardShellNavItem[]
}

interface DashboardShellProps {
  roleClassName?: string
  brandLabel?: string
  brandIcon?: ReactNode
  sidebarSections: DashboardShellNavSection[]
  showTopbar?: boolean
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  topActions?: ReactNode
  userName: string
  userMeta: string
  userInitials: string
  onUserCardClick?: () => void
  alerts?: ReactNode
  children: ReactNode
}

export const toInitials = (name: string, fallback = 'US'): string => {
  const tokens = name
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)

  if (tokens.length === 0) {
    return fallback
  }

  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase()
  }

  return `${tokens[0][0]}${tokens[1][0]}`.toUpperCase()
}

export default function DashboardShell({
  roleClassName,
  brandLabel = 'Taur.ai',
  brandIcon,
  sidebarSections,
  showTopbar = true,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  topActions,
  userName,
  userMeta,
  userInitials,
  onUserCardClick,
  alerts,
  children,
}: DashboardShellProps) {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value)
  }

  return (
    <div className={`customer-dashboard role-dashboard ${roleClassName || ''}`.trim()}>
      {alerts}

      <div className="shell">
        <aside className="sidebar">
          <div className="sb-logo">
            <div className="sb-dot">{brandIcon || <ChatIcon sx={{ fontSize: 13 }} />}</div>
            {brandLabel}
          </div>

          {sidebarSections.map((section) => (
            <div key={section.id}>
              <div className="sb-sec">{section.title}</div>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`sb-item${item.active ? ' on' : ''}`}
                  onClick={item.onClick}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          ))}

          <div className="sb-foot">
            <button type="button" className="u-row-btn" onClick={onUserCardClick}>
              <div className="u-row">
                <div className="u-av">{userInitials}</div>
                <div>
                  <div className="u-name">{userName}</div>
                  <div className="u-role">{userMeta}</div>
                </div>
              </div>
            </button>
          </div>
        </aside>

        <div className="main">
          {showTopbar && (
            <div className="topbar">
              <div className="srch">
                <SearchIcon sx={{ fontSize: 14 }} />
                <input
                  value={searchValue}
                  onChange={handleSearchChange}
                  placeholder={searchPlaceholder}
                  aria-label="Search dashboard"
                />
              </div>

              <div className="tb-r">{topActions}</div>
            </div>
          )}

          <div className="content">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}