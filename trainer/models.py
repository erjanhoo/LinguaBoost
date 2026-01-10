from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    is_email_verified = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    profile_picture = models.ImageField(upload_to="profile_pics/", blank=True, null=True)
    native_language = models.CharField(max_length=50, default="English")
    target_language = models.CharField(max_length=50, default="Spanish")
    bio = models.TextField(blank=True, max_length=500)
    learning_goal = models.CharField(max_length=100, blank=True, default="Fluency")

    def __str__(self) -> str:  # pragma: no cover
        return f"Profile for {self.user}" 


class VerificationCode(models.Model):
    PURPOSE_REGISTRATION = "registration"
    PURPOSE_LOGIN_2FA = "login_2fa"
    PURPOSE_PASSWORD_RESET = "password_reset"

    PURPOSE_CHOICES = [
        (PURPOSE_REGISTRATION, "Registration"),
        (PURPOSE_LOGIN_2FA, "Login 2FA"),
        (PURPOSE_PASSWORD_RESET, "Password Reset"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["user", "purpose", "is_used", "expires_at"])]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.purpose} for {self.user}" 


class Word(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.CharField(max_length=200)
    language = models.CharField(max_length=50, default="Spanish")

    def __str__(self) -> str:  # pragma: no cover - simple repr
        return self.text

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "text", "language"], name="unique_word_per_user"),
        ]


class Exercise(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    sentence = models.TextField()
    words_used = models.ManyToManyField(Word)
    user_translation = models.TextField(blank=True)
    correct_translation = models.TextField(blank=True)
    is_correct = models.BooleanField(default=False)

    def __str__(self) -> str:  # pragma: no cover
        return self.sentence[:50]


class Session(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    exercises = models.ManyToManyField(Exercise)
    date = models.DateTimeField(auto_now_add=True)
    last_words_used = models.JSONField(default=list)

    def __str__(self) -> str:  # pragma: no cover
        return f"Session {self.id} for {self.user}"
