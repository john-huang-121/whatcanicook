import { useEffect, useState } from 'react'
import { apiFetch } from '../api'
import type { AuthState, Navigate, Recipe } from '../types'
import { formatErrors } from '../utils/formatErrors'
import { titleize } from '../utils/titleize'
import { Fact } from './Fact'
import { LoadingPage } from './LoadingPage'
import { MessagePage } from './MessagePage'

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

          <div className="facts-grid">
            <Fact label="Prep Time" value={recipe.prep_time ? `${recipe.prep_time} minutes` : 'Not listed'} />
            <Fact label="Cook Time" value={`${recipe.cook_time} minutes`} />
            <Fact label="Servings" value={String(recipe.servings)} />
            <Fact label="Cuisine" value={recipe.cuisine_label || titleize(recipe.cuisine)} />
          </div>

          <section className="content-section">
            <h2>Ingredients</h2>
            {recipe.ingredients.length ? (
              <ul className="ingredient-list">
                {recipe.ingredients.map((item) => (
                  <li key={item.id}>
                    {item.quantity} {item.unit} {item.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No ingredients listed yet.</p>
            )}
          </section>

          <section className="content-section">
            <h2>Instructions</h2>
            <p className="pre-line">{recipe.instructions}</p>
          </section>
        </div>
      </div>
    </section>
  )
}
