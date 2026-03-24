from rest_framework import serializers
from .models import Project, Track

ALLOWED_PROJECT_BARS = frozenset({4, 8, 12, 16})


class ProjectSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.id")
    track_count = serializers.IntegerField(source="tracks.count", read_only=True)

    class Meta:
        model = Project
        fields = ("id", "name", "user", "bpm", "key", "bars", "track_count", "created_at", "updated_at")
        read_only_fields = ("id", "user", "track_count", "created_at", "updated_at")

    def validate_bars(self, value):
        if value not in ALLOWED_PROJECT_BARS:
            raise serializers.ValidationError(
                "Bars must be one of 4, 8, 12, or 16."
            )
        return value

    def validate(self, attrs):
        if self.instance is not None and "bars" in attrs:
            if attrs["bars"] != self.instance.bars and self.instance.tracks.exists():
                raise serializers.ValidationError(
                    {"bars": "Cannot change the length of a project that already has tracks."}
                )
        return attrs


class TrackSerializer(serializers.ModelSerializer):
    project = serializers.ReadOnlyField(source="project.id")

    class Meta:
        model = Track
        fields = ("id", "project", "name", "note_events", "created_at", "updated_at")
        read_only_fields = ("id", "project", "created_at", "updated_at")

    def validate_note_events(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("note_events must be a list.")
        return value


class AudioAnalysisSerializer(serializers.Serializer):
    audio_file = serializers.FileField()

    def validate_audio_file(self, value):
        # Browsers often send e.g. "audio/webm; codecs=opus" — compare base MIME only.
        ct = (value.content_type or "").split(";")[0].strip().lower()
        allowed = (
            "audio/wav",
            "audio/wave",
            "audio/x-wav",
            "audio/webm",
            "video/webm",
        )
        if ct not in allowed:
            raise serializers.ValidationError("File must be a WAV or WebM audio file.")
        return value
