from rest_framework import viewsets, permissions
from django.shortcuts import get_object_or_404
from .models import Project, Track
from .serializers import ProjectSerializer, TrackSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TrackViewSet(viewsets.ModelViewSet):
    serializer_class = TrackSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        project_id = self.kwargs.get("project_id")
        if project_id:
            project = get_object_or_404(Project, id=project_id, user=self.request.user)
            return Track.objects.filter(project=project)
        return Track.objects.filter(project__user=self.request.user)

    def perform_create(self, serializer):
        project_id = self.kwargs.get("project_id")
        project = get_object_or_404(Project, id=project_id, user=self.request.user)
        serializer.save(project=project)
