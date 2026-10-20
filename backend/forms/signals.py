"""
Start the form's active workflow when a submission becomes SUBMITTED.

This is the single place that starts workflows for submissions, whether they come from the
API, the Smart Assistant or the demo seed command.
"""
import logging

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import FormSubmission

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=FormSubmission)
def remember_previous_status(sender, instance, **kwargs):
    instance._previous_status = (
        FormSubmission.objects.filter(pk=instance.pk).values_list('status', flat=True).first()
        if instance.pk else None
    )


@receiver(post_save, sender=FormSubmission)
def start_workflow_on_submission(sender, instance, created, **kwargs):
    if instance.status != FormSubmission.SubmissionStatus.SUBMITTED:
        return
    if not created and getattr(instance, '_previous_status', None) == FormSubmission.SubmissionStatus.SUBMITTED:
        return

    from workflows.engine import WorkflowEngine
    from workflows.models import Workflow, WorkflowInstance

    workflow = Workflow.objects.filter(form=instance.form, status='ACTIVE').first()
    if workflow is None or WorkflowInstance.objects.filter(submission=instance).exists():
        return

    WorkflowEngine().start_workflow(instance, workflow)
    logger.info("Started workflow '%s' for submission %s", workflow.name, instance.submission_number)
