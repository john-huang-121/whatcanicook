from django.db import transaction
from rest_framework import serializers

from social.models import RecipeLike, SavedRecipe, UserFollow

from .models import Cuisine, Ingredient, Instruction, Recipe, RecipeIngredient, RecipeInstruction, Unit


class RecipeIngredientReadSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="ingredient.name")
    unit_label = serializers.SerializerMethodField()

    class Meta:
        model = RecipeIngredient
        fields = ["id", "name", "quantity", "unit", "unit_label", "note"]

    def get_unit_label(self, obj):
        if not obj.unit:
            return ""
        return obj.get_unit_display()


class RecipeIngredientWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    quantity = serializers.FloatField()
    unit = serializers.ChoiceField(choices=Unit.choices, required=False, allow_blank=True)
    note = serializers.CharField(max_length=255, required=False, allow_blank=True)


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
    like_count = serializers.SerializerMethodField()
    save_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    is_following_author = serializers.SerializerMethodField()
    author_follower_count = serializers.SerializerMethodField()
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
            "like_count",
            "save_count",
            "is_liked",
            "is_saved",
            "is_following_author",
            "author_follower_count",
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
            "like_count",
            "save_count",
            "is_liked",
            "is_saved",
            "is_following_author",
            "author_follower_count",
            "published_date",
            "total_time",
            "created_at",
            "updated_at",
        ]

    def get_is_owner(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and obj.created_by_id == request.user.id)

    def get_like_count(self, obj):
        like_count = getattr(obj, "like_count", None)
        if like_count is not None:
            return like_count
        return obj.likes.count()

    def get_save_count(self, obj):
        save_count = getattr(obj, "save_count", None)
        if save_count is not None:
            return save_count
        return obj.saves.count()

    def get_is_liked(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return RecipeLike.objects.filter(recipe=obj, user=request.user).exists()

    def get_is_saved(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return SavedRecipe.objects.filter(recipe=obj, user=request.user).exists()

    def get_is_following_author(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated or obj.created_by_id == request.user.id:
            return False
        return UserFollow.objects.filter(follower=request.user, following=obj.created_by).exists()

    def get_author_follower_count(self, obj):
        return obj.created_by.follower_relationships.count()

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
                note=item.get("note", "").strip(),
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


class UnitSerializer(serializers.Serializer):
    value = serializers.CharField(allow_blank=True)
    label = serializers.CharField()


class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = ["id", "name"]
