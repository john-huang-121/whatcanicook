from django.contrib import admin

from .models import Ingredient, Recipe, RecipeIngredient


class RecipeIngredientInline(admin.TabularInline):
    model = RecipeIngredient
    extra = 1


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ("title", "created_by", "cuisine", "is_public", "created_at")
    list_filter = ("is_public", "cuisine", "created_at")
    search_fields = ("title", "description", "instructions", "created_by__username")
    inlines = [RecipeIngredientInline]


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    search_fields = ("name",)
