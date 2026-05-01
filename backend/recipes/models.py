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


class Unit(models.TextChoices):
    NONE = '', 'No unit'
    TEASPOON = 'teaspoon(s)', 'teaspoon(s)'
    TABLESPOON = 'tablespoon(s)', 'tablespoon(s)'
    FLUID_OUNCE = 'fluid ounce(s)', 'fluid ounce(s)'
    CUP = 'cup(s)', 'cup(s)'
    PINT = 'pint(s)', 'pint(s)'
    QUART = 'quart(s)', 'quart(s)'
    GALLON = 'gallon(s)', 'gallon(s)'
    MILLILITER = 'milliliter(s)', 'milliliter(s)'
    LITER = 'liter(s)', 'liter(s)'
    OUNCE = 'ounce(s)', 'ounce(s)'
    POUND = 'pound(s)', 'pound(s)'
    GRAM = 'gram(s)', 'gram(s)'
    KILOGRAM = 'kilogram(s)', 'kilogram(s)'
    WHOLE = 'whole', 'whole'
    PIECE = 'piece(s)', 'piece(s)'
    SLICE = 'slice(s)', 'slice(s)'
    CLOVE = 'clove(s)', 'clove(s)'
    SPRIG = 'sprig(s)', 'sprig(s)'
    BUNCH = 'bunch(es)', 'bunch(es)'
    CAN = 'can(s)', 'can(s)'
    JAR = 'jar(s)', 'jar(s)'
    PACKAGE = 'package(s)', 'package(s)'
    PINCH = 'pinch(es)', 'pinch(es)'
    DASH = 'dash(es)', 'dash(es)'
    HANDFUL = 'handful(s)', 'handful(s)'
    TO_TASTE = 'to taste', 'to taste'


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
    instructions = models.ManyToManyField(
        'Instruction',
        through='RecipeInstruction',
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

class Instruction(models.Model):
    text = models.TextField()

    def __str__(self):
        return self.text[:80]
         
class RecipeIngredient(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='recipe_ingredients')
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name='recipe_ingredients')
    quantity = models.FloatField()
    unit = models.CharField(max_length=20, choices=Unit.choices, blank=True, default=Unit.NONE)
    note = models.CharField(max_length=255, blank=True, default="")

    def __str__(self):
        parts = [str(self.quantity)]
        if self.unit:
            parts.append(self.get_unit_display())
        parts.append(self.ingredient.name)
        return " ".join(parts)

class RecipeInstruction(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='recipe_instructions')
    instruction = models.ForeignKey(Instruction, on_delete=models.CASCADE, related_name='recipe_instructions')
    step_number = models.PositiveIntegerField()

    class Meta:
        ordering = ["step_number", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["recipe", "step_number"],
                name="unique_recipe_instruction_step",
            ),
        ]

    def __str__(self):
        return f"{self.step_number}. {self.instruction.text}"
