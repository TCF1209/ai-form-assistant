"""
Signal handlers for the forms app.
"""

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import FormSubmission


# Store the previous status to detect changes
_submission_status_cache = {}


@receiver(pre_save, sender=FormSubmission)
def cache_submission_status(sender, instance, **kwargs):
    """
    Cache the previous status before saving.
    """
    if instance.pk:
        try:
            old_instance = FormSubmission.objects.get(pk=instance.pk)
            _submission_status_cache[instance.pk] = old_instance.status
        except FormSubmission.DoesNotExist:
            pass


@receiver(post_save, sender=FormSubmission)
def start_workflow_on_submission(sender, instance, created, **kwargs):
    """
    Automatically start a workflow when a form submission is created or updated to SUBMITTED status.
    """
    # Only process if status is SUBMITTED
    if instance.status != FormSubmission.SubmissionStatus.SUBMITTED:
        return

    # Import here to avoid circular imports
    from workflows.models import Workflow, WorkflowInstance
    from workflows.engine import WorkflowEngine

    # Check if this is a new submission or status changed to SUBMITTED
    status_changed = False
    if not created and instance.pk in _submission_status_cache:
        old_status = _submission_status_cache.pop(instance.pk, None)
        status_changed = old_status != FormSubmission.SubmissionStatus.SUBMITTED

    # Start workflow if newly created as SUBMITTED or status changed to SUBMITTED
    if created or status_changed:
        # Find active workflow for this form
        active_workflow = Workflow.objects.filter(
            form=instance.form,
            status='ACTIVE'
        ).first()

        if active_workflow:
            # Check if workflow instance already exists
            existing_instance = WorkflowInstance.objects.filter(
                submission=instance,
                workflow=active_workflow
            ).exists()

            if not existing_instance:
                # Start the workflow
                engine = WorkflowEngine()
                workflow_instance = engine.start_workflow(instance, active_workflow)
                print(f"Started workflow '{active_workflow.name}' for submission {instance.submission_number}")