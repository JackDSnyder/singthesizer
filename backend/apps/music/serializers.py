from rest_framework import serializers
from .models import Project


class ProjectSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.id")

    class Meta:
        model = Project
        fields = ("id", "name", "user", "created_at", "updated_at")
        read_only_fields = ("id", "user", "created_at", "updated_at")
