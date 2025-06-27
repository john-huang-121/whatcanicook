from django.urls import path

from . import views

app_name = 'recipes'

urlpatterns = [
    path("", views.cuisine_index, name="cuisine_index"),
    path("<str:cuisine_type>/", views.cuisine, name="cuisine"),
    path("<int:recipe_id>/", views.detail, name="detail"),
    path("new/", views.create, name="create"),
    path("<int:recipe_id>/edit", views.update, name="update"),
    path("<int:recipe_id>/delete", views.delete, name="delete"),
]