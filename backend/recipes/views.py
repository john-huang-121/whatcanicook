from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Cuisine, Ingredient, Recipe, Unit
from .serializers import CuisineSerializer, IngredientSerializer, RecipeSerializer, UnitSerializer


def visible_recipes_for(user):
    return (
        Recipe.objects.visible_to(user)
        .select_related("created_by")
        .prefetch_related("recipe_ingredients__ingredient", "recipe_instructions__instruction")
    )


class CuisineListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cuisines = [{"value": choice.value, "label": choice.label} for choice in Cuisine]
        serializer = CuisineSerializer(cuisines, many=True)
        return Response(serializer.data)


class UnitListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        units = [{"value": choice.value, "label": choice.label} for choice in Unit]
        serializer = UnitSerializer(units, many=True)
        return Response(serializer.data)


class IngredientListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        ingredients = Ingredient.objects.order_by("name")
        serializer = IngredientSerializer(ingredients, many=True)
        return Response(serializer.data)


class RecipeListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get_queryset(self, request):
        queryset = visible_recipes_for(request.user).order_by("-created_at")

        cuisine = request.query_params.get("cuisine")
        if cuisine:
            queryset = queryset.filter(cuisine=cuisine)

        mine = request.query_params.get("mine")
        if mine in {"1", "true", "True"}:
            if not request.user.is_authenticated:
                return Recipe.objects.none()
            queryset = queryset.filter(created_by=request.user)

        return queryset

    def get(self, request):
        serializer = RecipeSerializer(
            self.get_queryset(request),
            many=True,
            context={"request": request},
        )
        return Response(serializer.data)

    def post(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication credentials were not provided."}, status=401)

        serializer = RecipeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        recipe = serializer.save(created_by=request.user)
        return Response(
            RecipeSerializer(recipe, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class RecipeDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get_object(self, request, recipe_id):
        return get_object_or_404(visible_recipes_for(request.user), pk=recipe_id)

    def get_owned_object(self, request, recipe_id):
        recipe = get_object_or_404(
            Recipe.objects.select_related("created_by").prefetch_related(
                "recipe_ingredients__ingredient",
                "recipe_instructions__instruction",
            ),
            pk=recipe_id,
        )
        if not recipe.can_edit(request.user):
            return None
        return recipe

    def get(self, request, recipe_id):
        recipe = self.get_object(request, recipe_id)
        return Response(RecipeSerializer(recipe, context={"request": request}).data)

    def patch(self, request, recipe_id):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication credentials were not provided."}, status=401)

        recipe = self.get_owned_object(request, recipe_id)
        if recipe is None:
            return Response({"detail": "You do not have permission to edit this recipe."}, status=403)

        serializer = RecipeSerializer(
            recipe,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        recipe = serializer.save()
        return Response(RecipeSerializer(recipe, context={"request": request}).data)

    def put(self, request, recipe_id):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication credentials were not provided."}, status=401)

        recipe = self.get_owned_object(request, recipe_id)
        if recipe is None:
            return Response({"detail": "You do not have permission to edit this recipe."}, status=403)

        serializer = RecipeSerializer(recipe, data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        recipe = serializer.save()
        return Response(RecipeSerializer(recipe, context={"request": request}).data)

    def delete(self, request, recipe_id):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication credentials were not provided."}, status=401)

        recipe = self.get_owned_object(request, recipe_id)
        if recipe is None:
            return Response({"detail": "You do not have permission to delete this recipe."}, status=403)

        recipe.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
