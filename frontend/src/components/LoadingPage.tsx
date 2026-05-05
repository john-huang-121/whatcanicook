import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'

export function LoadingPage({ message }: { message: string }) {
  return (
    <section className="page-band">
      <Paper className="message-panel loading-panel" elevation={0}>
        <CircularProgress size={28} thickness={4} />
        <p>{message}</p>
      </Paper>
    </section>
  )
}
