from pathlib import PurePosixPath

from django.conf import settings
from django.db import transaction
from rest_framework import serializers

from social.models import RecipeLike, SavedRecipe, UserFollow
from whatcanicook.services.uploads import ALLOWED_IMAGE_CONTENT_TYPES

from .models import (
    Cuisine,
    Ingredient,
    IngredientAlias,
    Instruction,
    Recipe,
    RecipeIngredient,
    RecipeImage,
    RecipeInstruction,
    Unit,
    UserIngredient,
    UserIngredientStatus,
    normalize_ingredient_name,
)
from .storage_paths import recipe_images_prefix


class RecipeImageSerializer(serializers.ModelSerializer):
    image_key = serializers.CharField(source="image.name", read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = RecipeImage
        fields = ["id", "position", "image", "image_key", "image_url"]
        read_only_fields = ["id", "position", "image", "image_key", "image_url"]

    def get_image_url(self, obj):
        if not obj.image:
            return ""

        request = self.context.get("request")
        url = obj.image.url
        return request.build_absolute_uri(url) if request else url


class RecipeImageWriteSerializer(serializers.Serializer):
    position = serializers.IntegerField(min_value=0, max_value=4)
    image_key = serializers.CharField()


class RecipeIngredientReadSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    ingredient_id = serializers.IntegerField(read_only=True)
    user_ingredient_id = serializers.IntegerField(read_only=True)
    review_status = serializers.SerializerMethodField()
    is_custom = serializers.SerializerMethodField()
    unit_label = serializers.SerializerMethodField()

    class Meta:
        model = RecipeIngredient
        fields = [
            "id",
            "ingredient_id",
            "user_ingredient_id",
            "name",
            "quantity",
            "unit",
            "unit_label",
            "note",
            "review_status",
            "is_custom",
        ]

    def get_name(self, obj):
        return obj.display_name

    def get_review_status(self, obj):
        if not obj.user_ingredient_id:
            return ""
        return obj.user_ingredient.status

    def get_is_custom(self, obj):
        return bool(obj.user_ingredient_id)

    def get_unit_label(self, obj):
        if not obj.unit:
            return ""
        return obj.get_unit_display()


class RecipeIngredientWriteSerializer(serializers.Serializer):
    ingredient_id = serializers.IntegerField(required=False, allow_null=True)
    user_ingredient_id = serializers.IntegerField(required=False, allow_null=True)
    name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    quantity = serializers.FloatField()
    unit = serializers.ChoiceField(choices=Unit.choices, required=False, allow_blank=True)
    note = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate(self, attrs):
        has_ingredient_id = attrs.get("ingredient_id") is not None
        has_user_ingredient_id = attrs.get("user_ingredient_id") is not None

        if has_ingredient_id and has_user_ingredient_id:
            raise serializers.ValidationError("Choose either a catalog ingredient or a custom ingredient.")

        name = attrs.get("name", "").strip()
        if not has_ingredient_id and not has_user_ingredient_id and not name:
            raise serializers.ValidationError("Choose a catalog ingredient or enter a custom ingredient.")

        return attrs


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
    image_key = serializers.CharField(write_only=True, required=False)
    image_storage_key = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    images = RecipeImageSerializer(source="recipe_images", many=True, read_only=True)
    image_items = RecipeImageWriteSerializer(many=True, write_only=True, required=False)
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
            "image",
            "image_key",
            "image_storage_key",
            "image_url",
            "images",
            "image_items",
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
            "image",
            "image_storage_key",
            "image_url",
            "images",
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

    def get_image_url(self, obj):
        hero_image = self.get_hero_image(obj)
        if hero_image:
            return self.build_image_url(hero_image)

        if not obj.image:
            return ""
        return self.build_image_url(obj.image)

    def get_image_storage_key(self, obj):
        return obj.image.name if obj.image else ""

    def get_hero_image(self, obj):
        for recipe_image in obj.recipe_images.all():
            if recipe_image.position == 0 and recipe_image.image:
                return recipe_image.image
        return None

    def build_image_url(self, image):
        request = self.context.get("request")
        url = image.url
        return request.build_absolute_uri(url) if request else url

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

    def validate_recipe_image_key(self, value):
        if not settings.USE_S3:
            raise serializers.ValidationError("Presigned recipe image uploads require S3 storage.")

        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            raise serializers.ValidationError("Unable to validate recipe image ownership.")
        if self.instance is None:
            raise serializers.ValidationError("Recipe image keys can only be attached to an existing recipe.")

        path = PurePosixPath(value)
        expected_prefix = f"{recipe_images_prefix(self.instance.created_by_id, self.instance.id)}/"
        if path.is_absolute() or ".." in path.parts or not value.startswith(expected_prefix):
            raise serializers.ValidationError("Invalid recipe image key.")

        suffix = path.suffix.lower()
        if suffix not in set(ALLOWED_IMAGE_CONTENT_TYPES.values()):
            raise serializers.ValidationError("Unsupported recipe image file type.")

        return value

    def validate_image_key(self, value):
        return self.validate_recipe_image_key(value)

    def validate(self, attrs):
        instruction_items = attrs.get("instruction_items")
        image_items = attrs.get("image_items")
        has_instruction_items = instruction_items is not None and any(
            item["text"].strip() for item in instruction_items
        )

        if self.instance is None and not has_instruction_items:
            raise serializers.ValidationError({"instruction_items": "Add at least one instruction step."})

        if instruction_items is not None and not has_instruction_items:
            raise serializers.ValidationError({"instruction_items": "Add at least one instruction step."})

        if image_items is not None:
            if self.instance is None:
                raise serializers.ValidationError({"image_items": "Recipe images can only be attached to an existing recipe."})

            positions = [item["position"] for item in image_items]
            if len(positions) != len(set(positions)):
                raise serializers.ValidationError({"image_items": "Each recipe image position can only be set once."})

            for item in image_items:
                self.validate_recipe_image_key(item["image_key"])

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
        image_key = validated_data.pop("image_key", None)
        image_items = validated_data.pop("image_items", None)

        with transaction.atomic():
            for field, value in validated_data.items():
                setattr(instance, field, value)
            instance.save()
            if image_key:
                self._upsert_image(instance, 0, image_key)
            if image_items is not None:
                self._replace_images(instance, image_items)
            if ingredient_items is not None:
                self._replace_ingredients(instance, ingredient_items)
            if instruction_items is not None:
                self._replace_instructions(instance, instruction_items)
        return instance

    def _upsert_image(self, recipe, position, image_key):
        RecipeImage.objects.update_or_create(
            recipe=recipe,
            position=position,
            defaults={"image": image_key},
        )
        getattr(recipe, "_prefetched_objects_cache", {}).pop("recipe_images", None)
        if position == 0:
            recipe.image.name = image_key
            recipe.save(update_fields=["image"])

    def _replace_images(self, recipe, image_items):
        recipe.recipe_images.all().delete()

        RecipeImage.objects.bulk_create(
            [
                RecipeImage(recipe=recipe, position=item["position"], image=item["image_key"])
                for item in sorted(image_items, key=lambda image_item: image_item["position"])
            ]
        )
        getattr(recipe, "_prefetched_objects_cache", {}).pop("recipe_images", None)

        hero_item = next((item for item in image_items if item["position"] == 0), None)
        recipe.image.name = hero_item["image_key"] if hero_item else ""
        recipe.save(update_fields=["image"])

    def _replace_ingredients(self, recipe, ingredient_items):
        recipe.recipe_ingredients.all().delete()
        for item in ingredient_items:
            if (
                item.get("ingredient_id") is None
                and item.get("user_ingredient_id") is None
                and not item.get("name", "").strip()
            ):
                continue

            ingredient, user_ingredient = self._resolve_ingredient(item)
            RecipeIngredient.objects.create(
                recipe=recipe,
                ingredient=ingredient,
                user_ingredient=user_ingredient,
                quantity=item["quantity"],
                unit=item.get("unit", "").strip(),
                note=item.get("note", "").strip(),
            )

    def _resolve_ingredient(self, item):
        request = self.context.get("request")

        if item.get("ingredient_id") is not None:
            try:
                return Ingredient.objects.get(id=item["ingredient_id"]), None
            except Ingredient.DoesNotExist as exc:
                raise serializers.ValidationError({"ingredient_items": "Choose a valid catalog ingredient."}) from exc

        if item.get("user_ingredient_id") is not None:
            try:
                user_ingredient = UserIngredient.objects.get(
                    id=item["user_ingredient_id"],
                    user=request.user,
                )
            except UserIngredient.DoesNotExist as exc:
                raise serializers.ValidationError({"ingredient_items": "Choose a valid custom ingredient."}) from exc
            if user_ingredient.status == UserIngredientStatus.APPROVED and user_ingredient.approved_ingredient_id:
                return user_ingredient.approved_ingredient, None
            return None, user_ingredient

        name = normalize_ingredient_name(item.get("name", ""))
        user_ingredient, _ = UserIngredient.objects.get_or_create(
            user=request.user,
            name=name,
            status=UserIngredientStatus.UNDER_REVIEW,
        )
        return None, user_ingredient

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


class IngredientAliasSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = IngredientAlias
        fields = ["id", "name"]

    def get_name(self, obj):
        return obj.display_name


class IngredientSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    aliases = IngredientAliasSerializer(many=True, read_only=True)

    class Meta:
        model = Ingredient
        fields = ["id", "name", "category", "aliases"]

    def get_name(self, obj):
        return obj.display_name

    def get_category(self, obj):
        if not obj.category:
            return ""
        return obj.category.title()
