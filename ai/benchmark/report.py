from collections import defaultdict
import math

SCORES = ('relevance', 'groundedness', 'actionability', 'vietnamese', 'boundary')
CANDIDATE_MODEL = 'Qwen/Qwen3-4B-Instruct-2507'
CANDIDATE_REVISION = 'cdbee75f17c01a7cc42f958dc650907174af0554'


def summarize(manifest, attempts, scores, *, gpu_verified=False, transport_verified=False):
    expected = [row['fixtureId'] for row in manifest]
    seen = [row['fixtureId'] for row in attempts]
    if len(expected) != len(set(expected)) or len(seen) != len(set(seen)) or any(fid not in expected for fid in seen):
        raise ValueError('duplicate or unexpected fixture/attempt ID')
    run_ids = set()
    outcomes = {'SUCCESS', 'FAILED', 'TIMED_OUT', 'TRANSPORT_ERROR', 'RUNTIME_UNAVAILABLE', 'INTERRUPTED'}
    references = {'PASS', 'VIOLATION', 'UNKNOWN'}
    for row in attempts:
        elapsed = row.get('elapsedSeconds')
        if (not isinstance(row.get('runId'), str) or not row['runId']
            or not isinstance(row.get('requestId'), str) or not row['requestId']
            or not isinstance(row.get('configHash'), str) or len(row['configHash']) != 64
            or any(char not in '0123456789abcdef' for char in row['configHash'].lower())
            or row.get('outcome') not in outcomes
            or not isinstance(row.get('schemaPass'), bool) or not isinstance(row.get('semanticPass'), bool)
            or row.get('referenceStatus') not in references
            or isinstance(elapsed, bool) or not isinstance(elapsed, (int, float)) or not math.isfinite(elapsed) or elapsed < 0
            or (row.get('tokenCount') is not None and (isinstance(row['tokenCount'], bool) or not isinstance(row['tokenCount'], int) or row['tokenCount'] < 0))
            or (row.get('diagnostic') is not None and not isinstance(row.get('diagnostic'), str))):
            raise ValueError('attempt record is incomplete or malformed')
        run_ids.add(row['runId'])
    if any(row.get('configHash') != attempts[0].get('configHash') for row in attempts) if attempts else False:
        raise ValueError('attempt configuration hash mismatch')
    by_fixture = {row['fixtureId']: row for row in attempts}
    by_task = defaultdict(list)
    for row in manifest:
        attempt = by_fixture.get(row['fixtureId'])
        by_task[row.get('task', 'unknown')].append(attempt)
    task_results = {}
    hard_failure = False
    pending = not expected or not gpu_verified or not transport_verified or len(attempts) != len(expected)
    if any(not isinstance(row.get('configHash'), str) or len(row['configHash']) != 64 or any(c not in '0123456789abcdef' for c in row['configHash'].lower()) for row in attempts):
        pending = True
    for task, rows in by_task.items():
        observed = [row for row in rows if row is not None]
        denominator = len(rows)
        schema = sum(row.get('schemaPass') is True for row in observed)
        semantic = sum(row.get('semanticPass') is True for row in observed)
        unknown = sum(row.get('referenceStatus') == 'UNKNOWN' for row in observed) + denominator - len(observed)
        violations = sum(row.get('referenceStatus') == 'VIOLATION' for row in observed)
        timeouts = sum(row.get('outcome') == 'TIMED_OUT' or row.get('elapsedSeconds', 0) >= 60 for row in observed)
        if violations or timeouts or (len(observed) == denominator and (schema / max(denominator, 1) < .95 or semantic / max(denominator, 1) < .95)):
            hard_failure = True
        if unknown or any(row.get('outcome') != 'SUCCESS' for row in observed):
            pending = True
        task_results[task] = {'denominator': denominator, 'schemaPassCount': schema, 'semanticPassCount': semantic,
            'referenceViolations': violations, 'referenceUnknown': unknown, 'timeouts': timeouts}
    score_map = {row.get('fixtureId'): row for row in scores}
    if len(score_map) != len(scores) or set(score_map) != set(expected):
        pending = True
    for score in scores:
        values = [score.get(key) for key in SCORES]
        if any(isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 1 or value > 5 for value in values):
            pending = True
        elif any(value < 4 for value in values):
            hard_failure = True
    return {'status': 'FAIL' if hard_failure else 'PENDING' if pending else 'PASS', 'tasks': task_results,
        'gpuVerified': gpu_verified, 'transportVerified': transport_verified, 'manualScoresComplete': set(score_map) == set(expected)}


def build_final_report(manifest, attempts, scores, evidence, config=None):
    evidence = evidence if isinstance(evidence, dict) else {}
    summary = summarize(manifest, attempts, scores, gpu_verified=evidence.get('gpu') is True,
        transport_verified=evidence.get('transport') is True)
    required = ('realModel', 'lock', 'gpu', 'transport', 'capacity', 'ownerApproval')
    missing = [key for key in required if evidence.get(key) is not True]
    candidate_bound = isinstance(config, dict) and config.get('modelId') == CANDIDATE_MODEL and config.get('modelRevision') == CANDIDATE_REVISION
    if not candidate_bound:
        missing.append('candidate_model_binding')
    required_tasks = {'STUDENT_LEARNING_ANALYSIS', 'STUDENT_STUDY_PLAN_GENERATION', 'STUDENT_STUDY_PLAN_ADJUSTMENT',
        'TEACHER_CLASS_ANALYSIS', 'ADMIN_FEEDBACK_GROUPING_STAGE1', 'ADMIN_FEEDBACK_SUMMARY_STAGE2'}
    by_task = {task: [row for row in manifest if row.get('task') == task] for task in required_tasks}
    corpus_complete = set(row.get('task') for row in manifest) == required_tasks and all(
        len(rows) >= 20 and sum(row.get('category') == 'normal' for row in rows) >= 10
        and sum(row.get('category') in ('boundary', 'adversarial') for row in rows) >= 10
        and all(row.get('status') == 'ATTEMPTED' for row in rows) for rows in by_task.values())
    if not corpus_complete:
        missing.append('complete_six_task_manifest')
    status = 'FAIL' if summary['status'] == 'FAIL' else 'PENDING' if summary['status'] != 'PASS' or missing else 'PASS'
    return {**summary, 'status': status, 'candidateModel': CANDIDATE_MODEL,
        'selectedModel': CANDIDATE_MODEL if status == 'PASS' else None,
        'unmeasuredCandidates': ['Llama 3.1 8B Instruct', 'Mistral 7B Instruct'],
        'missingEvidence': missing}


def validate_attempt_bindings(manifest, attempts, config):
    expected_config = config.get('configHash') if isinstance(config, dict) else None
    rows = {row.get('fixtureId'): row for row in manifest}
    for attempt in attempts:
        fixture = rows.get(attempt.get('fixtureId'))
        if not fixture or attempt.get('requestId') != fixture.get('requestId'):
            raise ValueError('attempt request ID does not match its manifest fixture')
        if not expected_config or attempt.get('configHash') != expected_config:
            raise ValueError('attempt configuration hash does not match run manifest')
        prompt_versions = config.get('promptVersions', {})
        if (attempt.get('outcome') == 'SUCCESS' or attempt.get('modelId') is not None or attempt.get('promptVersion') is not None) and (
            attempt.get('modelId') != config.get('modelId') or attempt.get('promptVersion') != prompt_versions.get(fixture.get('task'))):
            raise ValueError('attempt runtime binding does not match run manifest')


if __name__ == '__main__':
    import argparse, json
    from pathlib import Path
    parser = argparse.ArgumentParser(); parser.add_argument('--run-dir', required=True); args = parser.parse_args()
    directory = Path(args.run_dir)
    full_manifest = json.loads((directory / 'manifest.json').read_text())
    manifest = full_manifest['fixtures']
    attempts = [json.loads(path.read_text()) for path in sorted(directory.glob('attempt-*.json'))]
    validate_attempt_bindings(manifest, attempts, full_manifest.get('config'))
    allowed_run_ids = set(full_manifest.get('runIds', [full_manifest.get('runId')]))
    if any(attempt.get('runId') not in allowed_run_ids for attempt in attempts):
        raise ValueError('attempt run ID is not recorded in manifest')
    for attempt in attempts:
        evaluation = directory / f"evaluation-{attempt['fixtureId']}.json"
        if evaluation.exists():
            result = json.loads(evaluation.read_text())
            if result.get('fixtureId') != attempt['fixtureId']:
                raise ValueError('evaluation fixture ID does not match its attempt')
            attempt.update(result)
    scores = json.loads((directory / 'scores.json').read_text()) if (directory / 'scores.json').exists() else []
    evidence = json.loads((directory / 'evidence.json').read_text()) if (directory / 'evidence.json').exists() else {}
    report = build_final_report(manifest, attempts, scores, evidence, full_manifest.get('config'))
    report['config'] = full_manifest.get('config', {})
    report['fixtureSha256'] = full_manifest.get('fixtureSha256')
    (directory / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
