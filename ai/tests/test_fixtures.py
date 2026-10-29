import json
from pathlib import Path

from ai.benchmark.validate_fixtures import validate


def test_fixture_corpus_has_120_valid_synthetic_cases():
    rows = [json.loads(line) for line in Path('ai/benchmark/fixtures/fixtures.jsonl').read_text().splitlines()]
    assert len(rows) == 120
    assert len({row['fixtureId'] for row in rows}) == 120
    counts = {}
    for row in rows:
        counts.setdefault(row['task'], {}).setdefault(row['category'], 0)
        counts[row['task']][row['category']] += 1
    assert len(counts) == 6
    assert all(sum(parts.values()) >= 20 and parts.get('normal', 0) >= 10 and sum(v for k, v in parts.items() if k != 'normal') >= 10 for parts in counts.values())
    assert validate(rows) == []
    assert any('Ôn tập' in json.dumps(row, ensure_ascii=False) for row in rows)
    assert any('Ignore previous instructions' in json.dumps(row) for row in rows)
    assert all(any('Ignore previous instructions' in json.dumps(row['input']) for row in rows if row['task'] == task and row['category'] == 'adversarial') for task in counts)
    assert any(row['task'] == 'TEACHER_CLASS_ANALYSIS' and not row['input']['needsAttentionStudents'] for row in rows)
