import uuid
from pathlib import PurePosixPath

USER_UPLOAD_ROOT = "users"
PROFILE_PICTURES_DIR = "profile_pictures"
RECIPES_DIR = "recipes"


def user_upload_prefix(user_id):
    return f"{USER_UPLOAD_ROOT}/user_{user_id}"


def profile_picture_prefix(user_id):
    return f"{user_upload_prefix(user_id)}/{PROFILE_PICTURES_DIR}"


def recipe_images_prefix(user_id, recipe_id):
    return f"{user_upload_prefix(user_id)}/{RECIPES_DIR}/recipe_{recipe_id}"


def profile_picture_storage_name(user_id, extension):
    return f"{profile_picture_prefix(user_id)}/{uuid.uuid4().hex}{extension}"


def profile_picture_upload_to(instance, filename):
    filename = PurePosixPath(filename.replace("\\", "/")).name
    return f"{profile_picture_prefix(instance.user_id)}/{filename}"
