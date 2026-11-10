import asyncio
import hashlib
import json
import re
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import RuntimeSettings
from app.main import TASKS, create_app

ROOT = Path(__file__).resolve().parents[2]
API_AI = ROOT / "apps/api/src/ai"
VALID = API_AI / "__fixtures__/release1/valid"


class FakeEngine:
    def __init__(self, generated: str | Exception | None = None, available: bool = True):
        self.generated = generated
        self.available = available
        self.calls = 0

    async def generate(self, task: str, prompt: str, output_schema: dict) -> str:
        self.calls += 1
        if isinstance(self.generated, Exception):
            raise self.generated
        if self.generated is not None:
            return self.generated
        filename = TASKS[task]["output_schema"]
        fixture = VALID / filename.replace(".schema.json", ".json")
        return fixture.read_text()

    async def ready(self) -> bool:
        return self.available


def client(engine: FakeEngine | None = None) -> tuple[TestClient, FakeEngine]:
    selected = engine or FakeEngine()
    settings = RuntimeSettings(
        token="test-runtime-secret",
        ollama_base_url="http://ollama.test",
        model="qwen2.5:1.5b",
        model_id="qwen2.5:1.5b@sha256:65ec06548149b04c096a120e4a6da9d4017ea809c91734ea5631e89f96ddc57b",
        model_digest="65ec06548149b04c096a120e4a6da9d4017ea809c91734ea5631e89f96ddc57b",
        prompt_versions={task: item["prompt_version"] for task, item in TASKS.items()},
        generation_options={"temperature": 0, "top_p": 1, "num_ctx": 32768, "num_predict": -1},
    )
    return TestClient(create_app(settings, selected)), selected


def payload(task: str, input_data: dict | None = None) -> dict:
    if input_data is None:
        name = TASKS[task]["input_schema"].replace(".schema.json", ".json")
        input_data = json.loads((VALID / name).read_text())
    return {
        "contractVersion": "1.0",
        "requestId": "ai_req_contract_test",
        "task": task,
        "locale": "vi-VN",
        "input": input_data,
    }


@pytest.mark.parametrize(
    "task",
    [
        "STUDENT_LEARNING_ANALYSIS",
        "STUDENT_STUDY_PLAN_GENERATION",
        "STUDENT_STUDY_PLAN_ADJUSTMENT",
        "TEACHER_CLASS_ANALYSIS",
        "ADMIN_FEEDBACK_GROUPING_STAGE1",
        "ADMIN_FEEDBACK_SUMMARY_STAGE2",
    ],
)
def test_each_released_task_returns_correlated_object_with_registered_prompt(task: str) -> None:
    app, engine = client()

    response = app.post("/v1/infer", json=payload(task), headers={"Authorization": "Bearer test-runtime-secret"})

    assert response.status_code == 200
    body = response.json()
    assert body["contractVersion"] == "1.0"
    assert body["requestId"] == "ai_req_contract_test"
    assert body["task"] == task
    assert body["runtime"]["promptVersion"] == TASKS[task]["prompt_version"]
    assert isinstance(body["output"], dict)
    assert engine.calls == 1


def test_runtime_registry_contains_exactly_the_six_contract_keys() -> None:
    assert set(TASKS) == {
        "STUDENT_LEARNING_ANALYSIS",
        "STUDENT_STUDY_PLAN_GENERATION",
        "STUDENT_STUDY_PLAN_ADJUSTMENT",
        "TEACHER_CLASS_ANALYSIS",
        "ADMIN_FEEDBACK_GROUPING_STAGE1",
        "ADMIN_FEEDBACK_SUMMARY_STAGE2",
    }


def test_runtime_prompt_versions_match_nestjs_task_registry() -> None:
    source = (API_AI / "ai-task.registry.ts").read_text()
    for task, definition in TASKS.items():
        start = source.index(f"  {task}: {{")
        end = source.index("\n  },", start)
        match = re.search(r"promptVersion:\s*'([^']+)'", source[start:end])
        assert match is not None
        assert definition["prompt_version"] == match.group(1)


def test_runtime_schema_bytes_match_nestjs_release1_assets() -> None:
    runtime = Path(__file__).resolve().parents[1] / "app/schemas/release1"
    nest = API_AI / "schemas/release1"
    assert sorted(path.name for path in runtime.glob("*.schema.json")) == sorted(
        path.name for path in nest.glob("*.schema.json")
    )
    for schema in runtime.glob("*.schema.json"):
        assert schema.read_bytes() == (nest / schema.name).read_bytes()


def test_missing_or_invalid_bearer_token_is_rejected_without_echoing_secret() -> None:
    app, engine = client()
    response = app.post(
        "/v1/infer", json=payload("STUDENT_LEARNING_ANALYSIS"), headers={"Authorization": "Bearer wrong-secret"}
    )

    assert response.status_code == 401
    assert "test-runtime-secret" not in response.text
    assert "wrong-secret" not in response.text
    assert response.json() == {
        "contractVersion": "1.0",
        "requestId": "",
        "error": {"code": "INVALID_REQUEST", "message": "Invalid inference request"},
    }
    from jsonschema import Draft202012Validator

    schema_path = Path(__file__).resolve().parents[1] / "app/schemas/release1/inference-error-envelope.schema.json"
    error_schema = json.loads(schema_path.read_text())
    Draft202012Validator(error_schema).validate(response.json())
    assert engine.calls == 0


def test_missing_bearer_token_is_rejected_before_generation() -> None:
    app, engine = client()

    response = app.post("/v1/infer", json=payload("STUDENT_LEARNING_ANALYSIS"))

    assert response.status_code == 401
    assert engine.calls == 0


def test_unknown_task_returns_correlated_unsupported_task_without_dispatch() -> None:
    app, engine = client()
    request = payload("STUDENT_LEARNING_ANALYSIS")
    request["task"] = "NOT_A_RELEASED_TASK"

    response = app.post("/v1/infer", json=request, headers={"Authorization": "Bearer test-runtime-secret"})

    assert response.status_code == 400
    assert response.json() == {
        "contractVersion": "1.0",
        "requestId": request["requestId"],
        "error": {"code": "UNSUPPORTED_TASK", "message": "Unsupported AI task"},
    }
    assert engine.calls == 0


def test_unsupported_contract_returns_contract_error_without_dispatch() -> None:
    app, engine = client()
    request = payload("STUDENT_LEARNING_ANALYSIS")
    request["contractVersion"] = "2.0"

    response = app.post("/v1/infer", json=request, headers={"Authorization": "Bearer test-runtime-secret"})

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "UNSUPPORTED_CONTRACT"
    assert response.json()["requestId"] == request["requestId"]
    assert engine.calls == 0


@pytest.mark.parametrize("raw_body", [b"", b"{broken-json", b'{"value":NaN}'])
def test_empty_or_malformed_inbound_http_json_is_invalid_request(raw_body: bytes) -> None:
    app, engine = client()

    response = app.post(
        "/v1/infer",
        content=raw_body,
        headers={
            "Authorization": "Bearer test-runtime-secret",
            "Content-Type": "application/json",
        },
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_REQUEST"
    assert engine.calls == 0


@pytest.mark.parametrize("generated", ["", "not json", "[]", "null", '"text"', '{"value":NaN}'])
def test_generated_empty_malformed_or_non_object_text_is_e5_failure(generated: str) -> None:
    app, engine = client(FakeEngine(generated=generated))

    response = app.post(
        "/v1/infer", json=payload("STUDENT_LEARNING_ANALYSIS"), headers={"Authorization": "Bearer test-runtime-secret"}
    )

    assert response.status_code == 500
    assert response.json() == {
        "contractVersion": "1.0",
        "requestId": "ai_req_contract_test",
        "error": {"code": "INFERENCE_FAILED", "message": "Inference could not be completed"},
    }
    assert engine.calls == 1


def test_parsed_object_is_returned_unchanged_for_nestjs_validation() -> None:
    output = {"unknownField": [1, {"value": True}]}
    app, _ = client(FakeEngine(generated=json.dumps(output)))

    response = app.post(
        "/v1/infer", json=payload("STUDENT_LEARNING_ANALYSIS"), headers={"Authorization": "Bearer test-runtime-secret"}
    )

    assert response.status_code == 200
    assert response.json()["output"] == output


def test_model_unavailable_returns_generic_runtime_unavailable_without_prompt_logs(
    caplog: pytest.LogCaptureFixture,
) -> None:
    from app.engine.ollama import EngineUnavailable

    app, engine = client(FakeEngine(generated=EngineUnavailable("private prompt and test-runtime-secret")))

    response = app.post(
        "/v1/infer", json=payload("STUDENT_LEARNING_ANALYSIS"), headers={"Authorization": "Bearer test-runtime-secret"}
    )

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "RUNTIME_UNAVAILABLE"
    assert "test-runtime-secret" not in response.text + caplog.text
    assert "private prompt" not in response.text + caplog.text
    assert engine.calls == 1


def test_generation_timeout_is_a_correlated_504_without_retry() -> None:
    from app.engine.ollama import EngineTimeout

    app, engine = client(FakeEngine(generated=EngineTimeout()))

    response = app.post(
        "/v1/infer", json=payload("STUDENT_LEARNING_ANALYSIS"), headers={"Authorization": "Bearer test-runtime-secret"}
    )

    assert response.status_code == 504
    assert response.json()["error"]["code"] == "INFERENCE_FAILED"
    assert response.json()["requestId"] == "ai_req_contract_test"
    assert engine.calls == 1


def test_attempt_deadline_covers_readiness_and_generation(monkeypatch: pytest.MonkeyPatch) -> None:
    class SlowReadinessEngine(FakeEngine):
        async def ready(self) -> bool:
            await asyncio.sleep(0.03)
            return True

    monkeypatch.setattr("app.main.INFERENCE_TIMEOUT_SECONDS", 0.005)
    app, engine = client(SlowReadinessEngine())

    response = app.post(
        "/v1/infer", json=payload("STUDENT_LEARNING_ANALYSIS"), headers={"Authorization": "Bearer test-runtime-secret"}
    )

    assert response.status_code == 504
    assert response.json()["error"]["code"] == "INFERENCE_FAILED"
    assert engine.calls == 0


@pytest.mark.parametrize("generated", ['{"value":1e999}', '{"value":"\\ud800"}'])
def test_generated_non_json_representable_object_returns_correlated_inference_failure(generated: str) -> None:
    app, _ = client(FakeEngine(generated=generated))

    response = app.post(
        "/v1/infer", json=payload("STUDENT_LEARNING_ANALYSIS"), headers={"Authorization": "Bearer test-runtime-secret"}
    )

    assert response.status_code == 500
    assert response.json() == {
        "contractVersion": "1.0",
        "requestId": "ai_req_contract_test",
        "error": {"code": "INFERENCE_FAILED", "message": "Inference could not be completed"},
    }


def test_deeply_nested_generated_json_returns_correlated_inference_failure() -> None:
    generated = '{"value":' + "[" * 50000 + "0" + "]" * 50000 + "}"
    app, _ = client(FakeEngine(generated=generated))

    response = app.post(
        "/v1/infer", json=payload("STUDENT_LEARNING_ANALYSIS"), headers={"Authorization": "Bearer test-runtime-secret"}
    )

    assert response.status_code == 500
    assert response.json() == {
        "contractVersion": "1.0",
        "requestId": "ai_req_contract_test",
        "error": {"code": "INFERENCE_FAILED", "message": "Inference could not be completed"},
    }


def test_deeply_nested_inbound_json_returns_invalid_request_without_generation() -> None:
    app, engine = client()
    raw = (
        b'{"contractVersion":"1.0","requestId":"ai_req_contract_test",'
        b'"task":"STUDENT_LEARNING_ANALYSIS","locale":"vi-VN","input":' + b"[" * 50000 + b"0" + b"]" * 50000 + b"}"
    )

    response = app.post(
        "/v1/infer",
        content=raw,
        headers={"Authorization": "Bearer test-runtime-secret", "Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_REQUEST"
    assert engine.calls == 0


def test_readiness_is_false_until_exact_model_is_available() -> None:
    app, engine = client(FakeEngine(available=False))

    assert app.get("/health/live").status_code == 200
    assert app.get("/health/ready").status_code == 503
    response = app.post(
        "/v1/infer", json=payload("STUDENT_LEARNING_ANALYSIS"), headers={"Authorization": "Bearer test-runtime-secret"}
    )
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "RUNTIME_UNAVAILABLE"
    assert engine.calls == 0


def test_external_attempt_deadline_is_fixed_at_sixty_seconds() -> None:
    from app.config import INFERENCE_TIMEOUT_SECONDS

    assert INFERENCE_TIMEOUT_SECONDS == 60


def test_invalid_task_input_is_rejected_without_generation() -> None:
    app, engine = client()

    response = app.post(
        "/v1/infer",
        json=payload("STUDENT_LEARNING_ANALYSIS", {"unexpected": True}),
        headers={"Authorization": "Bearer test-runtime-secret"},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_REQUEST"
    assert engine.calls == 0


def test_task_registry_does_not_expose_prompt_version_in_request_envelope() -> None:
    app, engine = client()
    request = payload("STUDENT_LEARNING_ANALYSIS")
    request["promptVersion"] = "caller-selected-version"

    response = app.post("/v1/infer", json=request, headers={"Authorization": "Bearer test-runtime-secret"})

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_REQUEST"
    assert engine.calls == 0


def test_release_schema_checksums_and_model_manifest_are_pinned() -> None:
    runtime = Path(__file__).resolve().parents[1] / "app/schemas/release1"
    checks = {
        name: digest
        for digest, name in (line.split("  ", 1) for line in (runtime / "SHA256SUMS").read_text().splitlines())
    }
    assert len(checks) == 15
    for name, digest in checks.items():
        assert hashlib.sha256((runtime / name).read_bytes()).hexdigest() == digest
    manifest = json.loads((ROOT / "deployment/model-manifest.json").read_text())
    assert manifest["modelDigest"] == "65ec06548149b04c096a120e4a6da9d4017ea809c91734ea5631e89f96ddc57b"
    assert manifest["quantization"] == "Q4_K_M"
    assert manifest["capacityCertification"] == "NONE"


def test_ollama_engine_checks_exact_digest_and_uses_pinned_settings() -> None:
    from app.engine.ollama import OllamaEngine

    events: list[str] = []
    expected_digest = "65ec06548149b04c096a120e4a6da9d4017ea809c91734ea5631e89f96ddc57b"
    expected_model = "qwen2.5:1.5b"
    runtime_settings = RuntimeSettings(
        token="test-runtime-secret",
        ollama_base_url="http://ollama.test",
        model=expected_model,
        model_id=f"qwen2.5:1.5b@sha256:{expected_digest}",
        model_digest=expected_digest,
        prompt_versions={task: item["prompt_version"] for task, item in TASKS.items()},
        generation_options={"temperature": 0, "top_p": 1, "num_ctx": 32768, "num_predict": -1},
    )

    def respond(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/tags":
            events.append("tags")
            return httpx.Response(200, json={"models": [{"name": expected_model, "digest": expected_digest}]})
        events.append("generate")
        body = json.loads(request.content)
        assert body["model"] == expected_model
        assert body["options"] == runtime_settings.generation_options
        assert body["stream"] is False
        return httpx.Response(200, json={"response": "{}"})

    engine = OllamaEngine(runtime_settings, httpx.MockTransport(respond))
    assert asyncio.run(engine.ready()) is True
    assert asyncio.run(engine.generate("STUDENT_LEARNING_ANALYSIS", "full input", {})) == "{}"
    assert events == ["tags", "generate"]


def test_ollama_engine_rejects_digest_mismatch_without_generation() -> None:
    from app.engine.ollama import OllamaEngine

    events: list[str] = []
    expected_digest = "65ec06548149b04c096a120e4a6da9d4017ea809c91734ea5631e89f96ddc57b"
    settings = RuntimeSettings(
        token="test-runtime-secret",
        ollama_base_url="http://ollama.test",
        model="qwen2.5:1.5b",
        model_id=f"qwen2.5:1.5b@sha256:{expected_digest}",
        model_digest=expected_digest,
        prompt_versions={task: item["prompt_version"] for task, item in TASKS.items()},
        generation_options={"temperature": 0, "top_p": 1, "num_ctx": 32768, "num_predict": -1},
    )

    def respond(request: httpx.Request) -> httpx.Response:
        events.append(request.url.path)
        return httpx.Response(200, json={"models": [{"name": settings.model, "digest": "0" * 64}]})

    engine = OllamaEngine(settings, httpx.MockTransport(respond))
    assert asyncio.run(engine.ready()) is False
    assert events == ["/api/tags"]
