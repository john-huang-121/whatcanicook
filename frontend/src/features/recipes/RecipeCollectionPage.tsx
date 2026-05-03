import { useEffect, useState } from 'react'
import { AppLink } from '../../components/AppLink'
import { LoadingPage } from '../../components/LoadingPage'
import { LoginRequiredPage } from '../../components/LoginRequiredPage'
import { MessagePage } from '../../components/MessagePage'
import { apiFetch } from '../../lib/api'
import type { AuthState, Navigate, Recipe } from '../../types'
import { formatErrors } from '../../utils/formatErrors'
import { RecipeGrid } from './components/RecipeGrid'

type RecipeCollectionKind = 'mine' | 'saved'

const collectionConfig = {
  mine: {
    endpoint: '/api/recipes/?mine=true',
    eyebrow: 'My Recipes',
    title: 'Your recipes',
    empty: 'Create your first recipe and it will appear here.',
    errorTitle: 'Your recipes are unavailable',
  },
  saved: {
    endpoint: '/api/saved-recipes/',
    eyebrow: 'Saved Recipes',
    title: 'Saved for later',
    empty: 'Save recipes from their detail pages and they will appear here.',
    errorTitle: 'Saved recipes are unavailable',
  },
} satisfies Record<
  RecipeCollectionKind,
  {
    endpoint: string
    eyebrow: string
    title: string
    empty: string
    errorTitle: string
  }
>

export function RecipeCollectionPage({
  auth,
  kind,
  navigate,
}: {
  auth: AuthState
  kind: RecipeCollectionKind
  navigate: Navigate
}) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const config = collectionConfig[kind]

  useEffect(() => {
    if (!auth.authenticated) return
    let active = true

    const loadRecipes = async () => {
      try {
        const response = await apiFetch<Recipe[]>(config.endpoint)
        if (!active) return
        setRecipes(response)
      } catch (requestError) {
        if (!active) return
        setError(formatErrors(requestError))
      } finally {
        if (active) setLoading(false)
      }
    }

    loadRecipes()

    return () => {
      active = false
    }
  }, [auth.authenticated, config.endpoint])

  if (!auth.loading && !auth.authenticated) {
    return <LoginRequiredPage navigate={navigate} />
  }

  if (error) return <MessagePage title={config.errorTitle} message={error} navigate={navigate} />
  if (loading) return <LoadingPage message={`Loading ${config.eyebrow.toLowerCase()}...`} />

  return (
    <section className="page-band">
      <div className="page-inner">
        <div className="section-heading">
          <p className="eyebrow">{config.eyebrow}</p>
          <h1>{config.title}</h1>
          {kind === 'mine' && (
            <AppLink to="/recipes/new" navigate={navigate} className="primary-button">
              Create Recipe
            </AppLink>
          )}
        </div>
        {recipes.length ? <RecipeGrid recipes={recipes} navigate={navigate} /> : <p className="empty-state">{config.empty}</p>}
      </div>
    </section>
  )
}
