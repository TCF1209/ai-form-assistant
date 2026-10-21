"""
Tests for the AI features. OpenAI is always mocked, so these run without an API key.
"""
from datetime import datetime, timezone as dt_timezone
from unittest import mock
from zoneinfo import ZoneInfo

from django.core.cache import cache
from django.test import SimpleTestCase
from rest_framework.test import APITestCase

from ai_integration.services import OpenAIService, parse_json_response
from ai_integration.views import date_reference, time_range_bounds
from core.factories import make_department, make_form, make_user, submit

KL = ZoneInfo('Asia/Kuala_Lumpur')


class ParseJsonResponseTests(SimpleTestCase):
    def test_plain_json(self):
        self.assertEqual(parse_json_response('{"a": 1}'), {'a': 1})

    def test_json_inside_a_markdown_fence(self):
        # Regression: form generation failed whenever the model wrapped its JSON in ```json
        self.assertEqual(parse_json_response('```json\n{"a": 1}\n```'), {'a': 1})
        self.assertEqual(parse_json_response('```\n{"a": 1}\n```'), {'a': 1})


class TimeRangeTests(SimpleTestCase):
    # Wednesday 21 January 2026, 11:00 in Kuala Lumpur
    now = datetime(2026, 1, 21, 3, 0, tzinfo=dt_timezone.utc)

    def test_today_starts_at_local_midnight(self):
        start, end = time_range_bounds('today', self.now)
        self.assertEqual(start, datetime(2026, 1, 21, tzinfo=KL))
        self.assertIsNone(end)

    def test_last_week_is_the_previous_monday_to_monday(self):
        # Regression: the range used to start and end at the current time of day.
        self.assertEqual(
            time_range_bounds('last_week', self.now),
            (datetime(2026, 1, 12, tzinfo=KL), datetime(2026, 1, 19, tzinfo=KL)),
        )

    def test_last_month_crosses_the_year_boundary(self):
        self.assertEqual(
            time_range_bounds('last_month', self.now),
            (datetime(2025, 12, 1, tzinfo=KL), datetime(2026, 1, 1, tzinfo=KL)),
        )

    def test_unknown_ranges_are_unbounded(self):
        self.assertEqual(time_range_bounds('someday', self.now), (None, None))


class DateReferenceTests(SimpleTestCase):
    def test_next_week_starts_on_the_coming_monday(self):
        text = date_reference(datetime(2026, 10, 21).date())  # a Wednesday
        self.assertIn('Yesterday: 2026-10-20 (Tuesday)', text)
        self.assertIn('Next week: 2026-10-26 (Monday) to 2026-11-01', text)


GENERATED_FORM = '''```json
{
  "title": "Leave Application Form",
  "description": "Request time off",
  "fields": [
    {"name": "leave_type", "label": "Leave Type", "type": "select", "required": true,
     "options": ["Annual", "Medical"]},
    {"name": "start_date", "label": "Start Date", "type": "date", "required": true}
  ]
}
```'''


class FormGenerationApiTests(APITestCase):
    url = '/api/v1/ai/form-generation/generate/'

    def setUp(self):
        cache.clear()
        self.finance = make_department('Finance')
        self.manager = make_user('fin_manager', role='MANAGER', department=self.finance)
        self.employee = make_user('employee', department=self.finance)

    @mock.patch.object(OpenAIService, '_make_api_call', return_value=GENERATED_FORM)
    def test_a_manager_generates_a_form_for_their_department(self, api_call):
        self.client.force_authenticate(self.manager)
        response = self.client.post(self.url, {
            'description': 'A leave form with leave type and start date',
            'department': 'HR',
        }, format='json')

        self.assertEqual(response.status_code, 200, response.data)
        form = response.data['form_data']
        self.assertEqual(form['title'], 'Leave Application Form')
        self.assertEqual([f['field_type'] for f in form['fields']], ['SELECT', 'DATE'])

        # A Form Manager's own department wins over the one in the request
        user_prompt = api_call.call_args.args[0][1]['content']
        self.assertIn('Finance', user_prompt)
        self.assertNotIn('"HR"', user_prompt)

    @mock.patch.object(OpenAIService, '_make_api_call')
    def test_gibberish_is_rejected_before_calling_the_model(self, api_call):
        self.client.force_authenticate(self.manager)
        response = self.client.post(self.url, {'description': 'qwrtpsdfghjkl zxcvbnm'}, format='json')
        self.assertEqual(response.status_code, 400)
        api_call.assert_not_called()

    def test_employees_cannot_generate_forms(self):
        self.client.force_authenticate(self.employee)
        response = self.client.post(self.url, {'description': 'A leave form with dates'}, format='json')
        self.assertEqual(response.status_code, 403)


COUNT_INTENT = {
    'query_type': 'count',
    'entity': 'submissions',
    'filters': {'status': None, 'form_type': None, 'department': None, 'time_range': None},
    'interpretation': 'Counting all submissions',
    'confidence': 0.9,
}


@mock.patch.object(OpenAIService, 'parse_analytics_intent', return_value=COUNT_INTENT)
class AnalyticsQueryApiTests(APITestCase):
    """The model only interprets the question; the numbers come from ORM queries scoped by role."""

    url = '/api/v1/ai/query/'

    def setUp(self):
        it, hr = make_department('IT'), make_department('HR')
        self.it_manager = make_user('it_manager', role='MANAGER', department=it)
        self.admin = make_user('admin', role='ADMIN')
        self.employee = make_user('employee', department=it)
        it_form = make_form(it, name='IT Request', code='ITR')
        hr_form = make_form(hr, name='HR Request', code='HRR')
        for _ in range(3):
            submit(it_form, self.employee)
        submit(hr_form, make_user('hr_employee', department=hr))

    def count_for(self, user):
        self.client.force_authenticate(user)
        response = self.client.post(self.url, {'query': 'How many submissions are there?'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        return response.data['data'][0]['value']

    def test_a_manager_only_counts_their_department(self, _):
        self.assertEqual(self.count_for(self.it_manager), 3)

    def test_an_admin_counts_every_department(self, _):
        self.assertEqual(self.count_for(self.admin), 4)

    def test_employees_cannot_query_analytics(self, _):
        self.client.force_authenticate(self.employee)
        self.assertEqual(self.client.post(self.url, {'query': 'How many?'}, format='json').status_code, 403)
