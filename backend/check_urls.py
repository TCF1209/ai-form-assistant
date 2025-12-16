#!/usr/bin/env python
"""Script to debug URL configuration."""
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import django
django.setup()

from django.urls import get_resolver, reverse

def show_all_urls(urlpatterns, prefix=''):
    """Recursively list all URL patterns."""
    urls = []
    for pattern in urlpatterns:
        full_pattern = prefix + str(pattern.pattern)
        if hasattr(pattern, 'url_patterns'):
            urls.extend(show_all_urls(pattern.url_patterns, full_pattern))
        else:
            urls.append((full_pattern, getattr(pattern, 'name', None)))
    return urls

# Check FormSubmissionViewSet actions
from forms.views import FormSubmissionViewSet
print("=" * 60)
print("FormSubmissionViewSet Action Methods:")
print("=" * 60)
print(f"  Has 'export' method: {hasattr(FormSubmissionViewSet, 'export')}")
print(f"  Has 'stats' method: {hasattr(FormSubmissionViewSet, 'stats')}")

# Check if export has the action decorator attributes
if hasattr(FormSubmissionViewSet, 'export'):
    export_method = getattr(FormSubmissionViewSet, 'export')
    print(f"  export.kwargs: {getattr(export_method, 'kwargs', 'NO KWARGS')}")
    print(f"  export.detail: {getattr(export_method, 'detail', 'NO DETAIL')}")

# Check URL patterns from router
from rest_framework.routers import DefaultRouter
router = DefaultRouter()
router.register(r'submissions', FormSubmissionViewSet, basename='submission')

print("\n" + "=" * 60)
print("Router Generated URLs for FormSubmissionViewSet:")
print("=" * 60)
for url in router.urls:
    print(f"  {url.pattern} -> {url.name}")

# Check actual Django URLs
print("\n" + "=" * 60)
print("All Registered URLs containing 'submission' or 'export':")
print("=" * 60)
resolver = get_resolver()
all_urls = show_all_urls(resolver.url_patterns)
for url_pattern, name in sorted(all_urls):
    if 'submission' in url_pattern.lower() or 'export' in url_pattern.lower():
        print(f"  {url_pattern} -> {name}")

print("\n" + "=" * 60)
print("Top-level URL patterns:")
print("=" * 60)
for pattern in resolver.url_patterns:
    print(f"  {pattern.pattern}")
