from django.contrib import admin

from .models import Exercise, Profile, Session, VerificationCode, Word


@admin.register(Word)
class WordAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "text")
    search_fields = ("text",)


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "sentence", "is_correct")
    search_fields = ("sentence", "user__username")
    filter_horizontal = ("words_used",)


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "date")
    filter_horizontal = ("exercises",)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "is_email_verified", "two_factor_enabled")
    list_filter = ("is_email_verified", "two_factor_enabled")


@admin.register(VerificationCode)
class VerificationCodeAdmin(admin.ModelAdmin):
    list_display = ("user", "purpose", "code", "is_used", "expires_at", "created_at")
    list_filter = ("purpose", "is_used")
