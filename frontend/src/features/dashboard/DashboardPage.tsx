import { useEffect, useState } from 'react'
import { AppLink } from '../../components/AppLink'
import { LoadingPage } from '../../components/LoadingPage'
import { LoginRequiredPage } from '../../components/LoginRequiredPage'
import { MessagePage } from '../../components/MessagePage'
import { RecipeGrid } from '../recipes/components/RecipeGrid'
import { apiFetch } from '../../lib/api'
import type { AuthState, DashboardResponse, Navigate } from '../../types'
import { formatErrors } from '../../utils/formatErrors'

export function DashboardPage({ auth, navigate }: { auth: AuthState; navigate: Navigate }) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!auth.authenticated) return
    let active = true

    apiFetch<DashboardResponse>('/api/dashboard/')
      .then((response) => {
        if (!active) return
        setDashboard(response)
      })
      .catch((requestError) => {
        if (!active) return
        setError(formatErrors(requestError))
      })

    return () => {
      active = false
    }
  }, [auth.authenticated])

  if (!auth.loading && !auth.authenticated) {
    return <LoginRequiredPage navigate={navigate} />
  }

  if (error) return <MessagePage title="Dashboard unavailable" message={error} navigate={navigate} />
  if (!dashboard) return <LoadingPage message="Loading dashboard..." />

  return (
    <section className="page-band">
      <div className="page-inner dashboard-shell">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>Your cooking stream</h1>
            <p>Fresh recipes from people you follow, plus the collection you saved for later.</p>
          </div>
          <AppLink to="/recipes/new" navigate={navigate} className="primary-button">
            Create Recipe
          </AppLink>
        </section>

        <section className="stats-grid" aria-label="Your cooking stats">
          <div>
            <strong>{dashboard.stats.recipe_count}</strong>
            <span>Total recipes</span>
          </div>
          <div>
            <strong>{dashboard.stats.public_recipe_count}</strong>
            <span>Published</span>
          </div>
          <div>
            <strong>{dashboard.stats.following_count}</strong>
            <span>Following</span>
          </div>
          <div>
            <strong>{dashboard.stats.saved_recipe_count}</strong>
            <span>Saved</span>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="form-section-header">
            <div>
              <p className="eyebrow">Feed</p>
              <h2>New from people you follow</h2>
            </div>
            <AppLink to="/recipes" navigate={navigate} className="text-button">
              Find cooks
            </AppLink>
          </div>
          {dashboard.feed.length ? (
            <RecipeGrid recipes={dashboard.feed} navigate={navigate} />
          ) : (
            <p className="empty-state">Follow recipe authors from their recipe pages to start filling your feed.</p>
          )}
        </section>

        <section className="dashboard-section">
          <div className="form-section-header">
            <div>
              <p className="eyebrow">Saved Collection</p>
              <h2>Recipes for later</h2>
            </div>
          </div>
          {dashboard.saved_recipes.length ? (
            <RecipeGrid recipes={dashboard.saved_recipes} navigate={navigate} />
          ) : (
            <p className="empty-state">Save recipes from their detail pages and they will appear here.</p>
          )}
        </section>
      </div>
    </section>
  )
}
