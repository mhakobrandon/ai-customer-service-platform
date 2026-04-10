import { IconButton, Paper, Tooltip } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { useThemeMode } from '../../services/themeModeService'

export default function ThemeModeToggle() {
  const { mode, toggleMode } = useThemeMode()
  const theme = useTheme()

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 1400,
        borderRadius: '999px',
        backdropFilter: 'blur(14px)',
        border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.35 : 0.18)}`,
        backgroundColor:
          theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.72) : alpha('#ffffff', 0.78),
        transition: 'transform 180ms ease, box-shadow 180ms ease',
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 10px 26px rgba(2,6,23,0.45)'
            : '0 10px 24px rgba(15,23,42,0.15)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 14px 28px rgba(2,6,23,0.5)'
              : '0 14px 28px rgba(15,23,42,0.2)',
        },
      }}
    >
      <Tooltip title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
        <IconButton onClick={toggleMode} color="primary" size="large" aria-label="toggle theme mode">
          {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
        </IconButton>
      </Tooltip>
    </Paper>
  )
}
