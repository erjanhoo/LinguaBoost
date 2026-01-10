import json
import logging
import os
import random
import re
import unicodedata
import uuid
from datetime import timedelta
from typing import List, Tuple

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from openai import OpenAI
from rest_framework import permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from config import settings
from .models import Exercise, Profile, Session, VerificationCode, Word
from .serializers import (
    SessionSerializer,
    UserSerializer,
    WordSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)
DEFAULT_BASE_WORDS = [
    "hola",
    "casa",
    "comida",
    "libro",
    "trabajo",
    "familia",
    "amigo",
    "ciudad",
    "tiempo",
    "viaje",
]


def _generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def _create_code(user: User, purpose: str, minutes_valid: int = 10) -> VerificationCode:
    VerificationCode.objects.filter(user=user, purpose=purpose, is_used=False).update(is_used=True)
    return VerificationCode.objects.create(
        user=user,
        code=_generate_code(),
        purpose=purpose,
        expires_at=timezone.now() + timedelta(minutes=minutes_valid),
    )


def _send_code_email(user: User, code: str, purpose: str) -> None:
    subject = """Ваш код подтверждения"""
    if purpose == VerificationCode.PURPOSE_REGISTRATION:
        body = f"Код для завершения регистрации: {code}. Срок действия 10 минут."
    elif purpose == VerificationCode.PURPOSE_PASSWORD_RESET:
        body = f"Код для сброса пароля: {code}. Срок действия 10 минут."
    else:
        body = f"Код для входа (2FA): {code}. Срок действия 10 минут."
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)


def _ensure_session(user: User) -> Session:
    session = Session.objects.filter(user=user).order_by("-date").first()
    if session is None:
        session = Session.objects.create(user=user, last_words_used=[])
    return session


def _find_words_in_sentence(sentence: str, word_list: List[str]) -> List[str]:
    """Find which vocabulary items appear in the sentence.

    Uses normalized matching (case/accents/punctuation) and avoids substring false-positives.
    Supports both single-word items and multi-word phrases.
    """

    def normalize_for_match(text: str) -> str:
        # Remove accents
        text = unicodedata.normalize("NFD", text)
        text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
        # Lowercase and replace punctuation with spaces
        text = text.lower()
        text = "".join(ch if ch.isalnum() else " " for ch in text)
        # Collapse whitespace
        return " ".join(text.split())

    normalized_sentence = normalize_for_match(sentence)
    if not normalized_sentence:
        return []

    sentence_tokens = set(normalized_sentence.split())

    found_words: List[str] = []
    for raw_word in word_list:
        normalized_word = normalize_for_match(raw_word)
        if not normalized_word:
            continue

        if " " not in normalized_word:
            if normalized_word in sentence_tokens:
                found_words.append(raw_word)
            continue

        # Phrase match: require boundaries so we don't match across tokens accidentally.
        pattern = rf"(?<!\\w){re.escape(normalized_word)}(?!\\w)"
        if re.search(pattern, normalized_sentence):
            found_words.append(raw_word)

    return found_words


def _compute_streak(dates_desc: List[timezone.datetime.date], *, today) -> int:
    date_set = set(dates_desc)
    streak = 0
    cursor = today
    while cursor in date_set:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def _compute_longest_streak(dates_asc: List[timezone.datetime.date]) -> int:
    if not dates_asc:
        return 0
    best = 1
    current = 1
    for prev, cur in zip(dates_asc, dates_asc[1:]):
        if cur == prev + timedelta(days=1):
            current += 1
        else:
            best = max(best, current)
            current = 1
    return max(best, current)


def _select_words(user: User, session: Session, target_count: int, language: str = "Spanish") -> Tuple[List[Word], Session]:
    words = list(Word.objects.filter(user=user, language=language))
    if not words:
        return [], session

    target_count = max(1, min(target_count, len(words)))

    recent_ids = set((session.last_words_used or [])[-5:])
    shuffled = words[:]
    random.shuffle(shuffled)

    selected: List[Word] = []
    for w in shuffled:
        if len(selected) >= target_count:
            break
        if w.id in recent_ids and len(shuffled) > target_count:
            continue
        selected.append(w)

    if len(selected) < target_count:
        remaining = [w for w in shuffled if w not in selected]
        selected.extend(remaining[: target_count - len(selected)])

    session.last_words_used = [w.id for w in selected][-10:]
    session.save(update_fields=["last_words_used"])
    return selected, session


def _parse_json_payload(raw_text: str) -> dict:
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        return {}


def _extract_text(response) -> str:
    """Extract plain text from a Gemini response object."""
    if hasattr(response, "text"):
        return response.text
    candidate = getattr(response, "candidates", [None])[0]
    if candidate and getattr(candidate, "content", None):
        parts = getattr(candidate.content, "parts", []) or []
        return "".join(getattr(p, "text", "") for p in parts)
    return ""


def _normalize_text(text: str) -> str:
    """Remove accents, punctuation, and normalize text for comparison."""
    # Remove accents using NFD normalization
    text = unicodedata.normalize('NFD', text)
    text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
    # Remove punctuation and convert to lowercase
    text = ''.join(char for char in text if char.isalnum() or char.isspace())
    return text.lower().strip()


def generate_sentences_with_genai(
    user_words: List[str], 
    level: str, 
    length: str, 
    num_sentences: int,
    source_language: str,
    target_language: str,
    topic: str = "any",
    sentence_type: str = "mixed",
    tense: str = "mixed",
    grammar_focus: str = "",
) -> List[str]:
    api_key = settings.OPENAI_API_KEY
    
    if not api_key:
        return [f"Example sentence with {word}" for word in user_words[:num_sentences]]
    
    source_lang = source_language
    target_lang = target_language
    
    # Build topic instruction
    topic_instruction = ""
    if topic and topic != "any":
        topic_instruction = f"All sentences should be about the topic: {topic}. "
    
    # Build sentence type instruction
    type_instruction = ""
    if sentence_type == "affirmative":
        type_instruction = "Generate only affirmative (declarative) sentences. "
    elif sentence_type == "interrogative":
        type_instruction = "Generate only interrogative (question) sentences. "
    elif sentence_type == "negative":
        type_instruction = "Generate only negative sentences. "
    else:  # mixed
        type_instruction = "Mix different sentence types: affirmative, interrogative, and negative. "

    # Build tense instruction
    tense = (tense or "mixed").strip().lower()
    if tense not in {"mixed", "present", "past", "future"}:
        tense = "mixed"

    tense_instruction = ""
    if tense == "present":
        tense_instruction = "Use ONLY the present tense. "
    elif tense == "past":
        tense_instruction = "Use ONLY the past tense. "
    elif tense == "future":
        tense_instruction = "Use ONLY the future tense. "
    else:  # mixed
        tense_instruction = "Mix tenses naturally: present, past, and future. "

    grammar_focus = (grammar_focus or "").strip()
    grammar_focus_instruction = ""
    if grammar_focus:
        grammar_focus_instruction = (
            f"Grammar focus (must be clearly practiced in EVERY sentence): {grammar_focus}. "
            "Do NOT explicitly mention grammar rules; just make the sentences naturally require/illustrate this point. "
        )
    
    prompt = (
        f"Generate {num_sentences} natural, realistic sentences STRICTLY IN {source_lang.upper()} LANGUAGE. "
        f"Level: {level}, Length: {length}. "
        f"{topic_instruction}"
        f"{type_instruction}"
        f"{tense_instruction}"
        f"{grammar_focus_instruction}"
        f"Available vocabulary words: {user_words}. "
        "CRITICAL RULES:\n"
        "- Each sentence must use AT LEAST ONE word from the vocabulary list\n"
        "- ONLY generate sentences that native speakers say in REAL conversations\n"
        "- Before each sentence, ask: Would I actually say this to a friend? If NO → reject it\n"
        "- Use ONLY natural, common expressions from everyday life\n"
        "- Context must be realistic (actual situations people encounter daily)\n"
        "- Time references must make PRACTICAL sense:\n"
        "  * Use: today, tomorrow, tonight, this week, later, now, soon\n"
        "  * NEVER use specific months (April, June, November) or distant future dates\n"
        "  * Only use specific times that make sense in real conversations\n"
        "- NO forced combinations of unrelated vocabulary words\n"
        "- NO awkward verb/noun pairings that sound robotic or textbook-like\n"
        "- NO overly specific details that make no contextual sense\n"
        "- Keep it simple, direct, and conversational\n"
        "- Each sentence should be something learners will ACTUALLY use or hear\n"
        f"Think like a {source_lang} speaker talking to friends/family, NOT writing a grammar exercise. "
        f"ALL SENTENCES MUST BE IN {source_lang.upper()}, NOT {target_lang.upper()}. "
        'Return ONLY JSON format: {"sentences": ["...", "..."]}.'
    )
    
    client = OpenAI(api_key=api_key)
    system_message = (
        f"You are a native {source_lang} speaker teaching the language. "
        f"Generate ONLY sentences that native speakers actually use in daily life. "
        f"Reject anything that sounds unnatural, forced, or textbook-like. "
        f"Think: Would my friend/family actually say this? If no, don't use it."
    )
    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL_NAME,
        messages=[
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt},
        ],
        max_tokens=500,
        temperature=0.7,
    )
    raw_text = response.choices[0].message.content.strip()
    
    # Strip markdown code fences if present
    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    if raw_text.startswith("```"):
        raw_text = raw_text[3:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]
    raw_text = raw_text.strip()
    
    payload = _parse_json_payload(raw_text)
    sentences = payload.get("sentences")
    if isinstance(sentences, list) and sentences:
        return sentences[:num_sentences]

    # Fallback if model did not return expected structure
    return [part.strip() for part in raw_text.split("\n") if part.strip()][:num_sentences]


def check_translation_with_genai(sentence: str, translation: str, language_direction: str = "es-to-en") -> dict:
    api_key = settings.OPENAI_API_KEY
    
    # Determine source and target languages
    if language_direction == "en-to-es":
        source_lang = "English"
        target_lang = "Spanish"
    else:  # es-to-en (default)
        source_lang = "Spanish"
        target_lang = "English"
    
    if not api_key:
        is_correct = translation.strip().lower() in sentence.lower()
        return {
            "is_correct": is_correct,
            "correct_translation": sentence if not is_correct else translation,
            "explanation": "Offline check: verified by string containment."
            if not is_correct
            else "Translation accepted (offline).",
        }
    
    # Check if translations match when normalized (ignoring accents and punctuation)
    if _normalize_text(sentence) == _normalize_text(translation):
        return {
            "is_correct": True,
            "correct_translation": translation,
            "explanation": "",
        }
    
    # Special case: if translation is empty, just return the correct translation
    if not translation.strip():
        prompt = (
            f"Translate this {source_lang} sentence to {target_lang}: {sentence}. "
            'Respond with only JSON: {"correct_translation": "your translation here"}.'
        )
    else:
        prompt = (
            f"You are checking the translation of a {source_lang} sentence into {target_lang}. "
            f"{source_lang}: {sentence}\nUser's translation: {translation}\n\n"
            "Grade primarily by MEANING, not by perfect spelling/grammar.\n"
            "\n"
            "✅ Treat as CORRECT (is_correct=true) when the meaning is clearly the same, even if there are minor issues like:\n"
            "- Typos / misspellings that are still understandable (e.g., 'bcause' vs 'because')\n"
            "- Capitalization differences ('i' vs 'I')\n"
            "- Punctuation differences\n"
            "- Missing accent marks in Spanish (á é í ó ú ñ ü)\n"
            "- Minor article/preposition differences that do not change meaning\n"
            "- Minor word order differences that still sound natural/understandable\n"
            "\n"
            "🚫 Mark as INCORRECT (is_correct=false) only when there is a MEANING error, such as:\n"
            "- Wrong subject/object (changes who did what to whom), when it is unambiguous\n"
            "- Wrong tense/time that changes meaning (past vs future)\n"
            "- Negation mistakes (adding/removing 'not', 'no', 'nunca', etc.)\n"
            "- Missing or extra key information that changes meaning\n"
            "- Wrong key vocabulary (dog vs cat, buy vs sell, etc.)\n"
            "\n"
            "IMPORTANT:\n"
            "- Do NOT invent errors. Only mention a problem if it is definitely present.\n"
            "- If the source sentence allows more than one plausible interpretation (e.g., implicit/ambiguous subject), be lenient and accept the user's translation if it matches one plausible meaning.\n"
            "- If is_correct=true, set explanation to an empty string.\n"
            "\n"
            'Respond with JSON ONLY: {"is_correct": true/false, "correct_translation": "...", "explanation": ""}.'
        )
    
    client = OpenAI(api_key=api_key,
                    project='proj_75KlhDjKda9twpOyWLSJCAq2')
    system_message = f"You are a language teaching assistant. You check translations from {source_lang} to {target_lang}."
    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL_NAME,
        messages=[
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt},
        ],
        max_tokens=200,
        temperature=0.7,
    )
    raw_text = response.choices[0].message.content.strip()
    
    # Strip markdown code fences if present
    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    if raw_text.startswith("```"):
        raw_text = raw_text[3:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]
    raw_text = raw_text.strip()
    
    payload = _parse_json_payload(raw_text)

    return {
        "is_correct": bool(payload.get("is_correct", False)),
        "correct_translation": payload.get("correct_translation", translation),
        "explanation": payload.get("explanation", ""),
    }
class WordViewSet(viewsets.ModelViewSet):
    serializer_class = WordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Word.objects.filter(user=self.request.user).order_by("-id")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)


class GenerateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        profile = getattr(user, "profile", None)
        target_lang = profile.target_language if profile else "Spanish"
        native_lang = profile.native_language if profile else "English"

        level = request.data.get("level", "A1")
        length = request.data.get("length", "короткая")
        topic = request.data.get("topic", "any")
        sentence_type = request.data.get("sentence_type", "mixed")
        tense = request.data.get("tense", "mixed")
        grammar_focus = request.data.get("grammar_focus", "")
        num_sentences = int(request.data.get("num_sentences", 5))
        num_sentences = max(5, min(num_sentences, 10))
        words_count_raw = request.data.get("words_count", 5)
        specific_words = request.data.get("specific_words", [])

        try:
            words_count = int(words_count_raw)
        except (TypeError, ValueError):
            words_count = 5
        words_count = max(1, min(words_count, 20))

        used_genai = bool(settings.OPENAI_API_KEY)
        fallback_reason = None

        session = _ensure_session(user)
        
        if specific_words:
            selected_words = list(Word.objects.filter(user=user, text__in=specific_words, language__iexact=target_lang))
        else:
            selected_words, session = _select_words(user, session, target_count=words_count, language=target_lang)

        if selected_words:
            user_words = [w.text for w in selected_words]
        else:
            if target_lang.lower() == "spanish":
                base_words = list(DEFAULT_BASE_WORDS)
                while len(base_words) < words_count:
                    base_words.extend(DEFAULT_BASE_WORDS)
                user_words = base_words[:words_count]
            else:
                user_words = []

        try:
            sentences = generate_sentences_with_genai(
                user_words,
                level,
                length,
                num_sentences,
                source_language=target_lang,
                target_language=native_lang,
                topic=topic,
                sentence_type=sentence_type,
                tense=tense,
                grammar_focus=grammar_focus,
            )
        except Exception as exc:  # pragma: no cover - runtime safeguard
            message = str(exc)
            if "RESOURCE_EXHAUSTED" in message or "quota" in message.lower():
                logger.warning("Generation quota hit: %s", message)
                return Response(
                    {"detail": "AI is overloaded. Please try again later."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            else:
                logger.exception("Generation failed")
                return Response(
                    {"detail": "AI request failed. Please try again."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        created_exercises = []
        sentences_with_words = []
        with transaction.atomic():
            for sentence in sentences:
                exercise = Exercise.objects.create(user=user, sentence=sentence)
                exercise.words_used.set(selected_words)
                session.exercises.add(exercise)
                created_exercises.append(exercise)
                # Find which words from the list appear in this sentence
                words_in_sentence = _find_words_in_sentence(sentence, user_words)
                sentences_with_words.append({
                    "sentence": sentence,
                    "words_found": words_in_sentence
                })

        session.date = timezone.now()
        session.save(update_fields=["date"])

        return Response(
            {
                "sentences": sentences,
                "sentences_with_words": sentences_with_words,
                "words_used": user_words,
                "session": SessionSerializer(session).data,
                "used_genai": used_genai,
                "fallback_reason": fallback_reason,
            },
            status=status.HTTP_200_OK,
        )


class CheckTranslationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        sentence = request.data.get("sentence")
        translation = request.data.get("translation")
        if translation is None:
            translation = request.data.get("user_translation", "")
        language_direction = request.data.get("language_direction", "es-to-en")

        if not sentence or translation is None:
            return Response(
                {"detail": "Both 'sentence' and 'translation' are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = check_translation_with_genai(sentence, translation, language_direction)
        except Exception as exc:
            message = str(exc)
            if "RESOURCE_EXHAUSTED" in message or "quota" in message.lower():
                logger.warning("Translation check quota hit: %s", message)
                return Response(
                    {"detail": "AI is overloaded. Please try again later."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            else:
                logger.exception("Translation check failed")
                return Response(
                    {"detail": "AI request failed. Please try again."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        exercise = Exercise.objects.filter(user=user, sentence=sentence).order_by("-id").first()
        if exercise:
            exercise.user_translation = translation
            exercise.correct_translation = result.get("correct_translation", "")
            exercise.is_correct = bool(result.get("is_correct", False))
            exercise.save(update_fields=["user_translation", "correct_translation", "is_correct"])

        return Response(result, status=status.HTTP_200_OK)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""

        if not email or not password:
            return Response({"detail": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({"detail": "Email already registered."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=email, email=email, is_active=False)
        user.set_password(password)
        user.save()
        Profile.objects.get_or_create(user=user)

        code = _create_code(user, VerificationCode.PURPOSE_REGISTRATION)
        _send_code_email(user, code.code, code.purpose)

        return Response({"detail": "Verification code sent to email."}, status=status.HTTP_201_CREATED)


class VerifyRegistrationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        code = (request.data.get("code") or "").strip()
        user = User.objects.filter(email=email).first()
        if not user:
            return Response({"detail": "User not found."}, status=status.HTTP_400_BAD_REQUEST)

        vcode = (
            VerificationCode.objects.filter(
                user=user,
                purpose=VerificationCode.PURPOSE_REGISTRATION,
                is_used=False,
                expires_at__gte=timezone.now(),
            )
            .order_by("-created_at")
            .first()
        )
        if not vcode or vcode.code != code:
            return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)

        vcode.is_used = True
        vcode.save(update_fields=["is_used"])

        user.is_active = True
        user.save(update_fields=["is_active"])
        profile = user.profile
        profile.is_email_verified = True
        profile.save(update_fields=["is_email_verified"])

        token, _ = Token.objects.get_or_create(user=user)
        login(request, user)

        return Response({"token": token.key, "user": UserSerializer(user).data}, status=status.HTTP_200_OK)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
        user = authenticate(request, username=email, password=password)

        if not user:
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_400_BAD_REQUEST)
        if not user.is_active:
            return Response({"detail": "Account not verified."}, status=status.HTTP_400_BAD_REQUEST)

        if user.profile.two_factor_enabled:
            code = _create_code(user, VerificationCode.PURPOSE_LOGIN_2FA)
            _send_code_email(user, code.code, code.purpose)
            return Response({"requires_2fa": True, "detail": "2FA code sent to email."}, status=status.HTTP_200_OK)

        token, _ = Token.objects.get_or_create(user=user)
        login(request, user)
        return Response({"token": token.key, "user": UserSerializer(user).data}, status=status.HTTP_200_OK)


class Verify2FAView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        code = (request.data.get("code") or "").strip()
        user = User.objects.filter(email=email).first()
        if not user:
            return Response({"detail": "User not found."}, status=status.HTTP_400_BAD_REQUEST)

        vcode = (
            VerificationCode.objects.filter(
                user=user,
                purpose=VerificationCode.PURPOSE_LOGIN_2FA,
                is_used=False,
                expires_at__gte=timezone.now(),
            )
            .order_by("-created_at")
            .first()
        )
        if not vcode or vcode.code != code:
            return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)

        vcode.is_used = True
        vcode.save(update_fields=["is_used"])

        token, _ = Token.objects.get_or_create(user=user)
        login(request, user)
        return Response({"token": token.key, "user": UserSerializer(user).data}, status=status.HTTP_200_OK)


class LogoutView(APIView):
    def post(self, request):
        if request.user.is_authenticated:
            Token.objects.filter(user=request.user).delete()
            logout(request)
        return Response({"detail": "Logged out."}, status=status.HTTP_200_OK)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        profile = getattr(user, "profile", None)
        if not profile:
             return Response({"detail": "Profile not found"}, status=500)

        # Handle profile picture
        if "profile_picture" in request.FILES:
            profile.profile_picture = request.FILES["profile_picture"]
            
        if "native_language" in request.data:
            profile.native_language = request.data["native_language"]
            
        if "target_language" in request.data:
            profile.target_language = request.data["target_language"]
            
        profile.save()
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class Toggle2FAView(APIView):
    def post(self, request):
        enabled = bool(request.data.get("enabled"))
        profile = request.user.profile
        profile.two_factor_enabled = enabled
        profile.save(update_fields=["two_factor_enabled"])
        return Response({"two_factor_enabled": enabled}, status=status.HTTP_200_OK)


class ProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        total_words = Word.objects.filter(user=user).count()
        total_exercises = Exercise.objects.filter(user=user).count()

        attempted_qs = Exercise.objects.filter(user=user).exclude(user_translation="")
        total_attempted = attempted_qs.count()
        total_correct = attempted_qs.filter(is_correct=True).count()

        accuracy = (total_correct / total_attempted) if total_attempted else 0.0

        session_qs = Session.objects.filter(user=user)
        session_count = session_qs.count()

        # Practice days derived from sessions (generation events)
        practice_dates = [
            timezone.localtime(dt).date()
            for dt in session_qs.values_list("date", flat=True)
            if dt is not None
        ]
        practice_date_set = sorted(set(practice_dates))
        today = timezone.localdate()

        current_streak = _compute_streak(list(reversed(practice_date_set)), today=today)
        longest_streak = _compute_longest_streak(practice_date_set)
        last_practice_date = practice_date_set[-1].isoformat() if practice_date_set else None

        return Response(
            {
                "words_total": total_words,
                "exercises_total": total_exercises,
                "attempts_total": total_attempted,
                "correct_total": total_correct,
                "accuracy": round(accuracy, 4),
                "sessions_total": session_count,
                "days_practiced": len(practice_date_set),
                "current_streak": current_streak,
                "longest_streak": longest_streak,
                "last_practice_date": last_practice_date,
            },
            status=status.HTTP_200_OK,
        )


class ChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        message = request.data.get("message", "").strip()
        
        if not message:
            return Response(
                {"detail": "Message is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            return Response(
                {"response": "Sorry, AI chat is not available at the moment."},
                status=status.HTTP_200_OK,
            )
        
        try:
            client = OpenAI(api_key=api_key, project='proj_75KlhDjKda9twpOyWLSJCAq2')
            system_message = (
                "You are a helpful Spanish language tutor. "
                "Answer questions about Spanish grammar, vocabulary, pronunciation, and culture. "
                "Provide clear, concise explanations. "
                "Give examples when helpful. "
                "Be encouraging and supportive."
            )
            
            response = client.chat.completions.create(
                model=settings.OPENAI_MODEL_NAME,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": message},
                ],
                max_tokens=350,
                temperature=0.7,
            )
            
            ai_response = response.choices[0].message.content.strip()
            
            return Response({"response": ai_response}, status=status.HTTP_200_OK)
            
        except Exception as exc:
            logger.exception("Chat request failed")
            return Response(
                {"detail": "Failed to get response from AI."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()
        user = User.objects.filter(email=email).first()
        if user:
            code_obj = _create_code(user, VerificationCode.PURPOSE_PASSWORD_RESET)
            _send_code_email(user, code_obj.code, VerificationCode.PURPOSE_PASSWORD_RESET)
        
        return Response({"detail": "If verification matches, email sent."}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()
        code = request.data.get("code", "").strip()
        new_password = request.data.get("new_password", "").strip()

        if not email or not code or not new_password:
             return Response({"detail": "All fields required"}, status=status.HTTP_400_BAD_REQUEST)

        user = get_object_or_404(User, email=email)
        
        valid_code = VerificationCode.objects.filter(
            user=user,
            purpose=VerificationCode.PURPOSE_PASSWORD_RESET,
            code=code,
            is_used=False,
            expires_at__gt=timezone.now()
        ).first()

        if not valid_code:
             return Response({"detail": "Invalid or expired code"}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        
        valid_code.is_used = True
        valid_code.save()

        return Response({"detail": "Password reset successfully"}, status=status.HTTP_200_OK)

