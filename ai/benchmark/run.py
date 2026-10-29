"""HTTP-only benchmark runner. Each invocation is a new immutable run."""
import hashlib
import json
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from ai.runtime.prompts import PROMPT_VERSIONS
from ai.runtime.schemas import validate_envelope


def canonical_hash(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


def canonical_request_hash(fixture):
    return canonical_hash({'task': fixture['task'], 'input': fixture['input']})


def _observed_token_count(request_id, directory):
    if not directory:
        return None
    try:
        value = json.loads((Path(directory) / f'{request_id}.json').read_text()).get('outputTokenCount')
    except (OSError, ValueError):
        return None
    return value if isinstance(value, int) and not isinstance(value, bool) and value >= 0 else None


class AttemptRecord(dict):
    pass


FIXTURE_CORPUS_SHA256 = '76ae31c9d11d39b6ec5d3226e0072b3a35f96ff90add65f8e32b44b13e9e6904'


def _total_deadline(seconds):
    if threading.current_thread() is not threading.main_thread() or not hasattr(signal, 'setitimer'):
        raise RuntimeError('benchmark total deadline requires POSIX main thread execution')
    previous = signal.getsignal(signal.SIGALRM)
    if signal.getitimer(signal.ITIMER_REAL)[0] > 0:
        raise RuntimeError('benchmark runner cannot replace an existing process deadline')
    def timeout_handler(*_):
        raise TimeoutError('benchmark deadline exceeded')
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.setitimer(signal.ITIMER_REAL, seconds)
    return previous


def _clear_total_deadline(previous):
    if previous is not None:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, previous)


def _read_response(response, deadline):
    chunks = []
    read = getattr(response, 'read1', None)
    if read is None:
        return response.read()
    while True:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise TimeoutError('benchmark response deadline exceeded')
        sock = getattr(getattr(getattr(response, 'fp', None), 'raw', None), '_sock', None)
        if sock:
            sock.settimeout(remaining)
        chunk = read(65536)
        if not chunk:
            return b''.join(chunks)
        chunks.append(chunk)


def run_fixture(fixture, endpoint, *, allowlist, benchmark_mode, timeout=59, evaluator=None, run_id=None, on_dispatch_start=None, on_attempt=None, on_evaluated=None, on_output=None):
    parsed = urllib.parse.urlparse(endpoint)
    production = any(os.getenv(name, '').lower() == 'production' for name in ('NODE_ENV', 'AI_RUNTIME_ENV', 'AI_DEPLOYMENT_MODE'))
    if not benchmark_mode or production or parsed.hostname not in ('127.0.0.1', 'localhost', '::1'):
        raise ValueError('benchmark requires explicit mode and a loopback endpoint')
    if canonical_request_hash(fixture) not in allowlist:
        raise ValueError('fixture request is not allowlisted')
    request_id = str(uuid.uuid4())
    envelope = {'contractVersion': '1.0', 'requestId': request_id, 'task': fixture['task'], 'locale': 'vi-VN', 'input': fixture['input']}
    started = time.monotonic()
    deadline = started + timeout
    body = None
    outcome = 'FAILED'
    token_count = None
    diagnostic = None
    response_output = None
    runtime_binding = {}
    try:
        headers = {'Content-Type': 'application/json'}
        token = os.getenv('AI_RUNTIME_TOKEN')
        if token:
            headers['Authorization'] = f'Bearer {token}'
        request = urllib.request.Request(endpoint, data=json.dumps(envelope).encode(), headers=headers, method='POST')
        previous_alarm = _total_deadline(timeout)
        try:
            if on_dispatch_start:
                on_dispatch_start(request_id)
            with urllib.request.urlopen(request, timeout=timeout) as response:
                raw = _read_response(response, deadline)
                if response.status != 200:
                    diagnostic = f'HTTP {response.status}'
                    if response.status == 504:
                        outcome = 'TIMED_OUT'
                    elif response.status == 503:
                        outcome = 'RUNTIME_UNAVAILABLE'
                else:
                    body = json.loads(raw)
                    runtime = body.get('runtime') if isinstance(body, dict) else None
                    runtime_binding = runtime if isinstance(runtime, dict) else {}
                    correlated = isinstance(body, dict) and not validate_envelope('success', body) and body.get('requestId') == request_id and body.get('task') == fixture['task']
                    bound = isinstance(runtime, dict) and runtime.get('modelId') == os.getenv('AI_RUNTIME_MODEL_ID') and runtime.get('promptVersion') == PROMPT_VERSIONS.get(fixture['task'])
                    response_output = body.get('output') if correlated and bound and isinstance(body.get('output'), dict) else None
                    outcome = 'SUCCESS' if response_output is not None else 'FAILED'
                    if correlated and not bound:
                        diagnostic = 'runtime model or prompt binding mismatch'
                    elif not correlated or response_output is None:
                        diagnostic = 'runtime response correlation mismatch'
        finally:
            _clear_total_deadline(previous_alarm)
    except urllib.error.HTTPError as error:
        outcome = 'TIMED_OUT' if error.code == 504 else 'RUNTIME_UNAVAILABLE' if error.code == 503 else 'FAILED'
        diagnostic = f'HTTP {error.code}'
    except (TimeoutError, urllib.error.URLError, OSError) as error:
        if isinstance(error, TimeoutError) or isinstance(getattr(error, 'reason', None), TimeoutError):
            outcome = 'TIMED_OUT'
        else:
            outcome = 'TRANSPORT_ERROR'
        diagnostic = type(error).__name__
    except (ValueError, UnicodeDecodeError):
        diagnostic = 'invalid runtime response'
    elapsed = time.monotonic() - started
    attempt = AttemptRecord(runId=run_id or str(uuid.uuid4()), requestId=request_id, fixtureId=fixture['fixtureId'], configHash=os.getenv('AI_BENCHMARK_CONFIG_HASH', ''),
        modelId=runtime_binding.get('modelId'), promptVersion=runtime_binding.get('promptVersion'),
        elapsedSeconds=elapsed, outcome=outcome, tokenCount=token_count, schemaPass=False,
        semanticPass=False, referenceStatus='UNKNOWN', diagnostic=diagnostic)
    if on_attempt:
        on_attempt(attempt)
    if response_output is not None and on_output:
        on_output(request_id, response_output)
    if response_output is not None and evaluator:
        try:
            evaluation = evaluator(fixture, response_output)
        except Exception:
            evaluation = {'fixtureId': fixture['fixtureId'], 'schemaPass': False, 'semanticPass': False,
                'referenceStatus': 'UNKNOWN', 'diagnostic': 'backend evaluator unavailable'}
        attempt.update(schemaPass=evaluation.get('schemaPass', False), semanticPass=evaluation.get('semanticPass', False),
            referenceStatus=evaluation.get('referenceStatus', 'UNKNOWN'), diagnostic=diagnostic or evaluation.get('diagnostic'))
        if on_evaluated:
            on_evaluated(evaluation)
    return attempt


def evaluate_output(fixture, output):
    record = {'fixtureId': fixture['fixtureId'], 'task': fixture['task'], 'input': fixture['input'],
              'output': output, 'authoritativeContext': fixture.get('authoritativeContext', {})}
    completed = subprocess.run(['pnpm', '--filter', '@dacn/api', 'exec', 'tsx', '../../ai/benchmark/evaluate.ts'],
        input=json.dumps(record, ensure_ascii=False) + '\n', text=True, capture_output=True, check=True)
    return json.loads(completed.stdout)


def run_fixtures(fixtures, endpoint, output_dir, *, allowlist, benchmark_mode, evaluator=None, export_output=None,
                 resume_dir=None, runtime_restarted=False):
    run_id = str(uuid.uuid4())
    directory = Path(output_dir) / run_id
    directory.mkdir(parents=True, mode=0o700)
    manifest = [{'fixtureId': row['fixtureId'], 'task': row['task'], 'category': row['category'], 'status': 'NOT_ATTEMPTED'} for row in fixtures]
    run_manifest = {'runId': run_id, 'runIds': [run_id], 'config': {
        'configHash': os.getenv('AI_BENCHMARK_CONFIG_HASH', ''),
        'modelId': os.getenv('AI_RUNTIME_MODEL_ID', ''),
        'promptVersions': PROMPT_VERSIONS,
        'modelRevision': os.getenv('AI_RUNTIME_MODEL_REVISION', ''),
        'tokenizerRevision': os.getenv('AI_RUNTIME_MODEL_REVISION', ''),
        'quantization': 'NF4', 'gpu': os.getenv('AI_BENCHMARK_GPU', ''), 'gpuUuid': os.getenv('AI_BENCHMARK_GPU_UUID', ''),
        'torch': os.getenv('AI_BENCHMARK_TORCH', ''), 'cuda': os.getenv('AI_BENCHMARK_CUDA', ''),
        'seed': os.getenv('AI_BENCHMARK_SEED', '0'),
    }, 'fixtureSha256': FIXTURE_CORPUS_SHA256, 'fixtures': manifest}
    attempts = []
    if resume_dir:
        if not runtime_restarted:
            raise ValueError('resume requires explicit confirmation that the runtime was restarted')
        previous = Path(resume_dir)
        previous_manifest = json.loads((previous / 'manifest.json').read_text())
        if previous_manifest.get('fixtureSha256') != FIXTURE_CORPUS_SHA256 or previous_manifest.get('config') != run_manifest['config']:
            raise ValueError('resume fixture or configuration hash differs from prior run')
        prior_rows = previous_manifest['fixtures']
        if [(row['fixtureId'], row['task'], row['category']) for row in prior_rows] != [(row['fixtureId'], row['task'], row['category']) for row in manifest]:
            raise ValueError('resume fixture inventory differs from prior run')
        run_manifest['runIds'] = sorted(set(previous_manifest.get('runIds', [previous_manifest['runId']]) + [run_id]))
        by_id = {row['fixtureId']: row for row in prior_rows}
        for entry in manifest:
            prior = by_id[entry['fixtureId']]
            entry.update({key: prior[key] for key in ('status', 'requestId') if key in prior})
            prior_attempt = previous / f"attempt-{entry['fixtureId']}.json"
            if entry['status'] != 'NOT_ATTEMPTED':
                if not prior_attempt.exists():
                    _write_json(directory / f"attempt-{entry['fixtureId']}.json", {
                        'runId': previous_manifest['runId'], 'requestId': entry.get('requestId', 'interrupted'),
                        'fixtureId': entry['fixtureId'], 'configHash': run_manifest['config']['configHash'],
                        'elapsedSeconds': 60.0, 'outcome': 'INTERRUPTED', 'tokenCount': None,
                        'schemaPass': False, 'semanticPass': False, 'referenceStatus': 'UNKNOWN',
                        'diagnostic': 'process ended before the attempt record was finalized'}, exclusive=True)
                else:
                    shutil.copy2(prior_attempt, directory / prior_attempt.name)
                    prior_evaluation = previous / f"evaluation-{entry['fixtureId']}.json"
                    if prior_evaluation.exists(): shutil.copy2(prior_evaluation, directory / prior_evaluation.name)
                attempts.append(json.loads((directory / f"attempt-{entry['fixtureId']}.json").read_text()))
    _write_manifest(directory / 'manifest.json', run_manifest)
    for entry, fixture in zip(manifest, fixtures):
        if entry['status'] != 'NOT_ATTEMPTED':
            continue
        attempt_path = directory / f"attempt-{fixture['fixtureId']}.json"
        evaluation_path = directory / f"evaluation-{fixture['fixtureId']}.json"
        def persist_attempt(record):
            record['tokenCount'] = _observed_token_count(record.get('requestId'), os.getenv('AI_RUNTIME_OBSERVATION_DIR'))
            _write_json(attempt_path, record, exclusive=True)
        def persist_evaluation(record):
            _write_json(evaluation_path, record, exclusive=True)
        def mark_dispatched(request_id):
            entry.update(status='ATTEMPTED', requestId=request_id)
            _write_manifest(directory / 'manifest.json', run_manifest)
        def save_output(request_id, output):
            if export_output:
                _write_json(Path(export_output) / f"{request_id}.json", output, secure_dir=True, exclusive=True)
        attempt = run_fixture(fixture, endpoint, allowlist=allowlist, benchmark_mode=benchmark_mode,
            evaluator=evaluator or evaluate_output, run_id=run_id, on_attempt=persist_attempt,
            on_dispatch_start=mark_dispatched, on_evaluated=persist_evaluation, on_output=save_output if export_output else None)
        attempts.append(attempt)
        entry['status'] = 'TIMED_OUT' if attempt['outcome'] == 'TIMED_OUT' else 'ATTEMPTED'
        _write_manifest(directory / 'manifest.json', run_manifest)
        if attempt['outcome'] in ('TIMED_OUT', 'TRANSPORT_ERROR', 'RUNTIME_UNAVAILABLE'):
            break
    return directory, manifest, attempts


def _write_json(path, value, exclusive=False, secure_dir=False):
    if secure_dir:
        path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        os.chmod(path.parent, 0o700)
    fd, temporary = tempfile.mkstemp(dir=path.parent, prefix='.record-')
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, 'w') as stream:
            json.dump(value, stream, ensure_ascii=False, sort_keys=True)
            stream.write('\n'); stream.flush(); os.fsync(stream.fileno())
        if exclusive:
            os.link(temporary, path)
        else:
            os.replace(temporary, path)
    finally:
        if os.path.exists(temporary): os.unlink(temporary)


def _write_manifest(path, value):
    fd, temporary = tempfile.mkstemp(dir=path.parent, prefix='.manifest-')
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, 'w') as stream:
            json.dump(value, stream, ensure_ascii=False, sort_keys=True)
            stream.write('\n'); stream.flush(); os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary): os.unlink(temporary)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--fixtures', required=True); parser.add_argument('--endpoint', required=True); parser.add_argument('--output-dir', required=True)
    parser.add_argument('--export-output', help='Opt in to owner-only parsed model outputs for manual review')
    parser.add_argument('--resume', help='Prior run directory; resumes only never-dispatched fixtures')
    parser.add_argument('--runtime-restarted', action='store_true', help='Confirm the timed-out runtime process was restarted before resume')
    args = parser.parse_args()
    fixtures = [json.loads(line) for line in Path(args.fixtures).read_text().splitlines() if line.strip()]
    canonical_path = Path(__file__).parent / 'fixtures/fixtures.jsonl'
    if Path(args.fixtures).resolve() != canonical_path.resolve() or hashlib.sha256(canonical_path.read_bytes()).hexdigest() != FIXTURE_CORPUS_SHA256:
        raise SystemExit('benchmark fixture file is not the reviewed canonical corpus')
    from ai.benchmark.validate_fixtures import validate
    problems = validate(fixtures)
    from ai.benchmark.validate_fixtures import validate_with_backend
    if not problems:
        problems.extend(validate_with_backend(fixtures))
    if problems:
        raise SystemExit('\n'.join(problems))
    allowlist = {canonical_request_hash(row) for row in fixtures}
    runtime_allowlist = set(filter(None, os.getenv('AI_RUNTIME_BENCHMARK_ALLOWLIST', '').split(',')))
    if os.getenv('AI_RUNTIME_BENCHMARK_MODE') != '1' or runtime_allowlist != allowlist:
        raise SystemExit('runtime must be explicitly configured with the canonical benchmark allowlist')
    out, manifest, attempts = run_fixtures(fixtures, args.endpoint, args.output_dir, allowlist=allowlist,
        benchmark_mode=os.getenv('AI_BENCHMARK_MODE') == '1', export_output=args.export_output,
        resume_dir=args.resume, runtime_restarted=args.runtime_restarted)
    print(json.dumps({'runDir': str(out), 'attempts': len(attempts), 'notAttempted': sum(x['status'] == 'NOT_ATTEMPTED' for x in manifest)}))
