from ai.benchmark.report import build_final_report

TASKS = ['STUDENT_LEARNING_ANALYSIS', 'STUDENT_STUDY_PLAN_GENERATION', 'STUDENT_STUDY_PLAN_ADJUSTMENT', 'TEACHER_CLASS_ANALYSIS', 'ADMIN_FEEDBACK_GROUPING_STAGE1', 'ADMIN_FEEDBACK_SUMMARY_STAGE2']
from ai.benchmark.report import CANDIDATE_MODEL, CANDIDATE_REVISION

def candidate_config():
    return {'modelId':CANDIDATE_MODEL,'modelRevision':CANDIDATE_REVISION}


def complete_manifest():
    rows = []
    for task in TASKS:
        for i in range(20):
            rows.append({'fixtureId': f'{task}-{i}', 'task': task, 'category': 'normal' if i < 10 else 'adversarial', 'status': 'ATTEMPTED'})
    return rows


def complete_attempts(manifest, reference='PASS'):
    return [dict(runId='run', requestId=f'req-{row["fixtureId"]}', fixtureId=row['fixtureId'], outcome='SUCCESS', schemaPass=True, semanticPass=True,
        referenceStatus=reference, elapsedSeconds=1, configHash='a' * 64) for row in manifest]


def complete_scores(manifest):
    return [dict(fixtureId=row['fixtureId'], relevance=4, groundedness=4, actionability=4, vietnamese=4, boundary=4) for row in manifest]


def test_report_includes_denominators_and_only_selects_with_complete_evidence():
    manifest = complete_manifest(); attempts = complete_attempts(manifest); scores = complete_scores(manifest)
    attempts[0]['schemaPass'] = attempts[0]['semanticPass'] = False
    attempts[0]['referenceStatus'] = 'UNKNOWN'
    incomplete = build_final_report(manifest, attempts, scores, {'realModel': True, 'lock': True, 'gpu': True, 'transport': True, 'capacity': True, 'ownerApproval': True})
    assert incomplete['status'] == 'PENDING'
    assert incomplete['tasks']['STUDENT_LEARNING_ANALYSIS']['denominator'] == 20
    assert incomplete['tasks']['STUDENT_LEARNING_ANALYSIS']['referenceUnknown'] == 1
    assert incomplete['selectedModel'] is None


def test_any_reference_violation_fails_even_when_scores_are_high():
    manifest = complete_manifest(); attempts = complete_attempts(manifest); attempts[0]['referenceStatus'] = 'VIOLATION'; scores = complete_scores(manifest)
    scores[0].update(relevance=5, groundedness=5, actionability=5, vietnamese=5, boundary=5)
    report = build_final_report(manifest, attempts, scores, {'realModel': True, 'lock': True, 'gpu': True, 'transport': True, 'capacity': True, 'ownerApproval': True})
    assert report['status'] == 'FAIL'
    assert report['selectedModel'] is None


def test_no_evidence_means_pending_and_unmeasured_candidates_stay_unranked():
    report = build_final_report([], [], [], {})
    assert report['status'] == 'PENDING'
    assert report['selectedModel'] is None
    assert report['candidateModel'] == 'Qwen/Qwen3-4B-Instruct-2507'
    assert report['unmeasuredCandidates'] == ['Llama 3.1 8B Instruct', 'Mistral 7B Instruct']
    all_evidence = {'realModel': True, 'lock': True, 'gpu': True, 'transport': True, 'capacity': True, 'ownerApproval': True}
    assert build_final_report([], [], [], all_evidence)['status'] == 'PENDING'


def test_complete_six_task_evidence_can_pass_only_at_95_percent():
    manifest = complete_manifest(); attempts = complete_attempts(manifest); scores = complete_scores(manifest)
    for task in TASKS:
        first = next(row for row in attempts if row['fixtureId'].startswith(task))
        first['schemaPass'] = first['semanticPass'] = False
    evidence = {'realModel': True, 'lock': True, 'gpu': True, 'transport': True, 'capacity': True, 'ownerApproval': True}
    assert build_final_report(manifest, attempts, scores, evidence, candidate_config())['status'] == 'PASS'


def test_other_model_or_revision_cannot_be_selected_as_candidate():
    manifest=complete_manifest(); attempts=complete_attempts(manifest); scores=complete_scores(manifest)
    evidence={'realModel': True, 'lock': True, 'gpu': True, 'transport': True, 'capacity': True, 'ownerApproval': True}
    wrong={**candidate_config(),'modelRevision':'0'*40}
    report=build_final_report(manifest,attempts,scores,evidence,wrong)
    assert report['status']=='PENDING' and report['selectedModel'] is None
    assert 'candidate_model_binding' in report['missingEvidence']


def test_malformed_attempt_evidence_cannot_select_model():
    manifest = complete_manifest(); attempts = complete_attempts(manifest); scores = complete_scores(manifest)
    attempts[0]['elapsedSeconds'] = None
    attempts[0]['referenceStatus'] = 'BAD'
    import pytest
    with pytest.raises(ValueError, match='incomplete or malformed'):
        build_final_report(manifest, attempts, scores, {'realModel': True, 'lock': True, 'gpu': True, 'transport': True, 'capacity': True, 'ownerApproval': True})


def test_nan_human_score_cannot_select_model():
    import math
    import pytest
    manifest=complete_manifest(); attempts=complete_attempts(manifest); scores=complete_scores(manifest)
    scores[0]['relevance']=math.nan
    evidence={'realModel': True, 'lock': True, 'gpu': True, 'transport': True, 'capacity': True, 'ownerApproval': True}
    assert build_final_report(manifest,attempts,scores,evidence)['status'] == 'PENDING'


def test_report_rejects_attempt_config_or_request_id_mismatch():
    import pytest
    from ai.benchmark.report import validate_attempt_bindings
    manifest=[{'fixtureId':'f','task':TASKS[0],'category':'normal','status':'ATTEMPTED','requestId':'manifest-request'}]
    attempt={**complete_attempts(manifest)[0], 'requestId':'manifest-request','modelId':'model','promptVersion':'prompt'}
    config={'configHash':'a'*64,'modelId':'model','promptVersions':{TASKS[0]:'prompt'}}
    validate_attempt_bindings(manifest,[attempt],config)
    attempt['requestId']='other-request'
    with pytest.raises(ValueError, match='request ID'):
        validate_attempt_bindings(manifest,[attempt],config)
    attempt['requestId']='manifest-request'; attempt['configHash']='b'*64
    with pytest.raises(ValueError, match='configuration hash'):
        validate_attempt_bindings(manifest,[attempt],config)


def test_missing_and_malformed_manual_scores_remain_pending():
    import math
    manifest=complete_manifest(); attempts=complete_attempts(manifest); scores=complete_scores(manifest)
    del scores[0]['relevance']
    evidence={'realModel': True, 'lock': True, 'gpu': True, 'transport': True, 'capacity': True, 'ownerApproval': True}
    assert build_final_report(manifest,attempts,scores,evidence)['status'] == 'PENDING'
    scores=complete_scores(manifest); scores[0]['relevance']='excellent'
    assert build_final_report(manifest,attempts,scores,evidence)['status'] == 'PENDING'


def test_failed_attempt_without_runtime_response_binding_stays_in_report():
    from ai.benchmark.report import validate_attempt_bindings
    manifest=[{'fixtureId':'f','task':TASKS[0],'category':'normal','status':'ATTEMPTED','requestId':'request'}]
    attempt=dict(runId='run',requestId='request',fixtureId='f',configHash='a'*64,outcome='TIMED_OUT',elapsedSeconds=59,
        schemaPass=False,semanticPass=False,referenceStatus='UNKNOWN',tokenCount=None)
    config={'configHash':'a'*64,'modelId':'model','promptVersions':{TASKS[0]:'prompt'}}
    validate_attempt_bindings(manifest,[attempt],config)
