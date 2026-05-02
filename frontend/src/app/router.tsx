import type { AuthState, Navigate, SetAuth } from '../types'
import { LoginPage } from '../features/auth/LoginPage'
import { SignupPage } from '../features/auth/SignupPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { HomePage } from '../features/home/HomePage'
import { ProfilePage } from '../features/profile/ProfilePage'
import { CuisineIndexPage } from '../features/recipes/CuisineIndexPage'
import { CuisinePage } from '../features/recipes/CuisinePage'
import { DeleteRecipePage } from '../features/recipes/DeleteRecipePage'
import { RecipeDetailPage } from '../features/recipes/RecipeDetailPage'
import { RecipeFormPage } from '../features/recipes/RecipeFormPage'
import { NotFoundPage } from '../components/NotFoundPage'

export function AppRouter({
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
  if (path === '/dashboard') return <DashboardPage auth={auth} navigate={navigate} />
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
