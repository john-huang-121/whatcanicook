from dataclasses import dataclass

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from django.conf import settings

ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
}


class UploadStorageNotConfigured(Exception):
    pass


class UploadServiceError(Exception):
    pass


@dataclass(frozen=True)
class PresignedUpload:
    upload_url: str
    fields: dict
    file_key: str
    object_key: str
    expires_in: int
    max_bytes: int

    def as_response_data(self, file_key_field):
        return {
            "upload_url": self.upload_url,
            "fields": self.fields,
            file_key_field: self.file_key,
            "object_key": self.object_key,
            "expires_in": self.expires_in,
            "max_bytes": self.max_bytes,
        }


class S3UploadService:
    def __init__(self, client=None):
        self.client = client

    def create_presigned_image_upload(self, *, file_key, content_type, max_bytes):
        if not settings.USE_S3:
            raise UploadStorageNotConfigured("S3 uploads are not configured.")

        object_key = self.object_key(file_key)
        fields = {"Content-Type": content_type}
        conditions = [
            {"Content-Type": content_type},
            ["content-length-range", 1, max_bytes],
        ]

        try:
            upload = self.get_client().generate_presigned_post(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=object_key,
                Fields=fields,
                Conditions=conditions,
                ExpiresIn=settings.S3_PRESIGNED_UPLOAD_EXPIRES,
            )
        except ClientError as exc:
            raise UploadServiceError("Unable to prepare file upload.") from exc

        return PresignedUpload(
            upload_url=upload["url"],
            fields=upload["fields"],
            file_key=file_key,
            object_key=object_key,
            expires_in=settings.S3_PRESIGNED_UPLOAD_EXPIRES,
            max_bytes=max_bytes,
        )

    def object_key(self, file_key):
        location = getattr(settings, "S3_STORAGE_OPTIONS", {}).get("location", "").strip("/")
        return f"{location}/{file_key}" if location else file_key

    def get_client(self):
        if self.client is None:
            self.client = boto3.client(
                "s3",
                config=Config(
                    signature_version="s3v4",
                    s3={"addressing_style": "virtual"},
                ),
                region_name=getattr(settings, "AWS_S3_REGION_NAME", None),
            )
        return self.client
