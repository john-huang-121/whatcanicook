import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from django.conf import settings
from django.contrib.auth import login as django_login
from django.contrib.auth import logout as django_logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Profile
from .serializers import (
    AvatarUploadRequestSerializer,
    LoginSerializer,
    ProfileSerializer,
    SignupSerializer,
    UserSerializer,
)
from .storage_paths import profile_picture_storage_name


def s3_object_key(storage_name):
    location = settings.S3_STORAGE_OPTIONS.get("location", "").strip("/")
    return f"{location}/{storage_name}" if location else storage_name


def s3_upload_client():
    client_kwargs = {
        "config": Config(
            signature_version="s3v4",
            s3={"addressing_style": "virtual"},
        ),
        "region_name": settings.AWS_S3_REGION_NAME,
    }
    return boto3.client("s3", **client_kwargs)


class CsrfTokenView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        return Response({"detail": "CSRF cookie set."})


class CurrentUserView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"authenticated": False, "user": None})

        return Response(
            {
                "authenticated": True,
                "user": UserSerializer(request.user, context={"request": request}).data,
            }
        )


class SignupView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        django_login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        return Response(
            UserSerializer(user, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        django_login(request, user)
        return Response(UserSerializer(user, context={"request": request}).data)


class LogoutView(APIView):
    def post(self, request):
        django_logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_profile(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return profile

    def get(self, request):
        serializer = ProfileSerializer(self.get_profile(request), context={"request": request})
        return Response(serializer.data)

    def patch(self, request):
        serializer = ProfileSerializer(
            self.get_profile(request),
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AvatarUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not settings.USE_S3:
            return Response(
                {"detail": "S3 avatar uploads are not configured."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AvatarUploadRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        content_type = serializer.validated_data["content_type"]
        storage_name = profile_picture_storage_name(
            request.user.id,
            serializer.validated_data["extension"],
        )
        object_key = s3_object_key(storage_name)

        fields = {"Content-Type": content_type}
        conditions = [
            {"Content-Type": content_type},
            ["content-length-range", 1, settings.AVATAR_UPLOAD_MAX_BYTES],
        ]

        try:
            upload = s3_upload_client().generate_presigned_post(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=object_key,
                Fields=fields,
                Conditions=conditions,
                ExpiresIn=settings.S3_PRESIGNED_UPLOAD_EXPIRES,
            )
        except ClientError:
            return Response(
                {"detail": "Unable to prepare avatar upload."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "upload_url": upload["url"],
                "fields": upload["fields"],
                "profile_picture_key": storage_name,
                "object_key": object_key,
                "expires_in": settings.S3_PRESIGNED_UPLOAD_EXPIRES,
                "max_bytes": settings.AVATAR_UPLOAD_MAX_BYTES,
            }
        )
