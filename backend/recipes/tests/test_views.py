from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse

from recipes.models import (
    Cuisine,
    Ingredient,
    Instruction,
    Recipe,
    RecipeIngredient,
    RecipeImage,
    RecipeInstruction,
    Unit,
    UserIngredient,
    UserIngredientStatus,
)
from recipes.storage_paths import recipe_images_prefix

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
        self.middle_eastern_recipe = Recipe.objects.create(
            title="Falafel Plate",
            description="Herby chickpea dinner",
            prep_time=20,
            cook_time=10,
            servings=3,
            cuisine=Cuisine.MIDDLE_EASTERN,
            created_by=self.owner,
            is_public=True,
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
                {
                    "ingredient_id": self.ingredient.id,
                    "user_ingredient_id": None,
                    "name": "Salt",
                    "quantity": 1,
                    "unit": Unit.CUP,
                    "note": "fine sea salt",
                },
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

    def test_ingredients_endpoint_lists_titleized_canonical_ingredients(self):
        response = self.client.get(reverse("recipes:ingredient-list"))

        self.assertEqual(response.status_code, 200)
        self.assertIn({"id": self.ingredient.id, "name": "Salt", "category": "", "aliases": []}, response.json())
        self.assertEqual(Ingredient.objects.get(id=self.ingredient.id).name, "salt")

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
        self.assertEqual(recipe.recipe_ingredients.get(ingredient__name="salt").note, "fine sea salt")
        self.assertEqual(recipe.recipe_ingredients.get(user_ingredient__name="pepper").user_ingredient.status, "under_review")
        self.assertEqual(response.json()["ingredients"][1]["review_status"], "under_review")
        self.assertIn("image", response.json())
        self.assertIn("image_url", response.json())
        self.assertIn("images", response.json())

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

    def test_search_matches_recipe_title(self):
        response = self.client.get(reverse("recipes:recipe-list"), {"q": "Public"})
        recipe_titles = [recipe["title"] for recipe in response.json()]

        self.assertIn("Public Pasta", recipe_titles)

    def test_search_matches_recipe_description(self):
        response = self.client.get(reverse("recipes:recipe-list"), {"q": "everyone"})
        recipe_titles = [recipe["title"] for recipe in response.json()]

        self.assertIn("Public Pasta", recipe_titles)

    def test_search_matches_ingredient_name(self):
        response = self.client.get(reverse("recipes:recipe-list"), {"q": "Salt"})
        recipe_titles = [recipe["title"] for recipe in response.json()]

        self.assertIn("Public Pasta", recipe_titles)

    def test_search_matches_custom_user_ingredient_name(self):
        user_ingredient = UserIngredient.objects.create(user=self.owner, name="Aleppo Pepper")
        RecipeIngredient.objects.create(
            recipe=self.public_recipe,
            user_ingredient=user_ingredient,
            quantity=1,
            unit=Unit.TEASPOON,
        )

        response = self.client.get(reverse("recipes:recipe-list"), {"q": "Aleppo"})
        recipe_titles = [recipe["title"] for recipe in response.json()]

        self.assertIn("Public Pasta", recipe_titles)

    def test_search_matches_author_username(self):
        response = self.client.get(reverse("recipes:recipe-list"), {"q": "owner"})
        recipe_titles = [recipe["title"] for recipe in response.json()]

        self.assertIn("Public Pasta", recipe_titles)
        self.assertIn("Falafel Plate", recipe_titles)

    def test_search_matches_cuisine_label_and_value(self):
        label_response = self.client.get(reverse("recipes:recipe-list"), {"q": "Middle"})
        value_response = self.client.get(reverse("recipes:recipe-list"), {"q": "middle_eastern"})

        self.assertIn("Falafel Plate", [recipe["title"] for recipe in label_response.json()])
        self.assertIn("Falafel Plate", [recipe["title"] for recipe in value_response.json()])

    def test_search_matches_any_word(self):
        response = self.client.get(reverse("recipes:recipe-list"), {"q": "marshmallow Salt"})
        recipe_titles = [recipe["title"] for recipe in response.json()]

        self.assertIn("Public Pasta", recipe_titles)

    def test_search_hides_other_users_private_recipes(self):
        response = self.client.get(reverse("recipes:recipe-list"), {"q": "Private"})
        recipe_titles = [recipe["title"] for recipe in response.json()]

        self.assertNotIn("Private Pasta", recipe_titles)

    def test_owner_can_search_private_recipes(self):
        self.client.login(username="owner", password="testpass123")

        response = self.client.get(reverse("recipes:recipe-list"), {"q": "Private"})
        recipe_titles = [recipe["title"] for recipe in response.json()]

        self.assertIn("Private Pasta", recipe_titles)

    def test_search_combines_with_cuisine_and_mine_filter(self):
        self.client.login(username="owner", password="testpass123")

        response = self.client.get(
            reverse("recipes:recipe-list"),
            {"q": "Private", "cuisine": Cuisine.ITALIAN, "mine": "true"},
        )
        recipe_titles = [recipe["title"] for recipe in response.json()]

        self.assertEqual(recipe_titles, ["Private Pasta"])

    def test_ingredient_ids_filter_matches_recipes_with_all_selected_ingredients(self):
        tomato = Ingredient.objects.create(name="Tomato")
        RecipeIngredient.objects.create(
            recipe=self.public_recipe,
            ingredient=tomato,
            quantity=2,
            unit=Unit.WHOLE,
        )
        RecipeIngredient.objects.create(
            recipe=self.middle_eastern_recipe,
            ingredient=tomato,
            quantity=1,
            unit=Unit.WHOLE,
        )

        response = self.client.get(
            reverse("recipes:recipe-list"),
            {"ingredient_ids": f"{self.ingredient.id},{tomato.id}"},
        )
        recipe_titles = [recipe["title"] for recipe in response.json()]

        self.assertEqual(response.status_code, 200)
        self.assertEqual(recipe_titles, ["Public Pasta"])

    def test_invalid_ingredient_ids_filter_returns_no_recipes(self):
        response = self.client.get(reverse("recipes:recipe-list"), {"ingredient_ids": "salt"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

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
        self.assertEqual(self.public_recipe.recipe_ingredients.first().user_ingredient.name, "tomato")
        self.assertEqual(self.public_recipe.recipe_ingredients.first().user_ingredient.status, UserIngredientStatus.UNDER_REVIEW)
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

    @override_settings(USE_S3=True)
    def test_owner_can_update_recipe_image_from_presigned_upload_key(self):
        self.client.login(username="owner", password="testpass123")

        image_key = f"users/user_{self.owner.id}/recipes/recipe_{self.public_recipe.id}/cover.png"
        response = self.client.patch(
            reverse("recipes:recipe-detail", args=[self.public_recipe.id]),
            {"image_key": image_key},
            content_type="application/json",
        )

        self.public_recipe.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.public_recipe.image.name, image_key)
        self.assertEqual(
            RecipeImage.objects.get(recipe=self.public_recipe, position=0).image.name,
            image_key,
        )

    @override_settings(USE_S3=True)
    def test_owner_can_update_recipe_gallery_images_from_presigned_upload_keys(self):
        self.client.login(username="owner", password="testpass123")

        image_items = [
            {
                "position": 0,
                "image_key": f"users/user_{self.owner.id}/recipes/recipe_{self.public_recipe.id}/hero.png",
            },
            {
                "position": 4,
                "image_key": f"users/user_{self.owner.id}/recipes/recipe_{self.public_recipe.id}/gallery.png",
            },
        ]
        response = self.client.patch(
            reverse("recipes:recipe-detail", args=[self.public_recipe.id]),
            {"image_items": image_items},
            content_type="application/json",
        )

        self.public_recipe.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.public_recipe.image.name, image_items[0]["image_key"])
        self.assertEqual(self.public_recipe.recipe_images.count(), 2)
        self.assertEqual(response.json()["images"][0]["position"], 0)
        self.assertEqual(response.json()["images"][0]["image_key"], image_items[0]["image_key"])
        self.assertEqual(response.json()["images"][1]["position"], 4)

    @override_settings(USE_S3=True)
    def test_owner_can_replace_recipe_gallery_images_from_complete_image_items(self):
        self.client.login(username="owner", password="testpass123")
        image_keys = [
            f"users/user_{self.owner.id}/recipes/recipe_{self.public_recipe.id}/hero.png",
            f"users/user_{self.owner.id}/recipes/recipe_{self.public_recipe.id}/middle.png",
            f"users/user_{self.owner.id}/recipes/recipe_{self.public_recipe.id}/final.png",
        ]
        for position, image_key in enumerate(image_keys):
            RecipeImage.objects.create(recipe=self.public_recipe, position=position, image=image_key)
        self.public_recipe.image.name = image_keys[0]
        self.public_recipe.save(update_fields=["image"])

        response = self.client.patch(
            reverse("recipes:recipe-detail", args=[self.public_recipe.id]),
            {
                "image_items": [
                    {"position": 0, "image_key": image_keys[0]},
                    {"position": 1, "image_key": image_keys[2]},
                ],
            },
            content_type="application/json",
        )

        self.public_recipe.refresh_from_db()
        recipe_images = list(self.public_recipe.recipe_images.order_by("position"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.public_recipe.image.name, image_keys[0])
        self.assertEqual([(image.position, image.image.name) for image in recipe_images], [(0, image_keys[0]), (1, image_keys[2])])
        self.assertEqual([image["position"] for image in response.json()["images"]], [0, 1])

    @override_settings(USE_S3=True)
    def test_owner_can_remove_all_recipe_gallery_images(self):
        self.client.login(username="owner", password="testpass123")
        image_key = f"users/user_{self.owner.id}/recipes/recipe_{self.public_recipe.id}/hero.png"
        RecipeImage.objects.create(recipe=self.public_recipe, position=0, image=image_key)
        self.public_recipe.image.name = image_key
        self.public_recipe.save(update_fields=["image"])

        response = self.client.patch(
            reverse("recipes:recipe-detail", args=[self.public_recipe.id]),
            {"image_items": []},
            content_type="application/json",
        )

        self.public_recipe.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.public_recipe.image.name, "")
        self.assertFalse(self.public_recipe.recipe_images.exists())
        self.assertEqual(response.json()["images"], [])

    @override_settings(USE_S3=True)
    def test_recipe_gallery_image_positions_must_be_unique(self):
        self.client.login(username="owner", password="testpass123")

        image_key = f"users/user_{self.owner.id}/recipes/recipe_{self.public_recipe.id}/cover.png"
        response = self.client.patch(
            reverse("recipes:recipe-detail", args=[self.public_recipe.id]),
            {
                "image_items": [
                    {"position": 1, "image_key": image_key},
                    {"position": 1, "image_key": image_key},
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    @override_settings(USE_S3=True)
    def test_recipe_image_key_must_belong_to_recipe_owner_and_recipe(self):
        self.client.login(username="owner", password="testpass123")

        response = self.client.patch(
            reverse("recipes:recipe-detail", args=[self.public_recipe.id]),
            {
                "image_key": f"users/user_{self.other_user.id}/recipes/recipe_{self.public_recipe.id}/cover.png",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    @override_settings(
        USE_S3=True,
        AWS_STORAGE_BUCKET_NAME="test-bucket",
        AWS_S3_REGION_NAME="us-west-1",
        S3_STORAGE_OPTIONS={},
        RECIPE_IMAGE_UPLOAD_MAX_BYTES=2048,
        S3_PRESIGNED_UPLOAD_EXPIRES=300,
    )
    @patch("whatcanicook.services.uploads.boto3.client")
    def test_owner_can_request_presigned_recipe_image_upload(self, client_factory):
        self.client.login(username="owner", password="testpass123")
        s3_client = Mock()
        s3_client.generate_presigned_post.return_value = {
            "url": "https://s3.example.test/",
            "fields": {"key": "users/user_1/recipes/recipe_1/cover.png"},
        }
        client_factory.return_value = s3_client

        response = self.client.post(
            reverse("recipes:recipe-image-upload", args=[self.public_recipe.id]),
            {
                "filename": "cover.png",
                "content_type": "image/png",
                "size": 1024,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["upload_url"], "https://s3.example.test/")
        self.assertTrue(
            data["recipe_image_key"].startswith(
                f"{recipe_images_prefix(self.owner.id, self.public_recipe.id)}/"
            )
        )
        self.assertTrue(
            data["object_key"].startswith(
                f"{recipe_images_prefix(self.owner.id, self.public_recipe.id)}/"
            )
        )
        self.assertEqual(data["max_bytes"], 2048)
        self.assertEqual(data["position"], 0)
        s3_client.generate_presigned_post.assert_called_once()

    @override_settings(
        USE_S3=True,
        AWS_STORAGE_BUCKET_NAME="test-bucket",
        AWS_S3_REGION_NAME="us-west-1",
        S3_STORAGE_OPTIONS={},
        RECIPE_IMAGE_UPLOAD_MAX_BYTES=2048,
        S3_PRESIGNED_UPLOAD_EXPIRES=300,
    )
    @patch("whatcanicook.services.uploads.boto3.client")
    def test_owner_can_request_presigned_recipe_gallery_image_upload(self, client_factory):
        self.client.login(username="owner", password="testpass123")
        s3_client = Mock()
        s3_client.generate_presigned_post.return_value = {
            "url": "https://s3.example.test/",
            "fields": {"key": "users/user_1/recipes/recipe_1/gallery.png"},
        }
        client_factory.return_value = s3_client

        response = self.client.post(
            reverse("recipes:recipe-image-upload", args=[self.public_recipe.id]),
            {
                "filename": "gallery.png",
                "content_type": "image/png",
                "size": 1024,
                "position": 4,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["position"], 4)

    @override_settings(USE_S3=True, RECIPE_IMAGE_UPLOAD_MAX_BYTES=1024)
    def test_presigned_recipe_image_upload_rejects_out_of_range_position(self):
        self.client.login(username="owner", password="testpass123")

        response = self.client.post(
            reverse("recipes:recipe-image-upload", args=[self.public_recipe.id]),
            {
                "filename": "cover.png",
                "content_type": "image/png",
                "size": 512,
                "position": 5,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    @override_settings(USE_S3=True)
    def test_non_owner_cannot_request_presigned_recipe_image_upload(self):
        self.client.login(username="other", password="testpass123")

        response = self.client.post(
            reverse("recipes:recipe-image-upload", args=[self.public_recipe.id]),
            {
                "filename": "cover.png",
                "content_type": "image/png",
                "size": 1024,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)

    @override_settings(USE_S3=True, RECIPE_IMAGE_UPLOAD_MAX_BYTES=1024)
    def test_presigned_recipe_image_upload_rejects_non_images(self):
        self.client.login(username="owner", password="testpass123")

        response = self.client.post(
            reverse("recipes:recipe-image-upload", args=[self.public_recipe.id]),
            {
                "filename": "cover.txt",
                "content_type": "text/plain",
                "size": 512,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    def test_owner_can_delete_recipe(self):
        self.client.login(username="owner", password="testpass123")

        response = self.client.delete(reverse("recipes:recipe-detail", args=[self.public_recipe.id]))

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Recipe.objects.filter(id=self.public_recipe.id).exists())
