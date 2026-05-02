from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("recipes", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="RecipeLike",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "recipe",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="likes",
                        to="recipes.recipe",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="recipe_likes",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="SavedRecipe",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "recipe",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="saves",
                        to="recipes.recipe",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="saved_recipe_items",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="UserFollow",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "follower",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="following_relationships",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "following",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="follower_relationships",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="recipelike",
            constraint=models.UniqueConstraint(fields=("user", "recipe"), name="unique_recipe_like"),
        ),
        migrations.AddConstraint(
            model_name="savedrecipe",
            constraint=models.UniqueConstraint(fields=("user", "recipe"), name="unique_saved_recipe"),
        ),
        migrations.AddConstraint(
            model_name="userfollow",
            constraint=models.UniqueConstraint(fields=("follower", "following"), name="unique_user_follow"),
        ),
        migrations.AddConstraint(
            model_name="userfollow",
            constraint=models.CheckConstraint(
                condition=~models.Q(("follower", models.F("following"))),
                name="prevent_self_follow",
            ),
        ),
    ]

