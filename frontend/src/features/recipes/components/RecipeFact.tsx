import Paper from '@mui/material/Paper'

export function RecipeFact({ label, value }: { label: string; value: string }) {
  return (
    <Paper className="recipe-fact" elevation={0}>
      <h3>{label}</h3>
      <p>{value}</p>
    </Paper>
  )
}
