from django.contrib.auth.decorators import login_required
from django.shortcuts import render

from recipes.models import Recipe


@login_required
def profile(request):
    user_recipes = Recipe.objects.filter(created_by=request.user).order_by("-created_at")
    context = {
        "public_recipes": user_recipes.filter(is_public=True),
        "private_recipes": user_recipes.filter(is_public=False),
    }
    return render(request, "accounts/profile.html", context)
