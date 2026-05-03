from django.urls import path

from . import views

app_name = "social"

urlpatterns = [
    path("dashboard/", views.DashboardView.as_view(), name="dashboard"),
    path("feed/", views.FeedView.as_view(), name="feed"),
    path("saved-recipes/", views.SavedRecipeListView.as_view(), name="saved-recipe-list"),
    path("recipes/<int:recipe_id>/like/", views.RecipeLikeView.as_view(), name="recipe-like"),
    path("recipes/<int:recipe_id>/save/", views.SavedRecipeView.as_view(), name="recipe-save"),
    path("users/<int:user_id>/follow/", views.FollowUserView.as_view(), name="user-follow"),
]
