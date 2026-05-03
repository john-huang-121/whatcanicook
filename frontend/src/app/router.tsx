import type { AuthState, Navigate, SetAuth } from '../types'
import { LoginPage } from '../features/auth/LoginPage'
import { SignupPage } from '../features/auth/SignupPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { HomePage } from '../features/home/HomePage'
import { ProfilePage } from '../features/profile/ProfilePage'
import { CuisineIndexPage } from '../features/recipes/CuisineIndexPage'
import { CuisinePage } from '../features/recipes/CuisinePage'
import { DeleteRecipePage } from '../features/recipes/DeleteRecipePage'
import { RecipeCollectionPage } from '../features/recipes/RecipeCollectionPage'
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
  const [pathname, queryString = ''] = path.split('?')
  const searchParams = new URLSearchParams(queryString)
  const recipeDetailMatch = pathname.match(/^\/recipes\/(\d+)$/)
  const recipeEditMatch = pathname.match(/^\/recipes\/(\d+)\/edit$/)
  const recipeDeleteMatch = pathname.match(/^\/recipes\/(\d+)\/delete$/)
  const cuisineMatch = pathname.match(/^\/recipes\/cuisine\/([a-z_]+)$/)

  if (pathname === '/') return <HomePage auth={auth} navigate={navigate} />
  if (pathname === '/dashboard') return <DashboardPage auth={auth} navigate={navigate} />
  if (pathname === '/recipes')
    return <CuisineIndexPage key={searchParams.get('q') ?? ''} navigate={navigate} searchQuery={searchParams.get('q') ?? ''} />
  if (pathname === '/recipes/new') return <RecipeFormPage auth={auth} navigate={navigate} />
  if (pathname === '/recipes/mine') return <RecipeCollectionPage key="mine" auth={auth} kind="mine" navigate={navigate} />
  if (pathname === '/recipes/saved') return <RecipeCollectionPage key="saved" auth={auth} kind="saved" navigate={navigate} />
  if (pathname === '/login') return <LoginPage setAuth={setAuth} navigate={navigate} />
  if (pathname === '/signup') return <SignupPage setAuth={setAuth} navigate={navigate} />
  if (pathname === '/profile') return <ProfilePage auth={auth} navigate={navigate} setAuth={setAuth} />
  if (recipeEditMatch) return <RecipeFormPage auth={auth} navigate={navigate} recipeId={Number(recipeEditMatch[1])} />
  if (recipeDeleteMatch) return <DeleteRecipePage auth={auth} navigate={navigate} recipeId={Number(recipeDeleteMatch[1])} />
  if (recipeDetailMatch) return <RecipeDetailPage auth={auth} navigate={navigate} recipeId={Number(recipeDetailMatch[1])} />
  if (cuisineMatch) return <CuisinePage cuisine={cuisineMatch[1]} navigate={navigate} />

  return <NotFoundPage navigate={navigate} />
}
