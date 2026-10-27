"""
Score the analytics intent parser against labelled questions (analytics_intents.json).

Each field is read the way NaturalLanguageQueryView._execute_query reads it before comparing,
so two intents count as equal when they make the backend run the same query: a status given
as a string or a list, a missing filters object, or "Finance Department" for "Finance" are
not counted as mistakes, while a form type that matches no form is.
"""
import json
import math
from collections import defaultdict
from datetime import datetime, timezone as dt_timezone
from pathlib import Path

from ai_integration.views import time_range_bounds

DATASET = Path(__file__).with_name('analytics_intents.json')

LANGUAGES = ('en', 'zh', 'ms', 'none')
QUERY_TYPES = ('count', 'list', 'trend', 'comparison', 'breakdown', 'average', 'overview')
STATUSES = ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED')

# The view answers any of these with canned text before running a query, so a flag the case
# does not set is expected to be false.
FLAGS = {
    'is_greeting': 'greeting',
    'is_help_request': 'help',
    'is_casual_message': 'casual',
    'is_gibberish': 'gibberish',
}
FILTERS = ('status', 'form_type', 'department', 'time_range')
FIELDS = ('query_type', 'entity', 'group_by', *(f'filters.{name}' for name in FILTERS), *FLAGS)

# Fields matched with icontains in _execute_query, scored by what they select in the catalog
CATALOG_FIELDS = ('filters.form_type', 'filters.department')

_ANY_TIME = datetime(2026, 1, 1, tzinfo=dt_timezone.utc)


def load_cases(path=DATASET):
    with open(path, encoding='utf-8') as f:
        return json.load(f)['cases']


def expected_fields(case):
    """The case's expected values as flat field names, with unset flags filled in as false."""
    fields = dict.fromkeys(FLAGS, False)
    for key, value in case['expected'].items():
        if key == 'filters':
            fields.update({f'filters.{name}': v for name, v in value.items()})
        else:
            fields[key] = value
    return fields


def category(case):
    """The expected query_type, or which canned reply the case expects."""
    expected = case['expected']
    for flag, name in FLAGS.items():
        if expected.get(flag):
            return name
    return expected.get('query_type', 'overview')


def read_field(intent, field):
    if field.startswith('filters.'):
        filters = intent.get('filters')
        return filters.get(field.split('.', 1)[1]) if isinstance(filters, dict) else None
    return intent.get(field)


def matches(value, catalog_entries):
    """Catalog labels whose names contain value, ignoring case, as icontains does."""
    needle = value.lower()
    return frozenset(label for label, names in catalog_entries.items() if any(needle in n.lower() for n in names))


def normalize(field, value, catalog=None):
    """
    The value as _execute_query acts on it. catalog maps 'filters.form_type' and
    'filters.department' to {label: names searched}; without it those compare as text.
    """
    if field in FLAGS:
        return bool(value)
    if field == 'query_type':
        return value or 'overview'
    if field == 'entity':
        return value or 'submissions'
    if field == 'group_by':
        return value or None
    if field == 'filters.status':
        if isinstance(value, str):
            value = [value]
        return frozenset(str(v) for v in value) if value and isinstance(value, list) else None
    if field == 'filters.time_range':
        # Names time_range_bounds does not know apply no filter
        return value if isinstance(value, str) and time_range_bounds(value, _ANY_TIME) != (None, None) else None
    if field in CATALOG_FIELDS:
        if not value or not isinstance(value, str):
            return None
        if catalog and field in catalog:
            return matches(value, catalog[field])
        return value.strip().lower()
    raise ValueError(f'Unknown field: {field}')


def score_case(case, intent, catalog=None):
    """
    Compare a parsed intent with a labelled case. The case passes when every field it lists
    (plus the flags) matches after normalising.
    """
    fields = {}
    for field, want in expected_fields(case).items():
        got = read_field(intent, field)
        fields[field] = {
            'expected': want,
            'actual': got,
            'ok': normalize(field, want, catalog) == normalize(field, got, catalog),
        }
    return {'passed': all(f['ok'] for f in fields.values()), 'fields': fields}


def validate_cases(cases, catalog=None):
    """Problems with the dataset itself, so a typo is not reported as a model mistake."""
    problems = []
    seen = set()
    for case in cases:
        case_id = case.get('id')
        if case_id in seen:
            problems.append(f'{case_id}: duplicate id')
        seen.add(case_id)
        if case.get('language') not in LANGUAGES:
            problems.append(f'{case_id}: language must be one of {", ".join(LANGUAGES)}')
        if not case.get('question'):
            problems.append(f'{case_id}: no question')
        for field, value in expected_fields(case).items():
            if field not in FIELDS:
                problems.append(f'{case_id}: unknown field {field}')
            elif field == 'query_type' and value not in QUERY_TYPES:
                problems.append(f'{case_id}: unknown query_type {value!r}')
            elif field == 'filters.status' and value is not None and not set(value) <= set(STATUSES):
                problems.append(f'{case_id}: unknown status in {value!r}')
            elif field == 'filters.time_range' and value is not None and normalize(field, value) is None:
                problems.append(f'{case_id}: unknown time_range {value!r}')
            elif field in CATALOG_FIELDS and value is not None and catalog and field in catalog:
                found = matches(value, catalog[field])
                if len(found) != 1:
                    problems.append(f'{case_id}: {field} {value!r} matches {len(found)} entries, not 1')
    return problems


def percentile(values, p):
    """Nearest-rank percentile; None for no values."""
    if not values:
        return None
    ordered = sorted(values)
    return ordered[max(0, math.ceil(p / 100 * len(ordered)) - 1)]


def summarize(results, price_per_1k=None):
    """
    Aggregate scored results. Each result has 'case', 'passed', 'fields', 'latency' (seconds),
    'usage' ({'prompt_tokens', 'completion_tokens'} or None) and 'error'.
    price_per_1k is (input, output) USD per 1,000 tokens, or None to skip the cost.
    """
    def tally(key):
        groups = defaultdict(lambda: [0, 0])
        for result in results:
            group = groups[key(result)]
            group[0] += result['passed']
            group[1] += 1
        return {name: tuple(counts) for name, counts in groups.items()}

    per_field = defaultdict(lambda: [0, 0])
    for result in results:
        for field, outcome in result['fields'].items():
            per_field[field][0] += outcome['ok']
            per_field[field][1] += 1

    latencies = [r['latency'] for r in results if r.get('latency') is not None]
    prompt_tokens = sum((r.get('usage') or {}).get('prompt_tokens', 0) for r in results)
    completion_tokens = sum((r.get('usage') or {}).get('completion_tokens', 0) for r in results)
    cost = None
    if price_per_1k:
        cost = prompt_tokens / 1000 * price_per_1k[0] + completion_tokens / 1000 * price_per_1k[1]

    return {
        'cases': len(results),
        'passed': sum(r['passed'] for r in results),
        'errors': sum(1 for r in results if r.get('error')),
        'per_field': {f: tuple(per_field[f]) for f in FIELDS if f in per_field},
        'per_language': {lang: counts for lang, counts in sorted(tally(lambda r: r['case']['language']).items(),
                                                                  key=lambda item: LANGUAGES.index(item[0]))},
        'per_category': tally(lambda r: category(r['case'])),
        'p50': percentile(latencies, 50),
        'p95': percentile(latencies, 95),
        'max': max(latencies, default=None),
        'prompt_tokens': prompt_tokens,
        'completion_tokens': completion_tokens,
        'price_per_1k': price_per_1k,
        'cost': cost,
    }


def show(value):
    if value is None:
        return 'null'
    return json.dumps(value, ensure_ascii=False)


def rate(counts):
    passed, total = counts
    return f'{passed}/{total} ({passed / total:.0%})' if total else '-'


def render_report(summary, results, model, run_date):
    """The Markdown report written by `manage.py eval_ai --output`."""
    lines = [
        '# AI evaluation: analytics intent parser',
        '',
        f'Generated by `python manage.py eval_ai` on {run_date} with `{model}`. '
        'Do not edit by hand; re-run the command instead.',
        '',
        'Each question in [`analytics_intents.json`](../backend/ai_integration/evals/analytics_intents.json) '
        'goes through `OpenAIService.parse_analytics_intent`, the same call and prompt the analytics '
        'endpoint uses, with the context an admin gets. Every field the case lists is compared after '
        'reading it the way `_execute_query` does (a status string or list, a form or department '
        'name the backend matches with `icontains`). A case counts as correct only if all its fields '
        'match.',
        '',
        f'**Exact-intent accuracy: {rate((summary["passed"], summary["cases"]))}**',
        '',
        '| Measure | Value |',
        '|---|---|',
        f'| Latency p50 / p95 / max | {summary["p50"]:.2f} s / {summary["p95"]:.2f} s / {summary["max"]:.2f} s |'
        if summary['p50'] is not None else '| Latency p50 / p95 / max | - |',
        f'| Tokens (prompt / completion) | {summary["prompt_tokens"]:,} / {summary["completion_tokens"]:,} |',
    ]
    if summary['cost'] is not None:
        price_in, price_out = summary['price_per_1k']
        lines.append(f'| Estimated cost of the run | ${summary["cost"]:.4f} '
                     f'(at ${price_in:g} / ${price_out:g} per 1K prompt / completion tokens) |')
    else:
        lines.append('| Estimated cost of the run | not estimated (pass `--price-per-1k INPUT OUTPUT`) |')
    if summary['errors']:
        lines.append(f'| API errors | {summary["errors"]} |')

    lines += ['', '## By query type', '', '| Expected | Correct |', '|---|---|']
    lines += [f'| {name} | {rate(counts)} |' for name, counts in summary['per_category'].items()]
    lines += ['', '## By language', '', '| Language | Correct |', '|---|---|']
    lines += [f'| {name} | {rate(counts)} |' for name, counts in summary['per_language'].items()]
    lines += ['', '## By field', '',
              'Flags are scored on every case (they must stay false on analytics questions).', '',
              '| Field | Correct |', '|---|---|']
    lines += [f'| `{field}` | {rate(counts)} |' for field, counts in summary['per_field'].items()]

    failures = [r for r in results if not r['passed']]
    lines += ['', f'## Failed cases ({len(failures)})', '']
    if not failures:
        lines += ['None.', '']
    for result in failures:
        case = result['case']
        lines.append(f'**{case["id"]}** ({case["language"]}): {case["question"]}')
        if result.get('error'):
            lines.append(f'- API error: {result["error"]}')
        for field, outcome in result['fields'].items():
            if not outcome['ok']:
                lines.append(f'- `{field}`: expected {show(outcome["expected"])}, got {show(outcome["actual"])}')
        lines.append('')

    lines += ['<details><summary>Every answer (the fields scored for each case)</summary>', '',
              '| Case | Result | Model returned |', '|---|---|---|']
    for result in results:
        returned = ', '.join(
            f'{field.removeprefix("filters.")}={show(outcome["actual"])}'
            for field, outcome in result['fields'].items()
            if field not in FLAGS or outcome['actual'] or not outcome['ok']
        )
        lines.append(f'| {result["case"]["id"]} | {"ok" if result["passed"] else "**fail**"} | '
                     f'{returned.replace("|", "/")} |')
    lines += ['', '</details>', '']

    lines += [
        '## What this does not cover',
        '',
        '- Only step 1 (question to intent). Whether `_execute_query` returns the right rows for a '
        'correct intent, and the written summary (step 3), are not scored.',
        '- Single questions only: follow-ups that rely on conversation history are not tested.',
        '- Questions whose right answer is debatable are left out on purpose, so the set is easier '
        'than real traffic.',
        '- One run at the production temperature (0.1), so a re-run can differ by a case or two.',
        f'- {summary["cases"]} hand-written questions on the demo data; this is a regression check, '
        'not a measure of accuracy on real users\' questions.',
        '',
    ]
    return '\n'.join(lines)
