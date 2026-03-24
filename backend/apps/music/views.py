import logging
import os
import tempfile
import traceback

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from .models import Project, Track
from .serializers import AudioAnalysisSerializer, ProjectSerializer, TrackSerializer
from .services.pipeline import note_events_from_audio_path

logger = logging.getLogger(__name__)


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


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser])
def analyze_audio_view(request, project_id):
    project = get_object_or_404(Project, id=project_id, user=request.user)

    serializer = AudioAnalysisSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    audio_file = serializer.validated_data["audio_file"]
    suffix = ".webm" if "webm" in audio_file.content_type else ".wav"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            for chunk in audio_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        note_events = note_events_from_audio_path(
            tmp_path, bpm=project.bpm, key=project.key
        )
        return Response({"note_events": note_events})

    except (ValueError, FileNotFoundError, RuntimeError, OSError) as e:
        return Response(
            {"detail": str(e).strip() or repr(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
        msg = str(e).strip() or f"{type(e).__name__}"
        logger.exception("analyze-audio failed: %s", msg)
        payload = {"detail": msg}
        if settings.DEBUG:
            payload["traceback"] = traceback.format_exc()
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
