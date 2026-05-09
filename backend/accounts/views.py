from django.conf import settings
from django.contrib.auth import login as django_login
from django.contrib.auth import logout as django_logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from whatcanicook.services.uploads import S3UploadService, UploadServiceError

from .models import Profile
from .serializers import (
    AvatarUploadRequestSerializer,
    LoginSerializer,
    ProfileSerializer,
    SignupSerializer,
    UserSerializer,
)
from .storage_paths import profile_picture_storage_name


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

        serializer = AvatarUploadRequestSerializer(
            data=request.data,
            context={"max_bytes": settings.AVATAR_UPLOAD_MAX_BYTES},
        )
        serializer.is_valid(raise_exception=True)

        content_type = serializer.validated_data["content_type"]
        file_key = profile_picture_storage_name(
            request.user.id,
            serializer.validated_data["extension"],
        )

        try:
            upload = S3UploadService().create_presigned_image_upload(
                file_key=file_key,
                content_type=content_type,
                max_bytes=settings.AVATAR_UPLOAD_MAX_BYTES,
            )
        except UploadServiceError:
            return Response(
                {"detail": "Unable to prepare avatar upload."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(upload.as_response_data("profile_picture_key"))
