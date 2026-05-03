import { useEffect, useId, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { MessagePage } from '../../components/MessagePage'
import { RecipeGrid } from './components/RecipeGrid'
import { apiFetch } from '../../lib/api'
import type { Cuisine, Navigate, Recipe } from '../../types'
import { formatErrors } from '../../utils/formatErrors'

type SearchState = {
  query: string
  recipes: Recipe[]
  error: string
}

type SuggestionState = SearchState

const minimumAutocompleteLength = 2
const maximumSuggestions = 6

export function CuisineIndexPage({ navigate, searchQuery = '' }: { navigate: Navigate; searchQuery?: string }) {
  const suggestionListId = useId()
  const [cuisines, setCuisines] = useState<Cuisine[]>([])
  const [searchInput, setSearchInput] = useState(searchQuery)
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    recipes: [],
    error: '',
  })
  const [suggestionState, setSuggestionState] = useState<SuggestionState>({
    query: '',
    recipes: [],
    error: '',
  })
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const normalizedSearchQuery = searchQuery.trim()
  const hasSearch = normalizedSearchQuery.length > 0
  const normalizedSuggestionQuery = searchInput.trim()
  const shouldFetchSuggestions = normalizedSuggestionQuery.length >= minimumAutocompleteLength

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

  useEffect(() => {
    if (!normalizedSearchQuery) return
    let active = true

    async function loadSearchResults() {
      try {
        const response = await apiFetch<Recipe[]>(`/api/recipes/?q=${encodeURIComponent(normalizedSearchQuery)}`)
        if (!active) return
        setSearchState({
          query: normalizedSearchQuery,
          recipes: response,
          error: '',
        })
      } catch (requestError) {
        if (!active) return
        setSearchState({
          query: normalizedSearchQuery,
          recipes: [],
          error: formatErrors(requestError),
        })
      }
    }

    void loadSearchResults()

    return () => {
      active = false
    }
  }, [normalizedSearchQuery])

  useEffect(() => {
    if (!shouldFetchSuggestions) return
    let active = true

    const timeoutId = window.setTimeout(() => {
      async function loadSuggestions() {
        try {
          const response = await apiFetch<Recipe[]>(`/api/recipes/?q=${encodeURIComponent(normalizedSuggestionQuery)}`)
          if (!active) return
          setSuggestionState({
            query: normalizedSuggestionQuery,
            recipes: response.slice(0, maximumSuggestions),
            error: '',
          })
          setActiveSuggestionIndex(-1)
        } catch (requestError) {
          if (!active) return
          setSuggestionState({
            query: normalizedSuggestionQuery,
            recipes: [],
            error: formatErrors(requestError),
          })
          setActiveSuggestionIndex(-1)
        }
      }

      void loadSuggestions()
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [normalizedSuggestionQuery, shouldFetchSuggestions])

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setSuggestionsOpen(false)
    const nextQuery = searchInput.trim()
    navigate(nextQuery ? `/recipes?q=${encodeURIComponent(nextQuery)}` : '/recipes')
  }

  function chooseSuggestion(recipe: Recipe) {
    setSuggestionsOpen(false)
    setActiveSuggestionIndex(-1)
    navigate(`/recipes/${recipe.id}`)
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const suggestions =
      suggestionState.query === normalizedSuggestionQuery && shouldFetchSuggestions ? suggestionState.recipes : []

    if (!suggestionsOpen || !shouldFetchSuggestions) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveSuggestionIndex((current) => (suggestions.length ? (current + 1) % suggestions.length : -1))
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveSuggestionIndex((current) =>
        suggestions.length ? (current <= 0 ? suggestions.length - 1 : current - 1) : -1,
      )
    }

    if (event.key === 'Enter' && activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
      event.preventDefault()
      chooseSuggestion(suggestions[activeSuggestionIndex])
    }

    if (event.key === 'Escape') {
      setSuggestionsOpen(false)
      setActiveSuggestionIndex(-1)
    }
  }

  const searchLoading = hasSearch && searchState.query !== normalizedSearchQuery
  const searchError = hasSearch && searchState.query === normalizedSearchQuery ? searchState.error : ''
  const searchResults = searchState.query === normalizedSearchQuery ? searchState.recipes : []
  const suggestionsLoading =
    suggestionsOpen && shouldFetchSuggestions && suggestionState.query !== normalizedSuggestionQuery
  const suggestionError =
    suggestionsOpen && suggestionState.query === normalizedSuggestionQuery ? suggestionState.error : ''
  const suggestions =
    suggestionsOpen && suggestionState.query === normalizedSuggestionQuery ? suggestionState.recipes : []
  const showSuggestions = suggestionsOpen && shouldFetchSuggestions

  if (error && !hasSearch) return <MessagePage title="Cuisines unavailable" message={error} navigate={navigate} />

  return (
    <section className="page-band">
      <div className="page-inner">
        <div className="section-heading centered">
          <p className="eyebrow">Browse</p>
          <h1>Cuisines</h1>
          <p>Cuisines reflect ingredients, techniques, and traditions from a culture, region, or country.</p>
          <form className="recipe-search-form" onSubmit={submitSearch}>
            <label htmlFor="recipe-search">Search recipes</label>
            <div className="recipe-search-controls">
              <div className="recipe-search-combobox">
                <input
                  id="recipe-search"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls={suggestionListId}
                  aria-expanded={showSuggestions}
                  aria-activedescendant={
                    activeSuggestionIndex >= 0 ? `${suggestionListId}-${activeSuggestionIndex}` : undefined
                  }
                  value={searchInput}
                  onBlur={() => setSuggestionsOpen(false)}
                  onChange={(event) => {
                    setSearchInput(event.target.value)
                    setSuggestionsOpen(true)
                    setActiveSuggestionIndex(-1)
                  }}
                  onFocus={() => setSuggestionsOpen(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search by recipe, ingredient, cuisine, or cook"
                />
                {showSuggestions && (
                  <div className="recipe-search-suggestions" id={suggestionListId} role="listbox">
                    {suggestionError ? (
                      <p className="recipe-search-suggestion-status">{suggestionError}</p>
                    ) : suggestionsLoading ? (
                      <p className="recipe-search-suggestion-status">Finding matching recipes...</p>
                    ) : suggestions.length ? (
                      suggestions.map((recipe, index) => (
                        <button
                          aria-selected={index === activeSuggestionIndex}
                          className={`recipe-search-suggestion ${index === activeSuggestionIndex ? 'active' : ''}`}
                          id={`${suggestionListId}-${index}`}
                          key={recipe.id}
                          onMouseDown={(event) => {
                            event.preventDefault()
                            chooseSuggestion(recipe)
                          }}
                          role="option"
                          type="button"
                        >
                          <span>{recipe.title}</span>
                          <small>
                            {recipe.cuisine_label} / {recipe.total_time} min / by {recipe.created_by_username}
                          </small>
                        </button>
                      ))
                    ) : (
                      <p className="recipe-search-suggestion-status">No quick matches. Press Search to see all results.</p>
                    )}
                  </div>
                )}
              </div>
              <button type="submit" className="primary-button">
                Search
              </button>
              {hasSearch && (
                <button type="button" className="text-button" onClick={() => navigate('/recipes')}>
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>
        {hasSearch ? (
          <section className="search-results-section" aria-live="polite">
            <div className="form-section-header">
              <div>
                <p className="eyebrow">Search Results</p>
                <h2>Recipes matching "{normalizedSearchQuery}"</h2>
              </div>
            </div>
            {searchError ? (
              <p className="form-error">{searchError}</p>
            ) : searchLoading ? (
              <p className="muted">Searching recipes...</p>
            ) : searchResults.length ? (
              <RecipeGrid recipes={searchResults} navigate={navigate} />
            ) : (
              <p className="empty-state">No recipes matched "{normalizedSearchQuery}". Try a recipe name, ingredient, cuisine, or cook.</p>
            )}
          </section>
        ) : loading ? (
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
