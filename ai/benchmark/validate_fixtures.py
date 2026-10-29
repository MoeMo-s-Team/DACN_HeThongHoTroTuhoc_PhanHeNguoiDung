import json
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[2]
import sys
sys.path.insert(0, str(ROOT))
TASKS = {
    'STUDENT_LEARNING_ANALYSIS': 'student-learning-analysis',
    'STUDENT_STUDY_PLAN_GENERATION': 'student-study-plan-generation',
    'STUDENT_STUDY_PLAN_ADJUSTMENT': 'student-study-plan-adjustment',
    'TEACHER_CLASS_ANALYSIS': 'teacher-class-analysis',
    'ADMIN_FEEDBACK_GROUPING_STAGE1': 'admin-feedback-grouping-stage1',
    'ADMIN_FEEDBACK_SUMMARY_STAGE2': 'admin-feedback-summary-stage2',
}


def validate(rows):
    errors = []
    ids = set()
    for row in rows:
        fid = row.get('fixtureId')
        if not isinstance(fid, str) or fid in ids:
            errors.append(f'duplicate or missing fixtureId: {fid}')
        ids.add(fid)
        task = row.get('task')
        stem = TASKS.get(task)
        if not stem:
            errors.append(f'{fid}: unknown task')
            continue
        if row.get('category') not in ('normal', 'boundary', 'adversarial'):
            errors.append(f'{fid}: invalid category')
        if row.get('category') == 'adversarial' and 'ignore previous instructions' not in json.dumps(row.get('input', {}), ensure_ascii=False).lower():
            errors.append(f'{fid}: adversarial fixture lacks an instruction-injection string')
        from ai.runtime.schemas import task_schema
        if not Draft202012Validator(task_schema(task, 'input'), format_checker=FormatChecker()).is_valid(row.get('input')):
                errors.append(f'{fid}: schema-invalid input')
        if not isinstance(row.get('authoritativeContext'), dict) or row['authoritativeContext'].get('synthetic') is not True:
            errors.append(f'{fid}: provenance is not synthetic')
    by_task = {task: [r for r in rows if r.get('task') == task] for task in TASKS}
    for task, cases in by_task.items():
        if len(cases) < 20 or sum(r.get('category') == 'normal' for r in cases) < 10 or sum(r.get('category') in ('boundary', 'adversarial') for r in cases) < 10:
            errors.append(f'{task}: needs 20 total, 10 normal and 10 boundary/adversarial')
    return errors


def validate_with_backend(rows):
    import subprocess
    result = subprocess.run(['pnpm', '--filter', '@dacn/api', 'exec', 'tsx', '../../ai/benchmark/validate-inputs.ts'],
        cwd=ROOT, input=json.dumps(rows, ensure_ascii=False), text=True, capture_output=True)
    if result.returncode:
        return [result.stderr.strip() or 'backend input validation failed']
    return []


if __name__ == '__main__':
    import sys
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / 'fixtures/fixtures.jsonl'
    rows = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
    problems = validate(rows)
    if not problems:
        problems.extend(validate_with_backend(rows))
    if problems:
        raise SystemExit('\n'.join(problems))
    print(f'validated {len(rows)} synthetic fixtures')
