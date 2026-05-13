import { useEffect, useMemo, useState } from 'react'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import LocalDiningIcon from '@mui/icons-material/LocalDining'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import WhatshotIcon from '@mui/icons-material/Whatshot'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import { ImageCarousel } from '../../components/ImageCarousel'
import { LoadingPage } from '../../components/LoadingPage'
import { MessagePage } from '../../components/MessagePage'
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

  const recipeImages = useMemo(() => {
    if (!recipe) return []

    const uploadedImages = recipe.images
      .slice()
      .sort((firstImage, secondImage) => firstImage.position - secondImage.position)
      .map((image, index) => ({
        alt: `${recipe.title} image ${index + 1}`,
        url: image.image_url,
      }))
      .filter((image) => image.url)

    if (uploadedImages.length) return uploadedImages.slice(0, 5)
    return recipe.image_url ? [{ alt: recipe.title, url: recipe.image_url }] : []
  }, [recipe])

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

  const cuisineLabel = recipe.cuisine_label || titleize(recipe.cuisine)
  const recipeFacts = [
    {
      icon: <AccessTimeIcon aria-hidden="true" />,
      label: 'Total Time',
      value: `${recipe.total_time} Minutes`,
    },
    {
      icon: <RestaurantIcon aria-hidden="true" />,
      label: 'Servings',
      value: `${recipe.servings} ${recipe.servings === 1 ? 'Person' : 'People'}`,
    },
    {
      icon: <WhatshotIcon aria-hidden="true" />,
      label: 'Cook Time',
      value: `${recipe.cook_time} Minutes`,
    },
    {
      icon: <LocalDiningIcon aria-hidden="true" />,
      label: 'Cuisine',
      value: cuisineLabel,
    },
  ]

  return (
    <section className="page-band recipe-detail-page">
      <div className="detail-shell recipe-detail-shell">
        <ImageCarousel
          ariaLabel="Recipe image carousel"
          className="recipe-detail-carousel"
          emptyLabel="Recipe Image"
          images={recipeImages}
          maxFloatingImages={5}
        />

        <div className="detail-content recipe-detail-content">
          <header className="recipe-detail-heading">
            <div className="recipe-detail-tags">
              <Chip className="recipe-detail-tag seasonal" label={cuisineLabel} size="small" />
              <Chip
                className="recipe-detail-tag heritage"
                label={recipe.is_public ? 'Public Recipe' : 'Private Recipe'}
                size="small"
              />
            </div>
            <div className="recipe-detail-title-row">
              <div>
                <h1>{recipe.title}</h1>
                <p className="recipe-detail-byline">
                  By {recipe.created_by_username} on {recipe.published_date} / {recipe.author_follower_count} followers
                </p>
              </div>
              {recipe.is_owner && (
                <div className="mini-actions recipe-owner-actions">
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
          </header>

          <section className="recipe-detail-facts" aria-label="Recipe facts">
            {recipeFacts.map((fact) => (
              <Paper className="recipe-detail-fact" elevation={0} key={fact.label}>
                {fact.icon}
                <div>
                  <h3>{fact.label}</h3>
                  <p>{fact.value}</p>
                </div>
              </Paper>
            ))}
          </section>

          <div className="social-actions recipe-detail-actions">
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

          <div className="recipe-detail-body-grid">
            <div className="recipe-detail-main-column">
              <Paper className="recipe-story-card" elevation={0}>
                <h2>The Story Behind the Dish</h2>
                <p>{recipe.description || 'No story has been added for this recipe yet.'}</p>
              </Paper>

              <section className="content-section recipe-instructions-section">
                <h2>Instructions</h2>
                {recipe.instructions.length ? (
                  <ol className="instruction-list recipe-detail-instructions">
                    {recipe.instructions.map((item) => (
                      <li key={item.id}>
                        <span className="recipe-instruction-number">{item.step_number}</span>
                        <p>{item.text}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="muted">No instructions listed yet.</p>
                )}
              </section>
            </div>

            <Paper className="recipe-ingredients-card" component="aside" elevation={0}>
              <h2>Ingredients</h2>
              {recipe.ingredients.length ? (
                <ul className="ingredient-list recipe-detail-ingredients">
                  {recipe.ingredients.map((item) => (
                    <li key={item.id}>
                      <span>{`${item.quantity} ${[item.unit_label, item.name].filter(Boolean).join(' ')}`}</span>
                      {item.note && <small>{item.note}</small>}
                      {item.review_status === 'under_review' && <small>Under review</small>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No ingredients listed yet.</p>
              )}
            </Paper>
          </div>
        </div>
      </div>
    </section>
  )
}
