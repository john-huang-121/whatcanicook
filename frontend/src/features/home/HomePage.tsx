import { AppLink } from '../../components/AppLink'
import type { AuthState, Navigate } from '../../types'

export function HomePage({ auth, navigate }: { auth: AuthState; navigate: Navigate }) {
  return (
    <section className="hero-page">
      <div className="hero-content">
        <p className="eyebrow">WhatCanICook</p>
        <h1>Explore recipes from different cuisines.</h1>
        <p>Browse what others are cooking, then craft your own recipes and decide what stays private.</p>
        <div className="action-row">
          <AppLink to={auth.authenticated ? '/dashboard' : '/recipes'} navigate={navigate} className="primary-button">
            {auth.authenticated ? 'Open dashboard' : 'Get started'}
          </AppLink>
          <AppLink to={auth.authenticated ? '/recipes/new' : '/signup'} navigate={navigate} className="text-button">
            {auth.authenticated ? 'Create a recipe' : 'Create an account'}
          </AppLink>
        </div>
      </div>
    </section>
  )
}
