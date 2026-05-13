import { createTheme } from '@mui/material/styles'

export const appTheme = createTheme({
  palette: {
    primary: {
      main: '#c25e44',
      dark: '#9b4a35',
      contrastText: '#fff7ed',
    },
    secondary: {
      main: '#8a9a5b',
      dark: '#6f7d49',
      contrastText: '#fff7ed',
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
      default: '#fdf9f0',
      paper: '#ffffff',
    },
    text: {
      primary: '#4a4238',
      secondary: '#6b6257',
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily:
      '"Trebuchet MS", "Gill Sans", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
    h1: {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontWeight: 700,
    },
    h3: {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontWeight: 700,
    },
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
          borderRadius: '0.35rem',
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
          backgroundColor: '#ffffff',
        },
        notchedOutline: {
          borderRadius: '0.35rem',
          borderColor: '#d9d1c6',
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
