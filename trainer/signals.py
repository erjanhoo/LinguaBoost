from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Profile

User = get_user_model()


@receiver(post_save, sender=User)
def ensure_profile(sender, instance: User, created: bool, **kwargs):  # pragma: no cover - simple hook
    if created:
        Profile.objects.get_or_create(user=instance)
