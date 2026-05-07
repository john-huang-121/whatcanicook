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

export function SignupPage({ setAuth, navigate }: { setAuth: SetAuth; navigate: Navigate }) {
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
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Username"
          value={form.username}
          onChange={(event) => setForm({ ...form, username: event.target.value })}
          required
        />
        <TextField
          label="Email"
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          required
        />
        <div className="form-grid">
          <TextField
            label="First name"
            value={form.first_name}
            onChange={(event) => setForm({ ...form, first_name: event.target.value })}
            required
          />
          <TextField
            label="Last name"
            value={form.last_name}
            onChange={(event) => setForm({ ...form, last_name: event.target.value })}
            required
          />
        </div>
        <TextField
          label="Password"
          type="password"
          value={form.password1}
          onChange={(event) => setForm({ ...form, password1: event.target.value })}
          required
        />
        <TextField
          label="Confirm password"
          type="password"
          value={form.password2}
          onChange={(event) => setForm({ ...form, password2: event.target.value })}
          required
        />
        <Button type="submit" className="primary-button" variant="contained">
          Create Account
        </Button>
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
