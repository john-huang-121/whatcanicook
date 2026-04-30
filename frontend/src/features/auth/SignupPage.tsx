import { useState } from 'react'
import type { FormEvent } from 'react'
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
