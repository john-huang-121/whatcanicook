from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

from ..models import Recipe, RecipeIngredient, Ingredient, Cuisine

User = get_user_model()

# Create your tests here.
class RecipeModelTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="testpass123",
        )
        self.other_user = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="testpass123",
        )

        # Create ingredients
        self.salt = Ingredient.objects.create(name="Salt")
        self.eggs = Ingredient.objects.create(name="Eggs")

        # Create recipes
        self.recipe1 = Recipe.objects.create(
            title="Scrambled Eggs",
            description="Simple scrambled eggs",
            instructions="Beat eggs, cook in pan with salt.",
            prep_time=2,
            cook_time=5,
            servings=1,
            cuisine=Cuisine.AMERICAN,
            created_by=self.owner,
        )

        self.recipe2 = Recipe.objects.create(
            title="Salted Pasta",
            description="Just salty pasta water",
            instructions="Boil water, add salt and pasta.",
            cook_time=10,
            servings=2,
            cuisine=Cuisine.ITALIAN,
            created_by=self.owner,
        )

        self.private_recipe = Recipe.objects.create(
            title="Secret Soup",
            description="Hidden recipe",
            instructions="Keep it quiet.",
            prep_time=5,
            cook_time=20,
            servings=4,
            cuisine=Cuisine.FRENCH,
            created_by=self.other_user,
            is_public=False,
        )

        # Link ingredients to recipes
        RecipeIngredient.objects.create(recipe=self.recipe1, ingredient=self.eggs, quantity=2, unit="pcs")
        RecipeIngredient.objects.create(recipe=self.recipe1, ingredient=self.salt, quantity=0.5, unit="tsp")
        RecipeIngredient.objects.create(recipe=self.recipe2, ingredient=self.salt, quantity=1, unit="tbsp")

    def test_recipe_str(self):
        self.assertEqual(str(self.recipe1), "Scrambled Eggs")
        self.assertEqual(str(self.recipe2), "Salted Pasta")

    def test_ingredient_str(self):
        self.assertEqual(str(self.salt), "Salt")
        self.assertEqual(str(self.eggs), "Eggs")

    def test_find_all_ingredient_recipes(self):
        salt_recipes = self.salt.find_all_ingredient_recipes()
        self.assertIn(self.recipe1, salt_recipes)
        self.assertIn(self.recipe2, salt_recipes)
        self.assertEqual(salt_recipes.count(), 2)

        egg_recipes = self.eggs.find_all_ingredient_recipes()
        self.assertIn(self.recipe1, egg_recipes)
        self.assertNotIn(self.recipe2, egg_recipes)
        self.assertEqual(egg_recipes.count(), 1)

    def test_recipe_ingredients_many_to_many(self):
        recipe1_ingredients = set(self.recipe1.ingredients.values_list("name", flat=True))
        self.assertEqual(recipe1_ingredients, {"Eggs", "Salt"})

    def test_total_time(self):
        self.assertEqual(self.recipe1.total_time(), 7)
        self.assertEqual(self.recipe2.total_time(), 10)

    def test_visible_to_anonymous(self):
        visible = Recipe.objects.visible_to(AnonymousUser())
        self.assertIn(self.recipe1, visible)
        self.assertIn(self.recipe2, visible)
        self.assertNotIn(self.private_recipe, visible)

    def test_visible_to_owner(self):
        visible = Recipe.objects.visible_to(self.other_user)
        self.assertIn(self.private_recipe, visible)

    def test_recipeingredient_str(self):
        ri = RecipeIngredient.objects.get(recipe=self.recipe1, ingredient=self.salt)
        self.assertEqual(str(ri), "0.5 tsp Salt")
