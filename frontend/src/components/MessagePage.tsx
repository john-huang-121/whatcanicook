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
      <div className="message-panel">
        <h1>{title}</h1>
        <p>{message}</p>
        <button type="button" className="primary-button" onClick={() => navigate(action?.to ?? '/recipes')}>
          {action?.label ?? 'Browse recipes'}
        </button>
      </div>
    </section>
  )
}
