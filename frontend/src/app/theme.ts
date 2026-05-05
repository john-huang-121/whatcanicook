import { createTheme } from '@mui/material/styles'

export const appTheme = createTheme({
  palette: {
    primary: {
      main: '#d95f32',
      dark: '#a84625',
      contrastText: '#fffaf0',
    },
    secondary: {
      main: '#687a3d',
      dark: '#3f6212',
      contrastText: '#fffaf0',
    },
    success: {
      main: '#3f6212',
      dark: '#14532d',
    },
    error: {
      main: '#b91c1c',
      dark: '#991b1b',
    },
    warning: {
      main: '#a84625',
      dark: '#78350f',
    },
    background: {
      default: '#fff7ed',
      paper: '#fffaf0',
    },
    text: {
      primary: '#33251b',
      secondary: '#725e4a',
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    button: {
      fontWeight: 800,
      letterSpacing: 0,
      textTransform: 'none',
    },
  },
  components: {
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '0.85rem',
          fontWeight: 700,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: '0.75rem',
          minHeight: '2.55rem',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 850,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: '0.35rem',
          backgroundColor: '#fffdf8',
        },
        notchedOutline: {
          borderRadius: '0.35rem',
          borderColor: '#f4c98f',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        fullWidth: true,
        size: 'small',
        variant: 'outlined',
      },
    },
  },
})
