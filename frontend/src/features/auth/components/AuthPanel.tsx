import type { ReactNode } from 'react'
import Paper from '@mui/material/Paper'

export function AuthPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="page-band auth-band">
      <Paper className="auth-panel" elevation={0}>
        <h1>{title}</h1>
        {children}
      </Paper>
    </section>
  )
}
