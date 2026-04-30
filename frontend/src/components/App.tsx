import { useEffect, useState } from 'react'
import '../App.css'
import { apiFetch } from '../api'
import { usePath } from '../hooks/usePath'
import type { AuthResponse, AuthState } from '../types'
import { formatErrors } from '../utils/formatErrors'
import { MessagePage } from './MessagePage'
import { Navbar } from './Navbar'
import { RouteSwitch } from './RouteSwitch'

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

  return (
    <div className="app-shell">
      <Navbar auth={auth} navigate={navigate} logout={logout} />
      <main>
        {authError ? (
          <MessagePage title="Session unavailable" message={authError} navigate={navigate} />
        ) : (
          <RouteSwitch path={path} auth={auth} setAuth={setAuth} navigate={navigate} />
        )}
      </main>
    </div>
  )
}

export default App
