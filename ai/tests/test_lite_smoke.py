import json
from pathlib import Path

import pytest

from ai.benchmark.lite_smoke import load_fixtures, validate_pip_report, run_smoke

TASKS = {
    'STUDENT_LEARNING_ANALYSIS', 'STUDENT_STUDY_PLAN_GENERATION',
    'STUDENT_STUDY_PLAN_ADJUSTMENT', 'TEACHER_CLASS_ANALYSIS',
    'ADMIN_FEEDBACK_GROUPING_STAGE1', 'ADMIN_FEEDBACK_SUMMARY_STAGE2',
}


def test_lite_fixtures_have_exactly_one_record_per_task():
    rows = load_fixtures(Path('ai/benchmark/fixtures/lite-smoke.jsonl'))
    assert len(rows) == 6
    assert {row['task'] for row in rows} == TASKS


@pytest.mark.parametrize('rows', [[], [{'fixtureId': 'a', 'task': 'STUDENT_LEARNING_ANALYSIS'}, {'fixtureId': 'b', 'task': 'STUDENT_LEARNING_ANALYSIS'}]])
def test_fixture_loader_rejects_missing_or_duplicate_tasks(tmp_path, rows):
    path = tmp_path / 'rows.jsonl'
    path.write_text('\n'.join(json.dumps(row) for row in rows))
    with pytest.raises(ValueError):
        load_fixtures(path)


@pytest.mark.parametrize('report', [None, '{', '{}', '{"version":2,"environment":{},"install":[]}'])
def test_pip_report_fails_closed_when_missing_or_malformed(tmp_path, report):
    path = tmp_path / 'report.json'
    if report is not None:
        path.write_text(report)
    with pytest.raises(ValueError):
        validate_pip_report(path)


def test_pip_report_accepts_real_report_version_string(tmp_path):
    path = tmp_path / 'report.json'
    path.write_text(json.dumps({'version': '1', 'environment': {}, 'install': []}))
    assert validate_pip_report(path) is True


@pytest.mark.parametrize('name', ['torch', 'torchvision', 'bitsandbytes'])
def test_pip_report_rejects_torch_install_plan(tmp_path, name):
    path = tmp_path / 'report.json'
    path.write_text(json.dumps({'install': [{'metadata': {'name': name}}]}))
    with pytest.raises(ValueError):
        validate_pip_report(path)


def test_runner_retains_failed_output_for_all_rows_and_marks_binding_mismatch(monkeypatch, tmp_path):
    import ai.benchmark.lite_smoke as smoke

    rows = [{'fixtureId': str(i), 'task': task, 'input': {}, 'authoritativeContext': {}}
            for i, task in enumerate(sorted(TASKS))]
    monkeypatch.setattr(smoke, 'load_fixtures', lambda _path: rows)
    monkeypatch.setattr(smoke, 'post_request', lambda *_args: (200, {
        'contractVersion': '1.0', 'requestId': 'wrong', 'task': 'wrong',
        'output': {'real': True}, 'runtime': {'modelId': 'wrong', 'promptVersion': 'wrong'},
    }))
    result = run_smoke('http://127.0.0.1:8000/v1/infer', 'secret', tmp_path,
                       model_id='expected', evaluator=lambda *_: {'schemaPass': True, 'semanticPass': True, 'referenceStatus': 'PASS'})
    assert len(result['results']) == 6
    assert all(row['status'] == 'FAILED' and row['output'] == {'real': True} for row in result['results'])
    assert all(row['diagnostic'] for row in result['results'])
    assert 'secret' not in json.dumps(result)


def test_runner_fails_when_evaluator_returns_unknown_or_raises(monkeypatch, tmp_path):
    import ai.benchmark.lite_smoke as smoke

    rows = [{'fixtureId': 'a', 'task': 'STUDENT_LEARNING_ANALYSIS', 'input': {}, 'authoritativeContext': {}}]
    monkeypatch.setattr(smoke, 'load_fixtures', lambda _path: rows)
    monkeypatch.setattr(smoke, 'post_request', lambda _url, _token, request, _timeout: (200, {
        'contractVersion': '1.0', 'requestId': request['requestId'], 'task': rows[0]['task'], 'output': {},
        'runtime': {'modelId': 'model', 'promptVersion': smoke.PROMPT_VERSIONS[rows[0]['task']]},
    }))
    result = run_smoke('http://127.0.0.1:8000/v1/infer', 'token', tmp_path, model_id='model',
                       evaluator=lambda *_: {'schemaPass': True, 'semanticPass': True, 'referenceStatus': 'UNKNOWN'})
    assert result['results'][0]['status'] == 'FAILED'
    assert result['results'][0]['output'] == {}

    result = run_smoke('http://127.0.0.1:8000/v1/infer', 'token', tmp_path, model_id='model',
                       evaluator=lambda *_: (_ for _ in ()).throw(RuntimeError('validator unavailable')))
    assert result['results'][0]['status'] == 'FAILED'
    assert result['results'][0]['output'] == {}
    assert 'evaluator error' in result['results'][0]['diagnostic']


@pytest.mark.parametrize('body,diagnostic', [
    (None, 'HTTP 503 or invalid response envelope'),
    ({'contractVersion': '1.0', 'requestId': 'bad', 'task': 'STUDENT_LEARNING_ANALYSIS', 'output': {},
      'runtime': {'modelId': 'model', 'promptVersion': 'stu-learning-analysis-v1'}}, 'response contract or correlation mismatch'),
    ({'contractVersion': '1.0', 'requestId': 'current', 'task': 'STUDENT_LEARNING_ANALYSIS', 'output': {},
      'runtime': {'modelId': 'wrong', 'promptVersion': 'wrong'}}, 'runtime model or prompt binding mismatch'),
])
def test_runner_records_http_correlation_and_binding_failures(monkeypatch, tmp_path, body, diagnostic):
    import ai.benchmark.lite_smoke as smoke

    fixture = {'fixtureId': 'one', 'task': 'STUDENT_LEARNING_ANALYSIS', 'input': {}, 'authoritativeContext': {}}
    monkeypatch.setattr(smoke, 'load_fixtures', lambda _path: [fixture])
    def response(_endpoint, _token, request, _timeout):
        actual = dict(body) if isinstance(body, dict) else body
        if isinstance(actual, dict) and actual.get('requestId') == 'current':
            actual['requestId'] = request['requestId']
        return 503 if body is None else 200, actual
    monkeypatch.setattr(smoke, 'post_request', response)
    result = run_smoke('http://127.0.0.1:8000/v1/infer', 'token', tmp_path, model_id='model')
    assert result['results'][0]['status'] == 'FAILED'
    assert result['results'][0]['diagnostic'] == diagnostic


def test_runner_records_actual_returned_error(monkeypatch, tmp_path):
    import ai.benchmark.lite_smoke as smoke

    fixture = {'fixtureId': 'one', 'task': 'STUDENT_LEARNING_ANALYSIS', 'input': {}, 'authoritativeContext': {}}
    monkeypatch.setattr(smoke, 'load_fixtures', lambda _path: [fixture])
    monkeypatch.setattr(smoke, 'post_request', lambda *_args: (200, {
        'contractVersion': '1.0', 'requestId': 'bad', 'task': fixture['task'],
        'error': {'code': 'INFERENCE_FAILED', 'message': 'real failure'},
    }))
    result = run_smoke('http://127.0.0.1:8000/v1/infer', 'token', tmp_path, model_id='model')
    assert result['results'][0]['error'] == {'code': 'INFERENCE_FAILED', 'message': 'real failure'}


def test_malformed_http_200_response_is_failed_with_parse_error(monkeypatch, tmp_path):
    import ai.benchmark.lite_smoke as smoke

    fixture = {'fixtureId': 'one', 'task': 'STUDENT_LEARNING_ANALYSIS', 'input': {}, 'authoritativeContext': {}}
    monkeypatch.setattr(smoke, 'load_fixtures', lambda _path: [fixture])
    class Response:
        status = 200
        def __enter__(self): return self
        def __exit__(self, *_args): return False
        def read(self): return b'bad response token {"private":"do not save"}'
    monkeypatch.setattr(smoke.urllib.request, 'urlopen', lambda *_args, **_kwargs: Response())
    fixture['input'] = {'private': 'do not save'}
    result = run_smoke('http://127.0.0.1:8000/v1/infer', 'token', tmp_path, model_id='model')
    assert result['results'][0]['status'] == 'FAILED'
    assert result['results'][0]['error'] == 'bad response [REDACTED] [REDACTED_INPUT]'


def test_http_error_retains_non_json_body_and_redacts_token(monkeypatch, tmp_path):
    import io
    import urllib.error
    import ai.benchmark.lite_smoke as smoke

    fixture = {'fixtureId': 'one', 'task': 'STUDENT_LEARNING_ANALYSIS', 'input': {}, 'authoritativeContext': {}}
    monkeypatch.setattr(smoke, 'load_fixtures', lambda _path: [fixture])
    error = urllib.error.HTTPError('http://runtime', 502, 'bad gateway', {}, io.BytesIO(b'gateway token'))
    monkeypatch.setattr(smoke.urllib.request, 'urlopen', lambda *_args, **_kwargs: (_ for _ in ()).throw(error))
    result = run_smoke('http://127.0.0.1:8000/v1/infer', 'token', tmp_path, model_id='model')
    assert result['results'][0]['error'] == 'gateway [REDACTED]'


def test_notebook_initializes_block_recorder_before_source_validation_and_records_prerequisite_failures():
    notebook = json.loads(Path('ai/colab/phase-1d3-lite.ipynb').read_text())
    setup = ''.join(notebook['cells'][1]['source'])
    prerequisites = ''.join(notebook['cells'][2]['source'])
    assert setup.index('def block(') < setup.index('if not REPO_URL or not REPO_REF:')
    assert 'try:' in prerequisites[:prerequisites.index('nvidia-smi')]
    assert 'except Exception as exc:' in prerequisites
    assert 'block(f"BLOCKED: GPU/Torch prerequisites unavailable:' in prerequisites
    for cell in notebook['cells']:
        if cell['cell_type'] == 'code':
            compile(''.join(cell['source']), 'notebook-cell', 'exec')


def test_timeout_and_startup_failure_are_evidence(monkeypatch, tmp_path):
    import ai.benchmark.lite_smoke as smoke

    rows = [{'fixtureId': 'a', 'task': 'STUDENT_LEARNING_ANALYSIS', 'input': {}, 'authoritativeContext': {}}]
    monkeypatch.setattr(smoke, 'load_fixtures', lambda _path: rows)
    monkeypatch.setattr(smoke, 'post_request', lambda *_args: (_ for _ in ()).throw(TimeoutError('late')))
    result = run_smoke('http://127.0.0.1:8000/v1/infer', 'token', tmp_path, model_id='model')
    assert result['results'][0]['status'] == 'TIMED_OUT'
    assert result['results'][0]['error'] == 'TimeoutError: late'
    assert smoke.startup_failure('worker failed')['status'] == 'BLOCKED'


def test_post_request_enforces_total_deadline(monkeypatch):
    import time
    import ai.benchmark.lite_smoke as smoke

    class SlowResponse:
        status = 200
        def __enter__(self):
            time.sleep(0.1)
            return self
        def __exit__(self, *_args):
            return False

    monkeypatch.setattr(smoke.urllib.request, 'urlopen', lambda *_args, **_kwargs: SlowResponse())
    with pytest.raises(TimeoutError, match='total deadline'):
        smoke.post_request('http://127.0.0.1:8000/v1/infer', 'token', {}, 0.01)
