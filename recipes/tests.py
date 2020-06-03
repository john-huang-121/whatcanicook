from django.test import TestCase
from django.urls import reverse

from .models import Recipe, Ingredient

# Create your tests here.
class IngredientModelTests(TestCase):
    recipe_list = [
        Recipe(
            cuisine="Universal",
            title="Boiled Garlic",
            description="Water boiled garlic clove"
        ),
        Recipe(
            cuisine="Universal",
            title="Raw Garlic",
            description="Raw garlic clove"
        )
    ]

    def test_new_ingredient_references(self):
        garlic = Ingredient(
            ingredient_name="Garlic",
            amount_needed=1,
            unit_measurement="clove"
        )
        garlic.save()

        for recipe in self.recipe_list:
            recipe.save()
            garlic.recipes.add(recipe)

        self.assertEquals(garlic.recipes.count(), 2)

    def test_recipe_has_one_ingredient_relationship(self):
        garlic = Ingredient(
            ingredient_name="Garlic",
            amount_needed=1,
            unit_measurement="clove"
        )
        garlic.save()
        for recipe in self.recipe_list:
            recipe.save()
            garlic.recipes.add(recipe)

        self.assertEquals(self.recipe_list[0].ingredient_set.count(), 1)

def create_hardboiled_egg_recipe():
    new_recipe = Recipe(
        cuisine="Universal",
        title="Hardboiled Egg",
        description="An egg that has been cooked through in boiling water."
    )
    return new_recipe

class RecipeModelTests(TestCase):
    def test_recipe_accepts_valid_cuisine(self):
        """
        Checks whether the model will accept valid cuisines
        """
        valid_ans = create_hardboiled_egg_recipe()
        self.assertIs(valid_ans.acceptable_cuisines(), True)

    def test_recipe_doesnt_accept_invalid_ans(self):
        """
        Checks whether the model will accept valid cuisines
        """
        invalid_ans = create_hardboiled_egg_recipe()
        invalid_ans.cuisine = "Cheesy"
        self.assertIs(invalid_ans.acceptable_cuisines(), False)

    def test_cuisine_does_not_accept_blank(self):
        """
        Will not accept a blank cuisine type
        """
        invalid_ans = create_hardboiled_egg_recipe()
        invalid_ans.cuisine = ""
        self.assertIsNot(invalid_ans.acceptable_cuisines(), True)

    def test_recipe_has_title(self):
        recipe = create_hardboiled_egg_recipe()
        self.assertEquals(recipe.title, "Hardboiled Egg")

    def test_recipe_has_descriptions(self):
        recipe = create_hardboiled_egg_recipe()
        self.assertEquals(recipe.description, "An egg that has been cooked through in boiling water.")
