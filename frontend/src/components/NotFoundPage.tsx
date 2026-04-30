import type { Navigate } from '../types'
import { MessagePage } from './MessagePage'

export function NotFoundPage({ navigate }: { navigate: Navigate }) {
  return <MessagePage title="Not found" message="That page does not exist." navigate={navigate} />
}
