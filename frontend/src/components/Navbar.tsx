import { useState } from 'react'
import type { FocusEvent } from 'react'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import MenuList from '@mui/material/MenuList'
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
  const [accountOpen, setAccountOpen] = useState(false)
  const [browseOpen, setBrowseOpen] = useState(false)
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
    setAccountOpen(false)
    setBrowseOpen(false)
    navigate(to)
  }

  const handleLogout = () => {
    setOpen(false)
    setAccountOpen(false)
    setBrowseOpen(false)
    void logout()
  }

  const openAccountMenu = () => {
    setBrowseOpen(false)
    setAccountOpen(true)
  }

  const openBrowseMenu = () => {
    setAccountOpen(false)
    setBrowseOpen(true)
  }

  const focusBrowseMenu = () => {
    setAccountOpen(false)
    setBrowseOpen(true)
  }

  const closeAccountOnBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setAccountOpen(false)
    }
  }

  const closeBrowseOnBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setBrowseOpen(false)
    }
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
        <div className="browse-menu" onMouseEnter={() => setBrowseOpen(true)} onMouseLeave={() => setBrowseOpen(false)} onBlur={closeBrowseOnBlur}>
          <Button
            id="browse-recipes-button"
            className="browse-nav-link"
            type="button"
            variant="text"
            aria-haspopup="true"
            aria-expanded={browseOpen ? 'true' : undefined}
            aria-controls={browseOpen ? 'browse-recipes-menu' : undefined}
            onClick={openBrowseMenu}
            onFocus={focusBrowseMenu}
            onMouseEnter={openBrowseMenu}
          >
            Browse Recipes
            <span className="nav-caret" aria-hidden="true" />
          </Button>
          {browseOpen ? (
            <div className="browse-dropdown-panel">
              <MenuList id="browse-recipes-menu" aria-labelledby="browse-recipes-button" className="browse-dropdown-list">
                <MenuItem
                  component="a"
                  href="/recipes"
                  onClick={(event) => {
                    event.preventDefault()
                    closeAndNavigate('/recipes')
                  }}
                >
                  Recipes by Cuisine
                </MenuItem>
                <MenuItem
                  component="a"
                  href="/recipes/ingredients"
                  onClick={(event) => {
                    event.preventDefault()
                    closeAndNavigate('/recipes/ingredients')
                  }}
                >
                  Recipes by Ingredient
                </MenuItem>
              </MenuList>
            </div>
          ) : null}
        </div>
        {auth.authenticated ? (
          <>
            <div
              className={`account-menu ${accountOpen ? 'open' : ''}`}
              onMouseEnter={openAccountMenu}
              onMouseLeave={() => setAccountOpen(false)}
              onBlur={closeAccountOnBlur}
            >
              <IconButton
                id="account-menu-button"
                className="avatar-button"
                type="button"
                aria-haspopup="true"
                aria-expanded={accountOpen ? 'true' : undefined}
                aria-controls={accountOpen ? 'account-dropdown-menu' : undefined}
                aria-label={`${displayName} account menu`}
                onClick={openAccountMenu}
                onFocus={openAccountMenu}
              >
                <Avatar alt="" src={profileImage || undefined}>
                  {avatarInitials}
                </Avatar>
              </IconButton>
              {accountOpen ? (
                <div className="account-dropdown-panel">
                  <MenuList id="account-dropdown-menu" aria-labelledby="account-menu-button" className="account-dropdown-list">
                    <MenuItem onClick={() => closeAndNavigate('/profile')}>
                      My Profile
                    </MenuItem>
                    <MenuItem onClick={handleLogout}>
                      Logout
                    </MenuItem>
                  </MenuList>
                </div>
              ) : null}
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
