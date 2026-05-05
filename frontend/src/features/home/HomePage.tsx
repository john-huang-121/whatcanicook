import Button from '@mui/material/Button'
import type { AuthState, Navigate } from '../../types'

export function HomePage({ auth, navigate }: { auth: AuthState; navigate: Navigate }) {
  return (
    <section className="hero-page">
      <div className="hero-content">
        <p className="eyebrow">WhatCanICook</p>
        <h1>Explore recipes from different cuisines.</h1>
        <p>Browse what others are cooking, then craft your own recipes and decide what stays private.</p>
        <div className="action-row">
          <Button
            type="button"
            className="primary-button"
            variant="contained"
            onClick={() => navigate(auth.authenticated ? '/dashboard' : '/recipes')}
          >
            {auth.authenticated ? 'Open dashboard' : 'Get started'}
          </Button>
          <Button
            type="button"
            className="text-button"
            variant="text"
            onClick={() => navigate(auth.authenticated ? '/recipes/new' : '/signup')}
          >
            {auth.authenticated ? 'Create a recipe' : 'Create an account'}
          </Button>
        </div>
      </div>
    </section>
  )
}
