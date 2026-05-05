import { useState } from 'react'
import type { FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import { AppLink } from '../../components/AppLink'
import { AuthPanel } from './components/AuthPanel'
import { apiFetch } from '../../lib/api'
import type { Navigate, SetAuth, User } from '../../types'
import { formatErrors } from '../../utils/formatErrors'

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
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Username or email"
          value={login}
          onChange={(event) => setLogin(event.target.value)}
          required
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button type="submit" className="primary-button" variant="contained">
          Log In
        </Button>
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
