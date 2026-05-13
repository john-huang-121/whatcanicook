import { createTheme } from '@mui/material/styles'

export const appTheme = createTheme({
  palette: {
    primary: {
      main: '#a83820',
      dark: '#842413',
      contrastText: '#fff7ed',
    },
    secondary: {
      main: '#718032',
      dark: '#4d5b1e',
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
      default: '#f8efe8',
      paper: '#fffaf4',
    },
    text: {
      primary: '#3b261d',
      secondary: '#755f4e',
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
          backgroundColor: '#fffaf4',
        },
        notchedOutline: {
          borderRadius: '0.35rem',
          borderColor: '#e8d3c3',
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
