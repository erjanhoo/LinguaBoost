from rest_framework import serializers

from django.contrib.auth import get_user_model
from .models import Exercise, Profile, Session, Word

User = get_user_model()


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["is_email_verified", "two_factor_enabled"]


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "profile"]


class WordSerializer(serializers.ModelSerializer):
    def validate_text(self, value):
        text = (value or "").strip()
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return text

        qs = Word.objects.filter(user=user, text__iexact=text)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Слово уже есть в вашем словаре")
        return text

    class Meta:
        model = Word
        fields = ["id", "text"]


class ExerciseSerializer(serializers.ModelSerializer):
    words_used = WordSerializer(many=True, read_only=True)

    class Meta:
        model = Exercise
        fields = [
            "id",
            "sentence",
            "words_used",
            "user_translation",
            "correct_translation",
            "is_correct",
        ]


class SessionSerializer(serializers.ModelSerializer):
    exercises = ExerciseSerializer(many=True, read_only=True)

    class Meta:
        model = Session
        fields = ["id", "date", "last_words_used", "exercises"]
