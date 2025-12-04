#!/usr/bin/env python
"""
Script to sync FormSubmission status with WorkflowInstance status.
Run this once to fix existing data where workflow completed but submission status wasn't updated.

Usage: python fix_submission_status.py
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from workflows.models import WorkflowInstance
from forms.models import FormSubmission

def fix_submission_statuses():
    """Update submission statuses based on workflow instance completion."""

    print("Starting submission status sync...")

    # Find all completed workflow instances
    completed_instances = WorkflowInstance.objects.filter(status='COMPLETED')
    fixed_approved = 0

    for instance in completed_instances:
        submission = instance.submission
        if submission.status != 'APPROVED':
            print(f"Fixing submission {submission.submission_number}: {submission.status} -> APPROVED")
            submission.status = 'APPROVED'
            submission.save()
            fixed_approved += 1

    # Find all failed workflow instances
    failed_instances = WorkflowInstance.objects.filter(status='FAILED')
    fixed_rejected = 0

    for instance in failed_instances:
        submission = instance.submission
        if submission.status != 'REJECTED':
            print(f"Fixing submission {submission.submission_number}: {submission.status} -> REJECTED")
            submission.status = 'REJECTED'
            submission.save()
            fixed_rejected += 1

    print(f"\n=== Summary ===")
    print(f"Total COMPLETED workflows: {completed_instances.count()}")
    print(f"Total FAILED workflows: {failed_instances.count()}")
    print(f"Submissions fixed to APPROVED: {fixed_approved}")
    print(f"Submissions fixed to REJECTED: {fixed_rejected}")
    print("Done!")

if __name__ == '__main__':
    fix_submission_statuses()
