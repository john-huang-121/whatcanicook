import { AppLink } from './AppLink'
import type { Navigate } from '../types'

const sidebarItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Create Recipe', to: '/recipes/new' },
  { label: 'My Recipes', to: '/recipes/mine' },
  { label: 'Saved Recipes', to: '/recipes/saved' },
]

export function UserSidebar({ path, navigate }: { path: string; navigate: Navigate }) {
  return (
    <aside className="user-sidebar" aria-label="User recipe navigation">
      <nav className="user-sidebar-nav">
        {sidebarItems.map((item) => (
          <AppLink
            key={item.to}
            to={item.to}
            navigate={navigate}
            className={`user-sidebar-link ${path === item.to ? 'active' : ''}`}
          >
            {item.label}
          </AppLink>
        ))}
      </nav>
    </aside>
  )
}
