import { StrictMode } from 'react'
import type { ReactNode } from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles'
import { appTheme } from './theme'

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <StrictMode>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={appTheme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </StyledEngineProvider>
    </StrictMode>
  )
}
