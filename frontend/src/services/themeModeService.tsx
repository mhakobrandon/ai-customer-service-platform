import React, { createContext, useContext, useMemo, useState } from 'react'
import { CssBaseline } from '@mui/material'
import { ThemeProvider, createTheme, alpha } from '@mui/material/styles'

type ThemeMode = 'light' | 'dark'

interface ThemeModeContextType {
  mode: ThemeMode
  toggleMode: () => void
}

const STORAGE_KEY = 'ui_theme_mode'

const ThemeModeContext = createContext<ThemeModeContextType | undefined>(undefined)

const getInitialMode = (): ThemeMode => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') {
    return saved
  }
  return 'light'
}

const buildTheme = (mode: ThemeMode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'dark' ? '#60a5fa' : '#2563eb',
        dark: mode === 'dark' ? '#3b82f6' : '#1d4ed8',
        light: mode === 'dark' ? '#93c5fd' : '#60a5fa',
      },
      secondary: {
        main: mode === 'dark' ? '#f472b6' : '#db2777',
        dark: mode === 'dark' ? '#ec4899' : '#be185d',
        light: mode === 'dark' ? '#f9a8d4' : '#f472b6',
      },
      success: {
        main: mode === 'dark' ? '#34d399' : '#10b981',
      },
      warning: {
        main: mode === 'dark' ? '#fbbf24' : '#f59e0b',
      },
      error: {
        main: mode === 'dark' ? '#f87171' : '#ef4444',
      },
      info: {
        main: mode === 'dark' ? '#38bdf8' : '#0284c7',
      },
      background: {
        default: mode === 'dark' ? '#0f172a' : '#f8fafc',
        paper: mode === 'dark' ? '#111827' : '#ffffff',
      },
      divider: mode === 'dark' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(15, 23, 42, 0.08)',
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
      h4: {
        fontWeight: 700,
        letterSpacing: '-0.015em',
      },
      h5: {
        fontWeight: 700,
      },
      h6: {
        fontWeight: 600,
      },
      subtitle1: {
        fontWeight: 600,
      },
      subtitle2: {
        fontWeight: 600,
        letterSpacing: '0.01em',
      },
      button: {
        letterSpacing: '0.01em',
      },
      body2: {
        lineHeight: 1.6,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            transition: 'background-color 220ms ease, color 220ms ease',
            backgroundImage:
              mode === 'dark'
                ? 'radial-gradient(circle at 10% -20%, rgba(96,165,250,0.18), transparent 35%), radial-gradient(circle at 100% 0%, rgba(244,114,182,0.12), transparent 28%)'
                : 'radial-gradient(circle at 10% -20%, rgba(37,99,235,0.08), transparent 35%), radial-gradient(circle at 100% 0%, rgba(219,39,119,0.06), transparent 28%)',
          },
          '::selection': {
            backgroundColor: mode === 'dark' ? 'rgba(96,165,250,0.35)' : 'rgba(37,99,235,0.2)',
          },
          '*::-webkit-scrollbar': {
            width: '10px',
            height: '10px',
          },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: mode === 'dark' ? 'rgba(148,163,184,0.38)' : 'rgba(100,116,139,0.34)',
            borderRadius: '999px',
          },
          '*::-webkit-scrollbar-track': {
            backgroundColor: mode === 'dark' ? 'rgba(15,23,42,0.45)' : 'rgba(226,232,240,0.7)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            border: mode === 'dark' ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid rgba(15, 23, 42, 0.06)',
            backgroundImage: mode === 'dark' ? 'linear-gradient(180deg, rgba(30,41,59,0.45), rgba(17,24,39,0.8))' : 'none',
            transition: 'background-color 220ms ease, border-color 220ms ease, box-shadow 220ms ease',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: mode === 'dark' ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid rgba(15, 23, 42, 0.06)',
            boxShadow:
              mode === 'dark'
                ? '0px 8px 24px rgba(2, 6, 23, 0.35)'
                : '0px 8px 20px rgba(15, 23, 42, 0.06)',
            transition: 'transform 180ms ease, box-shadow 220ms ease, border-color 220ms ease',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '1px',
              background:
                mode === 'dark'
                  ? 'linear-gradient(90deg, rgba(96,165,250,0.3), rgba(244,114,182,0.25))'
                  : 'linear-gradient(90deg, rgba(37,99,235,0.16), rgba(219,39,119,0.14))',
            },
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow:
                mode === 'dark'
                  ? '0px 14px 30px rgba(2, 6, 23, 0.44)'
                  : '0px 14px 28px rgba(15, 23, 42, 0.1)',
            },
          },
        },
      },
      MuiCardActionArea: {
        styleOverrides: {
          root: {
            transition: 'transform 180ms ease',
            '&:hover': {
              transform: 'translateY(-1px)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 12,
            paddingInline: 14,
            transition: 'transform 140ms ease, box-shadow 180ms ease, background-color 180ms ease, border-color 180ms ease',
            '&:hover': {
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          },
          contained: {
            boxShadow: mode === 'dark' ? '0 8px 18px rgba(37, 99, 235, 0.28)' : '0 8px 18px rgba(37, 99, 235, 0.2)',
            backgroundImage:
              mode === 'dark'
                ? 'linear-gradient(135deg, rgba(96,165,250,0.95), rgba(59,130,246,0.95))'
                : 'linear-gradient(135deg, rgba(37,99,235,0.98), rgba(29,78,216,0.98))',
            '&:hover': {
              boxShadow: mode === 'dark' ? '0 10px 24px rgba(37, 99, 235, 0.34)' : '0 10px 24px rgba(37, 99, 235, 0.26)',
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: 'transform 140ms ease, background-color 180ms ease',
            '&:hover': {
              transform: 'translateY(-1px)',
              backgroundColor: alpha(mode === 'dark' ? '#e2e8f0' : '#0f172a', 0.08),
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            transition: 'box-shadow 180ms ease, border-color 180ms ease',
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 2,
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px ${alpha(mode === 'dark' ? '#60a5fa' : '#2563eb', 0.18)}`,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            fontWeight: 600,
            letterSpacing: '0.01em',
          },
          sizeSmall: {
            height: 24,
            fontSize: '0.72rem',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontSize: '0.72rem',
            color: mode === 'dark' ? 'rgba(226,232,240,0.9)' : 'rgba(15,23,42,0.78)',
            borderBottom: mode === 'dark' ? '1px solid rgba(148,163,184,0.22)' : '1px solid rgba(15,23,42,0.1)',
            paddingTop: 10,
            paddingBottom: 10,
          },
          body: {
            paddingTop: 10,
            paddingBottom: 10,
            borderBottom: mode === 'dark' ? '1px solid rgba(148,163,184,0.14)' : '1px solid rgba(15,23,42,0.06)',
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: mode === 'dark' ? '1px solid rgba(148,163,184,0.2)' : '1px solid rgba(15,23,42,0.08)',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            minHeight: 48,
            letterSpacing: '0.01em',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: 'background-color 180ms ease',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            borderBottom: mode === 'dark' ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid rgba(15, 23, 42, 0.06)',
            backdropFilter: 'blur(10px)',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 10,
            padding: '8px 10px',
            fontSize: '0.75rem',
            backgroundColor: mode === 'dark' ? 'rgba(15,23,42,0.95)' : 'rgba(15,23,42,0.88)',
          },
        },
      },
    },
  })

export const ThemeModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode)

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }

  const theme = useMemo(() => buildTheme(mode), [mode])
  const value = useMemo(() => ({ mode, toggleMode }), [mode])

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}

export const useThemeMode = (): ThemeModeContextType => {
  const context = useContext(ThemeModeContext)
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeModeProvider')
  }
  return context
}
