import { useState } from 'react'
import { ApiError, apiFetch } from '../../../lib/api'
import type { Navigate, Recipe } from '../../../types'
import { formatErrors } from '../../../utils/formatErrors'

export function RecipeLikeButton({
  onChange,
  recipe,
  navigate,
}: {
  onChange: (recipe: Recipe) => void
  recipe: Recipe
  navigate: Navigate
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const canLike = recipe.is_public && !recipe.is_owner
  const heartIcon = recipe.is_liked ? '/heart-favicon-liked-filled.png' : '/heart-favicon.png'

  async function toggleLike() {
    if (!canLike || busy) return

    setBusy(true)
    setError('')

    try {
      const updatedRecipe = await apiFetch<Recipe>(`/api/recipes/${recipe.id}/like/`, {
        method: recipe.is_liked ? 'DELETE' : 'POST',
      })
      onChange(updatedRecipe)
    } catch (requestError) {
      if (requestError instanceof ApiError && [401, 403].includes(requestError.status)) {
        navigate('/login')
        return
      }

      setError(formatErrors(requestError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      aria-label={recipe.is_liked ? `Unlike ${recipe.title}` : `Like ${recipe.title}`}
      aria-pressed={recipe.is_liked}
      className={`recipe-like-button ${recipe.is_liked ? 'liked' : ''}`}
      disabled={!canLike || busy}
      onClick={() => void toggleLike()}
      title={error || undefined}
    >
      <img src={heartIcon} alt="" />
    </button>
  )
}
