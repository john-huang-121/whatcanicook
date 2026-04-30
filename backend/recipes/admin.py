from django.contrib import admin

from .models import Ingredient, Instruction, Recipe, RecipeIngredient, RecipeInstruction


class RecipeIngredientInline(admin.TabularInline):
    model = RecipeIngredient
    extra = 1


class RecipeInstructionInline(admin.TabularInline):
    model = RecipeInstruction
    extra = 1


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ("title", "created_by", "cuisine", "is_public", "created_at")
    list_filter = ("is_public", "cuisine", "created_at")
    search_fields = ("title", "description", "recipe_instructions__instruction__text", "created_by__username")
    inlines = [RecipeIngredientInline, RecipeInstructionInline]


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    search_fields = ("name",)


@admin.register(Instruction)
class InstructionAdmin(admin.ModelAdmin):
    search_fields = ("text",)
