import type { MouseEvent } from 'react'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import type { Navigate } from '../types'

const sidebarItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Create Recipe', to: '/recipes/new' },
  { label: 'My Recipes', to: '/recipes/mine' },
  { label: 'Saved Recipes', to: '/recipes/saved' },
]

export function UserSidebar({ path, navigate }: { path: string; navigate: Navigate }) {
  function handleNavigate(to: string, event: MouseEvent<HTMLAnchorElement>) {
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
    <aside className="user-sidebar" aria-label="User recipe navigation">
      <List component="nav" className="user-sidebar-nav" disablePadding>
        {sidebarItems.map((item) => (
          <ListItemButton
            component="a"
            href={item.to}
            key={item.to}
            onClick={(event) => handleNavigate(item.to, event)}
            selected={path === item.to}
            className="user-sidebar-link"
          >
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </aside>
  )
}
