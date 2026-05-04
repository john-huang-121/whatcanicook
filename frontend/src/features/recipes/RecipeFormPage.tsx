import { useEffect, useId, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { LoginRequiredPage } from '../../components/LoginRequiredPage'
import { apiFetch } from '../../lib/api'
import type {
  AuthState,
  Cuisine,
  Ingredient,
  Navigate,
  Recipe,
  RecipeIngredientInput,
  RecipeInstructionInput,
  RecipePayload,
  RecipeUnit,
} from '../../types'
import { formatErrors } from '../../utils/formatErrors'

type RecipeFormState = {
  title: string
  description: string
  prep_time: string
  cook_time: string
  servings: string
  cuisine: string
  is_public: boolean
  instruction_items: RecipeInstructionInput[]
  ingredient_items: RecipeIngredientInput[]
}

const emptyRecipeForm: RecipeFormState = {
  title: '',
  description: '',
  prep_time: '',
  cook_time: '',
  servings: '',
  cuisine: 'american',
  is_public: true,
  instruction_items: [{ text: '' }],
  ingredient_items: [{ ingredient_id: null, user_ingredient_id: null, name: '', quantity: '', unit: '', note: '' }],
}

const maximumIngredientSuggestions = 6

function recipeToForm(recipe: Recipe): RecipeFormState {
  return {
    title: recipe.title,
    description: recipe.description,
    prep_time: recipe.prep_time?.toString() ?? '',
    cook_time: recipe.cook_time.toString(),
    servings: recipe.servings.toString(),
    cuisine: recipe.cuisine,
    is_public: recipe.is_public,
    instruction_items: recipe.instructions.length
      ? recipe.instructions.map((item) => ({
          text: item.text,
        }))
      : [{ text: '' }],
    ingredient_items: recipe.ingredients.length
      ? recipe.ingredients.map((item) => ({
          ingredient_id: item.ingredient_id,
          user_ingredient_id: item.user_ingredient_id,
          name: item.name,
          quantity: item.quantity.toString(),
          unit: item.unit,
          note: item.note,
        }))
      : [{ ingredient_id: null, user_ingredient_id: null, name: '', quantity: '', unit: '', note: '' }],
  }
}

export function RecipeFormPage({
  auth,
  navigate,
  recipeId,
}: {
  auth: AuthState
  navigate: Navigate
  recipeId?: number
}) {
  const ingredientListId = useId()
  const [form, setForm] = useState<RecipeFormState>(emptyRecipeForm)
  const [cuisines, setCuisines] = useState<Cuisine[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [unitOptions, setUnitOptions] = useState<RecipeUnit[]>([])
  const [openIngredientIndex, setOpenIngredientIndex] = useState<number | null>(null)
  const [activeIngredientSuggestionIndex, setActiveIngredientSuggestionIndex] = useState(-1)
  const [error, setError] = useState('')
  const editing = recipeId !== undefined

  // Fetch form option lists on mount
  useEffect(() => {
    let active = true

    const fetchFormOptions = async () => {
      try {
        const [cuisineResponse, ingredientResponse, unitResponse] = await Promise.all([
          apiFetch<Cuisine[]>('/api/cuisines/'),
          apiFetch<Ingredient[]>('/api/ingredients/'),
          apiFetch<RecipeUnit[]>('/api/units/'),
        ])
        if (!active) return
        setCuisines(cuisineResponse)
        setIngredients(ingredientResponse)
        setUnitOptions(unitResponse)
      } catch (requestError) {
        if (!active) return
        setError(formatErrors(requestError))
      }
    }

    fetchFormOptions()

    return () => {
      active = false
    }
  }, [])

  // Fetch recipe data if editing an existing recipe
  useEffect(() => {
    if (!recipeId) return
    let active = true

    const fetchRecipeById = async () => {
      try {
        const recipe = await apiFetch<Recipe>(`/api/recipes/${recipeId}/`)
        if (!active) return
        setForm(recipeToForm(recipe))
      } catch (requestError) {
        if (!active) return
        setError(formatErrors(requestError))
      }
    }

    fetchRecipeById()

    return () => {
      active = false
    }
  }, [recipeId])

  if (!auth.loading && !auth.authenticated) {
    return <LoginRequiredPage navigate={navigate} />
  }

  function updateInstruction(index: number, value: string) {
    setForm((current) => ({
      ...current,
      instruction_items: current.instruction_items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, text: value } : item,
      ),
    }))
  }

  function addInstruction() {
    setForm((current) => ({
      ...current,
      instruction_items: [...current.instruction_items, { text: '' }],
    }))
  }

  function removeInstruction(index: number) {
    setForm((current) => ({
      ...current,
      instruction_items: current.instruction_items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  function updateIngredient<Field extends keyof RecipeIngredientInput>(
    index: number,
    field: Field,
    value: RecipeIngredientInput[Field],
  ) {
    setForm((current) => ({
      ...current,
      ingredient_items: current.ingredient_items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }))
  }

  function updateIngredientName(index: number, value: string) {
    setForm((current) => ({
      ...current,
      ingredient_items: current.ingredient_items.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, ingredient_id: null, user_ingredient_id: null, name: value }
          : item,
      ),
    }))
    setOpenIngredientIndex(index)
    setActiveIngredientSuggestionIndex(-1)
  }

  function ingredientSuggestionsFor(value: string) {
    const normalizedValue = value.trim().toLowerCase()
    if (!normalizedValue) {
      return []
    }

    return ingredients
      .filter((ingredient) => {
        const matchesName = ingredient.name.toLowerCase().includes(normalizedValue)
        const matchesAlias = ingredient.aliases.some((alias) => alias.name.toLowerCase().includes(normalizedValue))
        return matchesName || matchesAlias
      })
      .slice(0, maximumIngredientSuggestions)
  }

  function chooseIngredient(index: number, ingredient: Ingredient) {
    setForm((current) => ({
      ...current,
      ingredient_items: current.ingredient_items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ingredient_id: ingredient.id,
              user_ingredient_id: null,
              name: ingredient.name,
            }
          : item,
      ),
    }))
    setOpenIngredientIndex(null)
    setActiveIngredientSuggestionIndex(-1)
  }

  function handleIngredientKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    const suggestions = ingredientSuggestionsFor(form.ingredient_items[index]?.name ?? '')

    if (openIngredientIndex !== index) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIngredientSuggestionIndex((current) => (suggestions.length ? (current + 1) % suggestions.length : -1))
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIngredientSuggestionIndex((current) =>
        suggestions.length ? (current <= 0 ? suggestions.length - 1 : current - 1) : -1,
      )
    }

    if (event.key === 'Enter' && activeIngredientSuggestionIndex >= 0 && suggestions[activeIngredientSuggestionIndex]) {
      event.preventDefault()
      chooseIngredient(index, suggestions[activeIngredientSuggestionIndex])
    }

    if (event.key === 'Escape') {
      setOpenIngredientIndex(null)
      setActiveIngredientSuggestionIndex(-1)
    }
  }

  function updateIngredientUnit(index: number, value: string) {
    const selectedUnit = unitOptions.find((unit) => unit.value === value)
    if (!selectedUnit) {
      setError('Choose a unit from the list.')
      return
    }

    updateIngredient(index, 'unit', selectedUnit.value)
  }

  function addIngredient() {
    setForm((current) => ({
      ...current,
      ingredient_items: [
        ...current.ingredient_items,
        { ingredient_id: null, user_ingredient_id: null, name: '', quantity: '', unit: '', note: '' },
      ],
    }))
  }

  function removeIngredient(index: number) {
    setForm((current) => ({
      ...current,
      ingredient_items: current.ingredient_items.filter((_, itemIndex) => itemIndex !== index),
    }))
    setOpenIngredientIndex(null)
    setActiveIngredientSuggestionIndex(-1)
  }

  function ingredientItemsForPayload(): RecipePayload['ingredient_items'] {
    return form.ingredient_items
      .filter((ingredient) => ingredient.name.trim() && ingredient.quantity)
      .map((item) => ({
        ingredient_id: item.ingredient_id,
        user_ingredient_id: item.user_ingredient_id,
        name: item.name.trim(),
        quantity: Number(item.quantity),
        unit: item.unit,
        note: item.note.trim(),
      }))
  }

  function toPayload(ingredientItems: RecipePayload['ingredient_items']): RecipePayload {
    return {
      title: form.title,
      description: form.description,
      prep_time: form.prep_time ? Number(form.prep_time) : null,
      cook_time: Number(form.cook_time),
      servings: Number(form.servings),
      cuisine: form.cuisine,
      is_public: form.is_public,
      instruction_items: form.instruction_items
        .filter((item) => item.text.trim())
        .map((item) => ({
          text: item.text.trim(),
        })),
      ingredient_items: ingredientItems,
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    const ingredientItems = ingredientItemsForPayload()

    try {
      const recipe = await apiFetch<Recipe>(editing ? `/api/recipes/${recipeId}/` : '/api/recipes/', {
        method: editing ? 'PATCH' : 'POST',
        body: toPayload(ingredientItems),
      })
      navigate(`/recipes/${recipe.id}`)
    } catch (requestError) {
      setError(formatErrors(requestError))
    }
  }

  return (
    <section className="page-band">
      <div className="form-shell">
        <h1>{editing ? 'Update Recipe' : 'Create Recipe'}</h1>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={(event) => void submit(event)} className="stacked-form">
          <label>
            Title
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </label>
          <label>
            Description
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <div className="form-grid">
            <label>
              Prep Time (minutes)
              <input
                type="number"
                min="0"
                value={form.prep_time}
                onChange={(event) => setForm({ ...form, prep_time: event.target.value })}
              />
            </label>
            <label>
              Cook Time (minutes)
              <input
                type="number"
                min="1"
                value={form.cook_time}
                onChange={(event) => setForm({ ...form, cook_time: event.target.value })}
                required
              />
            </label>
            <label>
              Servings
              <input
                type="number"
                min="1"
                value={form.servings}
                onChange={(event) => setForm({ ...form, servings: event.target.value })}
                required
              />
            </label>
            <label>
              Cuisine
              <select value={form.cuisine} onChange={(event) => setForm({ ...form, cuisine: event.target.value })}>
                {cuisines.map((cuisine) => (
                  <option key={cuisine.value} value={cuisine.value}>
                    {cuisine.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.is_public}
              onChange={(event) => setForm({ ...form, is_public: event.target.checked })}
            />
            Public recipe
          </label>

          <section className="content-section">
            <div className="form-section-header">
              <h2>Ingredients</h2>
            </div>
            <div className="ingredient-editor">
              {form.ingredient_items.map((item, index) => {
                const suggestions = ingredientSuggestionsFor(item.name)
                const showIngredientSuggestions =
                  openIngredientIndex === index && item.name.trim().length > 0 && item.ingredient_id === null
                const ingredientSuggestionListId = `${ingredientListId}-ingredient-${index}`

                return (
                  <div className="ingredient-row" key={`ingredient-${index}`}>
                    <input
                      aria-label="Quantity"
                      placeholder="Qty"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(event) => updateIngredient(index, 'quantity', event.target.value)}
                    />
                    <select
                      aria-label="Unit"
                      value={item.unit}
                      onChange={(event) => updateIngredientUnit(index, event.target.value)}
                    >
                      {unitOptions.map((unit) => (
                        <option key={unit.value || 'no-unit'} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                    <div className="ingredient-combobox">
                      <input
                        aria-activedescendant={
                          activeIngredientSuggestionIndex >= 0
                            ? `${ingredientSuggestionListId}-${activeIngredientSuggestionIndex}`
                            : undefined
                        }
                        aria-autocomplete="list"
                        aria-controls={ingredientSuggestionListId}
                        aria-expanded={showIngredientSuggestions}
                        aria-label="Ingredient name"
                        placeholder="Ingredient"
                        role="combobox"
                        value={item.name}
                        onBlur={() => setOpenIngredientIndex(null)}
                        onChange={(event) => updateIngredientName(index, event.target.value)}
                        onFocus={() => {
                          setOpenIngredientIndex(index)
                          setActiveIngredientSuggestionIndex(-1)
                        }}
                        onKeyDown={(event) => handleIngredientKeyDown(index, event)}
                      />
                      {item.ingredient_id !== null && <span className="ingredient-status success-text">Catalog</span>}
                      {item.user_ingredient_id !== null && (
                        <span className="ingredient-status danger-text">Under review</span>
                      )}
                      {showIngredientSuggestions && (
                        <div className="ingredient-suggestions" id={ingredientSuggestionListId} role="listbox">
                          {suggestions.length ? (
                            suggestions.map((ingredient, suggestionIndex) => (
                              <button
                                aria-selected={suggestionIndex === activeIngredientSuggestionIndex}
                                className={`ingredient-suggestion ${
                                  suggestionIndex === activeIngredientSuggestionIndex ? 'active' : ''
                                }`}
                                id={`${ingredientSuggestionListId}-${suggestionIndex}`}
                                key={ingredient.id}
                                onMouseDown={(event) => {
                                  event.preventDefault()
                                  chooseIngredient(index, ingredient)
                                }}
                                role="option"
                                type="button"
                              >
                                <span>{ingredient.name}</span>
                                {ingredient.category && <small>{ingredient.category}</small>}
                              </button>
                            ))
                          ) : (
                            <p className="ingredient-suggestion-status">No catalog matches</p>
                          )}
                        </div>
                      )}
                    </div>
                    <input
                      aria-label="Ingredient note"
                      placeholder="Note"
                      value={item.note}
                      onChange={(event) => updateIngredient(index, 'note', event.target.value)}
                    />
                    <button type="button" onClick={() => removeIngredient(index)} disabled={form.ingredient_items.length === 1}>
                      Remove
                    </button>
                  </div>
                )
              })}
              <button type="button" className="secondary-button" onClick={addIngredient}>
                Add ingredient
              </button>
            </div>
          </section>

          <section className="content-section">
            <div className="form-section-header">
              <h2>Instructions</h2>
            </div>
            <div className="instruction-editor">
              {form.instruction_items.map((item, index) => (
                <div className="instruction-row" key={`instruction-${index}`}>
                  <span className="step-number">{index + 1}</span>
                  <textarea
                    aria-label={`Instruction step ${index + 1}`}
                    placeholder="Describe this step"
                    value={item.text}
                    onChange={(event) => updateInstruction(index, event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeInstruction(index)}
                    disabled={form.instruction_items.length === 1}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="secondary-button" onClick={addInstruction}>
                Add instruction step
              </button>
            </div>
          </section>

          <div className="action-row">
            <button type="submit" className="primary-button">
              {editing ? 'Save Changes' : 'Create Recipe'}
            </button>
            {editing && recipeId && (
              <button type="button" className="text-button" onClick={() => navigate(`/recipes/${recipeId}`)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  )
}
