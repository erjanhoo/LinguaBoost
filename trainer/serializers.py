from rest_framework import serializers

from django.contrib.auth import get_user_model
from .models import Exercise, Profile, Session, Word

User = get_user_model()


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["is_email_verified", "two_factor_enabled", "profile_picture", "native_language", "target_language", "bio", "learning_goal"]




class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "profile"]


class WordSerializer(serializers.ModelSerializer):
    class Meta:
        model = Word
        fields = ["id", "text", "language"]
        read_only_fields = ["user"]

    def validate(self, data):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        text = data.get("text", "").strip()
        
        # If language is not provided in data, it might use the default from the model 
        # but here we are validating input data.
        # We can fetch the language from data or fall back to "Spanish" effectively for the check
        language = data.get("language", "Spanish")

        if user and user.is_authenticated:
            qs = Word.objects.filter(user=user, text__iexact=text, language__iexact=language)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("This word already exists in your dictionary for this language.")
        
        data['text'] = text
        return data



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
