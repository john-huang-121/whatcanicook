import type { MouseEvent, ReactNode } from 'react'
import Link from '@mui/material/Link'
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
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return
    }

    event.preventDefault()
    navigate(to)
  }

  return (
    <Link href={to} className={className} onClick={onClick} underline="none">
      {children}
    </Link>
  )
}
