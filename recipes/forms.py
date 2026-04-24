from django import forms
from django.forms import inlineformset_factory
from .models import Recipe, RecipeIngredient

class RecipeForm(forms.ModelForm):
    class Meta:
        model = Recipe
        fields = [
            'title',
            'description',
            'instructions',
            'prep_time',
            'cook_time',
            'servings',
            'cuisine',
        ]

class RecipeIngredientForm(forms.ModelForm):
    class Meta:
        model = RecipeIngredient
        fields = ['ingredient', 'quantity', 'unit']


RecipeIngredientFormSet = inlineformset_factory(
    Recipe,
    RecipeIngredient,
    form=RecipeIngredientForm,
    extra=3,  # or however many ingredient fields you want to show
    can_delete=True
)