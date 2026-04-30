import { StrictMode } from 'react'
import type { ReactNode } from 'react'

export function AppProvider({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>
}
