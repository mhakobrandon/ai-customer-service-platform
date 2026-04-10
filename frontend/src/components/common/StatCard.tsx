/**
 * StatCard — Brand-standard KPI card
 * Dark mode: vibrant gradient background matching the color theme.
 * Light mode: clean subtle tint with border.
 */
import { Box, Card, CardContent, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import type { SvgIconComponent } from '@mui/icons-material'

interface StatCardProps {
  label: string
  value: string | number
  Icon: SvgIconComponent
  /** MUI palette color key */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
  /** Optional small badge text shown below value */
  badge?: string
}

const DARK_GRADIENTS: Record<string, string> = {
  primary:   'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
  secondary: 'linear-gradient(135deg, #701a75 0%, #c026d3 100%)',
  success:   'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
  warning:   'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
  error:     'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
  info:      'linear-gradient(135deg, #0c4a6e 0%, #0284c7 100%)',
}

export default function StatCard({ label, value, Icon, color = 'primary', badge }: StatCardProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const palette = theme.palette[color]

  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: isDark
          ? DARK_GRADIENTS[color]
          : `linear-gradient(135deg, ${alpha(palette.main, 0.08)} 0%, ${alpha(palette.light || palette.main, 0.03)} 100%)`,
        border: `1px solid ${isDark ? alpha(palette.light || palette.main, 0.28) : alpha(palette.main, 0.15)}`,
        boxShadow: isDark
          ? `0 4px 24px ${alpha(palette.main, 0.4)}`
          : `0 2px 12px ${alpha(palette.main, 0.12)}`,
        transition: 'transform 180ms ease, box-shadow 180ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: isDark
            ? `0 8px 32px ${alpha(palette.main, 0.55)}`
            : `0 4px 20px ${alpha(palette.main, 0.22)}`,
        },
      }}
    >
      {/* Decorative background circles */}
      <Box sx={{ position: 'absolute', right: -18, top: -18, width: 88, height: 88, borderRadius: '50%', background: alpha('#fff', isDark ? 0.07 : 0.5), pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', right: 28, bottom: -28, width: 56, height: 56, borderRadius: '50%', background: alpha('#fff', isDark ? 0.04 : 0.3), pointerEvents: 'none' }} />

      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, position: 'relative' }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Box flex={1} minWidth={0}>
            <Typography
              variant="caption"
              sx={{
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600,
                fontSize: '0.67rem',
                color: isDark ? 'rgba(255,255,255,0.65)' : 'text.secondary',
                display: 'block',
                mb: 0.75,
              }}
            >
              {label}
            </Typography>
            <Typography
              variant="h4"
              fontWeight={800}
              lineHeight={1.1}
              sx={{ color: isDark ? '#fff' : (palette.dark || palette.main) }}
            >
              {value}
            </Typography>
            {badge && (
              <Typography
                variant="caption"
                sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'text.secondary', display: 'block', mt: 0.5 }}
              >
                {badge}
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: 2.5,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isDark ? alpha('#fff', 0.15) : alpha(palette.main, 0.12),
              color: isDark ? '#fff' : palette.main,
            }}
          >
            <Icon sx={{ fontSize: 22 }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}
