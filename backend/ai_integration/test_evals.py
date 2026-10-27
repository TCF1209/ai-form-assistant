"""
Tests for the intent parser evaluation (manage.py eval_ai). The model is mocked, so these run
without an API key or network.
"""
import copy
import json
import os
import re
import tempfile
from io import StringIO
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, TestCase, override_settings
from openai.resources.chat.completions import Completions

from ai_integration.evals.intents import (
    FLAGS,
    load_cases,
    percentile,
    render_report,
    score_case,
    summarize,
    validate_cases,
)
from core.factories import make_department, make_form

# The forms and departments seed_demo creates
SEED_FORMS = {
    'LEAVE-REQ': ('Leave Request Form', 'HR Department'),
    'EXP-CLAIM': ('Expense Claim Form', 'Finance Department'),
    'IT-EQUIP': ('IT Equipment Request', 'IT Department'),
    'TRAIN-REQ': ('Training Request Form', 'HR Department'),
    'WFH-REQ': ('Work From Home Request', 'HR Department'),
}
SEED_DEPARTMENTS = ['IT Department', 'HR Department', 'Finance Department', 'Marketing Department',
                    'Operations Department']
CATALOG = {
    'filters.form_type': {code: (name, code) for code, (name, _) in SEED_FORMS.items()},
    'filters.department': {name: (name,) for name in SEED_DEPARTMENTS},
}

LEAVE_CASE = {
    'id': 'count-en-1',
    'language': 'en',
    'question': 'How many leave requests were approved last month?',
    'expected': {
        'query_type': 'count',
        'entity': 'submissions',
        'filters': {'status': ['APPROVED'], 'form_type': 'leave', 'department': None, 'time_range': 'last_month'},
    },
}
PENDING_CASE = {
    'id': 'list-en-9',
    'language': 'en',
    'question': 'List pending requests from Finance',
    'expected': {
        'query_type': 'list',
        'group_by': None,
        'filters': {'status': ['SUBMITTED', 'IN_REVIEW'], 'department': 'Finance', 'time_range': None},
    },
}


def model_intent(case, **changes):
    """What a model that gets the case right could return, with some fields changed."""
    intent = copy.deepcopy(case['expected'])
    intent.update({'visualization': 'number', 'interpretation': 'Counting', 'confidence': 0.9})
    filters = dict(intent.get('filters') or {})
    for key, value in changes.items():
        if key.startswith('filters.'):
            filters[key.split('.', 1)[1]] = value
        else:
            intent[key] = value
    intent['filters'] = filters
    return intent


def failed_fields(case, intent, catalog=CATALOG):
    result = score_case(case, intent, catalog)
    return sorted(field for field, outcome in result['fields'].items() if not outcome['ok'])


class ScoreCaseTests(SimpleTestCase):
    def test_a_correct_intent_passes(self):
        result = score_case(LEAVE_CASE, model_intent(LEAVE_CASE), CATALOG)
        self.assertTrue(result['passed'])
        # The listed fields plus every flag
        self.assertEqual(len(result['fields']), 6 + len(FLAGS))

    def test_status_is_read_like_the_backend(self):
        self.assertEqual(failed_fields(LEAVE_CASE, model_intent(LEAVE_CASE, **{'filters.status': 'APPROVED'})), [])
        reordered = model_intent(PENDING_CASE, **{'filters.status': ['IN_REVIEW', 'SUBMITTED']})
        self.assertEqual(failed_fields(PENDING_CASE, reordered), [])
        # The database comparison is case-sensitive, so lower case finds nothing
        lower = model_intent(LEAVE_CASE, **{'filters.status': ['approved']})
        self.assertEqual(failed_fields(LEAVE_CASE, lower), ['filters.status'])

    def test_an_empty_or_missing_filter_means_no_filter(self):
        case = {**LEAVE_CASE, 'expected': {'query_type': 'count', 'filters': {'status': None, 'department': None}}}
        self.assertEqual(failed_fields(case, {'query_type': 'count', 'filters': {'status': []}}), [])
        self.assertEqual(failed_fields(case, {'query_type': 'count', 'filters': None}), [])
        self.assertEqual(failed_fields(case, {'query_type': 'count'}), [])

    def test_names_count_when_they_select_the_same_form_or_department(self):
        for form_type in ['leave', 'Leave Request Form', 'LEAVE-REQ']:
            intent = model_intent(LEAVE_CASE, **{'filters.form_type': form_type})
            self.assertEqual(failed_fields(LEAVE_CASE, intent), [], form_type)
        for department in ['Finance', 'Finance Department', 'FIN']:
            intent = model_intent(PENDING_CASE, **{'filters.department': department})
            self.assertEqual(failed_fields(PENDING_CASE, intent), [], department)

    def test_a_name_that_selects_nothing_fails(self):
        intent = model_intent(LEAVE_CASE, **{'filters.form_type': 'leave_request'})
        self.assertEqual(failed_fields(LEAVE_CASE, intent), ['filters.form_type'])
        intent = model_intent(PENDING_CASE, **{'filters.department': 'Kewangan'})
        self.assertEqual(failed_fields(PENDING_CASE, intent), ['filters.department'])

    def test_without_a_catalog_names_compare_as_text(self):
        intent = model_intent(LEAVE_CASE, **{'filters.form_type': 'Leave'})
        self.assertEqual(failed_fields(LEAVE_CASE, intent, catalog=None), [])
        intent = model_intent(LEAVE_CASE, **{'filters.form_type': 'Leave Request Form'})
        self.assertEqual(failed_fields(LEAVE_CASE, intent, catalog=None), ['filters.form_type'])

    def test_a_time_range_the_backend_does_not_know_applies_no_filter(self):
        intent = model_intent(PENDING_CASE, **{'filters.time_range': 'all_time'})
        self.assertEqual(failed_fields(PENDING_CASE, intent), [])
        intent = model_intent(LEAVE_CASE, **{'filters.time_range': 'previous_month'})
        self.assertEqual(failed_fields(LEAVE_CASE, intent), ['filters.time_range'])

    def test_a_flag_on_an_analytics_question_fails(self):
        # The view would answer "Hello!" instead of running the query
        intent = model_intent(LEAVE_CASE, is_greeting=True)
        self.assertEqual(failed_fields(LEAVE_CASE, intent), ['is_greeting'])

    def test_a_group_by_on_a_submission_list_fails(self):
        # _execute_query turns a list with a group_by into a breakdown
        intent = model_intent(PENDING_CASE, group_by='department')
        self.assertEqual(failed_fields(PENDING_CASE, intent), ['group_by'])

    def test_fields_the_case_does_not_list_are_not_scored(self):
        intent = model_intent(LEAVE_CASE, group_by='status', aggregation='count', visualization='pie')
        self.assertTrue(score_case(LEAVE_CASE, intent, CATALOG)['passed'])

    def test_missing_entity_and_query_type_read_as_the_backend_defaults(self):
        case = {**LEAVE_CASE, 'expected': {'query_type': 'count', 'entity': 'submissions'}}
        self.assertEqual(failed_fields(case, {'query_type': 'count'}), [])
        self.assertEqual(failed_fields(case, {'entity': 'submissions'}), ['query_type'])


class DatasetTests(SimpleTestCase):
    def test_the_dataset_fits_the_seed_data(self):
        self.assertEqual(validate_cases(load_cases(), CATALOG), [])

    def test_the_dataset_covers_every_query_type_special_case_and_language(self):
        cases = load_cases()
        summary = summarize([{'case': c, 'passed': True, 'fields': {}} for c in cases])
        self.assertGreaterEqual(len(cases), 40)
        for name in ['count', 'list', 'trend', 'comparison', 'breakdown', 'average', 'greeting', 'help', 'gibberish']:
            self.assertGreaterEqual(summary['per_category'][name][1], 4, name)
        for language in ['en', 'zh', 'ms']:
            self.assertGreaterEqual(summary['per_language'][language][1], 10, language)

    def test_mistakes_in_the_dataset_are_reported(self):
        def case(case_id, **expected):
            return {'id': case_id, 'language': 'en', 'question': 'q', 'expected': expected}

        problems = validate_cases([
            case('a', query_type='count'),
            case('a', query_type='total'),
            case('b', filters={'department': 'Department'}),
            case('c', filters={'form_type': 'travel'}),
            case('d', filters={'status': ['PENDING']}),
            case('e', filters={'time_range': 'last_quarter'}),
            case('f', grouping='status'),
            {'id': 'g', 'language': 'fr', 'question': 'Bonjour', 'expected': {'is_greeting': True}},
        ], CATALOG)
        self.assertEqual(problems, [
            'a: duplicate id',
            "a: unknown query_type 'total'",
            "b: filters.department 'Department' matches 5 entries, not 1",
            "c: filters.form_type 'travel' matches 0 entries, not 1",
            "d: unknown status in ['PENDING']",
            "e: unknown time_range 'last_quarter'",
            'f: unknown field grouping',
            'g: language must be one of en, zh, ms, none',
        ])


def result(case, passed, latency, prompt_tokens=1000, completion_tokens=100, error=None):
    fields = {'query_type': {'expected': 'count', 'actual': 'count' if passed else 'list', 'ok': passed},
              'is_greeting': {'expected': False, 'actual': False, 'ok': True}}
    return {'case': case, 'passed': passed, 'fields': fields, 'latency': latency, 'error': error,
            'usage': {'prompt_tokens': prompt_tokens, 'completion_tokens': completion_tokens}}


class SummarizeTests(SimpleTestCase):
    def test_percentile_uses_the_nearest_rank(self):
        values = [0.9, 0.1, 0.5, 0.3, 0.7, 0.2, 0.4, 0.6, 0.8, 1.0]
        self.assertEqual(percentile(values, 50), 0.5)
        self.assertEqual(percentile(values, 95), 1.0)
        self.assertEqual(percentile([2.0], 95), 2.0)
        self.assertIsNone(percentile([], 50))

    def test_accuracy_is_counted_per_field_language_and_query_type(self):
        greeting = {'id': 'g', 'language': 'zh', 'question': '你好', 'expected': {'is_greeting': True}}
        malay = {**LEAVE_CASE, 'id': 'm', 'language': 'ms'}
        results = [
            result(LEAVE_CASE, True, 1.0),
            result(malay, False, 3.0, error='AI service unavailable'),
            result(greeting, True, 2.0),
        ]
        summary = summarize(results, price_per_1k=(0.15, 0.6))

        self.assertEqual((summary['passed'], summary['cases'], summary['errors']), (2, 3, 1))
        self.assertEqual(summary['per_field'], {'query_type': (2, 3), 'is_greeting': (3, 3)})
        self.assertEqual(summary['per_language'], {'en': (1, 1), 'zh': (1, 1), 'ms': (0, 1)})
        self.assertEqual(summary['per_category'], {'count': (1, 2), 'greeting': (1, 1)})
        self.assertEqual((summary['p50'], summary['p95']), (2.0, 3.0))
        self.assertEqual((summary['prompt_tokens'], summary['completion_tokens']), (3000, 300))
        self.assertAlmostEqual(summary['cost'], 3 * 0.15 + 0.3 * 0.6)

    def test_the_cost_is_left_out_without_prices(self):
        summary = summarize([result(LEAVE_CASE, True, 1.0)])
        self.assertIsNone(summary['cost'])
        self.assertIn('not estimated', render_report(summary, [], 'gpt-test', '2026-10-27'))


def chat_completion(content, prompt_tokens=1000, completion_tokens=50):
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))],
        usage=SimpleNamespace(prompt_tokens=prompt_tokens, completion_tokens=completion_tokens),
    )


@override_settings(OPENAI_API_KEY='test-key')
class EvalCommandTests(TestCase):
    """The whole command against the real dataset, with the chat completions API mocked."""

    def setUp(self):
        departments = {name: make_department(name) for name in SEED_DEPARTMENTS}
        for code, (name, department) in SEED_FORMS.items():
            make_form(departments[department], name=name, code=code)
        self.cases = {case['question']: case for case in load_cases()}

    def answer(self, **kwargs):
        """Answer each question correctly, except the approved leave count."""
        question = re.search(r'User query: "(.*)"', kwargs['messages'][1]['content']).group(1)
        case = self.cases[question]
        if case['id'] == 'count-en-1':
            return chat_completion(json.dumps(model_intent(case, **{'filters.form_type': 'leave_request'})))
        return chat_completion(json.dumps(model_intent(case)))

    def run_command(self, *args):
        out = StringIO()
        with mock.patch.object(Completions, 'create', side_effect=self.answer) as create:
            call_command('eval_ai', *args, stdout=out)
        return out.getvalue(), create

    def test_the_report_has_the_accuracy_cost_and_failures(self):
        with tempfile.TemporaryDirectory() as folder:
            report_path = Path(folder) / 'report.md'
            output, create = self.run_command('--model', 'gpt-test', '--output', str(report_path),
                                              '--price-per-1k', '0.15', '0.6')
            report = report_path.read_text(encoding='utf-8')

        total = len(self.cases)
        self.assertEqual(create.call_count, total)
        self.assertEqual({call.kwargs['model'] for call in create.call_args_list}, {'gpt-test'})
        # The prompt carries the same context the analytics endpoint builds
        self.assertIn('"Leave Request Form"', create.call_args.kwargs['messages'][1]['content'])
        self.assertIn('User role: ADMIN', create.call_args.kwargs['messages'][1]['content'])

        self.assertIn(f'Exact-intent accuracy: {total - 1}/{total}', output)
        self.assertIn(f'**Exact-intent accuracy: {total - 1}/{total}', report)
        self.assertIn('| count | 6/7 (86%) |', report)
        self.assertIn('## Failed cases (1)', report)
        self.assertIn('- `filters.form_type`: expected "leave", got "leave_request"', report)
        cost = total * 1000 / 1000 * 0.15 + total * 50 / 1000 * 0.6
        self.assertIn(f'${cost:.4f}', report)

    def test_limit_runs_the_first_questions_only(self):
        output, create = self.run_command('--limit', '3')
        self.assertEqual(create.call_count, 3)
        self.assertIn('Exact-intent accuracy: 2/3', output)

    def test_a_database_without_the_seed_forms_is_refused(self):
        from forms.models import Form
        Form.objects.filter(code='WFH-REQ').delete()
        with self.assertRaisesMessage(CommandError, "list-ms-2: filters.form_type 'WFH' matches 0 entries"):
            self.run_command()

    @override_settings(OPENAI_API_KEY='')
    def test_it_needs_an_api_key(self):
        with mock.patch.dict(os.environ, {'OPENAI_API_KEY': ''}):
            with self.assertRaisesMessage(CommandError, 'OPENAI_API_KEY'):
                call_command('eval_ai', stdout=StringIO())
