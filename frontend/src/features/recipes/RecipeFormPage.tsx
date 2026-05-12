import { useEffect, useId, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react'
import DeleteIcon from '@mui/icons-material/Delete'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { LoginRequiredPage } from '../../components/LoginRequiredPage'
import { apiFetch } from '../../lib/api'
import { uploadToPresignedPost } from '../../lib/presignedUploads'
import type {
  AuthState,
  Cuisine,
  Ingredient,
  Navigate,
  Recipe,
  RecipeImageInput,
  RecipeImageUploadSignature,
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

type RecipeImageSlot = {
  file: File | null
  imageKey: string
  imageUrl: string
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
const recipeImageSlotCount = 5

function emptyImageSlot(): RecipeImageSlot {
  return { file: null, imageKey: '', imageUrl: '' }
}

function emptyImageSlots() {
  return Array.from({ length: recipeImageSlotCount }, emptyImageSlot)
}

function hasRecipeImageSlot(slot: RecipeImageSlot) {
  return Boolean(slot.file || slot.imageKey || slot.imageUrl)
}

function compactRecipeImageSlots(slots: RecipeImageSlot[]) {
  const filledSlots = slots.filter(hasRecipeImageSlot)
  return [
    ...filledSlots,
    ...Array.from({ length: recipeImageSlotCount - filledSlots.length }, emptyImageSlot),
  ].slice(0, recipeImageSlotCount)
}

function fieldSuffix(label: string, className = '') {
  return (
    <InputAdornment className={`field-suffix ${className}`.trim()} disableTypography position="end">
      {label}
    </InputAdornment>
  )
}

function ingredientSourceFor(item: RecipeIngredientInput) {
  if (item.ingredient_id !== null) {
    return { className: 'catalog', label: 'Catalog' }
  }

  if (item.user_ingredient_id !== null || item.name.trim()) {
    return { className: 'user', label: 'User' }
  }

  return null
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
  const recipeFormId = useId()
  const [form, setForm] = useState<RecipeFormState>(emptyRecipeForm)
  const [cuisines, setCuisines] = useState<Cuisine[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [unitOptions, setUnitOptions] = useState<RecipeUnit[]>([])
  const [openIngredientIndex, setOpenIngredientIndex] = useState<number | null>(null)
  const [activeIngredientSuggestionIndex, setActiveIngredientSuggestionIndex] = useState(-1)
  const [imageSlots, setImageSlots] = useState<RecipeImageSlot[]>(() => emptyImageSlots())
  const [imageSetChanged, setImageSetChanged] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const imagePreviewUrls = useMemo(
    () => imageSlots.map((slot) => (slot.file ? URL.createObjectURL(slot.file) : '')),
    [imageSlots],
  )
  const editing = recipeId !== undefined
  const prepTimeInputId = `${recipeFormId}-prep-time`
  const cookTimeInputId = `${recipeFormId}-cook-time`

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
        const nextImageSlots = emptyImageSlots()
        recipe.images.forEach((image) => {
          if (image.position >= 0 && image.position < recipeImageSlotCount) {
            nextImageSlots[image.position] = {
              file: null,
              imageKey: image.image_key,
              imageUrl: image.image_url,
            }
          }
        })
        if (!nextImageSlots[0].imageUrl && recipe.image_url) {
          nextImageSlots[0] = {
            file: null,
            imageKey: recipe.image_storage_key,
            imageUrl: recipe.image_url,
          }
        }
        setImageSlots(nextImageSlots)
        setImageSetChanged(false)
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

  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach((previewUrl) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl)
      })
    }
  }, [imagePreviewUrls])

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

  function handleIngredientKeyDown(index: number, event: KeyboardEvent<HTMLElement>) {
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

  function selectRecipeImage(position: number, event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null
    if (!selectedFile) {
      event.target.value = ''
      return
    }

    setImageSlots((current) => {
      const clickedSlotHasImage = hasRecipeImageSlot(current[position])
      const firstEmptyPosition = current.findIndex((slot) => !hasRecipeImageSlot(slot))
      const targetPosition = clickedSlotHasImage || firstEmptyPosition === -1 ? position : firstEmptyPosition

      return current.map((slot, index) =>
        index === targetPosition ? { file: selectedFile, imageKey: '', imageUrl: '' } : slot,
      )
    })
    setImageSetChanged(true)
    event.target.value = ''
  }

  function removeRecipeImage(position: number) {
    setImageSlots((current) => compactRecipeImageSlots(current.filter((_, index) => index !== position)))
    setImageSetChanged(true)
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

  function toPayload(
    ingredientItems: RecipePayload['ingredient_items'],
    imageItems?: RecipeImageInput[],
    includeImageItems = false,
  ): RecipePayload {
    return {
      title: form.title,
      description: form.description,
      ...(includeImageItems ? { image_items: imageItems ?? [] } : {}),
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

  async function uploadRecipeImage(selectedFile: File, targetRecipeId: number, position: number) {
    const contentType = selectedFile.type || 'application/octet-stream'
    const signature = await apiFetch<RecipeImageUploadSignature>(
      `/api/recipes/${targetRecipeId}/image-upload/`,
      {
        method: 'POST',
        body: {
          filename: selectedFile.name,
          content_type: contentType,
          size: selectedFile.size,
          position,
        },
      },
    )

    await uploadToPresignedPost(signature, selectedFile, position === 0 ? 'Hero image' : `Gallery image ${position}`)
    return { position, image_key: signature.recipe_image_key }
  }

  async function imageItemsForPayload(targetRecipeId: number, slots: RecipeImageSlot[]) {
    const uploadedImageKeys = new Map<number, string>()
    const selectedImages = slots
      .map((slot, position) => ({ file: slot.file, position }))
      .filter((item): item is { file: File; position: number } => item.file !== null)

    for (const item of selectedImages) {
      const uploadedImage = await uploadRecipeImage(item.file, targetRecipeId, item.position)
      uploadedImageKeys.set(uploadedImage.position, uploadedImage.image_key)
    }

    return slots
      .map((slot, position) => ({
        position,
        image_key: uploadedImageKeys.get(position) ?? slot.imageKey,
      }))
      .filter((item): item is RecipeImageInput => Boolean(item.image_key))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    const ingredientItems = ingredientItemsForPayload()
    setSaving(true)

    try {
      if (editing && recipeId) {
        const imageItems = imageSetChanged ? await imageItemsForPayload(recipeId, imageSlots) : undefined
        const recipe = await apiFetch<Recipe>(`/api/recipes/${recipeId}/`, {
          method: 'PATCH',
          body: toPayload(ingredientItems, imageItems, imageSetChanged),
        })
        navigate(`/recipes/${recipe.id}`)
        return
      }

      const recipe = await apiFetch<Recipe>('/api/recipes/', {
        method: 'POST',
        body: toPayload(ingredientItems),
      })

      const imageItems = await imageItemsForPayload(recipe.id, imageSlots)
      if (imageItems.length) {
        const recipeWithImage = await apiFetch<Recipe>(`/api/recipes/${recipe.id}/`, {
          method: 'PATCH',
          body: { image_items: imageItems },
        })
        navigate(`/recipes/${recipeWithImage.id}`)
        return
      }

      navigate(`/recipes/${recipe.id}`)
    } catch (requestError) {
      setError(formatErrors(requestError))
    } finally {
      setSaving(false)
    }
  }

  const recipeImageUrls = imagePreviewUrls.map((previewUrl, index) => previewUrl || imageSlots[index].imageUrl)
  const filledRecipeImageCount = recipeImageUrls.filter(Boolean).length

  return (
    <section className="page-band">
      <div className="form-shell recipe-form-shell">
        <h1>{editing ? 'Update Recipe' : 'Create Recipe'}</h1>
        {error && <Alert severity="error">{error}</Alert>}
        <form onSubmit={(event) => void submit(event)} className="stacked-form recipe-form-layout">
          <aside className="recipe-gallery-panel" aria-label="Recipe image gallery">
            <div className="recipe-gallery-header">
              <div>
                <h2>Gallery</h2>
                <p>Set one hero image and up to four gallery images</p>
              </div>
              <span>{filledRecipeImageCount}/5</span>
            </div>
            <div className="recipe-image-slot recipe-hero-image-slot">
              <ButtonBase aria-label="Upload hero image" className="recipe-hero-upload" component="label">
                {recipeImageUrls[0] ? (
                  <img src={recipeImageUrls[0]} alt="" />
                ) : (
                  <span className="recipe-hero-upload-empty">
                    <span className="recipe-hero-upload-icon" aria-hidden="true" />
                  </span>
                )}
                <span className="recipe-hero-upload-overlay">{recipeImageUrls[0] ? 'Change hero image' : ''}</span>
                <input hidden accept="image/*" type="file" onChange={(event) => selectRecipeImage(0, event)} />
              </ButtonBase>
              {recipeImageUrls[0] && (
                <button
                  aria-label="Remove hero image"
                  className="recipe-image-remove-button"
                  type="button"
                  onClick={() => removeRecipeImage(0)}
                >
                  <DeleteIcon aria-hidden="true" fontSize="inherit" />
                </button>
              )}
            </div>
            <div className="recipe-gallery-thumbnails">
              {[1, 2, 3, 4].map((position) => (
                <div className="recipe-image-slot recipe-gallery-thumb-slot" key={position}>
                  <ButtonBase
                    aria-label={`Upload gallery image ${position}`}
                    className={`recipe-gallery-thumb ${recipeImageUrls[position] ? 'filled' : 'placeholder'}`}
                    component="label"
                  >
                    {recipeImageUrls[position] ? <img src={recipeImageUrls[position]} alt="" /> : <span />}
                    {recipeImageUrls[position] && <span className="recipe-gallery-thumb-overlay">Change</span>}
                    <input hidden accept="image/*" type="file" onChange={(event) => selectRecipeImage(position, event)} />
                  </ButtonBase>
                  {recipeImageUrls[position] && (
                    <button
                      aria-label={`Remove gallery image ${position}`}
                      className="recipe-image-remove-button recipe-image-remove-button-small"
                      type="button"
                      onClick={() => removeRecipeImage(position)}
                    >
                      <DeleteIcon aria-hidden="true" fontSize="inherit" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </aside>

          <div className="recipe-form-fields">
            <TextField
              label="Title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              multiline
              minRows={4}
            />
            <div className="form-grid">
            <div className="form-field">
              <label htmlFor={prepTimeInputId}>Prep Time</label>
              <TextField
                className="mui-suffixed-field"
                fullWidth
                hiddenLabel
                id={prepTimeInputId}
                size="small"
                type="number"
                value={form.prep_time}
                onChange={(event) => setForm({ ...form, prep_time: event.target.value })}
                slotProps={{
                  htmlInput: { min: 0 },
                  input: {
                    endAdornment: fieldSuffix('minutes'),
                  },
                }}
              />
            </div>
            <div className="form-field">
              <label htmlFor={cookTimeInputId}>Cook Time</label>
              <TextField
                className="mui-suffixed-field"
                fullWidth
                hiddenLabel
                id={cookTimeInputId}
                required
                size="small"
                type="number"
                value={form.cook_time}
                onChange={(event) => setForm({ ...form, cook_time: event.target.value })}
                slotProps={{
                  htmlInput: { min: 1 },
                  input: {
                    endAdornment: fieldSuffix('minutes'),
                  },
                }}
              />
            </div>
            <TextField
              label="Servings"
              type="number"
              value={form.servings}
              onChange={(event) => setForm({ ...form, servings: event.target.value })}
              required
              slotProps={{ htmlInput: { min: 1 } }}
            />
            <TextField
              label="Cuisine"
              select
              value={form.cuisine}
              onChange={(event) => setForm({ ...form, cuisine: event.target.value })}
            >
                {cuisines.map((cuisine) => (
                  <MenuItem key={cuisine.value} value={cuisine.value}>
                    {cuisine.label}
                  </MenuItem>
                ))}
            </TextField>
            </div>
            <FormControlLabel
              className="checkbox-row"
              control={
                <Checkbox
                  checked={form.is_public}
                  onChange={(event) => setForm({ ...form, is_public: event.target.checked })}
                />
              }
              label="Public recipe"
            />

            <section className="content-section">
              <div className="form-section-header">
                <h2>Ingredients</h2>
              </div>
              <div className="ingredient-editor">
              {form.ingredient_items.map((item, index) => {
                const suggestions = ingredientSuggestionsFor(item.name)
                const showIngredientSuggestions =
                  openIngredientIndex === index && item.name.trim().length > 0 && item.ingredient_id === null
                const ingredientSource = ingredientSourceFor(item)
                const ingredientSuggestionListId = `${recipeFormId}-ingredient-${index}`

                return (
                  <div className="ingredient-row" key={`ingredient-${index}`}>
                    <TextField
                      aria-label="Quantity"
                      placeholder="Qty"
                      type="number"
                      value={item.quantity}
                      onChange={(event) => updateIngredient(index, 'quantity', event.target.value)}
                      slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                    />
                    <TextField
                      aria-label="Unit"
                      select
                      value={item.unit}
                      onChange={(event) => updateIngredientUnit(index, event.target.value)}
                    >
                      {unitOptions.map((unit) => (
                        <MenuItem key={unit.value || 'no-unit'} value={unit.value}>
                          {unit.label}
                        </MenuItem>
                      ))}
                    </TextField>
                    <div className="ingredient-combobox">
                      <TextField
                        className="mui-suffixed-field ingredient-name-field"
                        fullWidth
                        hiddenLabel
                        id={`${recipeFormId}-ingredient-name-${index}`}
                        placeholder="Ingredient"
                        size="small"
                        value={item.name}
                        onBlur={() => setOpenIngredientIndex(null)}
                        onChange={(event) => updateIngredientName(index, event.target.value)}
                        onFocus={() => {
                          setOpenIngredientIndex(index)
                          setActiveIngredientSuggestionIndex(-1)
                        }}
                        onKeyDown={(event) => handleIngredientKeyDown(index, event)}
                        slotProps={{
                          htmlInput: {
                            'aria-activedescendant':
                              activeIngredientSuggestionIndex >= 0
                                ? `${ingredientSuggestionListId}-${activeIngredientSuggestionIndex}`
                                : undefined,
                            'aria-autocomplete': 'list',
                            'aria-controls': ingredientSuggestionListId,
                            'aria-expanded': showIngredientSuggestions,
                            'aria-label': 'Ingredient name',
                            role: 'combobox',
                          },
                          input: {
                            endAdornment: ingredientSource
                              ? fieldSuffix(
                                  ingredientSource.label,
                                  `ingredient-source-suffix ${ingredientSource.className}`,
                                )
                              : null,
                          },
                        }}
                      />
                      {showIngredientSuggestions && (
                        <div className="ingredient-suggestions" id={ingredientSuggestionListId} role="listbox">
                          {suggestions.length ? (
                            suggestions.map((ingredient, suggestionIndex) => (
                              <ButtonBase
                                aria-selected={suggestionIndex === activeIngredientSuggestionIndex}
                                className={`ingredient-suggestion ${
                                  suggestionIndex === activeIngredientSuggestionIndex ? 'active' : ''
                                }`}
                                component="button"
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
                              </ButtonBase>
                            ))
                          ) : (
                            <p className="ingredient-suggestion-status">No catalog matches</p>
                          )}
                        </div>
                      )}
                    </div>
                    <TextField
                      aria-label="Ingredient note"
                      placeholder="Note"
                      value={item.note}
                      onChange={(event) => updateIngredient(index, 'note', event.target.value)}
                    />
                    <Button
                      type="button"
                      color="error"
                      variant="outlined"
                      onClick={() => removeIngredient(index)}
                      disabled={form.ingredient_items.length === 1}
                    >
                      Remove
                    </Button>
                  </div>
                )
              })}
              <Button type="button" className="secondary-button" variant="contained" onClick={addIngredient}>
                Add ingredient
              </Button>
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
                  <TextField
                    aria-label={`Instruction step ${index + 1}`}
                    placeholder="Describe this step"
                    value={item.text}
                    onChange={(event) => updateInstruction(index, event.target.value)}
                    multiline
                    minRows={3}
                    required
                  />
                  <Button
                    type="button"
                    color="error"
                    variant="outlined"
                    onClick={() => removeInstruction(index)}
                    disabled={form.instruction_items.length === 1}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" className="secondary-button" variant="contained" onClick={addInstruction}>
                Add instruction step
              </Button>
              </div>
            </section>

            <div className="action-row">
              <Button type="submit" className="primary-button" variant="contained" disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Recipe'}
              </Button>
              {editing && recipeId && (
                <Button
                  type="button"
                  className="text-button"
                  variant="text"
                  onClick={() => navigate(`/recipes/${recipeId}`)}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </section>
  )
}
