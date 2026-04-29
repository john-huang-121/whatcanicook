from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from recipes.models import Cuisine, Ingredient, Recipe, RecipeIngredient

User = get_user_model()


class RecipeViewTests(TestCase):
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
            instructions="Cook it.",
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
            instructions="Keep it secret.",
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
            unit="tsp",
        )

    def recipe_post_data(self, *, title="New Recipe", is_public=True):
        return {
            "title": title,
            "description": "Something tasty",
            "instructions": "Mix well",
            "prep_time": "10",
            "cook_time": "20",
            "servings": "4",
            "cuisine": Cuisine.AMERICAN,
            "is_public": "on" if is_public else "",
            "recipe_ingredients-TOTAL_FORMS": "3",
            "recipe_ingredients-INITIAL_FORMS": "0",
            "recipe_ingredients-MIN_NUM_FORMS": "0",
            "recipe_ingredients-MAX_NUM_FORMS": "1000",
            "recipe_ingredients-0-ingredient": str(self.ingredient.id),
            "recipe_ingredients-0-quantity": "1",
            "recipe_ingredients-0-unit": "cup",
            "recipe_ingredients-1-ingredient": "",
            "recipe_ingredients-1-quantity": "",
            "recipe_ingredients-1-unit": "",
            "recipe_ingredients-2-ingredient": "",
            "recipe_ingredients-2-quantity": "",
            "recipe_ingredients-2-unit": "",
        }

    def test_create_requires_login(self):
        response = self.client.get(reverse("recipes:create"))
        self.assertRedirects(response, f"{reverse('account_login')}?next={reverse('recipes:create')}")

    def test_logged_in_user_can_create_private_recipe(self):
        self.client.login(username="owner", password="testpass123")
        response = self.client.post(
            reverse("recipes:create"),
            self.recipe_post_data(title="Secret Dish", is_public=False),
        )

        recipe = Recipe.objects.get(title="Secret Dish")
        self.assertRedirects(response, reverse("recipes:detail", args=[recipe.id]))
        self.assertEqual(recipe.created_by, self.owner)
        self.assertFalse(recipe.is_public)
        self.assertEqual(recipe.recipe_ingredients.count(), 1)

    def test_anonymous_cannot_view_private_recipe(self):
        response = self.client.get(reverse("recipes:detail", args=[self.private_recipe.id]))
        self.assertEqual(response.status_code, 404)

    def test_owner_can_view_private_recipe(self):
        self.client.login(username="owner", password="testpass123")
        response = self.client.get(reverse("recipes:detail", args=[self.private_recipe.id]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Private Pasta")

    def test_cuisine_page_hides_other_users_private_recipes(self):
        response = self.client.get(reverse("recipes:cuisine", args=[Cuisine.ITALIAN]))
        self.assertContains(response, "Public Pasta")
        self.assertNotContains(response, "Private Pasta")

    def test_owner_sees_private_recipe_in_cuisine_page(self):
        self.client.login(username="owner", password="testpass123")
        response = self.client.get(reverse("recipes:cuisine", args=[Cuisine.ITALIAN]))
        self.assertContains(response, "Private Pasta")
        self.assertContains(response, "Private to you")

    def test_non_owner_cannot_edit_recipe(self):
        self.client.login(username="other", password="testpass123")
        response = self.client.get(reverse("recipes:update", args=[self.public_recipe.id]))
        self.assertEqual(response.status_code, 404)
