import { useEffect, useState } from 'react'
import ButtonBase from '@mui/material/ButtonBase'
import Card from '@mui/material/Card'
import { recipeImage } from '../../../config/constants'
import type { Navigate, Recipe } from '../../../types'
import { RecipeLikeButton } from './RecipeLikeButton'

export function RecipeCard({
  className = '',
  navigate,
  recipe,
}: {
  className?: string
  navigate: Navigate
  recipe: Recipe
}) {
  const [displayRecipe, setDisplayRecipe] = useState(recipe)
  const cardClassName = ['recipe-card', 'dashboard-recipe-card', className].filter(Boolean).join(' ')

  useEffect(() => {
    setDisplayRecipe(recipe)
  }, [recipe])

  return (
    <Card component="article" className={cardClassName}>
      <div className="recipe-card-image">
        <ButtonBase
          component="button"
          className="recipe-card-image-button"
          type="button"
          onClick={() => navigate(`/recipes/${displayRecipe.id}`)}
        >
          <img src={displayRecipe.image_url || recipeImage} alt="" />
        </ButtonBase>
        <RecipeLikeButton navigate={navigate} onChange={setDisplayRecipe} recipe={displayRecipe} />
      </div>
      <ButtonBase
        component="button"
        className="recipe-card-button recipe-card-content-button"
        type="button"
        onClick={() => navigate(`/recipes/${displayRecipe.id}`)}
      >
        <div className="recipe-card-body dashboard-recipe-card-body">
          <h2>{displayRecipe.title}</h2>
          <p className="dashboard-recipe-card-rating" aria-label={`${displayRecipe.like_count} likes`}>
            <span aria-hidden="true">{'\u2606 \u2606 \u2606 \u2606 \u2606'}</span>
            <small>({displayRecipe.like_count})</small>
          </p>
          <div className="dashboard-recipe-card-footer">
            <span>{displayRecipe.total_time ? `${displayRecipe.total_time} mins` : 'Quick recipe'}</span>
            <strong>From {displayRecipe.created_by_username}</strong>
          </div>
        </div>
      </ButtonBase>
    </Card>
  )
}

export function RecipeGrid({ recipes, navigate }: { recipes: Recipe[]; navigate: Navigate }) {
  return (
    <div className="recipe-grid">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} navigate={navigate} />
      ))}
    </div>
  )
}
