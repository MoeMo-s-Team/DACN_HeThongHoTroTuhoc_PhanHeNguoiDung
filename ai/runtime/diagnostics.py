import json
from pathlib import Path


def is_lite_stage1_fixture(request: dict) -> bool:
    if not isinstance(request, dict) or request.get("task") != "ADMIN_FEEDBACK_GROUPING_STAGE1":
        return False
    fixtures = Path(__file__).resolve().parents[1] / "benchmark/fixtures/lite-smoke.jsonl"
    try:
        return any(
            isinstance(fixture := json.loads(line), dict)
            and fixture.get("task") == request["task"]
            and fixture.get("input") == request.get("input")
            for line in fixtures.read_text(encoding="utf-8").splitlines() if line.strip()
        )
    except (OSError, json.JSONDecodeError, KeyError, TypeError):
        return False
