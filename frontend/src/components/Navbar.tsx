import { useState } from 'react'
import type { MouseEvent } from 'react'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import type { AuthState, Navigate } from '../types'
import { AppLink } from './AppLink'

export function Navbar({
  auth,
  navigate,
  logout,
}: {
  auth: AuthState
  navigate: Navigate
  logout: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null)
  const displayName = auth.user?.profile.display_name || auth.user?.username || 'User'
  const profileImage = auth.user?.profile.profile_picture_url
  const avatarInitials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  const closeAndNavigate = (to: string) => {
    setOpen(false)
    setAccountAnchor(null)
    navigate(to)
  }

  const handleLogout = () => {
    setOpen(false)
    setAccountAnchor(null)
    void logout()
  }

  const openAccountMenu = (event: MouseEvent<HTMLButtonElement>) => {
    setAccountAnchor(event.currentTarget)
  }

  return (
    <header className="navbar">
      <AppLink to="/" navigate={navigate} className="brand">
        <span className="brand-mark">W</span>
        <span>WhatCanICook</span>
      </AppLink>
      <Button className="icon-button menu-button" type="button" variant="outlined" onClick={() => setOpen((value) => !value)}>
        <span>{open ? 'Close' : 'Menu'}</span>
      </Button>
      <nav className={`nav-links ${open ? 'open' : ''}`}>
        <Button className="browse-nav-link" type="button" variant="text" onClick={() => closeAndNavigate('/recipes')}>
          Browse Recipes
        </Button>
        {auth.authenticated ? (
          <>
            <div className="account-menu">
              <IconButton
                className="avatar-button"
                type="button"
                aria-haspopup="true"
                aria-expanded={accountAnchor ? 'true' : undefined}
                aria-label={`${displayName} account menu`}
                onClick={openAccountMenu}
              >
                <Avatar alt="" src={profileImage || undefined}>
                  {avatarInitials}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={accountAnchor}
                open={Boolean(accountAnchor)}
                onClose={() => setAccountAnchor(null)}
                className="account-dropdown-menu"
              >
                <MenuItem onClick={() => closeAndNavigate('/profile')}>
                  My Profile
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  Logout
                </MenuItem>
              </Menu>
            </div>
          </>
        ) : (
          <div className="auth-links">
            <Button type="button" variant="text" onClick={() => closeAndNavigate('/login')}>
              Login
            </Button>
            <Button type="button" className="primary-button" variant="contained" onClick={() => closeAndNavigate('/signup')}>
              Signup
            </Button>
          </div>
        )}
      </nav>
    </header>
  )
}
