import type { MouseEvent, ReactNode } from 'react'
import type { Navigate } from '../types'

export function AppLink({
  to,
  navigate,
  className,
  children,
}: {
  to: string
  navigate: Navigate
  className?: string
  children: ReactNode
}) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    navigate(to)
  }

  return (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  )
}
