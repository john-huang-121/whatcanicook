import type { ReactNode } from 'react'
import type { Navigate } from '../types'
import { UserSidebar } from './UserSidebar'

export function UserWorkspace({
  path,
  navigate,
  children,
}: {
  path: string
  navigate: Navigate
  children: ReactNode
}) {
  return (
    <div className="user-workspace">
      <UserSidebar path={path} navigate={navigate} />
      <div className="user-workspace-content">{children}</div>
    </div>
  )
}
