from django.urls import path

from . import views

app_name = "accounts"

urlpatterns = [
    # Using allauth's built-in views for signup,login, and logout
    path("profile/", views.profile, name="profile"),
]
