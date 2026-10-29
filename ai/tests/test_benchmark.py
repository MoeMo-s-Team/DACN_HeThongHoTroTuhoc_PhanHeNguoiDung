import hashlib
import json
from unittest.mock import patch
from ai.benchmark.report import summarize
from ai.benchmark.run import AttemptRecord, _observed_token_count, canonical_request_hash, run_fixture, run_fixtures


def test_report_denominator_pending_and_thresholds():
    manifest = [{'fixtureId': f'f{i}', 'task': 'T', 'status': 'ATTEMPTED'} for i in range(20)]
    attempts = [dict(runId='run', requestId=f'req-{i}', fixtureId=f'f{i}', outcome='SUCCESS', schemaPass=i < 19, semanticPass=i < 19,
                     referenceStatus='PASS' if i < 19 else 'UNKNOWN', elapsedSeconds=1.0,
                     configHash='a' * 64) for i in range(20)]
    report = summarize(manifest, attempts, [], gpu_verified=True, transport_verified=True)
    assert report['status'] == 'PENDING'
    attempts[-1]['referenceStatus'] = 'VIOLATION'
    attempts[-1]['schemaPass'] = attempts[-1]['semanticPass'] = True
    assert summarize(manifest, attempts, [], gpu_verified=True, transport_verified=True)['status'] == 'FAIL'
    attempts[-1]['referenceStatus'] = 'PASS'
    attempts[-1]['elapsedSeconds'] = 60
    assert summarize(manifest, attempts, [], gpu_verified=True, transport_verified=True)['status'] == 'FAIL'


def test_missing_attempts_scores_or_gpu_cannot_pass():
    manifest = [{'fixtureId': 'a', 'task': 'T', 'status': 'NOT_ATTEMPTED'}]
    report = summarize(manifest, [], [], gpu_verified=False, transport_verified=False)
    assert report['status'] == 'PENDING'
    attempts = [dict(runId='run', requestId='req-a', fixtureId='a', outcome='SUCCESS', schemaPass=True, semanticPass=True, referenceStatus='PASS', elapsedSeconds=1, configHash='a' * 64)]
    assert summarize(manifest, attempts, [], gpu_verified=True, transport_verified=True)['status'] == 'PENDING'
    with __import__('pytest').raises(ValueError):
        summarize(manifest * 2, attempts, [])


def test_19_of_20_passes_only_with_complete_evidence_and_scores():
    manifest = [{'fixtureId': f'f{i}', 'task': 'T', 'status': 'ATTEMPTED'} for i in range(20)]
    attempts = [dict(runId='run', requestId=f'req-{i}', fixtureId=f'f{i}', outcome='SUCCESS', schemaPass=i < 19, semanticPass=True,
        referenceStatus='PASS', elapsedSeconds=1, configHash='b' * 64) for i in range(20)]
    scores = [dict(fixtureId=f'f{i}', relevance=4, groundedness=4, actionability=4, vietnamese=4, boundary=4) for i in range(20)]
    assert summarize(manifest, attempts, scores, gpu_verified=True, transport_verified=True)['status'] == 'PASS'


def test_runner_requires_allowlisted_loopback_and_records_timeout_once():
    fixture = {'fixtureId': 'x', 'task': 'STUDENT_LEARNING_ANALYSIS', 'input': {}, 'authoritativeContext': {}}
    expected = canonical_request_hash(fixture)
    try:
        run_fixture(fixture, 'http://example.com/v1/infer', allowlist={expected}, benchmark_mode=True)
    except ValueError:
        pass
    else:
        assert False, 'non-loopback endpoint must be rejected'
    with patch('ai.benchmark.run.urllib.request.urlopen', side_effect=TimeoutError):
        result = run_fixture(fixture, 'http://127.0.0.1:8000/v1/infer', allowlist={expected}, benchmark_mode=True)
    assert result['outcome'] == 'TIMED_OUT'
    assert result['referenceStatus'] == 'UNKNOWN'
    import pytest
    with pytest.raises(ValueError):
        run_fixture(fixture, 'http://127.0.0.1:8000/v1/infer', allowlist={expected}, benchmark_mode=False)
    assert result['outcome'] == 'TIMED_OUT'


def test_manifest_stops_on_timeout_and_preserves_unattempted_case(tmp_path):
    fixtures = [dict(fixtureId='a', task='T', category='normal', input={}), dict(fixtureId='b', task='T', category='boundary', input={})]
    def timeout_fixture(fixture, _endpoint, **kwargs):
        timeout = AttemptRecord(runId=kwargs['run_id'], fixtureId=fixture['fixtureId'], configHash='c' * 64, elapsedSeconds=59, outcome='TIMED_OUT',
            tokenCount=None, schemaPass=False, semanticPass=False, referenceStatus='UNKNOWN', diagnostic='timeout')
        kwargs['on_attempt'](timeout)
        return timeout
    with patch('ai.benchmark.run.run_fixture', side_effect=timeout_fixture) as run:
        directory, manifest, attempts = run_fixtures(fixtures, 'http://127.0.0.1:8000/v1/infer', tmp_path,
            allowlist=set(), benchmark_mode=True)
    run.assert_called_once()
    assert len(attempts) == 1
    assert [row['status'] for row in manifest] == ['TIMED_OUT', 'NOT_ATTEMPTED']
    assert len({attempt['runId'] for attempt in attempts}) == 1
    assert (directory / 'attempt-a.json').exists()
    records = [json.loads((directory / 'attempt-a.json').read_text())]
    assert records[0]['runId'] == json.loads((directory / 'manifest.json').read_text())['runId']


def test_manifest_marks_dispatch_before_http_starts(tmp_path):
    fixture = dict(fixtureId='a', task='T', category='normal', input={})
    observed = []
    def dispatch(row, _endpoint, **kwargs):
        kwargs['on_dispatch_start']('request-dispatched')
        directory = next(tmp_path.iterdir())
        observed.append(json.loads((directory / 'manifest.json').read_text())['fixtures'][0])
        attempt = AttemptRecord(runId=kwargs['run_id'], requestId='request-dispatched', fixtureId=row['fixtureId'],
            configHash='c' * 64, elapsedSeconds=1, outcome='FAILED', tokenCount=None,
            schemaPass=False, semanticPass=False, referenceStatus='UNKNOWN', diagnostic='test')
        kwargs['on_attempt'](attempt)
        return attempt
    with patch('ai.benchmark.run.run_fixture', side_effect=dispatch):
        run_fixtures([fixture], 'http://127.0.0.1:8000/v1/infer', tmp_path, allowlist=set(), benchmark_mode=True)
    assert observed[0]['status'] == 'ATTEMPTED' and observed[0]['requestId'] == 'request-dispatched'


def test_resume_requires_restart_and_replays_only_unattempted_cases(tmp_path, monkeypatch):
    monkeypatch.setenv('AI_BENCHMARK_CONFIG_HASH', 'd' * 64)
    fixtures = [dict(fixtureId='a', task='T', category='normal', input={}), dict(fixtureId='b', task='T', category='boundary', input={})]
    def crash_after_dispatch(row, _endpoint, **kwargs):
        kwargs['on_dispatch_start']('active-request')
        raise RuntimeError('simulated process loss')
    with patch('ai.benchmark.run.run_fixture', side_effect=crash_after_dispatch):
        try:
            run_fixtures(fixtures, 'http://127.0.0.1:8000/v1/infer', tmp_path, allowlist=set(), benchmark_mode=True)
        except RuntimeError:
            pass
    previous = next(path for path in tmp_path.iterdir() if (path / 'manifest.json').exists())
    with __import__('pytest').raises(ValueError, match='runtime was restarted'):
        run_fixtures(fixtures, 'http://127.0.0.1:8000/v1/infer', tmp_path, allowlist=set(), benchmark_mode=True, resume_dir=previous)
    called = []
    def success_for_unattempted(row, _endpoint, **kwargs):
        called.append(row['fixtureId']); kwargs['on_dispatch_start']('new-request')
        attempt = AttemptRecord(runId=kwargs['run_id'], requestId='new-request', fixtureId=row['fixtureId'], configHash='d' * 64,
            elapsedSeconds=1, outcome='FAILED', tokenCount=None, schemaPass=False, semanticPass=False,
            referenceStatus='UNKNOWN', diagnostic='test')
        kwargs['on_attempt'](attempt); return attempt
    with patch('ai.benchmark.run.run_fixture', side_effect=success_for_unattempted):
        new_dir, manifest, attempts = run_fixtures(fixtures, 'http://127.0.0.1:8000/v1/infer', tmp_path,
            allowlist=set(), benchmark_mode=True, resume_dir=previous, runtime_restarted=True)
    assert called == ['b']
    assert [row['outcome'] for row in attempts] == ['INTERRUPTED', 'FAILED']
    assert manifest[0]['requestId'] == 'active-request'
    assert json.loads((new_dir / 'manifest.json').read_text())['runIds']


def test_attempt_is_persisted_before_evaluator_failure_and_transport_loss_stops_run(tmp_path, monkeypatch):
    monkeypatch.setenv('AI_RUNTIME_MODEL_ID','candidate')
    fixture = {'fixtureId': 'x', 'task': 'STUDENT_LEARNING_ANALYSIS', 'category': 'normal', 'input': {}, 'authoritativeContext': {}}
    digest = canonical_request_hash(fixture)
    persisted = []
    with patch('ai.benchmark.run.urllib.request.urlopen') as request:
        class Response:
            status = 200
            request_id = None
            def __enter__(self): return self
            def __exit__(self, *_): pass
            def read(self):
                from ai.runtime.prompts import PROMPT_VERSIONS
                return json.dumps({'requestId':self.request_id,'contractVersion':'1.0','task':fixture['task'],'output':{},
                    'runtime':{'modelId':'candidate','promptVersion':PROMPT_VERSIONS[fixture['task']]}}).encode()
        def reply(req, timeout):
            response = Response(); response.request_id = json.loads(req.data)['requestId']; return response
        request.side_effect = reply
        result = run_fixture(fixture, 'http://127.0.0.1:8000/v1/infer', allowlist={digest}, benchmark_mode=True,
            evaluator=lambda *_: (_ for _ in ()).throw(RuntimeError()), on_attempt=persisted.append)
    assert len(persisted) == 1 and result['runId'] == persisted[0]['runId']
    assert result['requestId'] and result['requestId'] == json.loads(json.dumps(result))['requestId']
    assert result['outcome'] == 'SUCCESS' and result['referenceStatus'] == 'UNKNOWN'
    fixtures = [fixture, {**fixture, 'fixtureId': 'second'}]
    transport = AttemptRecord(runId='run', fixtureId='x', configHash='c' * 64, elapsedSeconds=1, outcome='TRANSPORT_ERROR',
        tokenCount=None, schemaPass=False, semanticPass=False, referenceStatus='UNKNOWN', diagnostic='URLError')
    def failed_transport(row, _endpoint, **kwargs):
        item = {**transport, 'runId': kwargs['run_id'], 'fixtureId': row['fixtureId']}
        kwargs['on_attempt'](item)
        return item
    with patch('ai.benchmark.run.run_fixture', side_effect=failed_transport) as run:
        _directory, manifest, attempts = run_fixtures(fixtures, 'http://127.0.0.1:8000/v1/infer', tmp_path,
            allowlist={digest}, benchmark_mode=True)
    run.assert_called_once()
    assert [row['status'] for row in manifest] == ['ATTEMPTED', 'NOT_ATTEMPTED']


def test_runner_rejects_response_from_wrong_model_or_prompt(monkeypatch):
    from ai.runtime.prompts import PROMPT_VERSIONS
    fixture = {'fixtureId':'f','task':'STUDENT_LEARNING_ANALYSIS','category':'normal','input':{}}
    monkeypatch.setenv('AI_RUNTIME_MODEL_ID','candidate')
    digest = canonical_request_hash(fixture)
    class Response:
        status = 200
        def __enter__(self): return self
        def __exit__(self, *_): pass
        def read(self):
            return json.dumps({'requestId':request_id,'contractVersion':'1.0','task':fixture['task'],'output':{},
                'runtime':{'modelId':'wrong-model','promptVersion':PROMPT_VERSIONS[fixture['task']]}}).encode()
    def reply(req, timeout):
        nonlocal request_id
        request_id = json.loads(req.data)['requestId']
        return Response()
    request_id = None
    with patch('ai.benchmark.run.urllib.request.urlopen', side_effect=reply):
        result = run_fixture(fixture,'http://127.0.0.1:8000/v1/infer',allowlist={digest},benchmark_mode=True,
            evaluator=lambda *_: (_ for _ in ()).throw(AssertionError('must not evaluate mismatched runtime')))
    assert result['outcome'] == 'FAILED'
    assert result['diagnostic'] == 'runtime model or prompt binding mismatch'


def test_runner_rejects_non_normative_success_envelope(monkeypatch):
    from ai.runtime.prompts import PROMPT_VERSIONS
    fixture={'fixtureId':'f','task':'STUDENT_LEARNING_ANALYSIS','category':'normal','input':{}}
    monkeypatch.setenv('AI_RUNTIME_MODEL_ID','candidate')
    digest=canonical_request_hash(fixture); request_id=None
    class Response:
        status=200
        def __enter__(self): return self
        def __exit__(self,*_): pass
        def read(self):
            return json.dumps({'requestId':request_id,'contractVersion':'1.0','task':fixture['task'],'output':{},
                'runtime':{'modelId':'candidate','promptVersion':PROMPT_VERSIONS[fixture['task']]},'extra':True}).encode()
    def reply(req,timeout):
        nonlocal request_id
        request_id=json.loads(req.data)['requestId']; return Response()
    with patch('ai.benchmark.run.urllib.request.urlopen',side_effect=reply):
        result=run_fixture(fixture,'http://127.0.0.1:8000/v1/infer',allowlist={digest},benchmark_mode=True,
            evaluator=lambda *_: (_ for _ in ()).throw(AssertionError('invalid envelope must not be evaluated')))
    assert result['outcome']=='FAILED'


def test_response_reader_enforces_one_total_deadline(monkeypatch):
    import pytest
    import ai.benchmark.run as runner
    clock=[0.0]
    class Response:
        def read1(self, _size):
            clock[0]=2.0
            return b'x'
    monkeypatch.setattr(runner.time,'monotonic',lambda:clock[0])
    with pytest.raises(TimeoutError,match='deadline'):
        runner._read_response(Response(),1.0)


def test_observed_output_token_count_is_kept_without_raw_text(tmp_path):
    (tmp_path/'request.json').write_text(json.dumps({'outputTokenCount':17,'generatedText':'private'}))
    assert _observed_token_count('request',tmp_path) == 17
    (tmp_path/'request.json').write_text(json.dumps({'outputTokenCount':True}))
    assert _observed_token_count('request',tmp_path) is None


def test_run_manifest_records_actual_candidate_and_gpu_environment(tmp_path, monkeypatch):
    for key,value in {'AI_RUNTIME_MODEL_ID':'candidate','AI_RUNTIME_MODEL_REVISION':'a'*40,
        'AI_BENCHMARK_GPU':'Tesla T4','AI_BENCHMARK_GPU_UUID':'GPU-00000000-0000-0000-0000-000000000123',
        'AI_BENCHMARK_TORCH':'2.11.0+cu130','AI_BENCHMARK_CUDA':'13.0','AI_BENCHMARK_CONFIG_HASH':'b'*64}.items():
        monkeypatch.setenv(key,value)
    fixture={'fixtureId':'f','task':'STUDENT_LEARNING_ANALYSIS','category':'normal','input':{}}
    def attempted(row,_endpoint,**kwargs):
        record=AttemptRecord(runId=kwargs['run_id'],requestId='r',fixtureId=row['fixtureId'],configHash='b'*64,
            elapsedSeconds=1,outcome='FAILED',tokenCount=None,schemaPass=False,semanticPass=False,
            referenceStatus='UNKNOWN',diagnostic='test')
        kwargs['on_dispatch_start']('r'); kwargs['on_attempt'](record); return record
    with patch('ai.benchmark.run.run_fixture',side_effect=attempted):
        directory,_,_=run_fixtures([fixture],'http://127.0.0.1:8000/v1/infer',tmp_path,allowlist=set(),benchmark_mode=True)
    config=json.loads((directory/'manifest.json').read_text())['config']
    assert (config['gpu'],config['gpuUuid'],config['torch'],config['cuda']) == ('Tesla T4','GPU-00000000-0000-0000-0000-000000000123','2.11.0+cu130','13.0')


def test_runner_deadline_covers_slowly_dripped_http_headers():
    import http.server
    import threading
    import time
    fixture={'fixtureId':'f','task':'STUDENT_LEARNING_ANALYSIS','category':'normal','input':{}}
    digest=canonical_request_hash(fixture)
    class Handler(http.server.BaseHTTPRequestHandler):
        def do_POST(self):
            for line in (b'HTTP/1.1 200 OK\r\n',b'Content-Type: application/json\r\n',b'X-One: 1\r\n',b'X-Two: 2\r\n',b'X-Three: 3\r\n',b'\r\n'):
                try:
                    self.wfile.write(line); self.wfile.flush()
                except OSError:
                    break
                time.sleep(.015)
        def log_message(self,*_): pass
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
    thread=threading.Thread(target=server.serve_forever,daemon=True); thread.start()
    started=time.monotonic()
    try:
        result=run_fixture(fixture,f'http://127.0.0.1:{server.server_port}/v1/infer',allowlist={digest},benchmark_mode=True,timeout=.04)
        assert result['outcome']=='TIMED_OUT'
        assert time.monotonic()-started < .15
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=1)
