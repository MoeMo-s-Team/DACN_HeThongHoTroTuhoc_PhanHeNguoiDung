import hashlib
import json
import os
import subprocess
import sys
import zipfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[2]
RELEASE = ROOT / "docs/releases/ai-contract-v1.0-schema-pack-release1"
ARCHIVE = RELEASE / "AI_Contract_v1.0_schema_pack_release1.zip"
TASKS = {
    "STUDENT_LEARNING_ANALYSIS": "student-learning-analysis",
    "STUDENT_STUDY_PLAN_GENERATION": "student-study-plan-generation",
    "STUDENT_STUDY_PLAN_ADJUSTMENT": "student-study-plan-adjustment",
    "TEACHER_CLASS_ANALYSIS": "teacher-class-analysis",
    "ADMIN_FEEDBACK_GROUPING_STAGE1": "admin-feedback-grouping-stage1",
    "ADMIN_FEEDBACK_SUMMARY_STAGE2": "admin-feedback-summary-stage2",
}
FIXTURES = RELEASE / "fixtures/valid"


def fixture(name):
    return json.loads((FIXTURES / name).read_text())


def request(task):
    slug = TASKS[task]
    return {
        "contractVersion": "1.0", "requestId": f"req-{task}", "task": task,
        "locale": "vi-VN", "input": fixture(f"{slug}.input.json"),
    }


class FakeWorker:
    model_id = "test-model"
    prompt_versions = {task: f"prompt-{task}" for task in TASKS}

    def __init__(self, result):
        self.result = result
        self.starts = 0
        self.closes = 0
        self.calls = []

    def start(self):
        self.starts += 1

    def close(self):
        self.closes += 1

    def infer(self, value):
        self.calls.append(value)
        from ai.runtime.model import GenerationResult
        return GenerationResult(self.result, 0, "eos")


def build_app(worker, token="secret"):
    from ai.runtime.app import create_app
    return create_app(lambda _config: worker, {"AI_RUNTIME_TOKEN": token})


def auth(token="secret"):
    return {"Authorization": f"Bearer {token}"}


def load_archive_schemas():
    with zipfile.ZipFile(ARCHIVE) as archive:
        schemas = {Path(name).name: json.loads(archive.read(name)) for name in archive.namelist()}
    return schemas


def test_schema_pack_has_verified_identity_and_all_refs_compile():
    expected = ARCHIVE.with_suffix(ARCHIVE.suffix + ".sha256").read_text().split()[0]
    assert hashlib.sha256(ARCHIVE.read_bytes()).hexdigest() == expected
    schemas = load_archive_schemas()
    assert len(schemas) == 15
    ids = [schema["$id"] for schema in schemas.values()]
    assert len(ids) == len(set(ids))
    assert all("promptVersion" not in schema.get("properties", {}) for schema in schemas.values())
    for name, schema in schemas.items():
        assert schema["$id"] == f"urn:dacn:ai-contract:v1.0:schema-pack-release1:{name.removesuffix('.schema.json')}"
    registry = Registry().with_resources((schema["$id"], Resource.from_contents(schema)) for schema in schemas.values())
    for schema in schemas.values():
        Draft202012Validator.check_schema(schema)
        Draft202012Validator(schema, registry=registry)
    with zipfile.ZipFile(ARCHIVE) as archive:
        for name in schemas:
            assert archive.read(name) == (RELEASE / "schemas" / name).read_bytes()
    for name, schema in schemas.items():
        fixture_path = FIXTURES / (name.removesuffix(".schema.json") + ".json")
        instance = json.loads(fixture_path.read_text())
        validator = Draft202012Validator(schema, registry=registry, format_checker=FormatChecker())
        assert list(validator.iter_errors(instance)) == []


@pytest.mark.parametrize("task", TASKS)
def test_valid_request_for_each_task_reaches_worker_once(task):
    worker = FakeWorker('{"parsed": true}')
    with TestClient(build_app(worker)) as client:
        response = client.post("/v1/infer", json=request(task), headers=auth())
    assert response.status_code == 200
    assert response.json()["requestId"] == f"req-{task}"
    assert worker.calls == [request(task)]


@pytest.mark.parametrize("mutation", ["missing", "wrong_type", "extra", "enum_or_datetime"])
@pytest.mark.parametrize("task", TASKS)
def test_invalid_task_input_is_rejected_before_worker(task, mutation):
    schemas = load_archive_schemas()
    schema = schemas[f"{TASKS[task]}.input.schema.json"]
    value = request(task)
    if mutation == "missing":
        field = schema["required"][0]
        value["input"].pop(field, None)
    elif mutation == "wrong_type":
        field, descriptor = next((name, item) for name, item in schema["properties"].items() if "type" in item)
        value["input"][field] = {} if descriptor["type"] == "array" else []
    elif mutation == "extra":
        value["input"]["unrecognized_contract_field"] = True
    else:
        def find_constraint(node, instance, path=()):
            if "$ref" in node:
                ref = node["$ref"]
                if ref.startswith("#/"):
                    target = schema
                    for part in ref[2:].split("/"):
                        target = target[part.replace("~1", "/").replace("~0", "~")]
                    return find_constraint(target, instance, path)
            if "enum" in node or node.get("format") == "date-time":
                return path, node
            for name, child in node.get("properties", {}).items():
                found = find_constraint(child, instance.get(name), path + (name,)) if isinstance(instance, dict) and name in instance else None
                if found:
                    return found
            if node.get("type") == "array" and node.get("items") and isinstance(instance, list) and instance:
                return find_constraint(node["items"], instance[0], path + (0,))
            return None
        found = find_constraint(schema, value["input"])
        if not found:
            pytest.skip("task schema defines no enum or date-time field")
        path, descriptor = found
        current = value["input"]
        for segment in path[:-1]:
            current = current[segment]
        current[path[-1]] = "__INVALID_ENUM__" if "enum" in descriptor else "not-a-date"
    worker = FakeWorker("{}")
    with TestClient(build_app(worker)) as client:
        response = client.post("/v1/infer", json=value, headers=auth())
    assert response.status_code == 400
    assert response.json() == {
        "contractVersion": "1.0", "requestId": value["requestId"],
        "error": {"code": "INVALID_REQUEST", "message": "Invalid request"},
    }
    assert worker.calls == []


@pytest.mark.parametrize("headers", [{}, auth("wrong")])
def test_missing_or_wrong_bearer_rejects_before_worker_admission(headers):
    worker = FakeWorker("{}")
    with TestClient(build_app(worker)) as client:
        response = client.post("/v1/infer", json=request(next(iter(TASKS))), headers=headers)
    assert response.status_code == 401
    assert worker.calls == []
    assert "secret" not in response.text and "wrong" not in response.text


def test_benchmark_mode_rejects_non_allowlisted_input_before_worker(monkeypatch):
    monkeypatch.setenv("AI_RUNTIME_BENCHMARK_MODE", "1")
    monkeypatch.setenv("AI_RUNTIME_BENCHMARK_ALLOWLIST", "a" * 64)
    worker = FakeWorker('{}')
    body = request('STUDENT_LEARNING_ANALYSIS')
    with TestClient(build_app(worker)) as client:
        response = client.post('/v1/infer', json=body, headers=auth())
    assert response.status_code == 400
    assert worker.calls == []


def test_benchmark_mode_is_rejected_when_runtime_is_production(monkeypatch):
    monkeypatch.setenv('AI_RUNTIME_BENCHMARK_MODE', '1')
    monkeypatch.setenv('NODE_ENV', 'production')
    worker = FakeWorker('{}')
    with TestClient(build_app(worker)) as client:
        response = client.post('/v1/infer', json=request('STUDENT_LEARNING_ANALYSIS'), headers=auth())
    assert response.status_code == 400
    assert worker.calls == []


def test_benchmark_mode_accepts_only_exact_task_input_hash(monkeypatch):
    import hashlib
    body = request('STUDENT_LEARNING_ANALYSIS')
    canonical = json.dumps({'task': body['task'], 'input': body['input']}, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
    monkeypatch.setenv('AI_RUNTIME_BENCHMARK_MODE', '1')
    monkeypatch.setenv('AI_RUNTIME_BENCHMARK_ALLOWLIST', hashlib.sha256(canonical.encode()).hexdigest())
    worker = FakeWorker('{"strengths":[],"areasToImprove":[],"priorityTopics":[],"reasons":[]}')
    with TestClient(build_app(worker)) as client:
        response = client.post('/v1/infer', json=body, headers=auth())
    assert response.status_code == 200
    assert worker.calls == [body]


@pytest.mark.parametrize("bad,code", [
    ({"requestId": "x"}, "INVALID_REQUEST"),
    ({"contractVersion": "2.0", "requestId": "x", "task": "STUDENT_LEARNING_ANALYSIS", "locale": "vi-VN", "input": {}}, "UNSUPPORTED_CONTRACT"),
    ({"contractVersion": "1.0", "requestId": "x", "task": "UNKNOWN", "locale": "vi-VN", "input": {}}, "UNSUPPORTED_TASK"),
    ({"contractVersion": "1.0", "requestId": "x", "task": "STUDENT_LEARNING_ANALYSIS", "locale": "vi-VN", "input": {}, "promptVersion": "bad"}, "INVALID_REQUEST"),
    ({"contractVersion": "1.0", "requestId": "x", "task": "STUDENT_LEARNING_ANALYSIS", "input": {}}, "INVALID_REQUEST"),
    ({"contractVersion": "1.0", "requestId": "x", "task": 4, "locale": "vi-VN", "input": {}}, "INVALID_REQUEST"),
    ({"contractVersion": "1.0", "requestId": "x", "task": "STUDENT_LEARNING_ANALYSIS", "locale": [], "input": {}}, "INVALID_REQUEST"),
    ({"contractVersion": "1.0", "requestId": "x", "task": "STUDENT_LEARNING_ANALYSIS", "locale": "vi-VN", "input": []}, "INVALID_REQUEST"),
])
def test_invalid_request_envelope_never_admits_worker(bad, code):
    worker = FakeWorker("{}")
    with TestClient(build_app(worker)) as client:
        response = client.post("/v1/infer", json=bad, headers=auth())
    assert response.status_code == 400
    messages = {
        "INVALID_REQUEST": "Invalid request",
        "UNSUPPORTED_CONTRACT": "Unsupported contract version",
        "UNSUPPORTED_TASK": "Unsupported task",
    }
    assert response.json() == {
        "contractVersion": "1.0", "requestId": "x",
        "error": {"code": code, "message": messages[code]},
    }
    assert worker.calls == []


def test_missing_or_invalid_request_id_gets_generic_uncorrelated_400():
    worker = FakeWorker("{}")
    with TestClient(build_app(worker)) as client:
        missing = client.post("/v1/infer", json={"task": "STUDENT_LEARNING_ANALYSIS"}, headers=auth())
        invalid = client.post("/v1/infer", json={"requestId": 17}, headers=auth())
        empty = client.post("/v1/infer", json={"requestId": " "}, headers=auth())
        malformed = client.post("/v1/infer", content=b"{", headers={**auth(), "Content-Type": "application/json"})
    assert all(response.status_code == 400 for response in (missing, invalid, empty, malformed))
    assert all("requestId" not in response.text for response in (missing, invalid, empty, malformed))
    assert worker.calls == []


@pytest.mark.parametrize("raw", ["{bad", "", "[]", "null", '{"nested":{"value":NaN}}', '{"nested":{"value":Infinity}}'])
def test_e5_unparseable_empty_or_non_object_output_is_correlated_error(raw):
    worker = FakeWorker(raw)
    body = request("STUDENT_LEARNING_ANALYSIS")
    with TestClient(build_app(worker)) as client:
        response = client.post("/v1/infer", json=body, headers=auth())
    assert response.status_code == 500
    assert response.json() == {
        "contractVersion": "1.0", "requestId": body["requestId"],
        "error": {"code": "INFERENCE_FAILED", "message": "Inference could not be completed"},
    }
    if raw:
        assert raw not in response.text
    assert "output" not in response.json()
    assert len(worker.calls) == 1


@pytest.mark.parametrize("task", TASKS)
def test_e6_forwards_parsed_objects_unchanged_even_when_task_invalid(task):
    obj = {"invalid-but-parsed": [1, "x"]}
    worker = FakeWorker(json.dumps(obj))
    body = request(task)
    with TestClient(build_app(worker)) as client:
        response = client.post("/v1/infer", json=body, headers=auth())
    assert response.status_code == 200
    assert response.json()["output"] == obj
    assert len(worker.calls) == 1


def test_e6_preserves_large_json_number_lexically():
    worker=FakeWorker('{"amount":1e999}')
    body=request('STUDENT_LEARNING_ANALYSIS')
    with TestClient(build_app(worker)) as client:
        response=client.post('/v1/infer',json=body,headers=auth())
    assert response.status_code==200
    assert '"output":{"amount":1e999}' in response.text


def test_worker_lifecycle_startup_and_shutdown_once():
    worker = FakeWorker("{}")
    with TestClient(build_app(worker)):
        assert worker.starts == 1
        assert worker.closes == 0
    assert worker.closes == 1


def test_module_style_runtime_config_object_is_accepted_by_lifespan():
    from ai.runtime.app import RuntimeConfig, create_app
    worker = FakeWorker('{}')
    app = create_app(lambda _config: worker, lambda: RuntimeConfig(None))
    with TestClient(app):
        assert worker.starts == 1
    assert worker.closes == 1


def test_invalid_config_aborts_startup_before_worker_creation():
    from ai.runtime.app import create_app
    worker = FakeWorker("{}")
    app = create_app(lambda _config: worker, {})
    with pytest.raises(Exception):
        with TestClient(app):
            pytest.fail("invalid runtime configuration must fail before app readiness")
    assert worker.starts == 0
    assert worker.closes == 0


def test_worker_start_failure_closes_created_worker_and_fails_startup():
    worker = FakeWorker("{}")
    def fail_start():
        worker.starts += 1
        raise RuntimeError("startup failed")
    worker.start = fail_start
    with pytest.raises(RuntimeError, match="startup failed"):
        with TestClient(build_app(worker)):
            pytest.fail("startup exception must abort lifespan")
    assert worker.closes == 1


def test_module_import_and_uvicorn_target_do_not_initialize_model_or_cuda():
    code = """
import sys
import multiprocessing.process
from importlib.abc import MetaPathFinder
class BlockGpuImports(MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname == 'torch' or fullname.startswith('transformers'):
            raise AssertionError('GPU/model import during app import')
sys.meta_path.insert(0, BlockGpuImports())
def forbidden_spawn(*args, **kwargs):
    raise AssertionError('GPU worker spawned during app import')
multiprocessing.process.BaseProcess.start = forbidden_spawn
from uvicorn.importer import import_from_string
app = import_from_string('ai.runtime.app:app')
assert app is not None
"""
    subprocess.run([sys.executable, "-c", code], cwd=ROOT, check=True, env=os.environ.copy())


@pytest.mark.parametrize("task", TASKS)
def test_task_shaped_missing_required_output_is_forwarded_unchanged(task):
    from ai.runtime.schemas import validate_output
    slug = TASKS[task]
    output = fixture(f"{slug}.output.json")
    required = load_archive_schemas()[f"{slug}.output.schema.json"]["required"][0]
    output.pop(required)
    assert validate_output(task, output)
    worker = FakeWorker(json.dumps(output))
    body = request(task)
    with TestClient(build_app(worker)) as client:
        response = client.post("/v1/infer", json=body, headers=auth())
    assert response.status_code == 200
    assert response.json()["output"] == output
    assert len(worker.calls) == 1


def test_auth_and_validation_responses_never_log_token_or_body(caplog):
    secret_body = "do-not-log-this-body"
    worker = FakeWorker("{}")
    with TestClient(build_app(worker)) as client:
        response = client.post("/v1/infer", content=secret_body, headers={"Authorization": "Bearer wrong-secret"})
    assert response.status_code == 401
    assert "wrong-secret" not in caplog.text
    assert secret_body not in caplog.text
    assert worker.calls == []


@pytest.mark.parametrize("error_type,status,code", [
    ("RuntimeUnavailable", 503, "RUNTIME_UNAVAILABLE"),
    ("InferenceTimeout", 504, "RUNTIME_UNAVAILABLE"),
    ("InferenceFailure", 500, "INFERENCE_FAILED"),
])
def test_worker_failures_keep_contract_classification(error_type, status, code):
    from ai.runtime import worker as worker_errors
    class FailingWorker(FakeWorker):
        def infer(self, value):
            self.calls.append(value)
            raise getattr(worker_errors, error_type)("private detail")
    worker = FailingWorker("{}")
    body = request("STUDENT_LEARNING_ANALYSIS")
    with TestClient(build_app(worker)) as client:
        response = client.post("/v1/infer", json=body, headers=auth())
    assert response.status_code == status
    assert response.json() == {
        "contractVersion": "1.0", "requestId": body["requestId"],
        "error": {"code": code, "message": "Runtime is unavailable" if status != 500 else "Inference could not be completed"},
    }
    assert "private detail" not in response.text
    assert len(worker.calls) == 1
