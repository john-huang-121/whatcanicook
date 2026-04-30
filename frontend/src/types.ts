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

export type Cuisine = {
  value: string
  label: string
}

export type RecipeIngredient = {
  id: number
  name: string
  quantity: number
  unit: string
}

export type RecipeIngredientInput = {
  name: string
  quantity: string
  unit: string
}

export type Recipe = {
  id: number
  title: string
  description: string
  prep_time: number | null
  cook_time: number
  servings: number
  instructions: string
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
  instructions: string
  cuisine: string
  is_public: boolean
  ingredient_items: Array<{
    name: string
    quantity: number
    unit: string
  }>
}
