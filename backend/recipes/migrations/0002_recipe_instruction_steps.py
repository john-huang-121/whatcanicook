import django.db.models.deletion
from django.db import migrations, models


def copy_instruction_text(apps, schema_editor):
    Recipe = apps.get_model("recipes", "Recipe")
    Instruction = apps.get_model("recipes", "Instruction")
    RecipeInstruction = apps.get_model("recipes", "RecipeInstruction")

    for recipe in Recipe.objects.exclude(instructions_text=""):
        instruction = Instruction.objects.create(text=recipe.instructions_text)
        RecipeInstruction.objects.create(
            recipe=recipe,
            instruction=instruction,
            step_number=1,
        )


def restore_instruction_text(apps, schema_editor):
    Recipe = apps.get_model("recipes", "Recipe")

    for recipe in Recipe.objects.prefetch_related("recipe_instructions__instruction"):
        text = "\n".join(
            recipe_instruction.instruction.text
            for recipe_instruction in recipe.recipe_instructions.all()
        )
        recipe.instructions_text = text
        recipe.save(update_fields=["instructions_text"])


class Migration(migrations.Migration):

    dependencies = [
        ("recipes", "0001_initial"),
    ]

    operations = [
        migrations.RenameField(
            model_name="recipe",
            old_name="instructions",
            new_name="instructions_text",
        ),
        migrations.CreateModel(
            name="Instruction",
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
                ("text", models.TextField()),
            ],
        ),
        migrations.CreateModel(
            name="RecipeInstruction",
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
                ("step_number", models.PositiveIntegerField()),
                (
                    "instruction",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="recipe_instructions",
                        to="recipes.instruction",
                    ),
                ),
                (
                    "recipe",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="recipe_instructions",
                        to="recipes.recipe",
                    ),
                ),
            ],
            options={
                "ordering": ["step_number", "id"],
            },
        ),
        migrations.AddField(
            model_name="recipe",
            name="instructions",
            field=models.ManyToManyField(
                blank=True,
                related_name="recipes",
                through="recipes.RecipeInstruction",
                to="recipes.instruction",
            ),
        ),
        migrations.AddConstraint(
            model_name="recipeinstruction",
            constraint=models.UniqueConstraint(
                fields=("recipe", "step_number"),
                name="unique_recipe_instruction_step",
            ),
        ),
        migrations.RunPython(copy_instruction_text, restore_instruction_text),
        migrations.RemoveField(
            model_name="recipe",
            name="instructions_text",
        ),
    ]
