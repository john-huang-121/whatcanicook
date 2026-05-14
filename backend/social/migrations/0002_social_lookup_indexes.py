from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("social", "0001_initial"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="recipelike",
            index=models.Index(fields=["recipe", "user"], name="recipe_like_recipe_user_idx"),
        ),
        migrations.AddIndex(
            model_name="savedrecipe",
            index=models.Index(fields=["recipe", "user"], name="saved_recipe_recipe_user_idx"),
        ),
        migrations.AddIndex(
            model_name="savedrecipe",
            index=models.Index(fields=["user", "-created_at"], name="saved_recipe_user_created_idx"),
        ),
    ]
