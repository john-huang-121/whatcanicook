import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { LoadingPage } from '../../components/LoadingPage'
import { LoginRequiredPage } from '../../components/LoginRequiredPage'
import { MessagePage } from '../../components/MessagePage'
import { ProfileRecipeSection } from './components/ProfileRecipeSection'
import { apiFetch } from '../../lib/api'
import type { AuthState, Navigate, Profile, Recipe, SetAuth } from '../../types'
import { formatErrors } from '../../utils/formatErrors'

export function ProfilePage({
  auth,
  navigate,
  setAuth,
}: {
  auth: AuthState
  navigate: Navigate
  setAuth: SetAuth
}) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [recipeError, setRecipeError] = useState('')

  useEffect(() => {
    if (!auth.authenticated) return
    let active = true

    apiFetch<Profile>('/api/auth/profile/')
      .then((response) => {
        if (!active) return
        setProfile(response)
      })
      .catch((requestError) => {
        if (!active) return
        setError(formatErrors(requestError))
      })

    apiFetch<Recipe[]>('/api/recipes/?mine=true')
      .then((response) => {
        if (!active) return
        setRecipes(response)
      })
      .catch((requestError) => {
        if (!active) return
        setRecipeError(formatErrors(requestError))
      })

    return () => {
      active = false
    }
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

  if (error && !profile) {
    return <MessagePage title="Profile unavailable" message={error} navigate={navigate} />
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

        {recipeError && <p className="form-error">{recipeError}</p>}
        <ProfileRecipeSection title="Public" recipes={groupedRecipes.publicRecipes} navigate={navigate} />
        <ProfileRecipeSection title="Private" recipes={groupedRecipes.privateRecipes} navigate={navigate} />
      </div>
    </section>
  )
}
