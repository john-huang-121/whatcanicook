from django import forms
from django.forms import inlineformset_factory
from .models import Recipe, RecipeIngredient, RecipeInstruction

class RecipeForm(forms.ModelForm):
    class Meta:
        model = Recipe
        fields = [
            'title',
            'description',
            'prep_time',
            'cook_time',
            'servings',
            'cuisine',
            'is_public',
        ]
        labels = {
            'is_public': 'Public recipe',
        }

class RecipeIngredientForm(forms.ModelForm):
    class Meta:
        model = RecipeIngredient
        fields = ['ingredient', 'quantity', 'unit', 'note']


class RecipeInstructionForm(forms.ModelForm):
    class Meta:
        model = RecipeInstruction
        fields = ['instruction', 'step_number']


RecipeIngredientFormSet = inlineformset_factory(
    Recipe,
    RecipeIngredient,
    form=RecipeIngredientForm,
    extra=3,  # or however many ingredient fields you want to show
    can_delete=True
)

RecipeInstructionFormSet = inlineformset_factory(
    Recipe,
    RecipeInstruction,
    form=RecipeInstructionForm,
    extra=3,
    can_delete=True,
)
