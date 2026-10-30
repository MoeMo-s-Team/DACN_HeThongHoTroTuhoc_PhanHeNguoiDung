"""Small real-runtime smoke for the separate Phase 1D.3-Lite demo lane."""
import json
import hashlib
import os
import re
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from ai.runtime.prompts import PROMPT_VERSIONS
from ai.runtime.schemas import validate_envelope

TASKS = tuple(PROMPT_VERSIONS)
MODEL_ID = 'Qwen/Qwen2.5-1.5B-Instruct'
MODEL_REVISION = '989aa7980e4cf806f80c7fef2b1adb7bc71aa306'


def load_fixtures(path):
    try:
        rows = [json.loads(line) for line in Path(path).read_text(encoding='utf-8').splitlines() if line.strip()]
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f'fixture file invalid: {error}') from error
    if len(rows) != len(TASKS) or any(not isinstance(row, dict) for row in rows):
        raise ValueError('Lite fixtures must contain exactly one record per task')
    if {row.get('task') for row in rows} != set(TASKS) or len({row.get('task') for row in rows}) != len(TASKS):
        raise ValueError('Lite fixtures contain duplicate or missing tasks')
    if any(not all(key in row for key in ('fixtureId', 'input', 'authoritativeContext')) for row in rows):
        raise ValueError('Lite fixture record is incomplete')
    return rows


def validate_pip_report(path):
    try:
        report = json.loads(Path(path).read_text(encoding='utf-8'))
        installs = report['install']
        if not isinstance(installs, list) or report.get('version') != '1' or not isinstance(report.get('environment'), dict):
            raise ValueError('required pip report fields missing')
        for item in installs:
            if not isinstance(item, dict) or not isinstance(item.get('metadata'), dict):
                raise ValueError('pip install entry metadata missing')
            raw_name = item['metadata'].get('name')
            if not isinstance(raw_name, str) or not re.fullmatch(r'[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?', raw_name.strip()):
                raise ValueError('pip install entry package name missing')
            name = raw_name.strip().lower().replace('_', '-').replace('.', '-')
            if name in {'torch', 'torchvision', 'torchaudio', 'bitsandbytes'}:
                raise ValueError(f'unsafe install planned: {name}')
    except (OSError, json.JSONDecodeError, KeyError, TypeError, AttributeError) as error:
        raise ValueError(f'pip dry-run report invalid: {error}') from error
    return True


def post_request(endpoint, token, envelope, timeout):
    request = urllib.request.Request(endpoint, data=json.dumps(envelope, ensure_ascii=False).encode(),
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}, method='POST')
    if signal.getitimer(signal.ITIMER_REAL)[0] > 0:
        raise RuntimeError('Lite smoke cannot replace an existing process deadline')
    previous = signal.getsignal(signal.SIGALRM)
    def deadline(_signum, _frame):
        raise TimeoutError('inference attempt exceeded total deadline')
    signal.signal(signal.SIGALRM, deadline)
    signal.setitimer(signal.ITIMER_REAL, timeout)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read()
            try:
                body = json.loads(raw)
            except (json.JSONDecodeError, UnicodeDecodeError) as error:
                raise ReturnedBodyError(f'malformed JSON response: {error}', raw) from error
            return response.status, body
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, previous)


class ReturnedBodyError(ValueError):
    def __init__(self, message, body):
        super().__init__(message)
        self.body = body


def evaluate_output(fixture, output):
    record = {'fixtureId': fixture['fixtureId'], 'task': fixture['task'], 'input': fixture['input'],
              'output': output, 'authoritativeContext': fixture['authoritativeContext']}
    result = subprocess.run(['pnpm', '--filter', '@dacn/api', 'exec', 'tsx', '../../ai/benchmark/evaluate.ts'],
        cwd=ROOT, input=json.dumps(record, ensure_ascii=False) + '\n', text=True, capture_output=True, check=True)
    return json.loads(result.stdout)


def run_smoke(endpoint, token, output_dir, *, model_id, evaluator=None, fixtures_path=None, timeout=59,
              evidence=None):
    if not 0 < timeout <= 60:
        raise ValueError('per-attempt timeout must be at most 60 seconds')
    fixtures = load_fixtures(fixtures_path or Path(__file__).parent / 'fixtures/lite-smoke.jsonl')
    evaluate = evaluator or evaluate_output
    results = []
    for fixture in fixtures:
        row = {'fixtureId': fixture['fixtureId'], 'task': fixture['task'], 'status': 'FAILED',
               'elapsedSeconds': 0.0, 'output': None, 'error': None,
               'evaluation': {'schemaPass': False, 'semanticPass': False, 'referenceStatus': 'UNKNOWN'},
               'diagnostic': None}
        request_id = f"lite-{fixture['fixtureId']}-{time.time_ns()}"
        row['requestId'] = request_id
        envelope = {'contractVersion': '1.0', 'requestId': request_id, 'task': fixture['task'],
                    'locale': 'vi-VN', 'input': fixture['input']}
        started = time.monotonic()
        try:
            status, body = post_request(endpoint, token, envelope, timeout)
            row['httpStatus'] = status
            if status != 200 or not isinstance(body, dict):
                if isinstance(body, dict):
                    row['output'] = body.get('output')
                    row['error'] = _returned_error(json.dumps(body.get('error', body)).encode(), token, fixture['input'])
                elif body is not None:
                    row['error'] = _returned_error(json.dumps(body).encode(), token, fixture['input'])
                row['diagnostic'] = f'HTTP {status} or invalid response envelope'
            else:
                row['output'] = body.get('output')
                if row['output'] is None and body.get('error') is not None:
                    row['error'] = _returned_error(json.dumps(body['error']).encode(), token, fixture['input'])
                runtime = body.get('runtime')
                if isinstance(runtime, dict):
                    row['modelId'] = runtime.get('modelId')
                    row['promptVersion'] = runtime.get('promptVersion')
                bound = isinstance(runtime, dict) and runtime.get('modelId') == model_id and runtime.get('promptVersion') == PROMPT_VERSIONS[fixture['task']]
                correlated = (not validate_envelope('success', body) and body.get('contractVersion') == '1.0'
                              and body.get('requestId') == request_id and body.get('task') == fixture['task'])
                if not correlated:
                    row['diagnostic'] = 'response contract or correlation mismatch'
                elif not bound:
                    row['diagnostic'] = 'runtime model or prompt binding mismatch'
                elif not isinstance(row['output'], dict):
                    row['diagnostic'] = 'output is missing or is not an object'
                else:
                    try:
                        row['evaluation'] = evaluate(fixture, row['output'])
                    except Exception as error:
                        row['diagnostic'] = f'evaluator error: {type(error).__name__}: {error}'
                    evaluation = row['evaluation']
                    passed = (evaluation.get('schemaPass') is True and evaluation.get('semanticPass') is True
                              and evaluation.get('referenceStatus') == 'PASS')
                    if passed:
                        row['status'] = 'PASS'
                    else:
                        row['diagnostic'] = row['diagnostic'] or evaluation.get('diagnostic') or 'schema, semantic, or reference validation failed'
        except urllib.error.HTTPError as error:
            row['httpStatus'] = error.code
            row['error'] = _returned_error(error.read(), token, fixture['input'], error.code)
            row['diagnostic'] = f'HTTP {error.code}'
        except (TimeoutError, urllib.error.URLError, OSError, ValueError) as error:
            row['status'] = 'TIMED_OUT' if isinstance(error, TimeoutError) else 'FAILED'
            if isinstance(error, ReturnedBodyError):
                row['error'] = _returned_error(error.body, token, fixture['input'])
            else:
                row['error'] = _redact(f'{type(error).__name__}: {error}', token)
            row['diagnostic'] = row['error']
        finally:
            row['elapsedSeconds'] = round(time.monotonic() - started, 3)
            results.append(row)
    from importlib.metadata import PackageNotFoundError, version
    dependencies = {}
    for package in ('fastapi', 'uvicorn', 'jsonschema', 'transformers', 'accelerate'):
        try:
            dependencies[package] = version(package)
        except PackageNotFoundError:
            dependencies[package] = None
    record = {'status': 'PASS' if len(results) == 6 and all(row['status'] == 'PASS' for row in results) else 'FAIL',
              'modelId': model_id, 'modelRevision': os.getenv('AI_RUNTIME_MODEL_REVISION', MODEL_REVISION),
              'results': results, 'evidence': evidence or {
                  'gpu': os.getenv('AI_RUNTIME_GPU_NAME'), 'gpuUuid': os.getenv('AI_RUNTIME_GPU_UUID'),
                  'gpuMemory': os.getenv('AI_RUNTIME_GPU_MEMORY'), 'torchVersion': os.getenv('AI_RUNTIME_TORCH_VERSION'),
                  'torchPath': os.getenv('AI_RUNTIME_TORCH_PATH'),
                  'modelLoadSeconds': os.getenv('AI_RUNTIME_MODEL_LOAD_SECONDS'),
                  'dependencyVersions': dependencies,
              }}
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    path = Path(output_dir) / f"lite-{time.strftime('%Y%m%d-%H%M%S')}.json"
    raw_hashes = {}
    for index, row in enumerate(record['results']):
        error = row.get('error')
        if isinstance(error, dict) and isinstance(error.get('sha256'), str) and len(error['sha256']) == 64:
            raw_hashes[index] = error.pop('sha256')
    record = _redact(record, token)
    for index, digest in raw_hashes.items():
        record['results'][index]['error']['sha256'] = digest
    path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return record


def startup_failure(error):
    return {'status': 'BLOCKED', 'diagnostic': str(error)}


def _redact(value, secret):
    if isinstance(value, str):
        return value.replace(secret, '[REDACTED]') if secret else value
    if isinstance(value, list):
        return [_redact(item, secret) for item in value]
    if isinstance(value, dict):
        return {str(key).replace(secret, '[REDACTED_KEY]') if secret else str(key):
                _redact(item, secret) for key, item in value.items()}
    return value


def _returned_error(raw, token, input_value, status=None):
    raw_bytes = raw if isinstance(raw, bytes) else str(raw).encode('utf-8', errors='replace')
    try:
        value = json.loads(raw_bytes)
    except (json.JSONDecodeError, UnicodeDecodeError, TypeError):
        value = raw_bytes.decode('utf-8', errors='replace')
    sensitive = set()
    input_words = set()
    def collect(item):
        if isinstance(item, dict):
            for key, part in item.items():
                sensitive.add(str(key))
                collect(part)
        elif isinstance(item, list):
            for part in item:
                collect(part)
        elif isinstance(item, str) and len(item) > 1:
            sensitive.add(item)
            input_words.update(word for word in re.findall(r'[\w.-]+', item, re.UNICODE) if len(word) > 1)
        elif isinstance(item, (int, float)) and not isinstance(item, bool) and len(str(item)) >= 3:
            sensitive.add(str(item))
    collect(input_value)
    if token:
        sensitive.add(token)
    compact_input = json.dumps(input_value, ensure_ascii=False, separators=(',', ':'))
    pretty_input = json.dumps(input_value, ensure_ascii=False, indent=2)
    sensitive.update((compact_input, pretty_input))
    sensitive.update(input_words)
    sensitive = sorted((value for value in sensitive if value), key=len, reverse=True)
    field_pattern = re.compile(r'prompt|input|auth|token|secret|credential|bearer|api.?key', re.I)
    assignment_pattern = re.compile(
        r'(?i)\b(?:secret|prompt|input|authorization|auth|token|api[_-]?key|credential|bearer)\b\s*[:=]\s*(?:"[^"]*"|\'[^\']*\'|[^,;\n]+)')
    bearer_pattern = re.compile(r'(?i)\bbearer\s+[^\s,;]+')
    def clean_text(text):
        text = text.replace(token, '[REDACTED]') if token else text
        text = assignment_pattern.sub('[REDACTED_ASSIGNMENT]', text)
        text = bearer_pattern.sub('Bearer [REDACTED]', text)
        for value in sensitive:
            text = re.sub(re.escape(value), '[REDACTED_INPUT]', text, flags=re.I)
        if field_pattern.search(text) and re.search(r'prompt|instruction', text, re.I):
            return '[PROMPT_OR_INSTRUCTION_CONTENT_REDACTED]'
        return text
    def scrub(item):
        if isinstance(item, dict):
            cleaned = {}
            for key, part in item.items():
                key = str(key)
                if field_pattern.search(key):
                    cleaned['[REDACTED_FIELD]'] = '[REDACTED]'
                    continue
                safe_key = clean_text(key)
                cleaned[safe_key if safe_key == key else '[REDACTED_KEY]'] = scrub(part)
            return cleaned
        if isinstance(item, list):
            return [scrub(part) for part in item]
        if not isinstance(item, (dict, list, bool)) and item in input_leaves:
            return '[REDACTED_INPUT]'
        if isinstance(item, str):
            return clean_text(item)
        return item
    input_leaves = set()
    def collect_leaves(item):
        if isinstance(item, dict):
            for part in item.values(): collect_leaves(part)
        elif isinstance(item, list):
            for part in item: collect_leaves(part)
        elif isinstance(item, (str, int, float)) and not isinstance(item, bool):
            input_leaves.add(item)
    collect_leaves(input_value)
    safe_body = scrub(value)
    if not isinstance(value, (dict, list, str)):
        safe_body = '[RESPONSE_BODY_REDACTED]'
    return {'body': safe_body, 'sha256': hashlib.sha256(raw_bytes).hexdigest(),
            **({'httpStatus': status} if status is not None else {})}


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--output-dir', default='ai/benchmark/lite-results')
    parser.add_argument('--endpoint', default=os.getenv('AI_RUNTIME_BASE_URL', 'http://127.0.0.1:8000') + '/v1/infer')
    parser.add_argument('--model-id', default=os.getenv('AI_RUNTIME_MODEL_ID', MODEL_ID))
    args = parser.parse_args()
    token = os.getenv('AI_RUNTIME_TOKEN')
    if not token:
        parser.error('AI_RUNTIME_TOKEN is required')
    print(json.dumps(run_smoke(args.endpoint, token, args.output_dir, model_id=args.model_id), ensure_ascii=False))


if __name__ == '__main__':
    main()
