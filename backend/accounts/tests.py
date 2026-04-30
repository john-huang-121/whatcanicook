from django.contrib.auth import SESSION_KEY, get_user_model
from django.test import TestCase
from django.urls import reverse

from .models import Profile

User = get_user_model()


class SignupApiTests(TestCase):
    def signup_data(self, **overrides):
        data = {
            "username": "jane",
            "email": "jane@example.com",
            "first_name": " Jane ",
            "last_name": " Doe ",
            "password1": "testpass123",
            "password2": "testpass123",
        }
        data.update(overrides)
        return data

    def test_signup_creates_user_profile_and_session(self):
        response = self.client.post(
            reverse("accounts:signup"),
            self.signup_data(),
            content_type="application/json",
        )

        user = User.objects.get(username="jane")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["username"], "jane")
        self.assertEqual(user.email, "jane@example.com")
        self.assertEqual(user.profile.first_name, "Jane")
        self.assertEqual(user.profile.last_name, "Doe")
        self.assertTrue(user.check_password("testpass123"))
        self.assertEqual(int(self.client.session[SESSION_KEY]), user.id)

    def test_signup_requires_name_fields(self):
        response = self.client.post(
            reverse("accounts:signup"),
            self.signup_data(first_name="", last_name=""),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("first_name", response.json())
        self.assertIn("last_name", response.json())
        self.assertFalse(User.objects.exists())


class LoginApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="jane",
            email="jane@example.com",
            password="testpass123",
        )

    def login_data(self, **overrides):
        data = {
            "login": "jane",
            "password": "testpass123",
        }
        data.update(overrides)
        return data

    def test_user_can_login_with_username(self):
        response = self.client.post(
            reverse("accounts:login"),
            self.login_data(),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["username"], "jane")
        self.assertEqual(int(self.client.session[SESSION_KEY]), self.user.id)

    def test_user_can_login_with_email(self):
        response = self.client.post(
            reverse("accounts:login"),
            self.login_data(login="jane@example.com"),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(int(self.client.session[SESSION_KEY]), self.user.id)

    def test_invalid_login_does_not_authenticate_user(self):
        response = self.client.post(
            reverse("accounts:login"),
            self.login_data(password="wrongpass"),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertNotIn(SESSION_KEY, self.client.session)

    def test_logout_clears_session(self):
        self.client.login(username="jane", password="testpass123")

        response = self.client.post(reverse("accounts:logout"))

        self.assertEqual(response.status_code, 204)
        self.assertNotIn(SESSION_KEY, self.client.session)


class ProfileApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="jane",
            email="jane@example.com",
            password="testpass123",
        )

    def test_me_reports_anonymous_user(self):
        response = self.client.get(reverse("accounts:me"))

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["authenticated"])

    def test_me_reports_authenticated_user(self):
        self.client.login(username="jane", password="testpass123")

        response = self.client.get(reverse("accounts:me"))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["authenticated"])
        self.assertEqual(response.json()["user"]["username"], "jane")

    def test_profile_is_created_for_new_user(self):
        self.assertTrue(Profile.objects.filter(user=self.user).exists())

    def test_user_name_helpers_use_profile(self):
        self.user.profile.first_name = "Jane"
        self.user.profile.last_name = "Doe"
        self.user.profile.save()

        self.assertEqual(self.user.get_full_name(), "Jane Doe")
        self.assertEqual(self.user.get_short_name(), "Jane")

    def test_user_can_update_profile_fields(self):
        self.client.login(username="jane", password="testpass123")

        response = self.client.patch(
            reverse("accounts:profile"),
            {
                "first_name": "Janet",
                "last_name": "Cook",
                "twitter_x_url": "https://x.com/janetcook",
                "instagram_url": "https://instagram.com/janetcook",
                "facebook_url": "https://facebook.com/janetcook",
                "linkedin_url": "https://linkedin.com/in/janetcook",
                "birth_date": "1990-05-01",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.first_name, "Janet")
        self.assertEqual(self.user.profile.last_name, "Cook")
        self.assertEqual(self.user.profile.twitter_x_url, "https://x.com/janetcook")
        self.assertEqual(self.user.profile.instagram_url, "https://instagram.com/janetcook")
        self.assertEqual(self.user.profile.facebook_url, "https://facebook.com/janetcook")
        self.assertEqual(self.user.profile.linkedin_url, "https://linkedin.com/in/janetcook")
        self.assertEqual(self.user.profile.birth_date.isoformat(), "1990-05-01")
