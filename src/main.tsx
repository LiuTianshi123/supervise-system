import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import App from './App';
import { AuthExpiredError } from './auth';
import './index.css';

/** 创建淘宝后台风格中文主题 */
const theme = createTheme({
  palette: {
    primary: {
      main: '#2563EB',
      light: '#3B82F6',
      dark: '#0D47A1',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#0ea5e9',
      light: '#38bdf8',
      dark: '#0284c7',
    },
    success: {
      main: '#00A870',
      light: '#10B981',
      dark: '#059669',
    },
    warning: {
      main: '#FF8800',
      light: '#F59E0B',
      dark: '#D97706',
    },
    error: {
      main: '#EF4444',
      light: '#F87171',
      dark: '#DC2626',
    },
    background: {
      default: '#F2F3F5',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1F1F1F',
      secondary: '#4E5969',
    },
    divider: '#E5E6EB',
  },
  typography: {
    fontFamily: '"PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
      letterSpacing: '-0.01em',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.1rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    subtitle1: {
      fontWeight: 600,
    },
    subtitle2: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 6,
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02)',
    '0 3px 6px -4px rgba(0,0,0,0.06), 0 6px 16px 0 rgba(0,0,0,0.04)',
    '0 6px 16px -4px rgba(0,0,0,0.08), 0 9px 28px 0 rgba(0,0,0,0.05)',
    '0 3px 6px -4px rgba(0,0,0,0.05), 0 6px 18px 0 rgba(0,0,0,0.06)',
    '0 6px 16px -4px rgba(0,0,0,0.08), 0 9px 28px 0 rgba(0,0,0,0.05)',
    '0 6px 16px -4px rgba(0,0,0,0.08), 0 9px 28px 0 rgba(0,0,0,0.05)',
    '0 6px 16px -4px rgba(0,0,0,0.08), 0 9px 28px 0 rgba(0,0,0,0.05)',
    '0 6px 16px -4px rgba(0,0,0,0.08), 0 9px 28px 0 rgba(0,0,0,0.05)',
    '0 6px 16px -4px rgba(0,0,0,0.08), 0 9px 28px 0 rgba(0,0,0,0.05)',
    '0 6px 16px -4px rgba(0,0,0,0.08), 0 9px 28px 0 rgba(0,0,0,0.05)',
    '0 6px 16px -4px rgba(0,0,0,0.08), 0 9px 28px 0 rgba(0,0,0,0.05)',
    '0 6px 16px -4px rgba(0,0,0,0.08), 0 9px 28px 0 rgba(0,0,0,0.05)',
    '0 6px 16px -4px rgba(0,0,0,0.08), 0 9px 28px 0 rgba(0,0,0,0.05)',
    '0 6px 16px -4px rgba(0,0,0,0.08), 0 9px 28px 0 rgba(0,0,0,0.05)',
    '0 6px 16px -4px rgba(0,0,0,0.08), 0 9px 28px 0 rgba(0,0,0,0.05)',
    '0 6px 16px -4px rgba(0,0,0,0.08), 0 9px 28px 0 rgba(0,0,0,0.05)',
    '0 6px 16px -4px rgba(0,0,0,0.08), 0 9px 28px 0 rgba(0,0,0,0.05)',
    '0 6px 16px -4px rgba(0,0,0,0.08), 0 9px 28px 0 rgba(0,0,0,0.05)',
    '0 6px 16px -4px rgba(0,0,0,0.08), 0 9px 28px 0 rgba(0,0,0,0.05)',
    '0 6px 16px -4px rgba(0,0,0,0.08), 0 9px 28px 0 rgba(0,0,0,0.05)',
    '0 6px 16px -4px rgba(0,0,0,0.08), 0 9px 28px 0 rgba(0,0,0,0.05)',
    '0 6px 16px -4px rgba(0,0,0,0.08), 0 9px 28px 0 rgba(0,0,0,0.05)',
    '0 6px 16px -4px rgba(0,0,0,0.08), 0 9px 28px 0 rgba(0,0,0,0.05)',
  ] as any,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: '6px',
          padding: '8px 16px',
          fontSize: '0.875rem',
        },
        contained: {
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02)',
          '&:hover': {
            boxShadow: '0 3px 6px -4px rgba(0,0,0,0.06), 0 6px 16px 0 rgba(0,0,0,0.04)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 12,
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02)',
        },
        elevation0: {
          boxShadow: 'none',
        },
        outlined: {
          borderRadius: 12,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: 'none',
          transition: 'box-shadow 0.2s ease',
          '&:hover': {
            boxShadow: '0 3px 6px -4px rgba(0,0,0,0.06), 0 6px 16px 0 rgba(0,0,0,0.04)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: '4px',
        },
        colorError: {
          backgroundColor: '#FEF2F2',
          color: '#DC2626',
        },
        colorSuccess: {
          backgroundColor: '#E8F6F0',
          color: '#00A870',
        },
        colorWarning: {
          backgroundColor: '#FFF3E8',
          color: '#FF8800',
        },
        colorInfo: {
          backgroundColor: '#E8F0FE',
          color: '#2563EB',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '12px',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '1rem',
          borderBottom: '1px solid #E5E6EB',
          pb: 1.5,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '20px',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 20px',
          justifyContent: 'flex-end',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: '#F7F8FA',
          color: '#4E5969',
          fontSize: '12px',
          borderBottom: '1px solid #E5E6EB',
        },
        body: {
          borderBottom: '1px solid #E5E6EB',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.Mui-selected': {
            backgroundColor: 'rgba(59,130,246,0.15)',
            '&:hover': {
              backgroundColor: 'rgba(59,130,246,0.2)',
            },
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '6px',
            '&.Mui-focused': {
              boxShadow: '0 0 0 2px rgba(37,99,235,0.15)',
            },
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          backgroundColor: '#E5E6EB',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          '& .MuiAlert-icon': {
            alignItems: 'center',
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: '6px',
          fontSize: '0.8125rem',
          backgroundColor: '#1F1F1F',
        },
      },
    },
    MuiPagination: {
      styleOverrides: {
        root: {
          borderRadius: '10px',
        },
        ul: {
          borderRadius: '10px',
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

// 全局捕获 AuthExpiredError — 避免 reload 死循环
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason instanceof AuthExpiredError) {
    event.preventDefault();
    window.location.href = '/';
  }
});
