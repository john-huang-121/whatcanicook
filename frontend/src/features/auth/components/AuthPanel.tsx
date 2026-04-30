import type { ReactNode } from 'react'

export function AuthPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="page-band auth-band">
      <div className="auth-panel">
        <h1>{title}</h1>
        {children}
      </div>
    </section>
  )
}
