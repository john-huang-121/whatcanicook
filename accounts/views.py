from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render

from .forms import ProfileForm
from .models import Profile
from recipes.models import Recipe


@login_required
def profile(request):
    profile_obj, _ = Profile.objects.get_or_create(user=request.user)

    if request.method == "POST":
        profile_form = ProfileForm(request.POST, request.FILES, instance=profile_obj)
        if profile_form.is_valid():
            profile_form.save()
            return redirect("accounts:profile")
    else:
        profile_form = ProfileForm(instance=profile_obj)

    user_recipes = Recipe.objects.filter(created_by=request.user).order_by("-created_at")
    context = {
        "profile": profile_obj,
        "profile_form": profile_form,
        "public_recipes": user_recipes.filter(is_public=True),
        "private_recipes": user_recipes.filter(is_public=False),
    }
    return render(request, "accounts/profile.html", context)
