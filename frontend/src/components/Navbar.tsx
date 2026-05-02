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
  const closeAndNavigate = (to: string) => {
    setOpen(false)
    navigate(to)
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
            <button type="button" onClick={() => closeAndNavigate('/dashboard')}>
              Dashboard
            </button>
            <button type="button" onClick={() => closeAndNavigate('/recipes/new')}>
              Create A Recipe
            </button>
            <button type="button" onClick={() => closeAndNavigate('/profile')}>
              My Profile
            </button>
            <span className="nav-greeting">Hi, {auth.user?.profile.display_name || auth.user?.username}</span>
            <button type="button" onClick={() => void logout()}>
              Log out
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => closeAndNavigate('/login')}>
              Log in
            </button>
            <button type="button" onClick={() => closeAndNavigate('/signup')}>
              Sign up
            </button>
          </>
        )}
      </nav>
    </header>
  )
}
