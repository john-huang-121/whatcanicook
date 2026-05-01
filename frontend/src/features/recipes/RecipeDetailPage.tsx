import { useEffect, useState } from 'react'
import { LoadingPage } from '../../components/LoadingPage'
import { MessagePage } from '../../components/MessagePage'
import { RecipeFact } from './components/RecipeFact'
import { apiFetch } from '../../lib/api'
import type { AuthState, Navigate, Recipe } from '../../types'
import { formatErrors } from '../../utils/formatErrors'
import { titleize } from '../../utils/titleize'

export function RecipeDetailPage({ auth, navigate, recipeId }: { auth: AuthState; navigate: Navigate; recipeId: number }) {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    apiFetch<Recipe>(`/api/recipes/${recipeId}/`)
      .then((response) => {
        if (!active) return
        setRecipe(response)
      })
      .catch((requestError) => {
        if (!active) return
        setError(formatErrors(requestError))
      })

    return () => {
      active = false
    }
  }, [recipeId, auth.authenticated])

  if (error) return <MessagePage title="Recipe unavailable" message={error} navigate={navigate} />
  if (!recipe) return <LoadingPage message="Loading recipe..." />

  return (
    <section className="page-band">
      <div className="detail-shell">
        <div className="recipe-hero-image">Recipe Image</div>
        <div className="detail-content">
          <div className="detail-header">
            <div>
              <h1>{recipe.title}</h1>
              <p>
                By {recipe.created_by_username} on {recipe.published_date}
              </p>
            </div>
            <div className="status-stack">
              <span className={recipe.is_public ? 'pill success' : 'pill danger'}>
                {recipe.is_public ? 'Public' : 'Private'}
              </span>
              {recipe.is_owner && (
                <div className="mini-actions">
                  <button type="button" onClick={() => navigate(`/recipes/${recipe.id}/edit`)}>
                    Edit
                  </button>
                  <button type="button" className="danger-link" onClick={() => navigate(`/recipes/${recipe.id}/delete`)}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {recipe.description && <p className="lead">{recipe.description}</p>}

          <div className="recipe-facts-grid">
            <RecipeFact label="Prep Time" value={recipe.prep_time ? `${recipe.prep_time} minutes` : 'Not listed'} />
            <RecipeFact label="Cook Time" value={`${recipe.cook_time} minutes`} />
            <RecipeFact label="Servings" value={String(recipe.servings)} />
            <RecipeFact label="Cuisine" value={recipe.cuisine_label || titleize(recipe.cuisine)} />
          </div>

          <section className="content-section">
            <h2>Ingredients</h2>
            {recipe.ingredients.length ? (
              <ul className="ingredient-list">
                {recipe.ingredients.map((item) => (
                  <li key={item.id}>
                    {`${item.quantity} ${[item.unit_label, item.name].filter(Boolean).join(' ')}`}
                    {item.note && <span className="muted"> ({item.note})</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No ingredients listed yet.</p>
            )}
          </section>

          <section className="content-section">
            <h2>Instructions</h2>
            {recipe.instructions.length ? (
              <ol className="instruction-list">
                {recipe.instructions.map((item) => (
                  <li key={item.id}>{item.text}</li>
                ))}
              </ol>
            ) : (
              <p className="muted">No instructions listed yet.</p>
            )}
          </section>
        </div>
      </div>
    </section>
  )
}
