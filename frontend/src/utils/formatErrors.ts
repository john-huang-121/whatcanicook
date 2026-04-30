import { ApiError } from '../lib/api'

export function formatErrors(error: unknown) {
  if (error instanceof ApiError) {
    if (typeof error.data === 'string') {
      return error.data
    }
    if (error.data && typeof error.data === 'object') {
      return Object.entries(error.data)
        .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : String(messages)}`)
        .join(' ')
    }
  }
  return 'Something went wrong. Please try again.'
}
