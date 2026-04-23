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
      borderRadius: 4,
    },
    typography: {
      fontFamily: [
        '"Inter"',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        'sans-serif',
      ].join(','),
      fontSize: 13,
      htmlFontSize: 16,
      h4: {
        fontWeight: 700,
        fontSize: '1.5rem',
        letterSpacing: '-0.015em',
        lineHeight: 1.3,
      },
      h5: {
        fontWeight: 700,
        fontSize: '1.25rem',
        lineHeight: 1.35,
      },
      h6: {
        fontWeight: 600,
        fontSize: '1rem',
        lineHeight: 1.4,
      },
      subtitle1: {
        fontWeight: 600,
        fontSize: '0.875rem',
        lineHeight: 1.5,
      },
      subtitle2: {
        fontWeight: 600,
        fontSize: '0.8125rem',
        letterSpacing: '0.01em',
        lineHeight: 1.5,
      },
      body1: {
        fontSize: '0.875rem',
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.8125rem',
        lineHeight: 1.6,
      },
      caption: {
        fontSize: '0.75rem',
        lineHeight: 1.5,
        letterSpacing: '0.02em',
      },
      button: {
        fontSize: '0.8125rem',
        fontWeight: 600,
        letterSpacing: '0.01em',
        textTransform: 'none' as const,
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
            border: mode === 'dark' ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid rgba(15, 23, 42, 0.08)',
            boxShadow:
              mode === 'dark'
                ? '0px 2px 8px rgba(2, 6, 23, 0.25)'
                : '0px 1px 4px rgba(15, 23, 42, 0.06)',
            transition: 'box-shadow 180ms ease, border-color 180ms ease',
            '&:hover': {
              boxShadow:
                mode === 'dark'
                  ? '0px 4px 16px rgba(2, 6, 23, 0.35)'
                  : '0px 4px 12px rgba(15, 23, 42, 0.1)',
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
            fontSize: '0.8125rem',
            borderRadius: 4,
            paddingInline: 14,
            transition: 'background-color 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
            '&:hover': {
              transform: 'none',
            },
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
            },
          },
          outlined: {
            borderWidth: '1px',
          },
          sizeSmall: {
            fontSize: '0.75rem',
            paddingInline: 10,
            paddingBlock: 4,
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
            borderRadius: 4,
            fontSize: '0.875rem',
            transition: 'box-shadow 150ms ease, border-color 150ms ease',
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 1.5,
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px ${alpha(mode === 'dark' ? '#60a5fa' : '#2563eb', 0.14)}`,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            fontWeight: 500,
            fontSize: '0.75rem',
            letterSpacing: '0.01em',
            height: 24,
          },
          sizeSmall: {
            height: 22,
            fontSize: '0.72rem',
            '& .MuiChip-label': {
              paddingLeft: 8,
              paddingRight: 8,
            },
          },
          label: {
            paddingLeft: 10,
            paddingRight: 10,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontSize: '0.6875rem',
            color: mode === 'dark' ? 'rgba(226,232,240,0.75)' : 'rgba(15,23,42,0.55)',
            backgroundColor: mode === 'dark' ? 'rgba(15,23,42,0.6)' : '#f8f9fc',
            borderBottom: mode === 'dark' ? '1px solid rgba(148,163,184,0.18)' : '1px solid rgba(15,23,42,0.1)',
            paddingTop: 9,
            paddingBottom: 9,
            paddingLeft: 16,
            paddingRight: 16,
            whiteSpace: 'nowrap' as const,
          },
          body: {
            paddingTop: 11,
            paddingBottom: 11,
            paddingLeft: 16,
            paddingRight: 16,
            fontSize: '0.8125rem',
            color: mode === 'dark' ? '#e2e8f0' : '#1e293b',
            borderBottom: mode === 'dark' ? '1px solid rgba(148,163,184,0.1)' : '1px solid rgba(15,23,42,0.06)',
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            border: 'none',
            boxShadow: 'none',
            overflow: 'hidden',
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableRow-root': {
              backgroundColor: mode === 'dark' ? 'rgba(15,23,42,0.6)' : '#f8f9fc',
            },
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
            borderRadius: 4,
            padding: '6px 10px',
            fontSize: '0.75rem',
            fontWeight: 500,
            backgroundColor: mode === 'dark' ? 'rgba(15,23,42,0.96)' : 'rgba(15,23,42,0.88)',
          },
          arrow: {
            color: mode === 'dark' ? 'rgba(15,23,42,0.96)' : 'rgba(15,23,42,0.88)',
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            fontSize: '0.875rem',
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            fontSize: '0.8125rem',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 6,
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
