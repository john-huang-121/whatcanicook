import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, MouseEvent, ReactNode } from 'react'
import './App.css'
import { ApiError, apiFetch } from './api'
import type {
  AuthResponse,
  Cuisine,
  Profile,
  Recipe,
  RecipeIngredientInput,
  RecipePayload,
  User,
} from './types'

const recipeImage =
  'https://www.allrecipes.com/thmb/oggFsonsSCzd8D4MX0CBwx1BnJ4=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/9400782-66267980c5c54f64acbfbf5bec31dd5b.jpg'

type AuthState = {
  loading: boolean
  authenticated: boolean
  user: User | null
}

type Navigate = (to: string) => void

function formatErrors(error: unknown) {
  if (error instanceof ApiError) {
    if (typeof error.data === 'string') {
      return error.data
    }
    if (error.data && typeof error.data === 'object') {
      return Object.entries(error.data)
        .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : String(messages)}`)
        .join(' ')
    }
  }
  return 'Something went wrong. Please try again.'
}

function titleize(value: string) {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function usePath() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((to: string) => {
    window.history.pushState({}, '', to)
    setPath(to)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return { path, navigate }
}

function AppLink({
  to,
  navigate,
  className,
  children,
}: {
  to: string
  navigate: Navigate
  className?: string
  children: ReactNode
}) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    navigate(to)
  }

  return (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  )
}

function App() {
  const { path, navigate } = usePath()
  const [auth, setAuth] = useState<AuthState>({ loading: true, authenticated: false, user: null })

  useEffect(() => {
    let active = true

    apiFetch<AuthResponse>('/api/auth/me/')
      .then((response) => {
        if (!active) return
        setAuth({
          loading: false,
          authenticated: response.authenticated,
          user: response.user,
        })
      })
      .catch(() => {
        if (!active) return
        setAuth({ loading: false, authenticated: false, user: null })
      })

    return () => {
      active = false
    }
  }, [])

  async function logout() {
    await apiFetch<void>('/api/auth/logout/', { method: 'POST' })
    setAuth({ loading: false, authenticated: false, user: null })
    navigate('/')
  }

  return (
    <div className="app-shell">
      <Navbar auth={auth} navigate={navigate} logout={logout} />
      <main>
        <RouteSwitch path={path} auth={auth} setAuth={setAuth} navigate={navigate} />
      </main>
    </div>
  )
}

function Navbar({
  auth,
  navigate,
  logout,
}: {
  auth: AuthState
  navigate: Navigate
  logout: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const closeAndNavigate = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  return (
    <header className="navbar">
      <AppLink to="/" navigate={navigate} className="brand">
        <span className="brand-mark">W</span>
        <span>WhatCanICook</span>
      </AppLink>
      <button className="icon-button menu-button" type="button" onClick={() => setOpen((value) => !value)}>
        <span>{open ? 'Close' : 'Menu'}</span>
      </button>
      <nav className={`nav-links ${open ? 'open' : ''}`}>
        <button type="button" onClick={() => closeAndNavigate('/recipes')}>
          Browse Recipes
        </button>
        {auth.authenticated ? (
          <>
            <button type="button" onClick={() => closeAndNavigate('/recipes/new')}>
              Create A Recipe
            </button>
            <button type="button" onClick={() => closeAndNavigate('/profile')}>
              My Profile
            </button>
            <span className="nav-greeting">Hi, {auth.user?.profile.display_name || auth.user?.username}</span>
            <button type="button" onClick={() => void logout()}>
              Log out
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => closeAndNavigate('/login')}>
              Log in
            </button>
            <button type="button" onClick={() => closeAndNavigate('/signup')}>
              Sign up
            </button>
          </>
        )}
      </nav>
    </header>
  )
}

function RouteSwitch({
  path,
  auth,
  setAuth,
  navigate,
}: {
  path: string
  auth: AuthState
  setAuth: (auth: AuthState) => void
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

function HomePage({ auth, navigate }: { auth: AuthState; navigate: Navigate }) {
  return (
    <section className="hero-page">
      <div className="hero-content">
        <p className="eyebrow">WhatCanICook</p>
        <h1>Explore recipes from different cuisines.</h1>
        <p>Browse what others are cooking, then craft your own recipes and decide what stays private.</p>
        <div className="action-row">
          <AppLink to="/recipes" navigate={navigate} className="primary-button">
            Get started
          </AppLink>
          <AppLink to={auth.authenticated ? '/recipes/new' : '/signup'} navigate={navigate} className="text-button">
            {auth.authenticated ? 'Create a recipe' : 'Create an account'}
          </AppLink>
        </div>
      </div>
    </section>
  )
}

function CuisineIndexPage({ navigate }: { navigate: Navigate }) {
  const [cuisines, setCuisines] = useState<Cuisine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<Cuisine[]>('/api/cuisines/')
      .then(setCuisines)
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="page-band">
      <div className="page-inner">
        <div className="section-heading centered">
          <p className="eyebrow">Browse</p>
          <h1>Cuisines</h1>
          <p>
            Cuisines reflect ingredients, techniques, and traditions from a culture, region, or country.
          </p>
        </div>
        {loading ? (
          <p className="muted">Loading cuisines...</p>
        ) : (
          <div className="cuisine-grid">
            {cuisines.map((cuisine) => (
              <button key={cuisine.value} type="button" onClick={() => navigate(`/recipes/cuisine/${cuisine.value}`)}>
                {cuisine.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function CuisinePage({ cuisine, navigate }: { cuisine: string; navigate: Navigate }) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<Recipe[]>(`/api/recipes/?cuisine=${encodeURIComponent(cuisine)}`)
      .then(setRecipes)
      .finally(() => setLoading(false))
  }, [cuisine])

  return (
    <section className="page-band">
      <div className="page-inner">
        <div className="section-heading centered">
          <h1>{titleize(cuisine)}</h1>
        </div>
        {loading ? (
          <p className="muted">Loading recipes...</p>
        ) : recipes.length ? (
          <RecipeGrid recipes={recipes} navigate={navigate} />
        ) : (
          <p className="empty-state">There are no recipes under this cuisine at this time.</p>
        )}
      </div>
    </section>
  )
}

function RecipeGrid({ recipes, navigate }: { recipes: Recipe[]; navigate: Navigate }) {
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
          </button>
        </article>
      ))}
    </div>
  )
}

function RecipeDetailPage({ auth, navigate, recipeId }: { auth: AuthState; navigate: Navigate; recipeId: number }) {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch<Recipe>(`/api/recipes/${recipeId}/`)
      .then(setRecipe)
      .catch((requestError) => setError(formatErrors(requestError)))
  }, [recipeId, auth.authenticated])

  if (error) return <MessagePage title="Recipe unavailable" message={error} navigate={navigate} />
  if (!recipe) return <LoadingPage message="Loading recipe..." />

  return (
    <section className="page-band">
      <div className="detail-shell">
        <div className="recipe-hero-image">Recipe Image</div>
        <div className="detail-content">
          <div className="detail-header">
            <div>
              <h1>{recipe.title}</h1>
              <p>
                By {recipe.created_by_username} on {recipe.published_date}
              </p>
            </div>
            <div className="status-stack">
              <span className={recipe.is_public ? 'pill success' : 'pill danger'}>
                {recipe.is_public ? 'Public' : 'Private'}
              </span>
              {recipe.is_owner && (
                <div className="mini-actions">
                  <button type="button" onClick={() => navigate(`/recipes/${recipe.id}/edit`)}>
                    Edit
                  </button>
                  <button type="button" className="danger-link" onClick={() => navigate(`/recipes/${recipe.id}/delete`)}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {recipe.description && <p className="lead">{recipe.description}</p>}

          <div className="facts-grid">
            <Fact label="Prep Time" value={recipe.prep_time ? `${recipe.prep_time} minutes` : 'Not listed'} />
            <Fact label="Cook Time" value={`${recipe.cook_time} minutes`} />
            <Fact label="Servings" value={String(recipe.servings)} />
            <Fact label="Cuisine" value={recipe.cuisine_label || titleize(recipe.cuisine)} />
          </div>

          <section className="content-section">
            <h2>Ingredients</h2>
            {recipe.ingredients.length ? (
              <ul className="ingredient-list">
                {recipe.ingredients.map((item) => (
                  <li key={item.id}>
                    {item.quantity} {item.unit} {item.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No ingredients listed yet.</p>
            )}
          </section>

          <section className="content-section">
            <h2>Instructions</h2>
            <p className="pre-line">{recipe.instructions}</p>
          </section>
        </div>
      </div>
    </section>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <h3>{label}</h3>
      <p>{value}</p>
    </div>
  )
}

type RecipeFormState = {
  title: string
  description: string
  instructions: string
  prep_time: string
  cook_time: string
  servings: string
  cuisine: string
  is_public: boolean
  ingredient_items: RecipeIngredientInput[]
}

const emptyRecipeForm: RecipeFormState = {
  title: '',
  description: '',
  instructions: '',
  prep_time: '',
  cook_time: '',
  servings: '',
  cuisine: 'american',
  is_public: true,
  ingredient_items: [{ name: '', quantity: '', unit: '' }],
}

function recipeToForm(recipe: Recipe): RecipeFormState {
  return {
    title: recipe.title,
    description: recipe.description,
    instructions: recipe.instructions,
    prep_time: recipe.prep_time?.toString() ?? '',
    cook_time: recipe.cook_time.toString(),
    servings: recipe.servings.toString(),
    cuisine: recipe.cuisine,
    is_public: recipe.is_public,
    ingredient_items: recipe.ingredients.length
      ? recipe.ingredients.map((item) => ({
          name: item.name,
          quantity: item.quantity.toString(),
          unit: item.unit,
        }))
      : [{ name: '', quantity: '', unit: '' }],
  }
}

function RecipeFormPage({
  auth,
  navigate,
  recipeId,
}: {
  auth: AuthState
  navigate: Navigate
  recipeId?: number
}) {
  const [form, setForm] = useState<RecipeFormState>(emptyRecipeForm)
  const [cuisines, setCuisines] = useState<Cuisine[]>([])
  const [error, setError] = useState('')
  const editing = recipeId !== undefined

  useEffect(() => {
    apiFetch<Cuisine[]>('/api/cuisines/').then(setCuisines).catch(() => setCuisines([]))
  }, [])

  useEffect(() => {
    if (!recipeId) return

    apiFetch<Recipe>(`/api/recipes/${recipeId}/`)
      .then((recipe) => setForm(recipeToForm(recipe)))
      .catch((requestError) => setError(formatErrors(requestError)))
  }, [recipeId])

  if (!auth.loading && !auth.authenticated) {
    return <LoginRequiredPage navigate={navigate} />
  }

  function updateIngredient(index: number, field: keyof RecipeIngredientInput, value: string) {
    setForm((current) => ({
      ...current,
      ingredient_items: current.ingredient_items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }))
  }

  function addIngredient() {
    setForm((current) => ({
      ...current,
      ingredient_items: [...current.ingredient_items, { name: '', quantity: '', unit: '' }],
    }))
  }

  function removeIngredient(index: number) {
    setForm((current) => ({
      ...current,
      ingredient_items: current.ingredient_items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  function toPayload(): RecipePayload {
    return {
      title: form.title,
      description: form.description,
      instructions: form.instructions,
      prep_time: form.prep_time ? Number(form.prep_time) : null,
      cook_time: Number(form.cook_time),
      servings: Number(form.servings),
      cuisine: form.cuisine,
      is_public: form.is_public,
      ingredient_items: form.ingredient_items
        .filter((item) => item.name.trim() && item.quantity)
        .map((item) => ({
          name: item.name.trim(),
          quantity: Number(item.quantity),
          unit: item.unit.trim(),
        })),
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const recipe = await apiFetch<Recipe>(editing ? `/api/recipes/${recipeId}/` : '/api/recipes/', {
        method: editing ? 'PATCH' : 'POST',
        body: toPayload(),
      })
      navigate(`/recipes/${recipe.id}`)
    } catch (requestError) {
      setError(formatErrors(requestError))
    }
  }

  return (
    <section className="page-band">
      <div className="form-shell">
        <h1>{editing ? 'Update Recipe' : 'Create Recipe'}</h1>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={(event) => void submit(event)} className="stacked-form">
          <label>
            Title
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </label>
          <label>
            Description
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <label>
            Instructions
            <textarea
              value={form.instructions}
              onChange={(event) => setForm({ ...form, instructions: event.target.value })}
              required
            />
          </label>
          <div className="form-grid">
            <label>
              Prep Time
              <input
                type="number"
                min="0"
                value={form.prep_time}
                onChange={(event) => setForm({ ...form, prep_time: event.target.value })}
              />
            </label>
            <label>
              Cook Time
              <input
                type="number"
                min="1"
                value={form.cook_time}
                onChange={(event) => setForm({ ...form, cook_time: event.target.value })}
                required
              />
            </label>
            <label>
              Servings
              <input
                type="number"
                min="1"
                value={form.servings}
                onChange={(event) => setForm({ ...form, servings: event.target.value })}
                required
              />
            </label>
            <label>
              Cuisine
              <select value={form.cuisine} onChange={(event) => setForm({ ...form, cuisine: event.target.value })}>
                {cuisines.map((cuisine) => (
                  <option key={cuisine.value} value={cuisine.value}>
                    {cuisine.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.is_public}
              onChange={(event) => setForm({ ...form, is_public: event.target.checked })}
            />
            Public recipe
          </label>

          <section className="content-section">
            <div className="form-section-header">
              <h2>Ingredients</h2>
              <button type="button" className="secondary-button" onClick={addIngredient}>
                Add ingredient
              </button>
            </div>
            <div className="ingredient-editor">
              {form.ingredient_items.map((item, index) => (
                <div className="ingredient-row" key={`${index}-${item.name}`}>
                  <input
                    aria-label="Ingredient name"
                    placeholder="Ingredient"
                    value={item.name}
                    onChange={(event) => updateIngredient(index, 'name', event.target.value)}
                  />
                  <input
                    aria-label="Quantity"
                    placeholder="Qty"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(event) => updateIngredient(index, 'quantity', event.target.value)}
                  />
                  <input
                    aria-label="Unit"
                    placeholder="Unit"
                    value={item.unit}
                    onChange={(event) => updateIngredient(index, 'unit', event.target.value)}
                  />
                  <button type="button" onClick={() => removeIngredient(index)} disabled={form.ingredient_items.length === 1}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="action-row">
            <button type="submit" className="primary-button">
              {editing ? 'Save Changes' : 'Create Recipe'}
            </button>
            {editing && recipeId && (
              <button type="button" className="text-button" onClick={() => navigate(`/recipes/${recipeId}`)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  )
}

function DeleteRecipePage({ auth, navigate, recipeId }: { auth: AuthState; navigate: Navigate; recipeId: number }) {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch<Recipe>(`/api/recipes/${recipeId}/`)
      .then(setRecipe)
      .catch((requestError) => setError(formatErrors(requestError)))
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

function LoginPage({ setAuth, navigate }: { setAuth: (auth: AuthState) => void; navigate: Navigate }) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const user = await apiFetch<User>('/api/auth/login/', {
        method: 'POST',
        body: { login, password },
      })
      setAuth({ loading: false, authenticated: true, user })
      navigate('/profile')
    } catch (requestError) {
      setError(formatErrors(requestError))
    }
  }

  return (
    <AuthPanel title="Log In">
      <form onSubmit={(event) => void submit(event)} className="stacked-form">
        {error && <p className="form-error">{error}</p>}
        <label>
          Username or email
          <input value={login} onChange={(event) => setLogin(event.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <button type="submit" className="primary-button">
          Log In
        </button>
        <p className="muted">
          Need an account?{' '}
          <AppLink to="/signup" navigate={navigate}>
            Sign up
          </AppLink>
        </p>
      </form>
    </AuthPanel>
  )
}

function SignupPage({ setAuth, navigate }: { setAuth: (auth: AuthState) => void; navigate: Navigate }) {
  const [form, setForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password1: '',
    password2: '',
  })
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const user = await apiFetch<User>('/api/auth/signup/', {
        method: 'POST',
        body: form,
      })
      setAuth({ loading: false, authenticated: true, user })
      navigate('/profile')
    } catch (requestError) {
      setError(formatErrors(requestError))
    }
  }

  return (
    <AuthPanel title="Create Account">
      <form onSubmit={(event) => void submit(event)} className="stacked-form">
        {error && <p className="form-error">{error}</p>}
        <label>
          Username
          <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        </label>
        <div className="form-grid">
          <label>
            First name
            <input
              value={form.first_name}
              onChange={(event) => setForm({ ...form, first_name: event.target.value })}
              required
            />
          </label>
          <label>
            Last name
            <input value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} required />
          </label>
        </div>
        <label>
          Password
          <input
            type="password"
            value={form.password1}
            onChange={(event) => setForm({ ...form, password1: event.target.value })}
            required
          />
        </label>
        <label>
          Confirm password
          <input
            type="password"
            value={form.password2}
            onChange={(event) => setForm({ ...form, password2: event.target.value })}
            required
          />
        </label>
        <button type="submit" className="primary-button">
          Create Account
        </button>
        <p className="muted">
          Already have an account?{' '}
          <AppLink to="/login" navigate={navigate}>
            Log in
          </AppLink>
        </p>
      </form>
    </AuthPanel>
  )
}

function AuthPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="page-band auth-band">
      <div className="auth-panel">
        <h1>{title}</h1>
        {children}
      </div>
    </section>
  )
}

function ProfilePage({
  auth,
  navigate,
  setAuth,
}: {
  auth: AuthState
  navigate: Navigate
  setAuth: (auth: AuthState) => void
}) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!auth.authenticated) return
    apiFetch<Profile>('/api/auth/profile/').then(setProfile).catch((requestError) => setError(formatErrors(requestError)))
    apiFetch<Recipe[]>('/api/recipes/?mine=true').then(setRecipes).catch(() => setRecipes([]))
  }, [auth.authenticated])

  const groupedRecipes = useMemo(
    () => ({
      publicRecipes: recipes.filter((recipe) => recipe.is_public),
      privateRecipes: recipes.filter((recipe) => !recipe.is_public),
    }),
    [recipes],
  )

  if (!auth.loading && !auth.authenticated) {
    return <LoginRequiredPage navigate={navigate} />
  }

  if (!profile || !auth.user) {
    return <LoadingPage message="Loading profile..." />
  }

  function updateProfile(field: keyof Profile, value: string) {
    setProfile((current) => (current ? { ...current, [field]: value } : current))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')

    const body = new FormData()
    body.set('first_name', profile.first_name)
    body.set('last_name', profile.last_name)
    body.set('twitter_x_url', profile.twitter_x_url)
    body.set('instagram_url', profile.instagram_url)
    body.set('facebook_url', profile.facebook_url)
    body.set('linkedin_url', profile.linkedin_url)
    if (profile.birth_date) body.set('birth_date', profile.birth_date)
    if (file) body.set('profile_picture', file)

    try {
      const updatedProfile = await apiFetch<Profile>('/api/auth/profile/', {
        method: 'PATCH',
        body,
      })
      setProfile(updatedProfile)
      setAuth({
        loading: false,
        authenticated: true,
        user: { ...auth.user, profile: updatedProfile },
      })
    } catch (requestError) {
      setError(formatErrors(requestError))
    }
  }

  return (
    <section className="page-band">
      <div className="page-inner narrow">
        <section className="profile-summary">
          <div>
            <p className="eyebrow">Profile</p>
            <h1>{profile.display_name}</h1>
            <p>{auth.user.email}</p>
          </div>
          {profile.profile_picture_url && <img src={profile.profile_picture_url} alt={profile.display_name} />}
        </section>

        <section className="form-shell">
          <p className="eyebrow">Profile Details</p>
          <h2>Edit your profile</h2>
          {error && <p className="form-error">{error}</p>}
          <form onSubmit={(event) => void submit(event)} className="stacked-form">
            <div className="form-grid">
              <label>
                First name
                <input value={profile.first_name} onChange={(event) => updateProfile('first_name', event.target.value)} />
              </label>
              <label>
                Last name
                <input value={profile.last_name} onChange={(event) => updateProfile('last_name', event.target.value)} />
              </label>
            </div>
            <label>
              Profile picture
              <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </label>
            <div className="form-grid">
              <label>
                Twitter/X
                <input value={profile.twitter_x_url} onChange={(event) => updateProfile('twitter_x_url', event.target.value)} />
              </label>
              <label>
                Instagram
                <input value={profile.instagram_url} onChange={(event) => updateProfile('instagram_url', event.target.value)} />
              </label>
              <label>
                Facebook
                <input value={profile.facebook_url} onChange={(event) => updateProfile('facebook_url', event.target.value)} />
              </label>
              <label>
                LinkedIn
                <input value={profile.linkedin_url} onChange={(event) => updateProfile('linkedin_url', event.target.value)} />
              </label>
              <label>
                Birth date
                <input
                  type="date"
                  value={profile.birth_date ?? ''}
                  onChange={(event) => updateProfile('birth_date', event.target.value)}
                />
              </label>
            </div>
            <button type="submit" className="primary-button">
              Save Profile
            </button>
          </form>
        </section>

        <ProfileRecipeSection title="Public" recipes={groupedRecipes.publicRecipes} navigate={navigate} />
        <ProfileRecipeSection title="Private" recipes={groupedRecipes.privateRecipes} navigate={navigate} />
      </div>
    </section>
  )
}

function ProfileRecipeSection({ title, recipes, navigate }: { title: string; recipes: Recipe[]; navigate: Navigate }) {
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

function LoginRequiredPage({ navigate }: { navigate: Navigate }) {
  return (
    <MessagePage
      title="Log in required"
      message="You need to be logged in to use this part of the app."
      navigate={navigate}
      action={{ label: 'Log in', to: '/login' }}
    />
  )
}

function LoadingPage({ message }: { message: string }) {
  return (
    <section className="page-band">
      <div className="message-panel">
        <p>{message}</p>
      </div>
    </section>
  )
}

function NotFoundPage({ navigate }: { navigate: Navigate }) {
  return <MessagePage title="Not found" message="That page does not exist." navigate={navigate} />
}

function MessagePage({
  title,
  message,
  navigate,
  action,
}: {
  title: string
  message: string
  navigate: Navigate
  action?: { label: string; to: string }
}) {
  return (
    <section className="page-band">
      <div className="message-panel">
        <h1>{title}</h1>
        <p>{message}</p>
        <button type="button" className="primary-button" onClick={() => navigate(action?.to ?? '/recipes')}>
          {action?.label ?? 'Browse recipes'}
        </button>
      </div>
    </section>
  )
}

export default App
