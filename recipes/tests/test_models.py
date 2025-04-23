from django.test import TestCase

from ..models import Recipe, RecipeIngredient, Ingredient, Cuisine

# Create your tests here.
class RecipeModelTests(TestCase):
    def setUp(self):
        # Create ingredients
        self.salt = Ingredient.objects.create(name="Salt")
        self.eggs = Ingredient.objects.create(name="Eggs")

        # Create recipes
        self.recipe1 = Recipe.objects.create(
            title="Scrambled Eggs",
            description="Simple scrambled eggs",
            instructions="Beat eggs, cook in pan with salt.",
            cook_time=5,
            servings=1,
            cuisine=Cuisine.AMERICAN,
        )

        self.recipe2 = Recipe.objects.create(
            title="Salted Pasta",
            description="Just salty pasta water",
            instructions="Boil water, add salt and pasta.",
            cook_time=10,
            servings=2,
            cuisine=Cuisine.ITALIAN,
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

    def test_recipeingredient_str(self):
        ri = RecipeIngredient.objects.get(recipe=self.recipe1, ingredient=self.salt)
        self.assertEqual(str(ri), "0.5 tsp Salt")