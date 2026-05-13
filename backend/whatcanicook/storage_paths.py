import uuid
from pathlib import PurePosixPath

USER_UPLOAD_ROOT = "users"


def clean_filename(filename):
    return PurePosixPath(filename.replace("\\", "/")).name


def unique_filename(extension):
    return f"{uuid.uuid4().hex}{extension}"


def user_upload_prefix(user_id):
    return f"{USER_UPLOAD_ROOT}/user_{user_id}"
