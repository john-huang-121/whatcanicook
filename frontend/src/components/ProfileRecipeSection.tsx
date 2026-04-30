import type { Navigate, Recipe } from '../types'

export function ProfileRecipeSection({ title, recipes, navigate }: { title: string; recipes: Recipe[]; navigate: Navigate }) {
  return (
    <section className="recipe-list-section">
      <div className="form-section-header">
        <div>
          <p className="eyebrow">Your Recipes</p>
          <h2>{title}</h2>
        </div>
        {title === 'Public' && (
          <button type="button" className="primary-button" onClick={() => navigate('/recipes/new')}>
            New Recipe
          </button>
        )}
      </div>
      {recipes.length ? (
        <div className="recipe-list">
          {recipes.map((recipe) => (
            <button key={recipe.id} type="button" onClick={() => navigate(`/recipes/${recipe.id}`)}>
              <span>
                <strong>{recipe.title}</strong>
                <small>{recipe.published_date}</small>
              </span>
              <em className={recipe.is_public ? 'success-text' : 'danger-text'}>{recipe.is_public ? 'Public' : 'Private'}</em>
            </button>
          ))}
        </div>
      ) : (
        <p className="muted">You do not have any {title.toLowerCase()} recipes.</p>
      )}
    </section>
  )
}
