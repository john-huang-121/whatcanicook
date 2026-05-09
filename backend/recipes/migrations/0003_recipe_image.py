import recipes.storage_paths
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("recipes", "0002_canonical_ingredients"),
    ]

    operations = [
        migrations.AddField(
            model_name="recipe",
            name="image",
            field=models.ImageField(
                blank=True,
                upload_to=recipes.storage_paths.recipe_image_upload_to,
            ),
        ),
    ]
