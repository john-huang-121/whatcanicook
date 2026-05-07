from django.shortcuts import get_object_or_404
from django.db.models import Count, Q
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Cuisine, Ingredient, Recipe, Unit, normalize_ingredient_name
from .serializers import CuisineSerializer, IngredientSerializer, RecipeSerializer, UnitSerializer


def visible_recipes_for(user):
    return (
        Recipe.objects.visible_to(user)
        .select_related("created_by")
        .prefetch_related(
            "recipe_ingredients__ingredient",
            "recipe_ingredients__user_ingredient",
            "recipe_instructions__instruction",
        )
        .annotate(like_count=Count("likes", distinct=True), save_count=Count("saves", distinct=True))
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
        ingredients = Ingredient.objects.prefetch_related("aliases").order_by("name")
        search_query = normalize_ingredient_name(request.query_params.get("q", ""))

        if search_query:
            ingredients = ingredients.filter(
                Q(name__icontains=search_query) | Q(aliases__name__icontains=search_query)
            ).distinct()

        serializer = IngredientSerializer(ingredients, many=True)
        return Response(serializer.data)


class RecipeListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get_ingredient_ids(self, request):
        raw_values = request.query_params.getlist("ingredient_ids")
        ingredient_ids = []

        for raw_value in raw_values:
            for value in raw_value.split(","):
                value = value.strip()
                if not value:
                    continue
                if not value.isdigit():
                    return None
                ingredient_id = int(value)
                if ingredient_id > 0 and ingredient_id not in ingredient_ids:
                    ingredient_ids.append(ingredient_id)

        return ingredient_ids

    def get_search_filter(self, search_query):
        search_filter = None
        search_terms = [term.strip() for term in search_query.split() if term.strip()]

        for term in search_terms:
            matching_cuisines = [
                choice.value
                for choice in Cuisine
                if term.lower() in choice.value.lower() or term.lower() in choice.label.lower()
            ]
            term_filter = (
                Q(title__icontains=term)
                | Q(description__icontains=term)
                | Q(created_by__username__icontains=term)
                | Q(recipe_ingredients__ingredient__name__icontains=term)
                | Q(recipe_ingredients__ingredient__aliases__name__icontains=term)
                | Q(recipe_ingredients__user_ingredient__name__icontains=term)
                | Q(cuisine__in=matching_cuisines)
            )
            search_filter = term_filter if search_filter is None else search_filter | term_filter

        return search_filter

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

        search_query = request.query_params.get("q", "").strip()
        if search_query:
            search_filter = self.get_search_filter(search_query)
            if search_filter is not None:
                queryset = queryset.filter(search_filter).distinct()

        ingredient_ids = self.get_ingredient_ids(request)
        if ingredient_ids is None:
            return Recipe.objects.none()

        for ingredient_id in ingredient_ids:
            queryset = queryset.filter(recipe_ingredients__ingredient_id=ingredient_id)

        if ingredient_ids:
            queryset = queryset.distinct()

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
                "recipe_ingredients__user_ingredient",
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
