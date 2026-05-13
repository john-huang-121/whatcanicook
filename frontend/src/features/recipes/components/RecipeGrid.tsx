import ButtonBase from '@mui/material/ButtonBase'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import { recipeImage } from '../../../config/constants'
import type { Navigate, Recipe } from '../../../types'

export function RecipeGrid({ recipes, navigate }: { recipes: Recipe[]; navigate: Navigate }) {
  return (
    <div className="recipe-grid">
      {recipes.map((recipe) => (
        <Card component="article" className="recipe-card" key={recipe.id}>
          <ButtonBase
            component="button"
            className="recipe-card-button"
            type="button"
            onClick={() => navigate(`/recipes/${recipe.id}`)}
          >
            <div className="recipe-card-image">
              <img src={recipe.image_url || recipeImage} alt="" />
            </div>
            <div className="recipe-card-body">
              <div className="recipe-card-tags">
                <Chip className="recipe-tag" label={recipe.cuisine_label} size="small" />
                {!recipe.is_public && <Chip className="recipe-privacy" color="error" label="Private" size="small" />}
              </div>
              <h2>{recipe.title}</h2>
              <p className="recipe-card-author">By {recipe.created_by_username}</p>
              <dl className="recipe-card-details">
                <div>
                  <dt>Time</dt>
                  <dd>{recipe.total_time} min</dd>
                </div>
                <div>
                  <dt>Prep</dt>
                  <dd>{recipe.prep_time ? `${recipe.prep_time} min` : 'Flexible'}</dd>
                </div>
                <div>
                  <dt>Serves</dt>
                  <dd>{recipe.servings}</dd>
                </div>
              </dl>
              <p className="recipe-card-meta">
                {recipe.like_count} likes / {recipe.save_count} saves
              </p>
            </div>
          </ButtonBase>
        </Card>
      ))}
    </div>
  )
}
