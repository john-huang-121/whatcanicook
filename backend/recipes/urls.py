from django.urls import path

from . import views

app_name = 'recipes'

urlpatterns = [
    path("cuisines/", views.CuisineListView.as_view(), name="cuisine-list"),
    path("ingredients/", views.IngredientListView.as_view(), name="ingredient-list"),
    path("recipes/", views.RecipeListView.as_view(), name="recipe-list"),
    path("recipes/<int:recipe_id>/", views.RecipeDetailView.as_view(), name="recipe-detail"),
]
