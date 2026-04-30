from django.db import transaction
from rest_framework import serializers

from .models import Cuisine, Ingredient, Instruction, Recipe, RecipeIngredient, RecipeInstruction


class RecipeIngredientReadSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="ingredient.name")

    class Meta:
        model = RecipeIngredient
        fields = ["id", "name", "quantity", "unit"]


class RecipeIngredientWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    quantity = serializers.FloatField()
    unit = serializers.CharField(max_length=64, required=False, allow_blank=True)


class RecipeInstructionReadSerializer(serializers.ModelSerializer):
    text = serializers.CharField(source="instruction.text")

    class Meta:
        model = RecipeInstruction
        fields = ["id", "text", "step_number"]


class RecipeInstructionWriteSerializer(serializers.Serializer):
    text = serializers.CharField()


class RecipeSerializer(serializers.ModelSerializer):
    created_by = serializers.IntegerField(source="created_by_id", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    cuisine_label = serializers.CharField(source="get_cuisine_display", read_only=True)
    published_date = serializers.CharField(read_only=True)
    total_time = serializers.IntegerField(read_only=True)
    is_owner = serializers.SerializerMethodField()
    ingredients = RecipeIngredientReadSerializer(source="recipe_ingredients", many=True, read_only=True)
    ingredient_items = RecipeIngredientWriteSerializer(many=True, write_only=True, required=False)
    instructions = RecipeInstructionReadSerializer(source="recipe_instructions", many=True, read_only=True)
    instruction_items = RecipeInstructionWriteSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = Recipe
        fields = [
            "id",
            "title",
            "description",
            "prep_time",
            "cook_time",
            "servings",
            "instructions",
            "instruction_items",
            "cuisine",
            "cuisine_label",
            "created_by",
            "created_by_username",
            "is_public",
            "is_owner",
            "ingredients",
            "ingredient_items",
            "published_date",
            "total_time",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "created_by_username",
            "is_owner",
            "published_date",
            "total_time",
            "created_at",
            "updated_at",
        ]

    def get_is_owner(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and obj.created_by_id == request.user.id)

    def validate_cuisine(self, value):
        if value and value not in Cuisine.values:
            raise serializers.ValidationError("Choose a valid cuisine.")
        return value

    def validate(self, attrs):
        instruction_items = attrs.get("instruction_items")
        has_instruction_items = instruction_items is not None and any(
            item["text"].strip() for item in instruction_items
        )

        if self.instance is None and not has_instruction_items:
            raise serializers.ValidationError({"instruction_items": "Add at least one instruction step."})

        if instruction_items is not None and not has_instruction_items:
            raise serializers.ValidationError({"instruction_items": "Add at least one instruction step."})

        return attrs

    def create(self, validated_data):
        ingredient_items = validated_data.pop("ingredient_items", [])
        instruction_items = validated_data.pop("instruction_items", [])

        with transaction.atomic():
            recipe = Recipe.objects.create(**validated_data)
            self._replace_ingredients(recipe, ingredient_items)
            self._replace_instructions(recipe, instruction_items)
        return recipe

    def update(self, instance, validated_data):
        ingredient_items = validated_data.pop("ingredient_items", None)
        instruction_items = validated_data.pop("instruction_items", None)

        with transaction.atomic():
            for field, value in validated_data.items():
                setattr(instance, field, value)
            instance.save()
            if ingredient_items is not None:
                self._replace_ingredients(instance, ingredient_items)
            if instruction_items is not None:
                self._replace_instructions(instance, instruction_items)
        return instance

    def _replace_ingredients(self, recipe, ingredient_items):
        recipe.recipe_ingredients.all().delete()
        for item in ingredient_items:
            name = item["name"].strip()
            if not name:
                continue

            ingredient, _ = Ingredient.objects.get_or_create(name=name)
            RecipeIngredient.objects.create(
                recipe=recipe,
                ingredient=ingredient,
                quantity=item["quantity"],
                unit=item.get("unit", "").strip(),
            )

    def _replace_instructions(self, recipe, instruction_items):
        old_instruction_ids = list(recipe.recipe_instructions.values_list("instruction_id", flat=True))
        recipe.recipe_instructions.all().delete()

        for index, item in enumerate(instruction_items, start=1):
            text = item["text"].strip()
            if not text:
                continue

            instruction = Instruction.objects.create(text=text)
            RecipeInstruction.objects.create(
                recipe=recipe,
                instruction=instruction,
                step_number=index,
            )

        Instruction.objects.filter(id__in=old_instruction_ids, recipe_instructions__isnull=True).delete()


class CuisineSerializer(serializers.Serializer):
    value = serializers.CharField()
    label = serializers.CharField()


class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = ["id", "name"]
