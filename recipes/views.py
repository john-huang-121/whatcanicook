from django.shortcuts import render, get_object_or_404, HttpResponseRedirect

from .models import Recipe
from .forms import RecipeForm

# Create your views here.
def index(request):
    recipes_list = Recipe.objects.all()
    context = {'recipes_list': recipes_list}

    return render(request, 'recipes/index.html', context)

def detail(request, recipe_id):
    recipe = get_object_or_404(Recipe, pk=recipe_id)

    return render(request, 'recipes/detail.html', {'recipe': recipe})

def create(request):
    form = RecipeForm(request.POST or None)

    if form.is_valid():
        form.save()

    context = {'form' : form}
    return render(request, 'recipes/create.html', context)

def update(request, recipe_id):
    obj = get_object_or_404(Recipe, pk=recipe_id)

    form = RecipeForm(request.POST or None, instance = obj)

    if form.is_valid():
        form.save()
        return HttpResponseRedirect('/'+id)

    context = {'form' : form}
    return render(request, 'recipes/update.html', context)

def delete(request, recipe_id):
    obj = get_object_or_404(Recipe, pk=recipe_id)

    if request.method == 'POST':
        obj.delete()

        return HttpResponseRedirect('/')
    
    context = {}
    return render(request, 'recipes/delete.html', context)