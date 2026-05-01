import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { LoginRequiredPage } from '../../components/LoginRequiredPage'
import { apiFetch } from '../../lib/api'
import type {
  AuthState,
  Cuisine,
  Navigate,
  Recipe,
  RecipeIngredientInput,
  RecipeInstructionInput,
  RecipePayload,
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
  ingredient_items: [{ name: '', quantity: '', unit: '' }],
}

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
          name: item.name,
          quantity: item.quantity.toString(),
          unit: item.unit,
        }))
      : [{ name: '', quantity: '', unit: '' }],
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
  const [form, setForm] = useState<RecipeFormState>(emptyRecipeForm)
  const [cuisines, setCuisines] = useState<Cuisine[]>([])
  const [error, setError] = useState('')
  const editing = recipeId !== undefined

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

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!recipeId) return
    let active = true

    apiFetch<Recipe>(`/api/recipes/${recipeId}/`)
      .then((recipe) => {
        if (!active) return
        setForm(recipeToForm(recipe))
      })
      .catch((requestError) => {
        if (!active) return
        setError(formatErrors(requestError))
      })

    return () => {
      active = false
    }
  }, [recipeId])

  if (!auth.loading && !auth.authenticated) {
    return <LoginRequiredPage navigate={navigate} />
  }

  function updateIngredient(index: number, field: keyof RecipeIngredientInput, value: string) {
    setForm((current) => ({
      ...current,
      ingredient_items: current.ingredient_items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }))
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

  function addIngredient() {
    setForm((current) => ({
      ...current,
      ingredient_items: [...current.ingredient_items, { name: '', quantity: '', unit: '' }],
    }))
  }

  function removeIngredient(index: number) {
    setForm((current) => ({
      ...current,
      ingredient_items: current.ingredient_items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  function toPayload(): RecipePayload {
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
      ingredient_items: form.ingredient_items
        .filter((item) => item.name.trim() && item.quantity)
        .map((item) => ({
          name: item.name.trim(),
          quantity: Number(item.quantity),
          unit: item.unit.trim(),
        })),
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const recipe = await apiFetch<Recipe>(editing ? `/api/recipes/${recipeId}/` : '/api/recipes/', {
        method: editing ? 'PATCH' : 'POST',
        body: toPayload(),
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
                step="1"
                value={form.prep_time}
                onChange={(event) => setForm({ ...form, prep_time: event.target.value })}
              />
            </label>
            <label>
              Cook Time (minutes)
              <input
                type="number"
                min="1"
                step="1"
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
              {form.ingredient_items.map((item, index) => (
                <div className="ingredient-row" key={`ingredient-${index}`}>
                  <input
                    aria-label="Ingredient name"
                    placeholder="Ingredient"
                    value={item.name}
                    onChange={(event) => updateIngredient(index, 'name', event.target.value)}
                  />
                  <input
                    aria-label="Quantity"
                    placeholder="Qty"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(event) => updateIngredient(index, 'quantity', event.target.value)}
                  />
                  <input
                    aria-label="Unit"
                    placeholder="Unit"
                    value={item.unit}
                    onChange={(event) => updateIngredient(index, 'unit', event.target.value)}
                  />
                  <button type="button" onClick={() => removeIngredient(index)} disabled={form.ingredient_items.length === 1}>
                    Remove
                  </button>
                </div>
              ))}
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
