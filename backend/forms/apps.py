from django.apps import AppConfig


class FormsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'forms'

    def ready(self):
        """Import signal handlers when the app is ready."""
        import forms.signals  # noqa
