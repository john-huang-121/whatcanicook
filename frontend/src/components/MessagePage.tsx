import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import type { Navigate } from '../types'

export function MessagePage({
  title,
  message,
  navigate,
  action,
}: {
  title: string
  message: string
  navigate: Navigate
  action?: { label: string; to: string }
}) {
  return (
    <section className="page-band">
      <Paper className="message-panel" elevation={0}>
        <h1>{title}</h1>
        <p>{message}</p>
        <Button type="button" className="primary-button" variant="contained" onClick={() => navigate(action?.to ?? '/recipes')}>
          {action?.label ?? 'Browse recipes'}
        </Button>
      </Paper>
    </section>
  )
}
