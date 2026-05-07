from django.contrib import admin
from django.utils import timezone

from .models import (
    Ingredient,
    IngredientAlias,
    Instruction,
    Recipe,
    RecipeIngredient,
    RecipeInstruction,
    UserIngredient,
    UserIngredientStatus,
)


class RecipeIngredientInline(admin.TabularInline):
    model = RecipeIngredient
    extra = 1


class RecipeInstructionInline(admin.TabularInline):
    model = RecipeInstruction
    extra = 1


class IngredientAliasInline(admin.TabularInline):
    model = IngredientAlias
    extra = 1


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ("title", "created_by", "cuisine", "is_public", "created_at")
    list_filter = ("is_public", "cuisine", "created_at")
    search_fields = (
        "title",
        "description",
        "recipe_ingredients__ingredient__name",
        "recipe_ingredients__user_ingredient__name",
        "recipe_instructions__instruction__text",
        "created_by__username",
    )
    inlines = [RecipeIngredientInline, RecipeInstructionInline]


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ("display_name", "name", "category")
    list_filter = ("category",)
    search_fields = ("name", "aliases__name")
    inlines = [IngredientAliasInline]


@admin.register(IngredientAlias)
class IngredientAliasAdmin(admin.ModelAdmin):
    list_display = ("display_name", "name", "ingredient")
    search_fields = ("name", "ingredient__name")


@admin.action(description="Approve selected custom ingredients")
def approve_user_ingredients(modeladmin, request, queryset):
    approved_count = 0
    for user_ingredient in queryset:
        user_ingredient.approve()
        approved_count += 1
    modeladmin.message_user(request, f"Approved {approved_count} custom ingredient(s).")


@admin.action(description="Reject selected custom ingredients")
def reject_user_ingredients(modeladmin, request, queryset):
    rejected_count = queryset.update(status=UserIngredientStatus.REJECTED, reviewed_at=timezone.now())
    modeladmin.message_user(request, f"Rejected {rejected_count} custom ingredient(s).")


@admin.register(UserIngredient)
class UserIngredientAdmin(admin.ModelAdmin):
    list_display = ("display_name", "user", "status", "approved_ingredient", "created_at", "reviewed_at")
    list_filter = ("status", "created_at", "reviewed_at")
    search_fields = ("name", "user__username", "approved_ingredient__name")
    actions = [approve_user_ingredients, reject_user_ingredients]


@admin.register(Instruction)
class InstructionAdmin(admin.ModelAdmin):
    search_fields = ("text",)
