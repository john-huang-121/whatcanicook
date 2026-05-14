from django.db.models import Avg, BooleanField, Count, Exists, FloatField, IntegerField, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce

from social.models import RecipeLike, RecipeRating, SavedRecipe, UserFollow


def with_recipe_serializer_data(queryset, user):
    user_id = user.id if getattr(user, "is_authenticated", False) else None
    like_count = (
        RecipeLike.objects.filter(recipe_id=OuterRef("pk"))
        .order_by()
        .values("recipe_id")
        .annotate(total=Count("pk"))
        .values("total")
    )
    save_count = (
        SavedRecipe.objects.filter(recipe_id=OuterRef("pk"))
        .order_by()
        .values("recipe_id")
        .annotate(total=Count("pk"))
        .values("total")
    )
    author_follower_count = (
        UserFollow.objects.filter(following_id=OuterRef("created_by_id"))
        .order_by()
        .values("following_id")
        .annotate(total=Count("pk"))
        .values("total")
    )
    average_rating = (
        RecipeRating.objects.filter(recipe_id=OuterRef("pk"))
        .order_by()
        .values("recipe_id")
        .annotate(average=Avg("rating"))
        .values("average")
    )
    rating_count = (
        RecipeRating.objects.filter(recipe_id=OuterRef("pk"))
        .order_by()
        .values("recipe_id")
        .annotate(total=Count("pk"))
        .values("total")
    )

    annotations = {
        "like_count": Coalesce(
            Subquery(like_count, output_field=IntegerField()),
            Value(0),
            output_field=IntegerField(),
        ),
        "save_count": Coalesce(
            Subquery(save_count, output_field=IntegerField()),
            Value(0),
            output_field=IntegerField(),
        ),
        "author_follower_count": Coalesce(
            Subquery(author_follower_count, output_field=IntegerField()),
            Value(0),
            output_field=IntegerField(),
        ),
        "average_rating": Coalesce(
            Subquery(average_rating, output_field=FloatField()),
            Value(0.0),
            output_field=FloatField(),
        ),
        "rating_count": Coalesce(
            Subquery(rating_count, output_field=IntegerField()),
            Value(0),
            output_field=IntegerField(),
        ),
    }

    if user_id is None:
        annotations.update(
            is_liked=Value(False, output_field=BooleanField()),
            is_saved=Value(False, output_field=BooleanField()),
            is_following_author=Value(False, output_field=BooleanField()),
            user_rating=Value(0, output_field=IntegerField()),
        )
    else:
        user_rating = (
            RecipeRating.objects.filter(recipe_id=OuterRef("pk"), user_id=user_id)
            .order_by()
            .values("rating")[:1]
        )
        annotations.update(
            is_liked=Exists(RecipeLike.objects.filter(recipe_id=OuterRef("pk"), user_id=user_id)),
            is_saved=Exists(SavedRecipe.objects.filter(recipe_id=OuterRef("pk"), user_id=user_id)),
            is_following_author=Exists(
                UserFollow.objects.filter(follower_id=user_id, following_id=OuterRef("created_by_id"))
            ),
            user_rating=Coalesce(
                Subquery(user_rating, output_field=IntegerField()),
                Value(0),
                output_field=IntegerField(),
            ),
        )

    return (
        queryset.select_related("created_by")
        .prefetch_related(
            "recipe_ingredients__ingredient",
            "recipe_ingredients__user_ingredient",
            "recipe_instructions__instruction",
            "recipe_images",
        )
        .annotate(**annotations)
    )
