import { MessagePage } from './MessagePage'
import type { Navigate } from '../types'

export function NotFoundPage({ navigate }: { navigate: Navigate }) {
  return <MessagePage title="Not found" message="That page does not exist." navigate={navigate} />
}
