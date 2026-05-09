import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import { LoadingPage } from '../../components/LoadingPage'
import { MessagePage } from '../../components/MessagePage'
import { RecipeFact } from './components/RecipeFact'
import { apiFetch } from '../../lib/api'
import type { AuthState, FollowResponse, Navigate, Recipe } from '../../types'
import { formatErrors } from '../../utils/formatErrors'
import { titleize } from '../../utils/titleize'

type RecipeAction = 'like' | 'save'
type BusyAction = RecipeAction | 'follow' | null

export function RecipeDetailPage({ auth, navigate, recipeId }: { auth: AuthState; navigate: Navigate; recipeId: number }) {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyAction, setBusyAction] = useState<BusyAction>(null)

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

  function requireLogin() {
    if (auth.authenticated) {
      return true
    }
    navigate('/login')
    return false
  }

  async function toggleRecipeAction(action: RecipeAction) {
    if (!recipe || !requireLogin()) return

    setActionError('')
    setBusyAction(action)
    const active = action === 'like' ? recipe.is_liked : recipe.is_saved

    try {
      const updatedRecipe = await apiFetch<Recipe>(`/api/recipes/${recipe.id}/${action}/`, {
        method: active ? 'DELETE' : 'POST',
      })
      setRecipe(updatedRecipe)
    } catch (requestError) {
      setActionError(formatErrors(requestError))
    } finally {
      setBusyAction(null)
    }
  }

  async function toggleFollowAuthor() {
    if (!recipe || !requireLogin()) return

    setActionError('')
    setBusyAction('follow')

    try {
      const follow = await apiFetch<FollowResponse>(`/api/users/${recipe.created_by}/follow/`, {
        method: recipe.is_following_author ? 'DELETE' : 'POST',
      })
      setRecipe((current) =>
        current
          ? {
              ...current,
              is_following_author: follow.is_following,
              author_follower_count: follow.follower_count,
            }
          : current,
      )
    } catch (requestError) {
      setActionError(formatErrors(requestError))
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <section className="page-band">
      <div className="detail-shell">
        <div className={`recipe-hero-image ${recipe.image_url ? 'has-image' : ''}`}>
          {recipe.image_url ? <img src={recipe.image_url} alt={recipe.title} /> : 'Recipe Image'}
        </div>
        <div className="detail-content">
          <div className="detail-header">
            <div>
              <h1>{recipe.title}</h1>
              <p>
                By {recipe.created_by_username} on {recipe.published_date}
              </p>
              <p className="muted">{recipe.author_follower_count} followers</p>
            </div>
            <div className="status-stack">
              <Chip color={recipe.is_public ? 'success' : 'error'} label={recipe.is_public ? 'Public' : 'Private'} />
              {recipe.is_owner && (
                <div className="mini-actions">
                  <Button type="button" variant="text" onClick={() => navigate(`/recipes/${recipe.id}/edit`)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    color="error"
                    variant="text"
                    onClick={() => navigate(`/recipes/${recipe.id}/delete`)}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="social-actions">
            {recipe.is_public && !recipe.is_owner && (
              <Button
                type="button"
                className={recipe.is_liked ? 'primary-button' : 'secondary-button'}
                variant={recipe.is_liked ? 'contained' : 'outlined'}
                onClick={() => void toggleRecipeAction('like')}
                loading={busyAction === 'like'}
              >
                {recipe.is_liked ? 'Liked' : 'Like'} ({recipe.like_count})
              </Button>
            )}
            <Button
              type="button"
              className={recipe.is_saved ? 'primary-button' : 'secondary-button'}
              variant={recipe.is_saved ? 'contained' : 'outlined'}
              onClick={() => void toggleRecipeAction('save')}
              loading={busyAction === 'save'}
            >
              {recipe.is_saved ? 'Saved' : 'Save'} ({recipe.save_count})
            </Button>
            {recipe.is_public && !recipe.is_owner && (
              <Button
                type="button"
                className={recipe.is_following_author ? 'primary-button' : 'secondary-button'}
                variant={recipe.is_following_author ? 'contained' : 'outlined'}
                onClick={() => void toggleFollowAuthor()}
                loading={busyAction === 'follow'}
              >
                {recipe.is_following_author ? 'Following' : `Follow ${recipe.created_by_username}`}
              </Button>
            )}
          </div>
          {actionError && (
            <Alert className="compact-error" severity="error">
              {actionError}
            </Alert>
          )}

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
                    {item.review_status === 'under_review' && (
                      <span className="ingredient-review-status"> - Under review</span>
                    )}
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
