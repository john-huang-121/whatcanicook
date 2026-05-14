from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from recipes.models import Recipe
from recipes.querysets import with_recipe_serializer_data
from recipes.serializers import RecipeSerializer

from .models import RecipeLike, RecipeRating, SavedRecipe, UserFollow

User = get_user_model()


class RecipeRatingWriteSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)


def recipe_queryset_for(user):
    return with_recipe_serializer_data(Recipe.objects.visible_to(user), user)


def public_recipe_queryset(user):
    return with_recipe_serializer_data(Recipe.objects.filter(is_public=True), user)


def saved_recipes_for(user, limit=None):
    saved_recipe_ids = (
        SavedRecipe.objects.filter(user=user).order_by("-created_at").values_list("recipe_id", flat=True)
    )
    if limit is not None:
        saved_recipe_ids = saved_recipe_ids[:limit]

    recipe_ids = list(saved_recipe_ids)
    if not recipe_ids:
        return []

    recipes_by_id = {recipe.id: recipe for recipe in recipe_queryset_for(user).filter(id__in=recipe_ids)}
    return [recipes_by_id[recipe_id] for recipe_id in recipe_ids if recipe_id in recipes_by_id]


class RecipeLikeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_recipe(self, request, recipe_id):
        return get_object_or_404(public_recipe_queryset(request.user), pk=recipe_id)

    def post(self, request, recipe_id):
        recipe = self.get_recipe(request, recipe_id)
        if recipe.created_by_id == request.user.id:
            return Response({"detail": "You cannot like your own recipe."}, status=status.HTTP_400_BAD_REQUEST)

        RecipeLike.objects.get_or_create(user=request.user, recipe=recipe)
        recipe = self.get_recipe(request, recipe_id)
        return Response(RecipeSerializer(recipe, context={"request": request}).data)

    def delete(self, request, recipe_id):
        recipe = self.get_recipe(request, recipe_id)
        RecipeLike.objects.filter(user=request.user, recipe=recipe).delete()
        recipe = self.get_recipe(request, recipe_id)
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
        recipes = (
            public_recipe_queryset(request.user)
            .filter(created_by_id__in=followed_user_ids)
            .order_by("-created_at")[:50]
        )
        return Response(RecipeSerializer(recipes, many=True, context={"request": request}).data)


class SavedRecipeListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        recipes = saved_recipes_for(request.user)
        return Response(RecipeSerializer(recipes, many=True, context={"request": request}).data)


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        followed_user_ids = UserFollow.objects.filter(follower=request.user).values("following_id")
        feed_recipes = (
            public_recipe_queryset(request.user)
            .filter(created_by_id__in=followed_user_ids)
            .order_by("-created_at")[:12]
        )
        saved_recipes = saved_recipes_for(request.user, limit=12)

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


class RecipeRatingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_recipe(self, request, recipe_id):
        return get_object_or_404(public_recipe_queryset(request.user), pk=recipe_id)

    def post(self, request, recipe_id):
        recipe = self.get_recipe(request, recipe_id)
        if recipe.created_by_id == request.user.id:
            return Response({"detail": "You cannot rate your own recipe."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = RecipeRatingWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        RecipeRating.objects.update_or_create(
            user=request.user,
            recipe=recipe,
            defaults={"rating": serializer.validated_data["rating"]},
        )
        recipe = self.get_recipe(request, recipe_id)
        return Response(RecipeSerializer(recipe, context={"request": request}).data)

    def delete(self, request, recipe_id):
        recipe = self.get_recipe(request, recipe_id)
        RecipeRating.objects.filter(user=request.user, recipe=recipe).delete()
        recipe = self.get_recipe(request, recipe_id)
        return Response(RecipeSerializer(recipe, context={"request": request}).data)
