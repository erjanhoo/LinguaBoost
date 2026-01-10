from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ChatView,
    CheckTranslationView,
    GenerateView,
    LoginView,
    LogoutView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ProgressView,
    RegisterView,
    Toggle2FAView,
    Verify2FAView,
    VerifyRegistrationView,
    WordViewSet,
)

router = DefaultRouter()
router.register(r"words", WordViewSet, basename="word")

urlpatterns = [
    path("", include(router.urls)),
    path("generate/", GenerateView.as_view(), name="generate"),
    path("check/", CheckTranslationView.as_view(), name="check"),
    path("chat/", ChatView.as_view(), name="chat"),
    path("progress/", ProgressView.as_view(), name="progress"),
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/verify-registration/", VerifyRegistrationView.as_view(), name="verify-registration"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/verify-2fa/", Verify2FAView.as_view(), name="verify-2fa"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("auth/toggle-2fa/", Toggle2FAView.as_view(), name="toggle-2fa"),
    path("auth/password-reset/request/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("auth/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
]
