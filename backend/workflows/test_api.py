"""
API-level tests: who may change workflows, and that approval state only changes through the engine.
"""
from rest_framework.test import APITestCase

from core.factories import make_department, make_form, make_user, make_workflow, submit
from workflows.models import WorkflowApproval, WorkflowInstance


class WorkflowApiTestCase(APITestCase):
    def setUp(self):
        self.it = make_department('IT')
        self.hr = make_department('HR')
        self.submitter = make_user('submitter', department=self.it)
        self.alice = make_user('alice', department=self.it)
        self.bob = make_user('bob', department=self.it)
        self.manager = make_user('it_manager', role='MANAGER', department=self.it)
        self.hr_manager = make_user('hr_manager', role='MANAGER', department=self.hr)
        self.admin = make_user('admin', role='ADMIN')
        self.form = make_form(self.it)
        self.workflow = make_workflow(self.form, [('ALL', [self.alice])])
        self.submission = submit(self.form, self.submitter)
        self.instance = WorkflowInstance.objects.get(submission=self.submission)
        self.approval = WorkflowApproval.objects.get(workflow_instance=self.instance)

    def as_user(self, user):
        self.client.force_authenticate(user)
        return self.client


class ApprovalBypassTests(WorkflowApiTestCase):
    """Regression tests: these requests used to succeed and skip the approval process."""

    def test_submitter_cannot_set_their_own_submission_to_approved(self):
        response = self.as_user(self.submitter).patch(
            f'/api/v1/submissions/{self.submission.id}/', {'status': 'APPROVED'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.submission.refresh_from_db()
        self.assertEqual(self.submission.status, 'SUBMITTED')

    def test_workflow_instances_cannot_be_edited_through_the_api(self):
        response = self.as_user(self.submitter).patch(
            f'/api/v1/workflow-instances/{self.instance.id}/', {'status': 'COMPLETED'}, format='json')
        self.assertEqual(response.status_code, 405)

    def test_approval_tasks_cannot_be_edited_through_the_api(self):
        response = self.as_user(self.alice).patch(
            f'/api/v1/workflow-approvals/{self.approval.id}/', {'status': 'APPROVED'}, format='json')
        self.assertEqual(response.status_code, 405)

    def test_employees_cannot_change_workflows(self):
        client = self.as_user(self.alice)
        self.assertEqual(client.post(f'/api/v1/workflows/{self.workflow.id}/deactivate/').status_code, 403)
        self.assertEqual(client.delete(f'/api/v1/workflows/{self.workflow.id}/').status_code, 403)
        self.assertEqual(client.post('/api/v1/workflows/', {}, format='json').status_code, 403)

    def test_employees_cannot_create_forms(self):
        response = self.as_user(self.alice).post(
            '/api/v1/forms/', {'name': 'X', 'department': str(self.it.id)}, format='json')
        self.assertEqual(response.status_code, 403)


class ProcessApprovalTests(WorkflowApiTestCase):
    def process(self, user, **payload):
        return self.as_user(user).post(
            f'/api/v1/workflow-approvals/{self.approval.id}/process/', payload, format='json')

    def test_the_assigned_approver_approves_the_request(self):
        self.assertEqual(self.process(self.alice, action='approve').status_code, 200)
        self.submission.refresh_from_db()
        self.assertEqual(self.submission.status, 'APPROVED')

    def test_a_task_cannot_be_decided_twice(self):
        self.process(self.alice, action='approve')
        response = self.process(self.alice, action='reject')
        self.assertEqual(response.status_code, 400)

    def test_only_the_assigned_approver_can_decide(self):
        self.assertEqual(self.process(self.bob, action='approve').status_code, 404)

    def test_a_task_cannot_be_delegated_to_the_submitter(self):
        response = self.process(self.alice, action='delegate', delegate_to=str(self.submitter.id))
        self.assertEqual(response.status_code, 400)
        self.approval.refresh_from_db()
        self.assertEqual(self.approval.status, 'PENDING')

    def test_delegating_hands_the_task_to_another_employee(self):
        response = self.process(self.alice, action='delegate', delegate_to=str(self.bob.id))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(WorkflowApproval.objects.filter(assigned_to=self.bob, status='PENDING').exists())


class WorkflowEditingTests(WorkflowApiTestCase):
    def edit_steps(self, user, approvers):
        steps = [{'name': 'Review', 'step_type': 'APPROVAL', 'order': 0, 'approval_mode': 'ALL',
                  'approvers': [str(a.id) for a in approvers]}]
        return self.as_user(user).patch(f'/api/v1/workflows/{self.workflow.id}/', {'steps': steps}, format='json')

    def test_steps_cannot_change_while_requests_are_being_approved(self):
        response = self.edit_steps(self.manager, [self.bob])
        self.assertEqual(response.status_code, 400)

    def test_editing_steps_keeps_the_approval_history(self):
        # Regression: steps used to be deleted and recreated, which cascaded to every approval record.
        self.as_user(self.alice).post(
            f'/api/v1/workflow-approvals/{self.approval.id}/process/', {'action': 'approve'}, format='json')

        response = self.edit_steps(self.manager, [self.bob])
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(WorkflowApproval.objects.filter(pk=self.approval.pk, status='APPROVED').exists())
        self.assertEqual(self.workflow.steps.get().step_approvers.get().user, self.bob)

    def test_managers_only_see_workflows_of_their_department(self):
        response = self.as_user(self.hr_manager).post(f'/api/v1/workflow-instances/{self.instance.id}/cancel/')
        self.assertEqual(response.status_code, 404)

    def test_the_department_manager_can_cancel_a_running_request(self):
        response = self.as_user(self.manager).post(f'/api/v1/workflow-instances/{self.instance.id}/cancel/')
        self.assertEqual(response.status_code, 200)
        self.approval.refresh_from_db()
        self.assertEqual(self.approval.status, 'CANCELLED')
