export type Profile = {
  first_name: string
  last_name: string
  display_name: string
  profile_picture: string | null
  profile_picture_url: string
  twitter_x_url: string
  instagram_url: string
  facebook_url: string
  linkedin_url: string
  birth_date: string | null
}

export type User = {
  id: number
  username: string
  email: string
  created_at: string
  updated_at: string
  profile: Profile
}

export type AuthResponse = {
  authenticated: boolean
  user: User | null
}

export type AuthState = {
  loading: boolean
  authenticated: boolean
  user: User | null
}

export type SetAuth = (auth: AuthState) => void

export type Navigate = (to: string) => void

export type Cuisine = {
  value: string
  label: string
}

export type RecipeUnitValue =
  | ''
  | 'teaspoon(s)'
  | 'tablespoon(s)'
  | 'fluid ounce(s)'
  | 'cup(s)'
  | 'pint(s)'
  | 'quart(s)'
  | 'gallon(s)'
  | 'milliliter(s)'
  | 'liter(s)'
  | 'ounce(s)'
  | 'pound(s)'
  | 'gram(s)'
  | 'kilogram(s)'
  | 'whole'
  | 'piece(s)'
  | 'slice(s)'
  | 'clove(s)'
  | 'sprig(s)'
  | 'bunch(es)'
  | 'can(s)'
  | 'jar(s)'
  | 'package(s)'
  | 'pinch(es)'
  | 'dash(es)'
  | 'handful(s)'
  | 'to taste'

export type RecipeUnit = {
  value: RecipeUnitValue
  label: string
}

export type RecipeIngredient = {
  id: number
  name: string
  quantity: number
  unit: RecipeUnitValue
  unit_label: string
  note: string
}

export type RecipeIngredientInput = {
  name: string
  quantity: string
  unit: RecipeUnitValue
  note: string
}

export type RecipeInstruction = {
  id: number
  text: string
  step_number: number
}

export type RecipeInstructionInput = {
  text: string
}

export type Recipe = {
  id: number
  title: string
  description: string
  prep_time: number | null
  cook_time: number
  servings: number
  instructions: RecipeInstruction[]
  cuisine: string
  cuisine_label: string
  created_by: number
  created_by_username: string
  is_public: boolean
  is_owner: boolean
  ingredients: RecipeIngredient[]
  published_date: string
  total_time: number
  created_at: string
  updated_at: string
}

export type RecipePayload = {
  title: string
  description: string
  prep_time: number | null
  cook_time: number
  servings: number
  cuisine: string
  is_public: boolean
  instruction_items: Array<{
    text: string
  }>
  ingredient_items: Array<{
    name: string
    quantity: number
    unit: RecipeUnitValue
    note: string
  }>
}
