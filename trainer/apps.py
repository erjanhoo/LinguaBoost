from django.apps import AppConfig


class TrainerConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "trainer"

    def ready(self):  # pragma: no cover - import side effects
        from . import signals  # noqa: F401
