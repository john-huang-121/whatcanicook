import { useEffect, useState } from 'react'
import type { FormEvent, KeyboardEvent, SyntheticEvent } from 'react'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import type { AutocompleteChangeDetails, AutocompleteChangeReason } from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import { MessagePage } from '../../components/MessagePage'
import { RecipeGrid } from './components/RecipeGrid'
import { apiFetch } from '../../lib/api'
import type { Cuisine, Ingredient, Navigate, Recipe } from '../../types'
import { formatErrors } from '../../utils/formatErrors'

type SearchState = {
  query: string
  recipes: Recipe[]
  error: string
}

type SuggestionState = SearchState

type IngredientBrowseGroup = {
  categories: string[]
  label: string
  limit: number
}

const minimumAutocompleteLength = 2
const maximumSuggestions = 6

const ingredientBrowseGroups: IngredientBrowseGroup[] = [
  { label: 'Protein', categories: ['meat', 'seafood', 'protein', 'legume'], limit: 12 },
  { label: 'Vegetables', categories: ['vegetable'], limit: 12 },
  { label: 'Grains', categories: ['grain'], limit: 10 },
  { label: 'Dairy', categories: ['dairy'], limit: 10 },
  { label: 'Pantry', categories: ['pantry', 'seasoning', 'oil', 'baking', 'herb'], limit: 14 },
]

function parseIngredientIdQuery(value: string) {
  return value
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((id, index, ids) => Number.isInteger(id) && id > 0 && ids.indexOf(id) === index)
}

function ingredientName(ingredient: Ingredient) {
  return ingredient.name?.trim() || ''
}

function ingredientCategory(ingredient: Ingredient) {
  return ingredient.category?.trim() || 'Other'
}

function ingredientCategoryKey(ingredient: Ingredient) {
  return ingredientCategory(ingredient).toLowerCase()
}

export function CuisineIndexPage({
  browseMode = 'cuisine',
  ingredientIdsQuery = '',
  navigate,
  searchQuery = '',
}: {
  browseMode?: 'cuisine' | 'ingredient'
  ingredientIdsQuery?: string
  navigate: Navigate
  searchQuery?: string
}) {
  const normalizedSearchQuery = searchQuery.trim()
  const appliedIngredientIds = parseIngredientIdQuery(ingredientIdsQuery)
  const normalizedIngredientIdsQuery = appliedIngredientIds.join(',')
  const [cuisines, setCuisines] = useState<Cuisine[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [selectedIngredientState, setSelectedIngredientState] = useState(() => ({
    ids: appliedIngredientIds,
    query: normalizedIngredientIdsQuery,
  }))
  const [ingredientInput, setIngredientInput] = useState('')
  const [recipeSearchState, setRecipeSearchState] = useState(() => ({
    query: normalizedSearchQuery,
    value: searchQuery,
  }))
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
  const [ingredientLoading, setIngredientLoading] = useState(browseMode === 'ingredient')
  const [error, setError] = useState('')
  const [ingredientError, setIngredientError] = useState('')
  const selectedIngredientIds =
    selectedIngredientState.query === normalizedIngredientIdsQuery ? selectedIngredientState.ids : appliedIngredientIds
  const searchInput = recipeSearchState.query === normalizedSearchQuery ? recipeSearchState.value : searchQuery
  const hasTextSearch = normalizedSearchQuery.length > 0
  const hasIngredientSearch = browseMode === 'ingredient' && appliedIngredientIds.length > 0
  const hasSearch = hasTextSearch || hasIngredientSearch
  const normalizedSuggestionQuery = searchInput.trim()
  const shouldFetchSuggestions =
    browseMode === 'cuisine' && normalizedSuggestionQuery.length >= minimumAutocompleteLength
  const browseBasePath = browseMode === 'ingredient' ? '/recipes/ingredients' : '/recipes'
  const searchKey = hasIngredientSearch
    ? `ingredients:${normalizedIngredientIdsQuery}`
    : hasTextSearch
      ? `q:${normalizedSearchQuery}`
      : ''
  const searchEndpoint = hasIngredientSearch
    ? `/api/recipes/?ingredient_ids=${encodeURIComponent(normalizedIngredientIdsQuery)}`
    : hasTextSearch
      ? `/api/recipes/?q=${encodeURIComponent(normalizedSearchQuery)}`
      : ''
  const appliedIngredients = appliedIngredientIds
    .map((id) => ingredients.find((ingredient) => ingredient.id === id))
    .filter((ingredient): ingredient is Ingredient => Boolean(ingredient))
  const selectedIngredients = selectedIngredientIds
    .map((id) => ingredients.find((ingredient) => ingredient.id === id))
    .filter((ingredient): ingredient is Ingredient => Boolean(ingredient))
    .filter((ingredient) => ingredientName(ingredient))
  const ingredientResultLabel = appliedIngredients.length
    ? appliedIngredients.map((ingredient) => ingredientName(ingredient)).join(', ')
    : 'selected ingredients'
  const ingredientGroups = ingredientBrowseGroups
    .map((group) => ({
      ...group,
      ingredients: ingredients
        .filter((ingredient) => group.categories.includes(ingredientCategoryKey(ingredient)))
        .slice(0, group.limit),
    }))
    .filter((group) => group.ingredients.length > 0)

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
    if (browseMode !== 'ingredient') {
      return
    }

    let active = true

    apiFetch<Ingredient[]>('/api/ingredients/')
      .then((response) => {
        if (!active) return
        setIngredients(response)
        setIngredientError('')
      })
      .catch((requestError) => {
        if (!active) return
        setIngredientError(formatErrors(requestError))
      })
      .finally(() => {
        if (!active) return
        setIngredientLoading(false)
      })

    return () => {
      active = false
    }
  }, [browseMode])

  useEffect(() => {
    if (!searchEndpoint) return
    let active = true

    async function loadSearchResults() {
      try {
        const response = await apiFetch<Recipe[]>(searchEndpoint)
        if (!active) return
        setSearchState({
          query: searchKey,
          recipes: response,
          error: '',
        })
      } catch (requestError) {
        if (!active) return
        setSearchState({
          query: searchKey,
          recipes: [],
          error: formatErrors(requestError),
        })
      }
    }

    void loadSearchResults()

    return () => {
      active = false
    }
  }, [searchEndpoint, searchKey])

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

  function submitRecipeSearch(event: FormEvent) {
    event.preventDefault()
    setSuggestionsOpen(false)
    const nextQuery = searchInput.trim()
    setRecipeSearchState({ query: nextQuery, value: nextQuery })
    navigate(nextQuery ? `${browseBasePath}?q=${encodeURIComponent(nextQuery)}` : browseBasePath)
  }

  function submitIngredientSearch(event: FormEvent) {
    event.preventDefault()
    const nextIngredientQuery = selectedIngredientIds.join(',')
    setSelectedIngredientState({ ids: selectedIngredientIds, query: nextIngredientQuery })
    navigate(nextIngredientQuery ? `${browseBasePath}?ingredient_ids=${nextIngredientQuery}` : browseBasePath)
  }

  function clearIngredientSearch() {
    setSelectedIngredientState({ ids: [], query: '' })
    setIngredientInput('')
    navigate(browseBasePath)
  }

  function clearRecipeSearch() {
    setRecipeSearchState({ query: '', value: '' })
    setSuggestionsOpen(false)
    navigate(browseBasePath)
  }

  function selectIngredients(value: readonly Ingredient[]) {
    const nextIngredientIds = value
      .map((ingredient) => ingredient.id)
      .filter((id, index, ids) => ids.indexOf(id) === index)
    setSelectedIngredientState({ ids: nextIngredientIds, query: normalizedIngredientIdsQuery })
    setIngredientInput('')
  }

  function addIngredient(ingredient: Ingredient) {
    const nextIngredientIds = selectedIngredientIds.includes(ingredient.id)
      ? selectedIngredientIds
      : [...selectedIngredientIds, ingredient.id]
    setSelectedIngredientState({ ids: nextIngredientIds, query: normalizedIngredientIdsQuery })
    setIngredientInput('')
  }

  function removeIngredient(ingredientId: number) {
    setSelectedIngredientState({
      ids: selectedIngredientIds.filter((selectedIngredientId) => selectedIngredientId !== ingredientId),
      query: normalizedIngredientIdsQuery,
    })
    setIngredientInput('')
  }

  function handleIngredientSelectionChange(
    _: SyntheticEvent,
    value: readonly Ingredient[],
    reason: AutocompleteChangeReason,
    details?: AutocompleteChangeDetails<Ingredient>
  ) {
    if (reason === 'selectOption' && details?.option) {
      addIngredient(details.option)
      return
    }

    selectIngredients(value)
  }

  function toggleIngredient(ingredient: Ingredient) {
    const nextIngredientIds = selectedIngredientIds.includes(ingredient.id)
      ? selectedIngredientIds.filter((ingredientId) => ingredientId !== ingredient.id)
      : [...selectedIngredientIds, ingredient.id]
    setSelectedIngredientState({ ids: nextIngredientIds, query: normalizedIngredientIdsQuery })
  }

  function handleIngredientSearchKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Backspace' || ingredientInput.length > 0 || selectedIngredientIds.length === 0) {
      return
    }

    event.preventDefault()
    removeIngredient(selectedIngredientIds[selectedIngredientIds.length - 1])
  }

  const searchLoading = hasSearch && searchState.query !== searchKey
  const searchError = hasSearch && searchState.query === searchKey ? searchState.error : ''
  const searchResults = searchState.query === searchKey ? searchState.recipes : []
  const suggestionsLoading =
    suggestionsOpen && shouldFetchSuggestions && suggestionState.query !== normalizedSuggestionQuery
  const suggestionError =
    suggestionsOpen && suggestionState.query === normalizedSuggestionQuery ? suggestionState.error : ''
  const suggestions =
    suggestionsOpen && suggestionState.query === normalizedSuggestionQuery ? suggestionState.recipes : []
  const showSuggestions = suggestionsOpen && shouldFetchSuggestions
  const noSuggestionText = suggestionError || 'No quick matches. Press Search to see all results.'
  const searchResultsTitle = hasIngredientSearch
    ? `Recipes with ${ingredientResultLabel}`
    : `Recipes matching "${normalizedSearchQuery}"`
  const emptySearchMessage = hasIngredientSearch
    ? 'No recipes include all selected ingredients yet. Try removing one ingredient or browsing another category.'
    : `No recipes matched "${normalizedSearchQuery}". Try a recipe name, ingredient, cuisine, or cook.`

  if (error && browseMode === 'cuisine' && !hasSearch) {
    return <MessagePage title="Cuisines unavailable" message={error} navigate={navigate} />
  }

  return (
    <section className="page-band">
      <div className="page-inner">
        <div className="section-heading centered">
          <p className="eyebrow">Browse</p>
          <h1>{browseMode === 'ingredient' ? 'Recipes by Ingredient' : 'Cuisines'}</h1>
          <p>
            {browseMode === 'ingredient'
              ? 'Pick ingredients you have, then find recipes that use all of them.'
              : 'Cuisines reflect ingredients, techniques, and traditions from a culture, region, or country.'}
          </p>
          <form
            className={`recipe-search-form ${browseMode === 'ingredient' ? 'ingredient-search-form' : ''}`}
            onSubmit={browseMode === 'ingredient' ? submitIngredientSearch : submitRecipeSearch}
          >
            {browseMode === 'ingredient' ? (
              <>
                <div className="recipe-search-controls ingredient-search-controls">
                  <div className="recipe-search-combobox">
                    <Autocomplete<Ingredient, true, false, false>
                      className="recipe-search-autocomplete ingredient-search-autocomplete"
                      filterSelectedOptions
                      getOptionLabel={ingredientName}
                      groupBy={ingredientCategory}
                      inputValue={ingredientInput}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      loading={ingredientLoading}
                      loadingText="Loading ingredients..."
                      noOptionsText="No matching catalog ingredients"
                      onChange={handleIngredientSelectionChange}
                      onKeyDown={handleIngredientSearchKeyDown}
                      onInputChange={(_, value, reason) => {
                        if (reason === 'reset' || reason === 'selectOption' || reason === 'removeOption') {
                          setIngredientInput('')
                          return
                        }
                        setIngredientInput(value)
                      }}
                      options={ingredients}
                      renderValue={(value, getItemProps) =>
                        value.map((ingredient, index) => {
                          const itemProps = getItemProps({ index })
                          return (
                            <Chip
                              className={`ingredient-search-tag ${itemProps.className}`}
                              data-item-index={itemProps['data-item-index']}
                              disabled={itemProps.disabled}
                              key={itemProps.key}
                              label={ingredientName(ingredient)}
                              onDelete={() => removeIngredient(ingredient.id)}
                              size="small"
                              tabIndex={itemProps.tabIndex}
                            />
                          )
                        })
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          id="ingredient-search"
                          slotProps={{
                            ...params.slotProps,
                            htmlInput: {
                              ...params.slotProps.htmlInput,
                              'aria-label': 'Ingredients',
                            },
                          }}
                        />
                      )}
                      renderOption={(props, ingredient) => {
                        const { key, className, ...optionProps } = props
                        return (
                          <li
                            {...optionProps}
                            className={`${className ?? ''} recipe-search-option ingredient-search-option`}
                            key={key}
                          >
                            <span>{ingredientName(ingredient)}</span>
                            <small>{ingredientCategory(ingredient)}</small>
                          </li>
                        )
                      }}
                      slotProps={{
                        paper: { className: 'recipe-search-suggestions' },
                        listbox: { className: 'recipe-search-listbox' },
                      }}
                      value={selectedIngredients}
                    />
                  </div>
                  <div className="recipe-search-actions">
                    <Button type="submit" className="primary-button" variant="contained" disabled={!selectedIngredientIds.length}>
                      Find Recipes
                    </Button>
                    {hasIngredientSearch || selectedIngredientIds.length > 0 ? (
                      <Button type="button" className="text-button" variant="text" onClick={clearIngredientSearch}>
                        Clear
                      </Button>
                    ) : (
                      <span className="recipe-search-action-placeholder" aria-hidden="true" />
                    )}
                  </div>
                </div>
                <p className="ingredient-search-helper">Recipes must include every selected ingredient.</p>
              </>
            ) : (
              <div className="recipe-search-controls">
                <div className="recipe-search-combobox">
                  <Autocomplete<Recipe, false, true, true>
                    className="recipe-search-autocomplete"
                    disableClearable
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
                        const nextQuery = value.title.trim()
                        setRecipeSearchState({ query: nextQuery, value: value.title })
                        setSuggestionsOpen(false)
                        navigate(`${browseBasePath}?q=${encodeURIComponent(nextQuery)}`)
                      }
                    }}
                    onClose={() => setSuggestionsOpen(false)}
                    onInputChange={(_, value, reason) => {
                      if (reason === 'reset') return
                      setRecipeSearchState({ query: normalizedSearchQuery, value })
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
                <div className="recipe-search-actions">
                  <Button type="submit" className="primary-button" variant="contained">
                    Search
                  </Button>
                  {hasTextSearch ? (
                    <Button type="button" className="text-button" variant="text" onClick={clearRecipeSearch}>
                      Clear
                    </Button>
                  ) : (
                    <span className="recipe-search-action-placeholder" aria-hidden="true" />
                  )}
                </div>
              </div>
            )}
          </form>
        </div>
        {browseMode === 'ingredient' && (
          <section className="ingredient-browse-section" aria-label="Browse common ingredients">
            <div className="form-section-header">
              <div>
                <p className="eyebrow">Ingredient Shelves</p>
                <h2>Start with what you have</h2>
              </div>
            </div>
            {ingredientError ? (
              <Alert severity="error">{ingredientError}</Alert>
            ) : ingredientLoading ? (
              <p className="muted">Loading ingredients...</p>
            ) : (
              <div className="ingredient-browse-grid">
                {ingredientGroups.map((group) => (
                  <section className="ingredient-browse-group" key={group.label}>
                    <h3>{group.label}</h3>
                    <div className="ingredient-chip-row">
                      {group.ingredients.map((ingredient) => {
                        const selected = selectedIngredientIds.includes(ingredient.id)
                        return (
                          <Chip
                            className={`ingredient-browse-chip ${selected ? 'selected' : ''}`}
                            clickable
                            color={selected ? 'primary' : 'default'}
                            key={ingredient.id}
                            label={ingredientName(ingredient)}
                            onClick={() => toggleIngredient(ingredient)}
                            variant={selected ? 'filled' : 'outlined'}
                          />
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>
        )}
        {hasSearch ? (
          <section className="search-results-section" aria-live="polite">
            <div className="form-section-header">
              <div>
                <p className="eyebrow">{hasIngredientSearch ? 'Ingredient Match' : 'Search Results'}</p>
                <h2>{searchResultsTitle}</h2>
              </div>
            </div>
            {searchError ? (
              <Alert severity="error">{searchError}</Alert>
            ) : searchLoading ? (
              <p className="muted">Searching recipes...</p>
            ) : searchResults.length ? (
              <RecipeGrid recipes={searchResults} navigate={navigate} />
            ) : (
              <p className="empty-state">{emptySearchMessage}</p>
            )}
          </section>
        ) : browseMode === 'ingredient' ? (
          <p className="empty-state">Choose one or more ingredients above to discover matching recipes.</p>
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
