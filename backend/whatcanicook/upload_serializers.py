from django.conf import settings
from rest_framework import serializers

from .services.uploads import ALLOWED_IMAGE_CONTENT_TYPES


class ImageUploadRequestSerializer(serializers.Serializer):
    filename = serializers.CharField(max_length=255)
    content_type = serializers.CharField(max_length=100)
    size = serializers.IntegerField(min_value=1)

    def validate_content_type(self, value):
        content_type = value.lower().strip()
        if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
            raise serializers.ValidationError("Unsupported image type.")
        return content_type

    def validate_size(self, value):
        max_bytes = self.context.get("max_bytes", settings.AVATAR_UPLOAD_MAX_BYTES)
        if value > max_bytes:
            raise serializers.ValidationError(f"Image must be {max_bytes} bytes or smaller.")
        return value

    def validate(self, attrs):
        attrs["extension"] = ALLOWED_IMAGE_CONTENT_TYPES[attrs["content_type"]]
        return attrs
