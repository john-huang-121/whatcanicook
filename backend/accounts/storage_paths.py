from whatcanicook.storage_paths import clean_filename, unique_filename, user_upload_prefix

PROFILE_PICTURES_DIR = "profile_pictures"


def profile_picture_prefix(user_id):
    return f"{user_upload_prefix(user_id)}/{PROFILE_PICTURES_DIR}"


def profile_picture_storage_name(user_id, extension):
    return f"{profile_picture_prefix(user_id)}/{unique_filename(extension)}"


def profile_picture_upload_to(instance, filename):
    return f"{profile_picture_prefix(instance.user_id)}/{clean_filename(filename)}"
