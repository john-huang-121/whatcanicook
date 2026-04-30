import { useState } from 'react'
import type { FormEvent } from 'react'
import { apiFetch } from '../api'
import type { Navigate, SetAuth, User } from '../types'
import { formatErrors } from '../utils/formatErrors'
import { AppLink } from './AppLink'
import { AuthPanel } from './AuthPanel'

export function LoginPage({ setAuth, navigate }: { setAuth: SetAuth; navigate: Navigate }) {
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
