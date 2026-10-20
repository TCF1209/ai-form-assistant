"""
Tests for the workflow engine: step approval modes, workflow types, self-approval handling,
delegation, and the guarantees that late votes cannot change a decided outcome.
"""
from django.test import TestCase

from core.factories import make_department, make_form, make_user, make_workflow, submit
from workflows.engine import WorkflowEngine, WorkflowError
from workflows.models import WorkflowApproval, WorkflowInstance, WorkflowNotification


class EngineTestCase(TestCase):
    def setUp(self):
        self.dept = make_department('IT')
        self.submitter = make_user('submitter', department=self.dept)
        self.alice = make_user('alice', department=self.dept)
        self.bob = make_user('bob', department=self.dept)
        self.carol = make_user('carol', department=self.dept)
        self.admin = make_user('admin', role='ADMIN')
        self.form = make_form(self.dept)
        self.engine = WorkflowEngine()

    def start(self, steps, data=None, **workflow_options):
        make_workflow(self.form, steps, **workflow_options)
        submission = submit(self.form, self.submitter, data=data)
        return WorkflowInstance.objects.get(submission=submission)

    def task(self, instance, user, status='PENDING'):
        return WorkflowApproval.objects.get(workflow_instance=instance, assigned_to=user, status=status)

    def tasks(self, instance, **filters):
        return WorkflowApproval.objects.filter(workflow_instance=instance, **filters)

    def assertFinished(self, instance, instance_status, submission_status):
        instance.refresh_from_db()
        instance.submission.refresh_from_db()
        self.assertEqual(instance.status, instance_status)
        self.assertEqual(instance.submission.status, submission_status)
        self.assertFalse(self.tasks(instance, status='PENDING').exists())


class SequentialWorkflowTests(EngineTestCase):
    def test_steps_run_in_order_and_the_last_approval_completes_the_request(self):
        instance = self.start([('ALL', [self.alice]), ('ALL', [self.bob])])
        self.assertEqual(list(self.tasks(instance).values_list('assigned_to__username', flat=True)), ['alice'])

        self.engine.approve_step(self.task(instance, self.alice), self.alice)
        self.assertTrue(self.tasks(instance, assigned_to=self.bob, status='PENDING').exists())

        self.engine.approve_step(self.task(instance, self.bob), self.bob)
        self.assertFinished(instance, 'COMPLETED', 'APPROVED')
        self.assertTrue(WorkflowNotification.objects.filter(
            recipient=self.submitter, notification_type='COMPLETED').exists())

    def test_a_rejection_rejects_the_request_and_notifies_the_submitter(self):
        instance = self.start([('ALL', [self.alice]), ('ALL', [self.bob])])
        self.engine.reject_step(self.task(instance, self.alice), self.alice, 'Not enough detail')

        self.assertFinished(instance, 'FAILED', 'REJECTED')
        self.assertFalse(self.tasks(instance, assigned_to=self.bob).exists())
        self.assertTrue(WorkflowNotification.objects.filter(
            recipient=self.submitter, notification_type='REJECTED').exists())

    def test_a_skippable_step_can_be_rejected_without_failing_the_workflow(self):
        instance = self.start([
            {'approval_mode': 'ALL', 'approvers': [self.alice], 'can_skip': True},
            ('ALL', [self.bob]),
        ])
        self.engine.reject_step(self.task(instance, self.alice), self.alice)
        self.engine.approve_step(self.task(instance, self.bob), self.bob)
        self.assertFinished(instance, 'COMPLETED', 'APPROVED')

    def test_a_workflow_without_steps_approves_immediately(self):
        instance = self.start([])
        self.assertFinished(instance, 'COMPLETED', 'APPROVED')


class ApprovalModeTests(EngineTestCase):
    def test_any_mode_closes_the_other_tasks_once_one_approver_approves(self):
        instance = self.start([('ANY', [self.alice, self.bob]), ('ALL', [self.carol])])
        self.engine.approve_step(self.task(instance, self.alice), self.alice)

        self.assertEqual(self.tasks(instance, assigned_to=self.bob).get().status, 'SKIPPED')
        self.assertEqual(self.tasks(instance, assigned_to=self.carol).count(), 1)

    def test_a_late_vote_is_refused_and_does_not_create_tasks_again(self):
        # Regression: a second approver acting after the step passed used to re-run the
        # progression and create a duplicate task for the next step.
        instance = self.start([('ANY', [self.alice, self.bob]), ('ALL', [self.carol])])
        late = self.task(instance, self.bob)
        self.engine.approve_step(self.task(instance, self.alice), self.alice)

        with self.assertRaises(WorkflowError):
            self.engine.reject_step(late, self.bob)
        self.assertEqual(self.tasks(instance, assigned_to=self.carol).count(), 1)

    def test_any_mode_rejects_only_when_everyone_rejects(self):
        instance = self.start([('ANY', [self.alice, self.bob])])
        self.engine.reject_step(self.task(instance, self.alice), self.alice)
        instance.refresh_from_db()
        self.assertEqual(instance.status, 'IN_PROGRESS')

        self.engine.reject_step(self.task(instance, self.bob), self.bob)
        self.assertFinished(instance, 'FAILED', 'REJECTED')

    def test_majority_mode_passes_with_more_than_half(self):
        instance = self.start([('MAJORITY', [self.alice, self.bob, self.carol])])
        self.engine.approve_step(self.task(instance, self.alice), self.alice)
        self.engine.approve_step(self.task(instance, self.bob), self.bob)
        self.assertFinished(instance, 'COMPLETED', 'APPROVED')
        self.assertEqual(self.tasks(instance, assigned_to=self.carol).get().status, 'SKIPPED')

    def test_majority_mode_rejects_on_a_tie(self):
        instance = self.start([('MAJORITY', [self.alice, self.bob])])
        self.engine.approve_step(self.task(instance, self.alice), self.alice)
        self.engine.reject_step(self.task(instance, self.bob), self.bob)
        self.assertFinished(instance, 'FAILED', 'REJECTED')

    def test_all_mode_still_completes_after_a_delegation(self):
        # Regression: the DELEGATED record used to count as a vote, so ALL could never be reached.
        instance = self.start([('ALL', [self.alice, self.bob])])
        delegated = self.task(instance, self.alice).delegate(self.alice, self.carol)

        self.engine.approve_step(delegated, self.carol)
        self.engine.approve_step(self.task(instance, self.bob), self.bob)
        self.assertFinished(instance, 'COMPLETED', 'APPROVED')


class ParallelWorkflowTests(EngineTestCase):
    def test_a_rejected_request_cannot_be_approved_by_a_later_vote(self):
        # Regression: after one step rejected the request, approving another step flipped
        # the submission to APPROVED.
        instance = self.start(
            [('ALL', [self.alice]), ('ALL', [self.bob])], workflow_type='PARALLEL', approval_threshold=100
        )
        late = self.task(instance, self.bob)
        self.engine.reject_step(self.task(instance, self.alice), self.alice)
        self.assertFinished(instance, 'FAILED', 'REJECTED')

        with self.assertRaises(WorkflowError):
            self.engine.approve_step(late, self.bob)
        self.assertFinished(instance, 'FAILED', 'REJECTED')

    def test_threshold_waits_while_it_can_still_be_reached(self):
        instance = self.start(
            [('ALL', [self.alice]), ('ALL', [self.bob])], workflow_type='PARALLEL', approval_threshold=50
        )
        self.engine.reject_step(self.task(instance, self.alice), self.alice)
        instance.refresh_from_db()
        self.assertEqual(instance.status, 'IN_PROGRESS')

        self.engine.approve_step(self.task(instance, self.bob), self.bob)
        self.assertFinished(instance, 'COMPLETED', 'APPROVED')

    def test_all_steps_start_at_once(self):
        instance = self.start([('ALL', [self.alice]), ('ALL', [self.bob])], workflow_type='PARALLEL')
        self.assertEqual(self.tasks(instance, status='PENDING').count(), 2)


class ConditionalWorkflowTests(EngineTestCase):
    def steps(self):
        large_amount = {'logic': 'AND', 'rules': [{'field': 'amount', 'operator': 'gt', 'value': 1000}]}
        return [
            ('ALL', [self.alice]),
            {'approval_mode': 'ALL', 'approvers': [self.bob], 'conditions': large_amount},
        ]

    def test_a_step_whose_condition_does_not_match_is_skipped(self):
        instance = self.start(self.steps(), data={'amount': '500'}, workflow_type='CONDITIONAL')
        self.engine.approve_step(self.task(instance, self.alice), self.alice)
        self.assertFinished(instance, 'COMPLETED', 'APPROVED')
        self.assertFalse(self.tasks(instance, assigned_to=self.bob).exists())

    def test_numbers_typed_as_text_are_compared_as_numbers(self):
        instance = self.start(self.steps(), data={'amount': '1500'}, workflow_type='CONDITIONAL')
        self.engine.approve_step(self.task(instance, self.alice), self.alice)
        self.assertTrue(self.tasks(instance, assigned_to=self.bob, status='PENDING').exists())


class SelfApprovalTests(EngineTestCase):
    def test_the_submitter_is_never_assigned_their_own_request(self):
        instance = self.start([('ALL', [self.submitter, self.alice])])
        self.assertEqual(list(self.tasks(instance).values_list('assigned_to__username', flat=True)), ['alice'])
        self.assertEqual(instance.context_data['exclusions'][0]['reason'], 'self_approval')

    def test_an_admin_takes_over_when_no_one_else_can_approve(self):
        instance = self.start([('ALL', [self.submitter])])
        self.assertEqual(instance.status, 'NEEDS_ADMIN_ACTION')
        self.assertEqual(self.tasks(instance).get().assigned_to, self.admin)

        self.engine.decide_as_admin(instance, self.admin, approve=True)
        self.assertFinished(instance, 'COMPLETED', 'APPROVED')

    def test_the_workflow_returns_to_in_progress_when_a_later_step_has_approvers(self):
        instance = self.start([('ALL', [self.submitter]), ('ALL', [self.alice])])
        self.engine.decide_as_admin(instance, self.admin, approve=True)
        instance.refresh_from_db()
        self.assertEqual(instance.status, 'IN_PROGRESS')
        self.assertTrue(self.tasks(instance, assigned_to=self.alice, status='PENDING').exists())


class CancelTests(EngineTestCase):
    def test_cancelling_closes_open_tasks(self):
        instance = self.start([('ALL', [self.alice, self.bob])])
        self.engine.cancel(instance, self.admin, 'No longer needed')

        instance.refresh_from_db()
        self.assertEqual(instance.status, 'CANCELLED')
        self.assertEqual(set(self.tasks(instance).values_list('status', flat=True)), {'CANCELLED'})
        self.assertEqual(instance.submission.status, 'CANCELLED')

        with self.assertRaises(WorkflowError):
            self.engine.approve_step(self.tasks(instance).first(), self.alice)
