import { useEffect, useState } from 'react'
import { MessagePage } from '../../components/MessagePage'
import { apiFetch } from '../../lib/api'
import type { Cuisine, Navigate } from '../../types'
import { formatErrors } from '../../utils/formatErrors'

export function CuisineIndexPage({ navigate }: { navigate: Navigate }) {
  const [cuisines, setCuisines] = useState<Cuisine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    apiFetch<Cuisine[]>('/api/cuisines/')
      .then((response) => {
        if (!active) return
        setCuisines(response)
      })
      .catch((requestError) => {
        if (!active) return
        setError(formatErrors(requestError))
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  if (error) return <MessagePage title="Cuisines unavailable" message={error} navigate={navigate} />

  return (
    <section className="page-band">
      <div className="page-inner">
        <div className="section-heading centered">
          <p className="eyebrow">Browse</p>
          <h1>Cuisines</h1>
          <p>Cuisines reflect ingredients, techniques, and traditions from a culture, region, or country.</p>
        </div>
        {loading ? (
          <p className="muted">Loading cuisines...</p>
        ) : (
          <div className="cuisine-grid">
            {cuisines.map((cuisine) => (
              <button key={cuisine.value} type="button" onClick={() => navigate(`/recipes/cuisine/${cuisine.value}`)}>
                {cuisine.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
