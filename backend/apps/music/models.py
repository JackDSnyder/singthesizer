from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.contrib.auth.models import User


class Project(models.Model):
    name = models.CharField(max_length=200)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="projects")
    bpm = models.IntegerField(
        default=120,
        validators=[MinValueValidator(40), MaxValueValidator(200)],
        help_text="Beats per minute (40-200)",
    )
    key = models.CharField(
        max_length=10, default="C", help_text="Musical key (e.g., C, Dm, Am)"
    )
    bars = models.IntegerField(
        default=4,
        validators=[MinValueValidator(4), MaxValueValidator(16)],
        help_text="Project length in bars (1 bar = 4 beats). Allowed: 4, 8, 12, or 16.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Track(models.Model):
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="tracks"
    )
    name = models.CharField(max_length=200, default="Track")
    note_events = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.name} ({self.project.name})"
