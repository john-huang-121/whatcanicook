export function LoadingPage({ message }: { message: string }) {
  return (
    <section className="page-band">
      <div className="message-panel">
        <p>{message}</p>
      </div>
    </section>
  )
}
