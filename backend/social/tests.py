from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from recipes.models import Cuisine, Recipe

from .models import RecipeLike, SavedRecipe, UserFollow

User = get_user_model()


class SocialApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="reader",
            email="reader@example.com",
            password="testpass123",
        )
        self.author = User.objects.create_user(
            username="author",
            email="author@example.com",
            password="testpass123",
        )
        self.other_author = User.objects.create_user(
            username="other-author",
            email="other-author@example.com",
            password="testpass123",
        )
        self.public_recipe = Recipe.objects.create(
            title="Shared Noodles",
            description="A public recipe",
            cook_time=12,
            servings=2,
            cuisine=Cuisine.CHINESE,
            created_by=self.author,
            is_public=True,
        )
        self.other_recipe = Recipe.objects.create(
            title="Other Stew",
            description="Not in the feed",
            cook_time=30,
            servings=4,
            cuisine=Cuisine.MOROCCAN,
            created_by=self.other_author,
            is_public=True,
        )
        self.private_recipe = Recipe.objects.create(
            title="Hidden Noodles",
            description="A private recipe",
            cook_time=15,
            servings=2,
            cuisine=Cuisine.CHINESE,
            created_by=self.author,
            is_public=False,
        )
        self.own_recipe = Recipe.objects.create(
            title="My Soup",
            description="Mine",
            cook_time=10,
            servings=1,
            cuisine=Cuisine.AMERICAN,
            created_by=self.user,
            is_public=True,
        )

    def test_user_can_like_and_unlike_public_recipe(self):
        self.client.login(username="reader", password="testpass123")

        response = self.client.post(reverse("social:recipe-like", args=[self.public_recipe.id]))
        duplicate_response = self.client.post(reverse("social:recipe-like", args=[self.public_recipe.id]))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["is_liked"])
        self.assertEqual(response.json()["like_count"], 1)
        self.assertEqual(duplicate_response.json()["like_count"], 1)
        self.assertEqual(RecipeLike.objects.count(), 1)

        unlike_response = self.client.delete(reverse("social:recipe-like", args=[self.public_recipe.id]))

        self.assertEqual(unlike_response.status_code, 200)
        self.assertFalse(unlike_response.json()["is_liked"])
        self.assertEqual(unlike_response.json()["like_count"], 0)

    def test_like_requires_another_users_public_recipe(self):
        self.client.login(username="reader", password="testpass123")

        private_response = self.client.post(reverse("social:recipe-like", args=[self.private_recipe.id]))
        own_response = self.client.post(reverse("social:recipe-like", args=[self.own_recipe.id]))

        self.assertEqual(private_response.status_code, 404)
        self.assertEqual(own_response.status_code, 400)
        self.assertFalse(RecipeLike.objects.exists())

    def test_user_can_save_and_list_saved_recipes(self):
        self.client.login(username="reader", password="testpass123")

        save_response = self.client.post(reverse("social:recipe-save", args=[self.public_recipe.id]))
        list_response = self.client.get(reverse("social:saved-recipe-list"))

        self.assertEqual(save_response.status_code, 200)
        self.assertTrue(save_response.json()["is_saved"])
        self.assertEqual(save_response.json()["save_count"], 1)
        self.assertEqual(SavedRecipe.objects.count(), 1)
        self.assertEqual([recipe["title"] for recipe in list_response.json()], ["Shared Noodles"])

        unsave_response = self.client.delete(reverse("social:recipe-save", args=[self.public_recipe.id]))

        self.assertEqual(unsave_response.status_code, 200)
        self.assertFalse(unsave_response.json()["is_saved"])

    def test_follow_controls_feed_recipes(self):
        self.client.login(username="reader", password="testpass123")

        follow_response = self.client.post(reverse("social:user-follow", args=[self.author.id]))
        feed_response = self.client.get(reverse("social:feed"))

        self.assertEqual(follow_response.status_code, 200)
        self.assertTrue(follow_response.json()["is_following"])
        self.assertEqual(follow_response.json()["follower_count"], 1)
        self.assertEqual(UserFollow.objects.count(), 1)
        feed_titles = [recipe["title"] for recipe in feed_response.json()]
        self.assertIn("Shared Noodles", feed_titles)
        self.assertNotIn("Hidden Noodles", feed_titles)
        self.assertNotIn("Other Stew", feed_titles)

        unfollow_response = self.client.delete(reverse("social:user-follow", args=[self.author.id]))
        empty_feed_response = self.client.get(reverse("social:feed"))

        self.assertEqual(unfollow_response.status_code, 200)
        self.assertFalse(unfollow_response.json()["is_following"])
        self.assertEqual(empty_feed_response.json(), [])

    def test_user_cannot_follow_self(self):
        self.client.login(username="reader", password="testpass123")

        response = self.client.post(reverse("social:user-follow", args=[self.user.id]))

        self.assertEqual(response.status_code, 400)
        self.assertFalse(UserFollow.objects.exists())

    def test_dashboard_returns_feed_saved_recipes_and_stats(self):
        UserFollow.objects.create(follower=self.user, following=self.author)
        SavedRecipe.objects.create(user=self.user, recipe=self.public_recipe)
        self.client.login(username="reader", password="testpass123")

        response = self.client.get(reverse("social:dashboard"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual([recipe["title"] for recipe in response.json()["feed"]], ["Shared Noodles"])
        self.assertEqual([recipe["title"] for recipe in response.json()["saved_recipes"]], ["Shared Noodles"])
        self.assertEqual(response.json()["stats"]["recipe_count"], 1)
        self.assertEqual(response.json()["stats"]["following_count"], 1)
        self.assertEqual(response.json()["stats"]["saved_recipe_count"], 1)
