/**
 * PageHeader — Brand-standard full-width page hero header.
 * Provides gradient background, page title, subtitle, and an optional
 * right-aligned action area (buttons etc.).
 */
import { Box, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Right-side content (buttons, chips, etc.) */
  actions?: ReactNode
  /** Bottom margin override (default 3). Pass 0 for viewport-height layouts. */
  mb?: number
  /** Compact layout for dense dashboard views. */
  compact?: boolean
  /** Render without card background, border, or shadow. */
  transparent?: boolean
}

export default function PageHeader({ title, subtitle, actions, mb = 3, compact = false, transparent = false }: PageHeaderProps) {
  const theme = useTheme()

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      flexDirection={{ xs: 'column', sm: 'row' }}
      gap={2}
      mb={mb}
      sx={{
        px: 3,
        py: compact ? 1.5 : 2.5,
        borderRadius: 3,
        background: transparent
          ? 'transparent'
          : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.14)}, ${alpha(theme.palette.secondary.main, 0.09)})`,
        border: transparent ? '1px solid transparent' : `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
        boxShadow: transparent
          ? 'none'
          : theme.palette.mode === 'dark'
            ? '0 12px 26px rgba(2, 6, 23, 0.35)'
            : '0 10px 24px rgba(15, 23, 42, 0.08)',
        position: 'relative',
        overflow: 'hidden',
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: transparent
            ? 'none'
            :
            theme.palette.mode === 'dark'
              ? 'radial-gradient(circle at 100% 0%, rgba(96,165,250,0.16), transparent 34%)'
              : 'radial-gradient(circle at 100% 0%, rgba(37,99,235,0.08), transparent 34%)',
          pointerEvents: 'none',
        },
      }}
    >
      <Box>
        <Typography variant={compact ? 'h5' : 'h4'} fontWeight={700} lineHeight={1.2}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant={compact ? 'body2' : 'body1'} color="text.secondary" mt={0.5}>
            {subtitle}
          </Typography>
        )}
      </Box>

      {actions && (
        <Box display="flex" flexWrap="wrap" gap={1.5} flexShrink={0}>
          {actions}
        </Box>
      )}
    </Box>
  )
}
