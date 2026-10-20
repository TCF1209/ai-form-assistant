"""
Small helpers that build test data. Used by the test modules of every app.
"""
from users.models import Department, User
from forms.models import Form, FormField, FormSubmission
from workflows.models import Workflow, WorkflowStep, WorkflowStepApprover

PASSWORD = 'Test-pass-123'


def make_department(name='IT'):
    return Department.objects.get_or_create(name=name, defaults={'code': name.upper()[:20]})[0]


def make_user(username, role='USER', department=None, **extra):
    return User.objects.create_user(
        username=username,
        email=f'{username}@example.com',
        password=PASSWORD,
        role=role,
        department=department,
        **extra,
    )


def make_form(department, name='Leave Request', code='LEAVE', file_field=False):
    form = Form.objects.create(name=name, code=code, department=department, status='ACTIVE')
    FormField.objects.create(form=form, name='reason', label='Reason', field_type='TEXT', order=0)
    FormField.objects.create(form=form, name='amount', label='Amount', field_type='NUMBER', order=1)
    if file_field:
        FormField.objects.create(form=form, name='receipt', label='Receipt', field_type='FILE', order=2)
    return form


def make_workflow(form, steps, workflow_type='SEQUENTIAL', **extra):
    """
    steps: list of (approval_mode, [approvers]) or dicts with WorkflowStep fields plus 'approvers'.
    """
    workflow = Workflow.objects.create(
        name=f'{form.name} approval',
        code=f'WF-{form.code}',
        form=form,
        workflow_type=workflow_type,
        status='ACTIVE',
        **extra,
    )
    for order, spec in enumerate(steps):
        if not isinstance(spec, dict):
            spec = {'approval_mode': spec[0], 'approvers': spec[1]}
        spec = dict(spec)
        approvers = spec.pop('approvers')
        step = WorkflowStep.objects.create(
            workflow=workflow, name=spec.pop('name', f'Step {order + 1}'), order=order, **spec
        )
        for position, approver in enumerate(approvers):
            WorkflowStepApprover.objects.create(workflow_step=step, user=approver, order=position)
    return workflow


def submit(form, user, data=None, status='SUBMITTED'):
    """Create a submission; the post_save signal starts the form's active workflow."""
    return FormSubmission.objects.create(form=form, submitted_by=user, status=status, data=data or {})
