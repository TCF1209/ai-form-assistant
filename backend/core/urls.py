"""
Root URL configuration: the Django admin, the REST API under /api/v1/, and uploaded files.
"""
from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('api.v1.urls')),
]

if settings.SERVE_MEDIA:
    urlpatterns.append(
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT})
    )
