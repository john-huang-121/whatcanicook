from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.shortcuts import render, get_object_or_404, redirect

from .models import Recipe, Cuisine
from .forms import RecipeForm, RecipeIngredientFormSet


def visible_recipes_for(user):
    return Recipe.objects.visible_to(user).select_related("created_by")


def get_owned_recipe_or_404(user, recipe_id):
    return get_object_or_404(
        Recipe.objects.select_related("created_by"),
        pk=recipe_id,
        created_by=user,
    )


def cuisine_index(request):
    cuisines_list = [choice.label for choice in Cuisine]
    context = {'cuisines_list': cuisines_list}

    return render(request, 'recipes/cuisine_index.html', context)

def cuisine(request, cuisine_type):
    cuisine_list = visible_recipes_for(request.user).filter(cuisine=cuisine_type).order_by("-created_at")
    context = {'cuisine_list': cuisine_list, 'cuisine_type': cuisine_type.title()}

    return render(request, 'recipes/cuisine.html', context)

def detail(request, recipe_id):
    recipe = get_object_or_404(visible_recipes_for(request.user), pk=recipe_id)

    return render(request, 'recipes/detail.html', {'recipe': recipe})

@login_required
def create(request):
    form = RecipeForm(request.POST or None)
    formset = RecipeIngredientFormSet(request.POST or None)

    if form.is_valid() and formset.is_valid():
        with transaction.atomic():
            recipe = form.save(commit=False)
            recipe.created_by = request.user
            recipe.save()
            formset.instance = recipe
            formset.save()
        return redirect('recipes:detail', recipe_id=recipe.id)

    return render(request, 'recipes/create.html', {
        'form': form,
        'formset': formset,
        'page_title': 'Create Recipe',
        'submit_label': 'Create Recipe',
    })

@login_required
def update(request, recipe_id):
    obj = get_owned_recipe_or_404(request.user, recipe_id)

    form = RecipeForm(request.POST or None, instance=obj)
    formset = RecipeIngredientFormSet(request.POST or None, instance=obj)

    if form.is_valid() and formset.is_valid():
        with transaction.atomic():
            form.save()
            formset.save()
        return redirect('recipes:detail', recipe_id=recipe_id)

    context = {
        'form': form,
        'formset': formset,
        'page_title': 'Update Recipe',
        'submit_label': 'Save Changes',
        'recipe': obj,
    }
    return render(request, 'recipes/create.html', context)

@login_required
def delete(request, recipe_id):
    obj = get_owned_recipe_or_404(request.user, recipe_id)

    if request.method == 'POST':
        obj.delete()

        return redirect('recipes:cuisine_index')
    
    context = {'recipe': obj}
    return render(request, 'recipes/delete.html', context)
