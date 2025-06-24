from django.db import models
from django.conf import settings

# Create your models here.
class Cuisine(models.TextChoices):
    ITALIAN = 'italian', 'Italian'
    FRENCH = 'french', 'French'
    CHINESE = 'chinese', 'Chinese'
    JAPANESE = 'japanese', 'Japanese'
    KOREAN = 'korean', 'Korean'
    AMERICAN = 'american', 'American'

class ServingUnit(models.Model):
    text = models.CharField(max_length=50)

    def __str__(self):
        return self.text

class Recipe(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    prep_time = models.CharField(max_length=100, blank=True)
    cook_time = models.PositiveIntegerField(help_text="Time in minutes")
    servings = models.PositiveIntegerField()
    serving_unit = models.ForeignKey(ServingUnit, null=True, blank=True, on_delete=models.SET_NULL)
    instructions = models.TextField()
    cuisine = models.CharField(
        max_length=20,
        choices=Cuisine.choices,
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recipes')

    def __str__(self):
        return self.title

class Ingredient(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name
    
    def find_all_ingredient_recipes(self):
        return Recipe.objects.filter(recipe_ingredients__ingredient=self).distinct()
        
class RecipeIngredient(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='recipe_ingredients')
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name='recipe_ingredients')
    quantity = models.FloatField()
    unit = models.CharField(max_length=64)

    def __str__(self):
        return f"{self.quantity} {self.unit} {self.ingredient.name}"