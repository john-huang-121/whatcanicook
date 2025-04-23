from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("<int:recipe_id>/", views.detail, name="detail"),
    path("new/", views.create, name="create"),
    path("<int:recipe_id>/edit", views.update, name="update"),
    path("<int:recipe_id>/delete", views.delete, name="delete"),
]