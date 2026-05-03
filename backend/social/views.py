from django.contrib.auth import get_user_model
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from recipes.models import Recipe
from recipes.serializers import RecipeSerializer

from .models import RecipeLike, SavedRecipe, UserFollow

User = get_user_model()


def recipe_queryset_for(user):
    return (
        Recipe.objects.visible_to(user)
        .select_related("created_by")
        .prefetch_related("recipe_ingredients__ingredient", "recipe_instructions__instruction")
        .annotate(like_count=Count("likes", distinct=True), save_count=Count("saves", distinct=True))
    )


def public_recipe_queryset():
    return (
        Recipe.objects.filter(is_public=True)
        .select_related("created_by")
        .prefetch_related("recipe_ingredients__ingredient", "recipe_instructions__instruction")
        .annotate(like_count=Count("likes", distinct=True), save_count=Count("saves", distinct=True))
    )


class RecipeLikeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_recipe(self, recipe_id):
        return get_object_or_404(public_recipe_queryset(), pk=recipe_id)

    def post(self, request, recipe_id):
        recipe = self.get_recipe(recipe_id)
        if recipe.created_by_id == request.user.id:
            return Response({"detail": "You cannot like your own recipe."}, status=status.HTTP_400_BAD_REQUEST)

        RecipeLike.objects.get_or_create(user=request.user, recipe=recipe)
        recipe = self.get_recipe(recipe_id)
        return Response(RecipeSerializer(recipe, context={"request": request}).data)

    def delete(self, request, recipe_id):
        recipe = self.get_recipe(recipe_id)
        RecipeLike.objects.filter(user=request.user, recipe=recipe).delete()
        recipe = self.get_recipe(recipe_id)
        return Response(RecipeSerializer(recipe, context={"request": request}).data)


class SavedRecipeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_recipe(self, request, recipe_id):
        return get_object_or_404(recipe_queryset_for(request.user), pk=recipe_id)

    def post(self, request, recipe_id):
        recipe = self.get_recipe(request, recipe_id)
        SavedRecipe.objects.get_or_create(user=request.user, recipe=recipe)
        recipe = self.get_recipe(request, recipe_id)
        return Response(RecipeSerializer(recipe, context={"request": request}).data)

    def delete(self, request, recipe_id):
        recipe = self.get_recipe(request, recipe_id)
        SavedRecipe.objects.filter(user=request.user, recipe=recipe).delete()
        recipe = self.get_recipe(request, recipe_id)
        return Response(RecipeSerializer(recipe, context={"request": request}).data)


class FollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_target_user(self, user_id):
        return get_object_or_404(User, pk=user_id)

    def response_data(self, request, target_user):
        return {
            "user_id": target_user.id,
            "is_following": UserFollow.objects.filter(follower=request.user, following=target_user).exists(),
            "follower_count": target_user.follower_relationships.count(),
            "following_count": target_user.following_relationships.count(),
        }

    def post(self, request, user_id):
        target_user = self.get_target_user(user_id)
        if target_user.id == request.user.id:
            return Response({"detail": "You cannot follow yourself."}, status=status.HTTP_400_BAD_REQUEST)

        UserFollow.objects.get_or_create(follower=request.user, following=target_user)
        return Response(self.response_data(request, target_user))

    def delete(self, request, user_id):
        target_user = self.get_target_user(user_id)
        UserFollow.objects.filter(follower=request.user, following=target_user).delete()
        return Response(self.response_data(request, target_user))


class FeedView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        followed_user_ids = UserFollow.objects.filter(follower=request.user).values("following_id")
        recipes = public_recipe_queryset().filter(created_by_id__in=followed_user_ids).order_by("-created_at")[:50]
        return Response(RecipeSerializer(recipes, many=True, context={"request": request}).data)


class SavedRecipeListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        saved_items = (
            SavedRecipe.objects.filter(user=request.user)
            .select_related("recipe__created_by")
            .prefetch_related("recipe__recipe_ingredients__ingredient", "recipe__recipe_instructions__instruction")
            .order_by("-created_at")
        )
        recipes = [item.recipe for item in saved_items if item.recipe.can_view(request.user)]
        return Response(RecipeSerializer(recipes, many=True, context={"request": request}).data)


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        followed_user_ids = UserFollow.objects.filter(follower=request.user).values("following_id")
        feed_recipes = public_recipe_queryset().filter(created_by_id__in=followed_user_ids).order_by("-created_at")[:12]

        saved_items = (
            SavedRecipe.objects.filter(user=request.user)
            .select_related("recipe__created_by")
            .prefetch_related("recipe__recipe_ingredients__ingredient", "recipe__recipe_instructions__instruction")
            .order_by("-created_at")[:12]
        )
        saved_recipes = [item.recipe for item in saved_items if item.recipe.can_view(request.user)]

        return Response(
            {
                "feed": RecipeSerializer(feed_recipes, many=True, context={"request": request}).data,
                "saved_recipes": RecipeSerializer(saved_recipes, many=True, context={"request": request}).data,
                "stats": {
                    "recipe_count": request.user.recipes.count(),
                    "public_recipe_count": request.user.recipes.filter(is_public=True).count(),
                    "follower_count": request.user.follower_relationships.count(),
                    "following_count": request.user.following_relationships.count(),
                    "saved_recipe_count": request.user.saved_recipe_items.count(),
                },
            }
        )

