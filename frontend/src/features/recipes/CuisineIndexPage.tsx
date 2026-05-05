import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
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

export function CuisineIndexPage({
  browseMode = 'cuisine',
  navigate,
  searchQuery = '',
}: {
  browseMode?: 'cuisine' | 'ingredient'
  navigate: Navigate
  searchQuery?: string
}) {
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
  const [loading, setLoading] = useState(browseMode !== 'ingredient')
  const [error, setError] = useState('')
  const normalizedSearchQuery = searchQuery.trim()
  const hasSearch = normalizedSearchQuery.length > 0
  const normalizedSuggestionQuery = searchInput.trim()
  const shouldFetchSuggestions = normalizedSuggestionQuery.length >= minimumAutocompleteLength
  const browseBasePath = browseMode === 'ingredient' ? '/recipes/ingredients' : '/recipes'

  useEffect(() => {
    if (browseMode === 'ingredient') {
      return
    }

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
  }, [browseMode])

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
        } catch (requestError) {
          if (!active) return
          setSuggestionState({
            query: normalizedSuggestionQuery,
            recipes: [],
            error: formatErrors(requestError),
          })
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
    navigate(nextQuery ? `${browseBasePath}?q=${encodeURIComponent(nextQuery)}` : browseBasePath)
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
  const noSuggestionText = suggestionError || 'No quick matches. Press Search to see all results.'

  if (error && !hasSearch) return <MessagePage title="Cuisines unavailable" message={error} navigate={navigate} />

  return (
    <section className="page-band">
      <div className="page-inner">
        <div className="section-heading centered">
          <p className="eyebrow">Browse</p>
          <h1>{browseMode === 'ingredient' ? 'Recipes by Ingredient' : 'Cuisines'}</h1>
          <p>
            {browseMode === 'ingredient'
              ? 'Search by ingredient to find recipes that use what you already have.'
              : 'Cuisines reflect ingredients, techniques, and traditions from a culture, region, or country.'}
          </p>
          <form className="recipe-search-form" onSubmit={submitSearch}>
            <div className="recipe-search-controls">
              <div className="recipe-search-combobox">
                <Autocomplete<Recipe, false, false, true>
                  className="recipe-search-autocomplete"
                  freeSolo
                  filterOptions={(options) => options}
                  getOptionLabel={(option) => (typeof option === 'string' ? option : option.title)}
                  inputValue={searchInput}
                  isOptionEqualToValue={(option, value) => typeof value !== 'string' && option.id === value.id}
                  loading={suggestionsLoading}
                  loadingText="Finding matching recipes..."
                  noOptionsText={noSuggestionText}
                  onChange={(_, value) => {
                    if (typeof value === 'object' && value !== null) {
                      setSuggestionsOpen(false)
                      navigate(`/recipes/${value.id}`)
                    }
                  }}
                  onClose={() => setSuggestionsOpen(false)}
                  onInputChange={(_, value, reason) => {
                    if (reason === 'reset') return
                    setSearchInput(value)
                    setSuggestionsOpen(true)
                  }}
                  onOpen={() => setSuggestionsOpen(true)}
                  open={showSuggestions}
                  options={suggestions}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      id="recipe-search"
                      label="Search recipes"
                      placeholder="Search by recipe, ingredient, cuisine, or cook"
                    />
                  )}
                  renderOption={(props, recipe) => (
                    <li {...props} className={`${props.className ?? ''} recipe-search-option`}>
                      <span>{recipe.title}</span>
                      <small>
                        {recipe.cuisine_label} / {recipe.total_time} min / by {recipe.created_by_username}
                      </small>
                    </li>
                  )}
                  slotProps={{
                    paper: { className: 'recipe-search-suggestions' },
                    listbox: { className: 'recipe-search-listbox' },
                  }}
                />
              </div>
              <Button type="submit" className="primary-button" variant="contained">
                Search
              </Button>
              {hasSearch && (
                <Button type="button" className="text-button" variant="text" onClick={() => navigate(browseBasePath)}>
                  Clear
                </Button>
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
              <Alert severity="error">{searchError}</Alert>
            ) : searchLoading ? (
              <p className="muted">Searching recipes...</p>
            ) : searchResults.length ? (
              <RecipeGrid recipes={searchResults} navigate={navigate} />
            ) : (
              <p className="empty-state">No recipes matched "{normalizedSearchQuery}". Try a recipe name, ingredient, cuisine, or cook.</p>
            )}
          </section>
        ) : browseMode === 'ingredient' ? (
          <p className="empty-state">Search for an ingredient above to discover matching recipes.</p>
        ) : loading ? (
          <p className="muted">Loading cuisines...</p>
        ) : (
          <div className="cuisine-grid">
            {cuisines.map((cuisine) => (
              <Button
                key={cuisine.value}
                type="button"
                variant="outlined"
                onClick={() => navigate(`/recipes/cuisine/${cuisine.value}`)}
              >
                {cuisine.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
