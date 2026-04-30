import { useEffect, useState } from 'react'
import { apiFetch } from '../api'
import type { AuthState, Navigate, Recipe } from '../types'
import { formatErrors } from '../utils/formatErrors'
import { LoginRequiredPage } from './LoginRequiredPage'

export function DeleteRecipePage({ auth, navigate, recipeId }: { auth: AuthState; navigate: Navigate; recipeId: number }) {
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
  }, [recipeId])

  if (!auth.loading && !auth.authenticated) {
    return <LoginRequiredPage navigate={navigate} />
  }

  async function deleteRecipe() {
    setError('')
    try {
      await apiFetch<void>(`/api/recipes/${recipeId}/`, { method: 'DELETE' })
      navigate('/recipes')
    } catch (requestError) {
      setError(formatErrors(requestError))
    }
  }

  return (
    <section className="page-band">
      <div className="form-shell compact">
        <h1>Delete Recipe</h1>
        {error && <p className="form-error">{error}</p>}
        <p>Confirm that you want to delete {recipe ? <strong>{recipe.title}</strong> : 'this recipe'}.</p>
        <div className="action-row">
          <button type="button" className="danger-button" onClick={() => void deleteRecipe()}>
            Delete
          </button>
          <button type="button" className="text-button" onClick={() => navigate(`/recipes/${recipeId}`)}>
            Cancel
          </button>
        </div>
      </div>
    </section>
  )
}
