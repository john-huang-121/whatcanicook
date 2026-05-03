import { useState } from 'react'
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
    navigate(to)
  }

  const handleLogout = () => {
    setOpen(false)
    void logout()
  }

  return (
    <header className="navbar">
      <AppLink to="/" navigate={navigate} className="brand">
        <span className="brand-mark">W</span>
        <span>WhatCanICook</span>
      </AppLink>
      <button className="icon-button menu-button" type="button" onClick={() => setOpen((value) => !value)}>
        <span>{open ? 'Close' : 'Menu'}</span>
      </button>
      <nav className={`nav-links ${open ? 'open' : ''}`}>
        <button type="button" onClick={() => closeAndNavigate('/recipes')}>
          Browse Recipes
        </button>
        {auth.authenticated ? (
          <>
            <div className="account-menu">
              <button
                className="avatar-button"
                type="button"
                aria-haspopup="true"
                aria-label={`${displayName} account menu`}
              >
                {profileImage ? <img src={profileImage} alt="" /> : <span>{avatarInitials}</span>}
              </button>
              <div className="account-dropdown">
                <button type="button" onClick={() => closeAndNavigate('/profile')}>
                  My Profile
                </button>
                <button type="button" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="auth-links">
            <button type="button" onClick={() => closeAndNavigate('/login')}>
              Login
            </button>
            <button type="button" onClick={() => closeAndNavigate('/signup')}>
              Signup
            </button>
          </div>
        )}
      </nav>
    </header>
  )
}
