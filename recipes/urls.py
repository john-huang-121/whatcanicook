from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    # path("<int:recipe_id>/", views.detail, name="detail"),
    # path("<int:recipe_id>/results", views.results, name="results"),
    # path("<int:recipe_id>/edit", views.edit, name="edit"),
]