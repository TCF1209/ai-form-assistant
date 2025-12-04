#!/usr/bin/env python
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.urls import get_resolver

def show_urls():
    resolver = get_resolver()
    for pattern in resolver.url_patterns:
        print(f"Pattern: {pattern.pattern}")
        if hasattr(pattern, 'url_patterns'):
            for sub in pattern.url_patterns:
                print(f"  - {sub.pattern}")
                if hasattr(sub, 'url_patterns'):
                    for sub2 in sub.url_patterns:
                        print(f"    - {sub2.pattern}")

# Check FormSubmissionViewSet actions
from forms.views import FormSubmissionViewSet
print("\n=== FormSubmissionViewSet Actions ===")
print("Has export:", hasattr(FormSubmissionViewSet, 'export'))
print("Has stats:", hasattr(FormSubmissionViewSet, 'stats'))

# Check URL patterns
from rest_framework.routers import DefaultRouter
router = DefaultRouter()
router.register(r'submissions', FormSubmissionViewSet, basename='submission')
print("\n=== Router URLs ===")
for url in router.urls:
    print(f"  {url.pattern} -> {url.name}")

if __name__ == '__main__':
    show_urls()
