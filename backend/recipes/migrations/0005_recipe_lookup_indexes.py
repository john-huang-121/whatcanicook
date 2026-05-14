from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("recipes", "0004_recipeimage"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="recipe",
            index=models.Index(fields=["is_public", "-created_at"], name="recipe_public_created_idx"),
        ),
        migrations.AddIndex(
            model_name="recipe",
            index=models.Index(fields=["created_by", "-created_at"], name="recipe_author_created_idx"),
        ),
    ]
