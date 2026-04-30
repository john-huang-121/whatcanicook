import type { AuthState, Navigate, SetAuth } from '../types'
import { CuisineIndexPage } from './CuisineIndexPage'
import { CuisinePage } from './CuisinePage'
import { DeleteRecipePage } from './DeleteRecipePage'
import { HomePage } from './HomePage'
import { LoginPage } from './LoginPage'
import { NotFoundPage } from './NotFoundPage'
import { ProfilePage } from './ProfilePage'
import { RecipeDetailPage } from './RecipeDetailPage'
import { RecipeFormPage } from './RecipeFormPage'
import { SignupPage } from './SignupPage'

export function RouteSwitch({
  path,
  auth,
  setAuth,
  navigate,
}: {
  path: string
  auth: AuthState
  setAuth: SetAuth
  navigate: Navigate
}) {
  const recipeDetailMatch = path.match(/^\/recipes\/(\d+)$/)
  const recipeEditMatch = path.match(/^\/recipes\/(\d+)\/edit$/)
  const recipeDeleteMatch = path.match(/^\/recipes\/(\d+)\/delete$/)
  const cuisineMatch = path.match(/^\/recipes\/cuisine\/([a-z_]+)$/)

  if (path === '/') return <HomePage auth={auth} navigate={navigate} />
  if (path === '/recipes') return <CuisineIndexPage navigate={navigate} />
  if (path === '/recipes/new') return <RecipeFormPage auth={auth} navigate={navigate} />
  if (path === '/login') return <LoginPage setAuth={setAuth} navigate={navigate} />
  if (path === '/signup') return <SignupPage setAuth={setAuth} navigate={navigate} />
  if (path === '/profile') return <ProfilePage auth={auth} navigate={navigate} setAuth={setAuth} />
  if (recipeEditMatch) return <RecipeFormPage auth={auth} navigate={navigate} recipeId={Number(recipeEditMatch[1])} />
  if (recipeDeleteMatch) return <DeleteRecipePage auth={auth} navigate={navigate} recipeId={Number(recipeDeleteMatch[1])} />
  if (recipeDetailMatch) return <RecipeDetailPage auth={auth} navigate={navigate} recipeId={Number(recipeDetailMatch[1])} />
  if (cuisineMatch) return <CuisinePage cuisine={cuisineMatch[1]} navigate={navigate} />

  return <NotFoundPage navigate={navigate} />
}
