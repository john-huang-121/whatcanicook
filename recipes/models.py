from django.db import models
from django.conf import settings

# Create your models here.
class Cuisine(models.TextChoices):
    # Western
    AMERICAN = 'american', 'American'
    FRENCH = 'french', 'French'
    ITALIAN = 'italian', 'Italian'
    SPANISH = 'spanish', 'Spanish'
    MEDITERRANEAN = 'mediterranean', 'Mediterranean'
    # Asian
    CHINESE = 'chinese', 'Chinese'
    JAPANESE = 'japanese', 'Japanese'
    KOREAN = 'korean', 'Korean'
    THAI = 'thai', 'Thai'
    VIETNAMESE = 'vietnamese', 'Vietnamese'
    INDIAN = 'indian', 'Indian'
    FILIPINO = 'filipino', 'Filipino'
    MALAYSIAN = 'malaysian', 'Malaysian'
    INDONESIAN = 'indonesian', 'Indonesian'
    # Middle Eastern
    MIDDLE_EASTERN = 'middle_eastern', 'Middle Eastern'
    # African
    MOROCCAN = 'moroccan', 'Moroccan'
    ETHIOPIAN = 'ethiopian', 'Ethiopian'
    WEST_AFRICAN = 'west_african', 'West African'
    # Latin American & Caribbean
    MEXICAN = 'mexican', 'Mexican'
    BRAZILIAN = 'brazilian', 'Brazilian'
    PERUVIAN = 'peruvian', 'Peruvian'
    ARGENTINIAN = 'argentinian', 'Argentinian'
    CARIBBEAN = 'caribbean', 'Caribbean'
    # Eastern European
    EASTERN_EUROPEAN = 'eastern_european', 'Eastern European'
    RUSSIAN = 'russian', 'Russian'
    POLISH = 'polish', 'Polish'
    # Miscellaneous
    MISCELLANEOUS = 'miscellaneous', 'Miscellaneous'

class Recipe(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    cook_time = models.PositiveIntegerField(help_text="Time in minutes")
    servings = models.PositiveIntegerField()
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
    
    @property
    def published_date(self):
        return self.created_at.strftime("%B %d, %Y")

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