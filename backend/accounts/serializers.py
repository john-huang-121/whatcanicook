from pathlib import PurePosixPath

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from whatcanicook.services.uploads import ALLOWED_IMAGE_CONTENT_TYPES
from whatcanicook.upload_serializers import ImageUploadRequestSerializer

from .models import Profile
from .storage_paths import profile_picture_prefix

User = get_user_model()


class ProfileSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)
    profile_picture_key = serializers.CharField(write_only=True, required=False)
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            "first_name",
            "last_name",
            "display_name",
            "profile_picture",
            "profile_picture_key",
            "profile_picture_url",
            "twitter_x_url",
            "instagram_url",
            "facebook_url",
            "linkedin_url",
            "birth_date",
        ]
        read_only_fields = ["display_name", "profile_picture_url"]

    def validate_profile_picture_key(self, value):
        if not settings.USE_S3:
            raise serializers.ValidationError("Presigned profile picture uploads require S3 storage.")

        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            raise serializers.ValidationError("Unable to validate profile picture ownership.")

        path = PurePosixPath(value)
        expected_prefix = f"{profile_picture_prefix(request.user.id)}/"
        if path.is_absolute() or ".." in path.parts or not value.startswith(expected_prefix):
            raise serializers.ValidationError("Invalid profile picture key.")

        suffix = path.suffix.lower()
        if suffix not in set(ALLOWED_IMAGE_CONTENT_TYPES.values()):
            raise serializers.ValidationError("Unsupported profile picture file type.")

        return value

    def get_profile_picture_url(self, obj):
        if not obj.profile_picture:
            return ""

        request = self.context.get("request")
        url = obj.profile_picture.url
        return request.build_absolute_uri(url) if request else url

    def update(self, instance, validated_data):
        profile_picture_key = validated_data.pop("profile_picture_key", None)
        instance = super().update(instance, validated_data)

        if profile_picture_key:
            instance.profile_picture.name = profile_picture_key
            instance.save(update_fields=["profile_picture"])

        return instance


class AvatarUploadRequestSerializer(ImageUploadRequestSerializer):
    pass


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "created_at", "updated_at", "profile"]


class SignupSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    password1 = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def validate(self, attrs):
        if attrs["password1"] != attrs["password2"]:
            raise serializers.ValidationError({"password2": "The two password fields did not match."})

        user = User(username=attrs["username"], email=attrs["email"])
        validate_password(attrs["password1"], user=user)
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password1"],
        )
        Profile.objects.update_or_create(
            user=user,
            defaults={
                "first_name": validated_data["first_name"].strip(),
                "last_name": validated_data["last_name"].strip(),
            },
        )
        return user


class LoginSerializer(serializers.Serializer):
    login = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        login = attrs["login"]

        username = login
        if "@" in login:
            user = User.objects.filter(email__iexact=login).first()
            if user:
                username = user.username

        user = authenticate(
            request=self.context.get("request"),
            username=username,
            password=attrs["password"],
        )
        if user is None:
            raise serializers.ValidationError("Unable to log in with the provided credentials.")
        if not user.is_active:
            raise serializers.ValidationError("This account is inactive.")

        attrs["user"] = user
        return attrs
