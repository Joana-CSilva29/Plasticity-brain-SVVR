import { createTheme, alpha } from '@mui/material';

export const theme = createTheme({
  typography: {
    fontFamily: 'monospace',
    allVariants: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
  },
  palette: {
    primary: {
      main: '#6C5CE7',
      light: '#A8A4E3',
      dark: '#4834d4',
    },
    secondary: {
      main: '#00D2D3',
      light: '#81ECEC',
      dark: '#019595',
    },
    background: {
      default: '#0F172A',
      paper: alpha('#ffffff', 0.08),
    },
    gradients: {
      purple: 'linear-gradient(135deg, #6C5CE7 0%, #a55eea 100%)',
      blue: 'linear-gradient(135deg, #00D2D3 0%, #00A8FF 100%)',
      pink: 'linear-gradient(135deg, #FF6B81 0%, #FF4757 100%)',
      orange: 'linear-gradient(135deg, #FFA502 0%, #FF7F50 100%)',
    },
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        root: {
          fontFamily: 'monospace',
          color: 'rgba(255, 255, 255, 0.7)',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily: 'monospace',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontFamily: 'monospace',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(20px)',
          borderRadius: 24,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(255, 255, 255, 0.05)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          textTransform: 'none',
          fontWeight: 600,
          padding: '12px 24px',
          transition: 'all 0.3s ease',
          fontFamily: 'monospace',
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          height: 8,
          padding: '15px 0',
        },
        rail: {
          height: 8,
          opacity: 0.2,
          backgroundColor: '#A8A4E3',
          borderRadius: 4,
        },
        track: {
          height: 8,
          borderRadius: 4,
          background: 'linear-gradient(90deg, #6C5CE7 0%, #00D2D3 100%)',
        },
        thumb: {
          width: 24,
          height: 24,
          backgroundColor: '#ffffff',
          boxShadow: '0 0 10px rgba(108, 92, 231, 0.5)',
          '&:hover': {
            boxShadow: '0 0 15px rgba(108, 92, 231, 0.8)',
          },
        },
      },
    },
  },
}); 