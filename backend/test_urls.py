#!/usr/bin/env python
"""Test if URLs load correctly."""
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import django
    django.setup()
    print("Django setup: OK")
except Exception as e:
    print(f"Django setup failed: {e}")
    sys.exit(1)

try:
    from core.urls import urlpatterns
    print("URLs imported: OK")
    print(f"Number of URL patterns: {len(urlpatterns)}")
    for p in urlpatterns:
        print(f"  - {p.pattern}")
except Exception as e:
    print(f"URL import failed: {e}")
    import traceback
    traceback.print_exc()
