import django.core.validators
from django.db import migrations, models


ALLOWED_BARS = (4, 8, 12, 16)


def _nearest_allowed(bars):
    return min(ALLOWED_BARS, key=lambda a: abs(a - bars))


def normalize_bars_to_allowed(apps, schema_editor):
    """Map any legacy bar count to the nearest of 4, 8, 12, or 16."""
    Project = apps.get_model("music", "Project")
    for p in Project.objects.all():
        nb = _nearest_allowed(p.bars)
        if nb != p.bars:
            p.bars = nb
            p.save(update_fields=["bars"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("music", "0003_project_bars_alter_project_bpm"),
    ]

    operations = [
        migrations.RunPython(normalize_bars_to_allowed, noop_reverse),
        migrations.AlterField(
            model_name="project",
            name="bars",
            field=models.IntegerField(
                default=4,
                help_text="Project length in bars (1 bar = 4 beats). Allowed: 4, 8, 12, or 16.",
                validators=[
                    django.core.validators.MinValueValidator(4),
                    django.core.validators.MaxValueValidator(16),
                ],
            ),
        ),
    ]
