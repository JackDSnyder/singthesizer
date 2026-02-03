from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, TrackViewSet

router = DefaultRouter()
router.register(r"projects", ProjectViewSet, basename="project")
router.register(r"tracks", TrackViewSet, basename="track")

urlpatterns = [
    path(
        "projects/<int:project_id>/tracks/",
        TrackViewSet.as_view({"get": "list", "post": "create"}),
        name="project-tracks",
    ),
] + router.urls
