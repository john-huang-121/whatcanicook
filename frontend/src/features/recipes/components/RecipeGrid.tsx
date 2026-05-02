import { recipeImage } from '../../../config/constants'
import type { Navigate, Recipe } from '../../../types'

export function RecipeGrid({ recipes, navigate }: { recipes: Recipe[]; navigate: Navigate }) {
  return (
    <div className="recipe-grid">
      {recipes.map((recipe) => (
        <article className="recipe-card" key={recipe.id}>
          <button type="button" onClick={() => navigate(`/recipes/${recipe.id}`)}>
            <img src={recipeImage} alt="" />
            <span>{recipe.total_time} Minutes</span>
            {!recipe.is_public && <strong>Private to you</strong>}
            <h2>{recipe.title}</h2>
            <p>By {recipe.created_by_username}</p>
            <p className="recipe-card-meta">
              {recipe.like_count} likes / {recipe.save_count} saves
            </p>
          </button>
        </article>
      ))}
    </div>
  )
}
