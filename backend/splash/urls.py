from django.urls import path
from . import views

app_name = 'splash'

urlpatterns = [
    path('', views.homepage, name='homepage')
]