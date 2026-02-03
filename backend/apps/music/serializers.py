from rest_framework import serializers
from .models import Project, Track


class ProjectSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.id")

    class Meta:
        model = Project
        fields = ("id", "name", "user", "created_at", "updated_at")
        read_only_fields = ("id", "user", "created_at", "updated_at")


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
