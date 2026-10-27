"""
Measure how accurately the analytics intent parser understands a labelled set of questions.

    python manage.py eval_ai                                   # print the results
    python manage.py eval_ai --output docs/ai-evaluation.md    # also write the report
    python manage.py eval_ai --model gpt-4o --limit 10 --price-per-1k 0.0025 0.01

Calls the OpenAI API once per question, so it needs OPENAI_API_KEY and a seeded database
(python manage.py seed_demo): the departments and forms are part of the prompt.
"""
import time
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from ai_integration.evals.intents import (
    DATASET,
    load_cases,
    rate,
    render_report,
    score_case,
    summarize,
    validate_cases,
)
from ai_integration.services import OpenAIService
from ai_integration.views import NaturalLanguageQueryView
from forms.models import Form
from users.models import Department


def build_catalog():
    """What the backend's icontains filters can select: forms by name or code, departments by name."""
    return {
        'filters.form_type': {code: (name, code) for name, code in Form.objects.values_list('name', 'code')},
        'filters.department': {name: (name,) for name in Department.objects.values_list('name', flat=True)},
    }


def record_usage(service):
    """Keep the token usage of each call, which _make_api_call does not return."""
    calls = []
    create = service.client.chat.completions.create

    def create_and_record(*args, **kwargs):
        response = create(*args, **kwargs)
        calls.append(response.usage)
        return response

    service.client.chat.completions.create = create_and_record
    return calls


class Command(BaseCommand):
    help = 'Measure how accurately the analytics intent parser understands a labelled set of questions.'

    def add_arguments(self, parser):
        parser.add_argument('--model', help='OpenAI model to test (default: settings.OPENAI_MODEL).')
        parser.add_argument('--limit', type=int, help='Only run the first N questions.')
        parser.add_argument('--output', help='Also write a Markdown report here. A relative path is taken '
                                             'from the repository root, e.g. docs/ai-evaluation.md.')
        parser.add_argument('--price-per-1k', nargs=2, type=float, metavar=('INPUT', 'OUTPUT'),
                            help='USD per 1,000 prompt and completion tokens, to estimate the cost.')
        parser.add_argument('--dataset', default=str(DATASET), help='Labelled questions (JSON).')

    def handle(self, *args, **options):
        service = OpenAIService()
        if not service.client:
            raise CommandError('The OpenAI client is not configured: set OPENAI_API_KEY in backend/.env.')
        service.model = options['model'] or settings.OPENAI_MODEL
        usage = record_usage(service)

        cases = load_cases(options['dataset'])
        catalog = build_catalog()
        problems = validate_cases(cases, catalog)
        if problems:
            raise CommandError('The dataset does not fit this database (run seed_demo?):\n' + '\n'.join(problems))
        if options['limit']:
            cases = cases[:options['limit']]
        if not cases:
            raise CommandError('No questions to run.')

        # The context an admin gets from the analytics endpoint
        context = NaturalLanguageQueryView()._build_context('ADMIN', None)

        results = []
        for number, case in enumerate(cases, 1):
            usage.clear()
            started = time.perf_counter()
            intent = service.parse_analytics_intent(case['question'], context)
            latency = time.perf_counter() - started
            result = {
                'case': case,
                'intent': intent,
                'latency': latency,
                'usage': {
                    'prompt_tokens': sum(u.prompt_tokens for u in usage if u),
                    'completion_tokens': sum(u.completion_tokens for u in usage if u),
                },
                'error': intent.get('error'),
                **score_case(case, intent, catalog),
            }
            results.append(result)
            outcome = 'ok  ' if result['passed'] else 'FAIL'
            self.stdout.write(f'{number:>3}/{len(cases)} {outcome} {case["id"]:<18} {latency:5.2f}s  {case["question"]}')

        summary = summarize(results, options['price_per_1k'])
        self.stdout.write('')
        self.stdout.write(f'Exact-intent accuracy: {rate((summary["passed"], summary["cases"]))} with {service.model}')
        for name, counts in summary['per_category'].items():
            self.stdout.write(f'  {name:<11} {rate(counts)}')
        self.stdout.write(f'Latency p50 {summary["p50"]:.2f}s, p95 {summary["p95"]:.2f}s, max {summary["max"]:.2f}s; '
                          f'tokens {summary["prompt_tokens"]:,} prompt / {summary["completion_tokens"]:,} completion'
                          + (f'; about ${summary["cost"]:.4f}' if summary['cost'] is not None else ''))

        if options['output']:
            path = Path(options['output'])
            if not path.is_absolute():
                path = Path(settings.BASE_DIR).parent / path
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(render_report(summary, results, service.model, timezone.localdate().isoformat()),
                            encoding='utf-8')
            self.stdout.write(f'Report written to {path}')
