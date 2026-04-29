from django.conf import settings
from django.db import models
from django.db.models import Q


class RecipeQuerySet(models.QuerySet):
    def visible_to(self, user):
        if user.is_authenticated:
            return self.filter(Q(is_public=True) | Q(created_by=user))
        return self.filter(is_public=True)

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
    prep_time = models.PositiveIntegerField(
        help_text="Time in minutes",
        blank=True,
        null=True,
    )
    cook_time = models.PositiveIntegerField(help_text="Time in minutes")
    servings = models.PositiveIntegerField()
    instructions = models.TextField()
    cuisine = models.CharField(
        max_length=20,
        choices=Cuisine.choices,
        blank=True,
        null=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='recipes',
    )
    is_public = models.BooleanField(default=True)
    ingredients = models.ManyToManyField(
        'Ingredient',
        through='RecipeIngredient',
        related_name='recipes',
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    objects = RecipeQuerySet.as_manager()

    def __str__(self):
        return self.title
    
    @property
    def published_date(self):
        return self.created_at.strftime("%B %d, %Y")

    def total_time(self):
        return (self.prep_time or 0) + self.cook_time

    def can_view(self, user):
        return self.is_public or (user.is_authenticated and self.created_by_id == user.id)

    def can_edit(self, user):
        return user.is_authenticated and self.created_by_id == user.id

class Ingredient(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name
    
    def find_all_ingredient_recipes(self):
        return self.recipes.all()
         
class RecipeIngredient(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='recipe_ingredients')
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name='recipe_ingredients')
    quantity = models.FloatField()
    unit = models.CharField(max_length=64, blank=True)

    def __str__(self):
        parts = [str(self.quantity)]
        if self.unit:
            parts.append(self.unit)
        parts.append(self.ingredient.name)
        return " ".join(parts)
