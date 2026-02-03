from django.contrib import admin
from .models import Project, Track


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["name", "user__username"]


@admin.register(Track)
class TrackAdmin(admin.ModelAdmin):
    list_display = ["name", "project", "created_at"]
    list_filter = ["created_at", "project"]
    search_fields = ["name", "project__name"]
