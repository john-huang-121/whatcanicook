import { useEffect, useState } from 'react'
import './app.css'
import { MessagePage } from '../components/MessagePage'
import { Navbar } from '../components/Navbar'
import { UserWorkspace } from '../components/UserWorkspace'
import { usePath } from '../hooks/usePath'
import { apiFetch } from '../lib/api'
import type { AuthResponse, AuthState } from '../types'
import { formatErrors } from '../utils/formatErrors'
import { AppRouter } from './router'

export function App() {
  const { path, navigate } = usePath()
  const [auth, setAuth] = useState<AuthState>({ loading: true, authenticated: false, user: null })
  const [authError, setAuthError] = useState('')

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
      .catch((requestError) => {
        if (!active) return
        setAuth({ loading: false, authenticated: false, user: null })
        setAuthError(formatErrors(requestError))
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

  const page = authError ? (
    <MessagePage title="Session unavailable" message={authError} navigate={navigate} />
  ) : (
    <AppRouter path={path} auth={auth} setAuth={setAuth} navigate={navigate} />
  )

  return (
    <div className="app-shell">
      <Navbar auth={auth} navigate={navigate} logout={logout} />
      <main>{auth.authenticated ? <UserWorkspace path={path} navigate={navigate}>{page}</UserWorkspace> : page}</main>
    </div>
  )
}

export default App
