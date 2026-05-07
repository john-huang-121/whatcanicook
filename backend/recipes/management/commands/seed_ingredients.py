import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from recipes.models import Ingredient, IngredientAlias, normalize_ingredient_name


class Command(BaseCommand):
    help = "Seed canonical ingredients and aliases from a JSON file."

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            default=None,
            help="Path to a replacement ingredient seed JSON file.",
        )

    def handle(self, *args, **options):
        seed_path = (
            Path(options["path"])
            if options["path"]
            else Path(__file__).resolve().parents[2] / "seed_data" / "ingredients.json"
        )

        if not seed_path.exists():
            raise CommandError(f"Ingredient seed file not found: {seed_path}")

        try:
            seed_items = json.loads(seed_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CommandError(f"Ingredient seed file is not valid JSON: {exc}") from exc

        if not isinstance(seed_items, list):
            raise CommandError("Ingredient seed file must contain a JSON list.")

        ingredient_count = 0
        alias_count = 0

        for seed_item in seed_items:
            name, category, aliases = self.parse_seed_item(seed_item)
            ingredient, _ = Ingredient.objects.update_or_create(
                name=name,
                defaults={"category": category},
            )
            ingredient_count += 1

            for alias in aliases:
                normalized_alias = normalize_ingredient_name(alias)
                if not normalized_alias or normalized_alias == ingredient.name:
                    continue
                IngredientAlias.objects.update_or_create(
                    name=normalized_alias,
                    defaults={"ingredient": ingredient},
                )
                alias_count += 1

        if options["verbosity"] > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Seeded {ingredient_count} ingredient(s) and {alias_count} alias(es) from {seed_path}."
                )
            )

    def parse_seed_item(self, seed_item):
        if isinstance(seed_item, str):
            name = normalize_ingredient_name(seed_item)
            if not name:
                raise CommandError("Ingredient seed names cannot be blank.")
            return name, "", []

        if not isinstance(seed_item, dict):
            raise CommandError("Each ingredient seed item must be a string or object.")

        name = normalize_ingredient_name(str(seed_item.get("name", "")))
        if not name:
            raise CommandError("Ingredient seed objects must include a non-blank name.")

        aliases = seed_item.get("aliases", [])
        if not isinstance(aliases, list):
            raise CommandError(f"Aliases for '{name}' must be a list.")

        category = normalize_ingredient_name(str(seed_item.get("category", "")))
        return name, category, aliases
