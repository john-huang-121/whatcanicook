from whatcanicook.storage_paths import clean_filename, unique_filename, user_upload_prefix

RECIPES_DIR = "recipes"


def recipe_images_prefix(user_id, recipe_id):
    return f"{user_upload_prefix(user_id)}/{RECIPES_DIR}/recipe_{recipe_id}"


def recipe_image_storage_name(user_id, recipe_id, extension):
    return f"{recipe_images_prefix(user_id, recipe_id)}/{unique_filename(extension)}"


def recipe_image_upload_to(instance, filename):
    recipe_id = instance.id or "unsaved"
    return f"{recipe_images_prefix(instance.created_by_id, recipe_id)}/{clean_filename(filename)}"
