from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def normalize(value):
    return " ".join((value or "").strip().lower().split())


def normalize_existing_ingredients(apps, schema_editor):
    Ingredient = apps.get_model("recipes", "Ingredient")
    RecipeIngredient = apps.get_model("recipes", "RecipeIngredient")

    groups = {}
    for ingredient in Ingredient.objects.order_by("id"):
        normalized_name = normalize(ingredient.name)
        if normalized_name:
            groups.setdefault(normalized_name, []).append(ingredient.id)

    for normalized_name, ingredient_ids in groups.items():
        primary_id = ingredient_ids[0]
        duplicate_ids = ingredient_ids[1:]
        if duplicate_ids:
            RecipeIngredient.objects.filter(ingredient_id__in=duplicate_ids).update(ingredient_id=primary_id)
            Ingredient.objects.filter(id__in=duplicate_ids).delete()

        Ingredient.objects.filter(id=primary_id).update(name=normalized_name, category="")


class Migration(migrations.Migration):

    dependencies = [
        ("recipes", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="ingredient",
            name="category",
            field=models.CharField(blank=True, default="", max_length=80),
        ),
        migrations.CreateModel(
            name="IngredientAlias",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=255, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "ingredient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="aliases",
                        to="recipes.ingredient",
                    ),
                ),
            ],
            options={
                "verbose_name_plural": "ingredient aliases",
                "ordering": ["name", "id"],
            },
        ),
        migrations.CreateModel(
            name="UserIngredient",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=255)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("under_review", "Under review"),
                            ("approved", "Approved"),
                            ("rejected", "Rejected"),
                        ],
                        default="under_review",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "approved_ingredient",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="approved_user_ingredients",
                        to="recipes.ingredient",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="user_ingredients",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["status", "name", "id"],
            },
        ),
        migrations.AddField(
            model_name="recipeingredient",
            name="user_ingredient",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="recipe_ingredients",
                to="recipes.useringredient",
            ),
        ),
        migrations.AlterField(
            model_name="recipeingredient",
            name="ingredient",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="recipe_ingredients",
                to="recipes.ingredient",
            ),
        ),
        migrations.RunPython(normalize_existing_ingredients, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="useringredient",
            constraint=models.UniqueConstraint(
                condition=models.Q(status="under_review"),
                fields=("user", "name"),
                name="unique_under_review_user_ingredient",
            ),
        ),
        migrations.AddConstraint(
            model_name="recipeingredient",
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(ingredient__isnull=False, user_ingredient__isnull=True)
                    | models.Q(ingredient__isnull=True, user_ingredient__isnull=False)
                ),
                name="recipeingredient_has_one_ingredient_source",
            ),
        ),
    ]
