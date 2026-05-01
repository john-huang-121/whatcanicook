from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from recipes.models import Cuisine, Ingredient, Instruction, Recipe, RecipeIngredient, RecipeInstruction, Unit

User = get_user_model()


class RecipeApiTests(TestCase):
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
        self.ingredient = Ingredient.objects.create(name="Salt")
        self.public_recipe = Recipe.objects.create(
            title="Public Pasta",
            description="For everyone",
            prep_time=5,
            cook_time=15,
            servings=2,
            cuisine=Cuisine.ITALIAN,
            created_by=self.owner,
            is_public=True,
        )
        self.private_recipe = Recipe.objects.create(
            title="Private Pasta",
            description="For me",
            prep_time=5,
            cook_time=15,
            servings=2,
            cuisine=Cuisine.ITALIAN,
            created_by=self.owner,
            is_public=False,
        )
        RecipeIngredient.objects.create(
            recipe=self.public_recipe,
            ingredient=self.ingredient,
            quantity=1,
            unit=Unit.TEASPOON,
        )
        cook_it = Instruction.objects.create(text="Cook it.")
        keep_secret = Instruction.objects.create(text="Keep it secret.")
        RecipeInstruction.objects.create(recipe=self.public_recipe, instruction=cook_it, step_number=1)
        RecipeInstruction.objects.create(recipe=self.private_recipe, instruction=keep_secret, step_number=1)

    def recipe_payload(self, *, title="New Recipe", is_public=True):
        return {
            "title": title,
            "description": "Something tasty",
            "prep_time": 10,
            "cook_time": 20,
            "servings": 4,
            "cuisine": Cuisine.AMERICAN,
            "is_public": is_public,
            "instruction_items": [
                {"text": "Mix well."},
                {"text": "Serve warm."},
            ],
            "ingredient_items": [
                {"name": "Salt", "quantity": 1, "unit": Unit.CUP, "note": "fine sea salt"},
                {"name": "Pepper", "quantity": 0.5, "unit": Unit.TEASPOON},
            ],
        }

    def test_cuisines_endpoint_lists_choices(self):
        response = self.client.get(reverse("recipes:cuisine-list"))

        self.assertEqual(response.status_code, 200)
        self.assertIn({"value": "italian", "label": "Italian"}, response.json())

    def test_units_endpoint_lists_choices(self):
        response = self.client.get(reverse("recipes:unit-list"))

        self.assertEqual(response.status_code, 200)
        self.assertIn({"value": "teaspoon(s)", "label": "teaspoon(s)"}, response.json())
        self.assertIn({"value": "slice(s)", "label": "slice(s)"}, response.json())
        self.assertIn({"value": "to taste", "label": "to taste"}, response.json())

    def test_create_requires_login(self):
        response = self.client.post(
            reverse("recipes:recipe-list"),
            self.recipe_payload(),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)

    def test_logged_in_user_can_create_private_recipe(self):
        self.client.login(username="owner", password="testpass123")

        response = self.client.post(
            reverse("recipes:recipe-list"),
            self.recipe_payload(title="Secret Dish", is_public=False),
            content_type="application/json",
        )

        recipe = Recipe.objects.get(title="Secret Dish")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["id"], recipe.id)
        self.assertEqual(recipe.created_by, self.owner)
        self.assertFalse(recipe.is_public)
        self.assertEqual(recipe.recipe_ingredients.count(), 2)
        self.assertEqual(recipe.recipe_instructions.count(), 2)
        self.assertEqual(response.json()["ingredients"][0]["unit_label"], "cup(s)")
        self.assertEqual(response.json()["ingredients"][0]["note"], "fine sea salt")
        self.assertEqual(recipe.recipe_ingredients.get(ingredient__name="Salt").note, "fine sea salt")

    def test_anonymous_cannot_view_private_recipe(self):
        response = self.client.get(reverse("recipes:recipe-detail", args=[self.private_recipe.id]))

        self.assertEqual(response.status_code, 404)

    def test_owner_can_view_private_recipe(self):
        self.client.login(username="owner", password="testpass123")

        response = self.client.get(reverse("recipes:recipe-detail", args=[self.private_recipe.id]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["title"], "Private Pasta")
        self.assertEqual(response.json()["instructions"][0]["text"], "Keep it secret.")
        self.assertTrue(response.json()["is_owner"])

    def test_create_requires_instruction_steps(self):
        self.client.login(username="owner", password="testpass123")
        payload = self.recipe_payload()
        payload["instruction_items"] = []

        response = self.client.post(
            reverse("recipes:recipe-list"),
            payload,
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("instruction_items", response.json())

    def test_create_rejects_unknown_unit(self):
        self.client.login(username="owner", password="testpass123")
        payload = self.recipe_payload()
        payload["ingredient_items"][0]["unit"] = "scoop"

        response = self.client.post(
            reverse("recipes:recipe-list"),
            payload,
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("ingredient_items", response.json())

    def test_cuisine_endpoint_hides_other_users_private_recipes(self):
        response = self.client.get(reverse("recipes:recipe-list"), {"cuisine": Cuisine.ITALIAN})
        recipe_titles = [recipe["title"] for recipe in response.json()]

        self.assertIn("Public Pasta", recipe_titles)
        self.assertNotIn("Private Pasta", recipe_titles)

    def test_owner_sees_private_recipe_in_cuisine_endpoint(self):
        self.client.login(username="owner", password="testpass123")

        response = self.client.get(reverse("recipes:recipe-list"), {"cuisine": Cuisine.ITALIAN})
        recipe_titles = [recipe["title"] for recipe in response.json()]

        self.assertIn("Private Pasta", recipe_titles)

    def test_non_owner_cannot_edit_recipe(self):
        self.client.login(username="other", password="testpass123")

        response = self.client.patch(
            reverse("recipes:recipe-detail", args=[self.public_recipe.id]),
            {"title": "Stolen Pasta"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)

    def test_owner_can_update_recipe_ingredients(self):
        self.client.login(username="owner", password="testpass123")

        response = self.client.patch(
            reverse("recipes:recipe-detail", args=[self.public_recipe.id]),
            {
                "title": "Updated Pasta",
                "ingredient_items": [
                    {"name": "Tomato", "quantity": 2, "unit": Unit.CUP, "note": "diced"},
                ],
            },
            content_type="application/json",
        )

        self.public_recipe.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.public_recipe.title, "Updated Pasta")
        self.assertEqual(self.public_recipe.recipe_ingredients.count(), 1)
        self.assertEqual(self.public_recipe.recipe_ingredients.first().ingredient.name, "Tomato")
        self.assertEqual(self.public_recipe.recipe_ingredients.first().note, "diced")

    def test_owner_can_update_recipe_instructions(self):
        self.client.login(username="owner", password="testpass123")

        response = self.client.patch(
            reverse("recipes:recipe-detail", args=[self.public_recipe.id]),
            {
                "instruction_items": [
                    {"text": "Boil pasta."},
                    {"text": "Finish with sauce."},
                ],
            },
            content_type="application/json",
        )

        self.public_recipe.refresh_from_db()
        instruction_steps = list(
            self.public_recipe.recipe_instructions.values_list("instruction__text", flat=True)
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(instruction_steps, ["Boil pasta.", "Finish with sauce."])
        self.assertEqual(response.json()["instructions"][1]["step_number"], 2)

    def test_owner_can_delete_recipe(self):
        self.client.login(username="owner", password="testpass123")

        response = self.client.delete(reverse("recipes:recipe-detail", args=[self.public_recipe.id]))

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Recipe.objects.filter(id=self.public_recipe.id).exists())
