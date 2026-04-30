import { MessagePage } from './MessagePage'
import type { Navigate } from '../types'

export function LoginRequiredPage({ navigate }: { navigate: Navigate }) {
  return (
    <MessagePage
      title="Log in required"
      message="You need to be logged in to use this part of the app."
      navigate={navigate}
      action={{ label: 'Log in', to: '/login' }}
    />
  )
}
