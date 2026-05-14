import { useEffect, useMemo, useState } from 'react'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { LoadingPage } from '../../components/LoadingPage'
import { LoginRequiredPage } from '../../components/LoginRequiredPage'
import { MessagePage } from '../../components/MessagePage'
import { ScrollableRow } from '../../components/ScrollableRow'
import { apiFetch } from '../../lib/api'
import type { AuthState, DashboardResponse, Navigate, Recipe } from '../../types'
import { formatErrors } from '../../utils/formatErrors'
import { RecipeCard } from '../recipes/components/RecipeGrid'

const DISCOVER_ROW_CONFIG = [
  { key: 'top-rated', title: 'Top Rated Recipes' },
  { key: 'new', title: 'New Recipes' },
  { key: 'you-may-love', title: 'Recipes You May Love' }
] as const
const DISCOVER_ROW_LIMIT = 6

type DiscoverRowKey = (typeof DISCOVER_ROW_CONFIG)[number]['key']
type DashboardTab = 'discover' | 'community'

function CommunityFeed({ recipes, navigate }: { recipes: Recipe[]; navigate: Navigate }) {
  if (!recipes.length) {
    return <p className="empty-state">Follow recipe authors from recipe pages to build your community feed.</p>
  }

  return (
    <section className="dashboard-community-feed" aria-label="Community feed">
      {recipes.map((recipe) => (
        <article key={recipe.id} className="dashboard-community-card">
          <header>
            <p>@{recipe.created_by_username}</p>
            <small>{new Date(recipe.published_date || recipe.created_at).toLocaleDateString()}</small>
          </header>
          <button type="button" className="dashboard-community-card-button" onClick={() => navigate(`/recipes/${recipe.id}`)}>
            <img src={recipe.image_url} alt={recipe.title} loading="lazy" />
            <div>
              <h3>{recipe.title}</h3>
              <p>{recipe.description}</p>
            </div>
          </button>
        </article>
      ))}
    </section>
  )
}

export function DashboardPage({ auth, navigate }: { auth: AuthState; navigate: Navigate }) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<DashboardTab>('discover')

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

  const discoverRows = useMemo<Record<DiscoverRowKey, Recipe[]>>(() => {
    const feed = dashboard?.feed ?? []
    const saved = dashboard?.saved_recipes ?? []
    const topRated = [...feed].sort((a, b) => b.average_rating - a.average_rating).slice(0, DISCOVER_ROW_LIMIT)
    const newest = [...feed]
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, DISCOVER_ROW_LIMIT)
    const youMayLove = [...saved, ...feed].slice(0, DISCOVER_ROW_LIMIT)

    return {
      'top-rated': topRated,
      new: newest,
      'you-may-love': youMayLove
    }
  }, [dashboard])

  if (!auth.loading && !auth.authenticated) {
    return <LoginRequiredPage navigate={navigate} />
  }

  if (error) return <MessagePage title="Dashboard unavailable" message={error} navigate={navigate} />
  if (!dashboard) return <LoadingPage message="Loading dashboard..." />

  return (
    <section className="page-band">
      <div className="page-inner dashboard-shell">
        <Tabs
          aria-label="Dashboard views"
          className="dashboard-tabs"
          onChange={(_event, nextTab: DashboardTab) => setTab(nextTab)}
          value={tab}
        >
          <Tab
            className="dashboard-tab"
            icon={<img alt="" aria-hidden="true" className="dashboard-tab-icon" src="/compass-favicon.png" />}
            iconPosition="start"
            label="Discover"
            value="discover"
          />
          <Tab
            className="dashboard-tab"
            icon={<img alt="" aria-hidden="true" className="dashboard-tab-icon" src="/community-favicon.png" />}
            iconPosition="start"
            label="Community"
            value="community"
          />
        </Tabs>

        {tab === 'discover' ? (
          <section className="dashboard-discover" aria-label="Discover recipes">
            {DISCOVER_ROW_CONFIG.map((row) => (
              <ScrollableRow
                emptyState="No recipes yet for this collection."
                getKey={(recipe) => recipe.id}
                items={discoverRows[row.key]}
                key={row.key}
                className="dashboard-recipe-row"
                renderItem={(recipe) => <RecipeCard recipe={recipe} navigate={navigate} />}
                title={row.title}
              />
            ))}
          </section>
        ) : (
          <CommunityFeed recipes={dashboard.feed} navigate={navigate} />
        )}
      </div>
    </section>
  )
}
