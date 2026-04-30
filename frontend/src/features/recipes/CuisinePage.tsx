import { useEffect, useState } from 'react'
import { MessagePage } from '../../components/MessagePage'
import { RecipeGrid } from './components/RecipeGrid'
import { apiFetch } from '../../lib/api'
import type { Navigate, Recipe } from '../../types'
import { formatErrors } from '../../utils/formatErrors'
import { titleize } from '../../utils/titleize'

export function CuisinePage({ cuisine, navigate }: { cuisine: string; navigate: Navigate }) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    apiFetch<Recipe[]>(`/api/recipes/?cuisine=${encodeURIComponent(cuisine)}`)
      .then((response) => {
        if (!active) return
        setRecipes(response)
      })
      .catch((requestError) => {
        if (!active) return
        setError(formatErrors(requestError))
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [cuisine])

  if (error) return <MessagePage title={`${titleize(cuisine)} unavailable`} message={error} navigate={navigate} />

  return (
    <section className="page-band">
      <div className="page-inner">
        <div className="section-heading centered">
          <h1>{titleize(cuisine)}</h1>
        </div>
        {loading ? (
          <p className="muted">Loading recipes...</p>
        ) : recipes.length ? (
          <RecipeGrid recipes={recipes} navigate={navigate} />
        ) : (
          <p className="empty-state">There are no recipes under this cuisine at this time.</p>
        )}
      </div>
    </section>
  )
}
