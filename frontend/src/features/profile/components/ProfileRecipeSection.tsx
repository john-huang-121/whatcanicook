import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import type { Navigate, Recipe } from '../../../types'

export function ProfileRecipeSection({ title, recipes, navigate }: { title: string; recipes: Recipe[]; navigate: Navigate }) {
  return (
    <section className="recipe-list-section">
      <div className="form-section-header">
        <div>
          <p className="eyebrow">Your Recipes</p>
          <h2>{title}</h2>
        </div>
        {title === 'Public' && (
          <Button type="button" className="primary-button" variant="contained" onClick={() => navigate('/recipes/new')}>
            New Recipe
          </Button>
        )}
      </div>
      {recipes.length ? (
        <List className="recipe-list" disablePadding>
          {recipes.map((recipe) => (
            <ListItemButton key={recipe.id} className="recipe-list-item" onClick={() => navigate(`/recipes/${recipe.id}`)}>
              <ListItemText primary={recipe.title} secondary={recipe.published_date} />
              <Chip
                color={recipe.is_public ? 'success' : 'error'}
                label={recipe.is_public ? 'Public' : 'Private'}
                size="small"
                variant="outlined"
              />
            </ListItemButton>
          ))}
        </List>
      ) : (
        <p className="muted">You do not have any {title.toLowerCase()} recipes.</p>
      )}
    </section>
  )
}
