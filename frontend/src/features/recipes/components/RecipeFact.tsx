export function RecipeFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <h3>{label}</h3>
      <p>{value}</p>
    </div>
  )
}
