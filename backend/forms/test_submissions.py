"""
Tests for submitting forms: attachments, allowed status changes, deletion and manual decisions.
"""
import json
import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from core.factories import make_department, make_form, make_user, make_workflow, submit
from forms.models import FormFile, FormSubmission
from workflows.models import WorkflowInstance

MEDIA_ROOT = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=MEDIA_ROOT)
class SubmissionTestCase(APITestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(MEDIA_ROOT, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.dept = make_department('Finance')
        self.employee = make_user('employee', department=self.dept)
        self.colleague = make_user('colleague', department=self.dept)
        self.manager = make_user('fin_manager', role='MANAGER', department=self.dept)
        self.form = make_form(self.dept, name='Expense Claim', code='EXP', file_field=True)
        self.client.force_authenticate(self.employee)

    def post_submission(self, files=None, status='SUBMITTED', **data):
        payload = {'form': str(self.form.id), 'status': status, 'data': json.dumps(data or {'reason': 'Taxi'})}
        payload.update(files or {})
        return self.client.post('/api/v1/submissions/', payload, format='multipart')


class AttachmentTests(SubmissionTestCase):
    def test_an_attachment_is_stored_with_its_metadata(self):
        # Regression: saving any attachment raised TypeError (FormFile has no field_name).
        receipt = SimpleUploadedFile('receipt.pdf', b'%PDF-1.4 test', content_type='application/pdf')
        response = self.post_submission({'receipt': receipt})
        self.assertEqual(response.status_code, 201, response.data)

        stored = FormFile.objects.get()
        self.assertEqual((stored.field.name, stored.original_name, stored.file_size, stored.mime_type),
                         ('receipt', 'receipt.pdf', 13, 'application/pdf'))

        detail = self.client.get(f"/api/v1/submissions/{response.data['id']}/").data
        self.assertEqual(detail['files'][0]['file_name'], 'receipt.pdf')

    def test_a_file_type_that_is_not_allowed_is_refused_and_nothing_is_saved(self):
        script = SimpleUploadedFile('run.exe', b'MZ', content_type='application/octet-stream')
        response = self.post_submission({'receipt': script})
        self.assertEqual(response.status_code, 400)
        self.assertIn('receipt', response.data)
        self.assertFalse(FormSubmission.objects.exists())

    @override_settings(MAX_UPLOAD_SIZE=10)
    def test_a_file_over_the_size_limit_is_refused(self):
        big = SimpleUploadedFile('big.pdf', b'x' * 11, content_type='application/pdf')
        self.assertEqual(self.post_submission({'receipt': big}).status_code, 400)

    def test_a_file_for_a_field_the_form_does_not_have_is_refused(self):
        stray = SimpleUploadedFile('a.pdf', b'x', content_type='application/pdf')
        self.assertEqual(self.post_submission({'photo': stray}).status_code, 400)


class StatusTests(SubmissionTestCase):
    def test_a_new_submission_can_only_be_a_draft_or_submitted(self):
        self.assertEqual(self.post_submission(status='APPROVED').status_code, 400)

    def test_inactive_forms_do_not_accept_submissions(self):
        self.form.status = 'INACTIVE'
        self.form.save()
        self.assertEqual(self.post_submission().status_code, 400)

    def test_submitting_a_draft_starts_the_workflow(self):
        make_workflow(self.form, [('ALL', [self.colleague])])
        draft = submit(self.form, self.employee, status='DRAFT')

        response = self.client.put(f'/api/v1/submissions/{draft.id}/', {
            'form': str(self.form.id), 'status': 'SUBMITTED', 'data': {'reason': 'Hotel'}}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(WorkflowInstance.objects.filter(submission=draft).exists())

    def test_a_submitted_request_can_no_longer_be_edited(self):
        submission = submit(self.form, self.employee)
        response = self.client.patch(
            f'/api/v1/submissions/{submission.id}/', {'data': {'reason': 'Changed'}}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_submission_numbers_stay_unique_within_the_same_second(self):
        numbers = {submit(self.form, self.employee).submission_number for _ in range(20)}
        self.assertEqual(len(numbers), 20)


class DeletionTests(SubmissionTestCase):
    def test_an_employee_can_discard_their_draft(self):
        draft = submit(self.form, self.employee, status='DRAFT')
        self.assertEqual(self.client.delete(f'/api/v1/submissions/{draft.id}/').status_code, 204)

    def test_submitted_requests_cannot_be_deleted(self):
        submission = submit(self.form, self.employee)
        self.assertEqual(self.client.delete(f'/api/v1/submissions/{submission.id}/').status_code, 400)

    def test_a_manager_cannot_delete_an_employees_request(self):
        submission = submit(self.form, self.employee)
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.delete(f'/api/v1/submissions/{submission.id}/').status_code, 403)


class ManualDecisionTests(SubmissionTestCase):
    def test_a_manager_decides_requests_of_forms_without_a_workflow(self):
        submission = submit(self.form, self.employee)
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.post(f'/api/v1/submissions/{submission.id}/approve/').status_code, 200)
        submission.refresh_from_db()
        self.assertEqual(submission.status, 'APPROVED')

    def test_a_manager_cannot_bypass_a_running_workflow(self):
        make_workflow(self.form, [('ALL', [self.colleague])])
        submission = submit(self.form, self.employee)
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.post(f'/api/v1/submissions/{submission.id}/approve/').status_code, 400)

    def test_withdrawing_cancels_the_open_approval_tasks(self):
        make_workflow(self.form, [('ALL', [self.colleague])])
        submission = submit(self.form, self.employee)
        response = self.client.post(f'/api/v1/submissions/{submission.id}/withdraw/', {'reason': 'Typo'})
        self.assertEqual(response.status_code, 200)

        instance = WorkflowInstance.objects.get(submission=submission)
        submission.refresh_from_db()
        self.assertEqual((submission.status, instance.status), ('WITHDRAWN', 'CANCELLED'))
        self.assertEqual(instance.approvals.get().status, 'CANCELLED')
