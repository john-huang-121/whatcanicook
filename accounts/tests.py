from django.contrib.auth import SESSION_KEY, get_user_model
from django.test import TestCase
from django.urls import reverse

from allauth.account.forms import LoginForm

from .forms import UserSignupForm

User = get_user_model()


class SignupTests(TestCase):
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

    def test_signup_page_uses_custom_form(self):
        response = self.client.get(reverse("account_signup"))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "account/signup.html")
        self.assertIsInstance(response.context["form"], UserSignupForm)
        self.assertEqual(
            list(response.context["form"].fields),
            ["username", "email", "first_name", "last_name", "password1", "password2"],
        )

    def test_signup_creates_user_with_trimmed_name_fields(self):
        response = self.client.post(reverse("account_signup"), self.signup_data())

        user = User.objects.get(username="jane")
        self.assertRedirects(response, reverse("accounts:profile"))
        self.assertEqual(user.email, "jane@example.com")
        self.assertEqual(user.first_name, "Jane")
        self.assertEqual(user.last_name, "Doe")
        self.assertTrue(user.check_password("testpass123"))

    def test_signup_requires_name_fields(self):
        response = self.client.post(
            reverse("account_signup"),
            self.signup_data(first_name="", last_name=""),
        )

        form = response.context["form"]
        self.assertEqual(response.status_code, 200)
        self.assertIn("first_name", form.errors)
        self.assertIn("last_name", form.errors)
        self.assertFalse(User.objects.exists())


class LoginTests(TestCase):
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

    def test_login_page_uses_allauth_template(self):
        response = self.client.get(reverse("account_login"))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "account/login.html")
        self.assertIsInstance(response.context["form"], LoginForm)
        self.assertEqual(list(response.context["form"].fields), ["login", "password", "remember"])
        self.assertContains(response, reverse("account_signup"))

    def test_user_can_login_with_username(self):
        response = self.client.post(reverse("account_login"), self.login_data())

        self.assertRedirects(response, reverse("accounts:profile"))
        self.assertEqual(int(self.client.session[SESSION_KEY]), self.user.id)

    def test_login_redirects_to_next_url(self):
        next_url = reverse("recipes:create")

        response = self.client.post(
            reverse("account_login"),
            self.login_data(next=next_url),
        )

        self.assertRedirects(response, next_url)
        self.assertEqual(int(self.client.session[SESSION_KEY]), self.user.id)

    def test_invalid_login_does_not_authenticate_user(self):
        response = self.client.post(
            reverse("account_login"),
            self.login_data(password="wrongpass"),
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.context["form"].errors)
        self.assertNotIn(SESSION_KEY, self.client.session)
