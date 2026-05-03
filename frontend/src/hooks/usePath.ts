import { useCallback, useEffect, useState } from 'react'
import type { Navigate } from '../types'

function currentPath() {
  return `${window.location.pathname}${window.location.search}`
}

export function usePath(): { path: string; navigate: Navigate } {
  const [path, setPath] = useState(currentPath)

  useEffect(() => {
    const onPopState = () => setPath(currentPath())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback<Navigate>((to) => {
    window.history.pushState({}, '', to)
    setPath(currentPath())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return { path, navigate }
}
