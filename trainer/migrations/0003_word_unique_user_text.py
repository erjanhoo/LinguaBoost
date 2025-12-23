from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("trainer", "0002_profile_verificationcode"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="word",
            constraint=models.UniqueConstraint(fields=["user", "text"], name="unique_word_per_user"),
        ),
    ]
