import { useMemo, useState } from 'react'
import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  Tooltip,
  Typography,
} from '@mui/material'
import { Notifications as NotificationsIcon } from '@mui/icons-material'
import type { AppNotification } from '../../services/notificationService'

interface NotificationBellProps {
  items: AppNotification[]
  unreadCount: number
  onOpenItem?: (item: AppNotification) => void
  onMarkAllRead?: () => void
  tooltip?: string
}

export default function NotificationBell({
  items,
  unreadCount,
  onOpenItem,
  onMarkAllRead,
  tooltip = 'Notifications',
}: NotificationBellProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    [items]
  )

  return (
    <>
      <Tooltip title={tooltip}>
        <IconButton color="inherit" onClick={(event) => setAnchorEl(event.currentTarget)}>
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 360, maxWidth: '90vw' } }}
      >
        <Box sx={{ px: 2, py: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" fontWeight={700}>Notifications</Typography>
          {onMarkAllRead && unreadCount > 0 && (
            <Button size="small" onClick={() => { onMarkAllRead(); setAnchorEl(null) }}>
              Mark all as read
            </Button>
          )}
        </Box>
        <Divider />

        {sortedItems.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">No new notifications.</Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {sortedItems.slice(0, 12).map((item) => (
              <ListItemButton
                key={item.id}
                onClick={() => {
                  onOpenItem?.(item)
                  setAnchorEl(null)
                }}
                sx={{ alignItems: 'flex-start' }}
              >
                <ListItemText
                  primary={<Typography variant="body2" fontWeight={600}>{item.title}</Typography>}
                  secondary={<Typography variant="caption" color="text.secondary">{item.description}</Typography>}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Menu>
    </>
  )
}
