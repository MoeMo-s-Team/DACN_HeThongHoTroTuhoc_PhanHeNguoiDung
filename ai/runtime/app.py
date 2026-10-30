from __future__ import annotations

import asyncio
import hmac
import inspect
import json
import os
import hashlib
import logging
import stat
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response

from ai.runtime.diagnostics import is_lite_stage1_fixture
from ai.runtime.schemas import TASK_FILES, validate_envelope, validate_request
from ai.runtime.worker import InferenceFailure, InferenceTimeout, RuntimeUnavailable, WorkerConfig, WorkerController


@dataclass(frozen=True)
class RuntimeConfig:
    token: str | None

    @classmethod
    def from_value(cls, value: Any) -> "RuntimeConfig":
        if isinstance(value, cls):
            return value
        if not isinstance(value, dict) or "AI_RUNTIME_TOKEN" not in value:
            raise ValueError("AI runtime configuration is invalid")
        token = value["AI_RUNTIME_TOKEN"]
        if token is not None and (not isinstance(token, str) or not token):
            raise ValueError("AI runtime configuration is invalid")
        return cls(token)

    @classmethod
    def from_environment(cls) -> "RuntimeConfig":
        return cls.from_value({"AI_RUNTIME_TOKEN": os.environ.get("AI_RUNTIME_TOKEN")})


def _error(request_id: str, code: str, message: str, status: int) -> JSONResponse:
    return JSONResponse(status_code=status, content={
        "contractVersion": "1.0", "requestId": request_id,
        "error": {"code": code, "message": message},
    })


def _reject_json_constant(value: str):
    raise ValueError(f"invalid JSON constant: {value}")


def _worker_factory(_config: RuntimeConfig):
    return WorkerController(WorkerConfig.from_environment())


def _write_lite_diagnostic(value: dict, worker: Any, generated: Any = None,
                           error: Exception | None = None, auth_token: str | None = None,
                           *, is_json_parse_error: bool = False) -> None:
    if os.environ.get("AI_RUNTIME_LITE_DIAGNOSTICS") != "1" or not is_lite_stage1_fixture(value):
        return
    directory_value = os.environ.get("AI_RUNTIME_LITE_DIAGNOSTICS_DIR")
    if not directory_value:
        return
    directory = Path(directory_value).expanduser()
    try:
        directory.mkdir(parents=True, mode=0o700, exist_ok=True)
        info = directory.lstat()
        if (not stat.S_ISDIR(info.st_mode) or info.st_uid != os.geteuid()
                or stat.S_IMODE(info.st_mode) & 0o077):
            return
        parse_error = None
        runtime_error = None
        if is_json_parse_error and isinstance(error, json.JSONDecodeError):
            parse_error = {"type": type(error).__name__, "message": error.msg,
                           "position": error.pos, "line": error.lineno, "column": error.colno}
        elif is_json_parse_error and error is not None:
            parse_error = {"type": type(error).__name__}
        elif error is not None:
            runtime_error = getattr(error, "diagnostic_error_type", type(error).__name__)
        raw_output = getattr(generated, "raw_text", None)
        if isinstance(raw_output, str) and auth_token:
            raw_output = raw_output.replace(auth_token, "[REDACTED]")
        record = {
            "task": value["task"],
            "modelId": getattr(worker, "model_id", None),
            "rawGeneratedOutput": raw_output,
            "outputTokenCount": getattr(generated, "output_token_count", None),
            "terminationReason": getattr(generated, "termination_reason", None),
            "maxNewTokens": int(os.environ.get("AI_RUNTIME_MAX_NEW_TOKENS", "1024")),
            "jsonParsingError": parse_error,
            "runtimeErrorType": runtime_error,
        }
        serialized = json.dumps(record, ensure_ascii=False, indent=2)
        if auth_token and auth_token in serialized:
            return
        path = directory / f"stage1-{uuid.uuid4().hex}.json"
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as output:
            output.write(serialized + "\n")
    except OSError:
        return


def create_app(worker_factory: Callable[[RuntimeConfig], Any], config: Any) -> FastAPI:
    worker_config = config
    worker = None

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        nonlocal worker
        resolved_config = worker_config() if callable(worker_config) else worker_config
        parsed_config = RuntimeConfig.from_value(resolved_config)
        worker = worker_factory(parsed_config)
        _app.state.runtime_config = parsed_config
        try:
            result = worker.start()
            if inspect.isawaitable(result):
                await result
            load_duration = getattr(worker, "load_duration_seconds", None)
            if isinstance(load_duration, (int, float)):
                logging.getLogger("uvicorn.error").info("AI model loaded in %.3f seconds", load_duration)
            yield
        except BaseException:
            result = worker.close()
            if inspect.isawaitable(result):
                await result
            worker = None
            raise
        else:
            result = worker.close()
            if inspect.isawaitable(result):
                await result
            worker = None

    app = FastAPI(lifespan=lifespan)

    @app.post("/v1/infer")
    async def infer(request: Request):
        if worker_config is None:
            return JSONResponse(status_code=503, content={"error": "Runtime unavailable"})
        current_config = getattr(request.app.state, "runtime_config", None)
        if current_config is None:
            return JSONResponse(status_code=503, content={"error": "Runtime unavailable"})
        if current_config.token is not None:
            supplied = request.headers.get("authorization", "")
            scheme, separator, credential = supplied.partition(" ")
            if not separator or scheme.lower() != "bearer" or not hmac.compare_digest(credential.encode(), current_config.token.encode()):
                return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        try:
            value = json.loads(await request.body(), parse_constant=_reject_json_constant)
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
            return JSONResponse(status_code=400, content={"error": "Invalid request"})
        request_id = value.get("requestId") if isinstance(value, dict) else None
        if not isinstance(request_id, str) or not request_id.strip():
            return JSONResponse(status_code=400, content={"error": "Invalid request"})
        contract_version = value.get("contractVersion") if isinstance(value, dict) else None
        if isinstance(contract_version, str) and contract_version != "1.0":
            return _error(request_id, "UNSUPPORTED_CONTRACT", "Unsupported contract version", 400)
        task = value.get("task") if isinstance(value, dict) else None
        if isinstance(task, str) and task not in TASK_FILES:
            return _error(request_id, "UNSUPPORTED_TASK", "Unsupported task", 400)
        if validate_envelope("request", value):
            return _error(request_id, "INVALID_REQUEST", "Invalid request", 400)
        try:
            validate_request(value)
        except ValueError:
            return _error(request_id, "INVALID_REQUEST", "Invalid request", 400)
        if os.environ.get("AI_RUNTIME_BENCHMARK_MODE") == "1":
            if any(os.environ.get(name, "").lower() == "production" for name in ("NODE_ENV", "AI_RUNTIME_ENV", "AI_DEPLOYMENT_MODE")):
                return _error(request_id, "INVALID_REQUEST", "Invalid request", 400)
            canonical = json.dumps({"task": value["task"], "input": value["input"]}, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
            digest = hashlib.sha256(canonical.encode()).hexdigest()
            allowed = set(filter(None, os.environ.get("AI_RUNTIME_BENCHMARK_ALLOWLIST", "").split(",")))
            if digest not in allowed:
                return _error(request_id, "INVALID_REQUEST", "Invalid request", 400)
        generated = None
        try:
            generated = await asyncio.to_thread(worker.infer, value)
            raw_text = generated.raw_text
            try:
                output = json.loads(raw_text, parse_constant=_reject_json_constant)
            except (json.JSONDecodeError, ValueError) as error:
                _write_lite_diagnostic(value, worker, generated, error, current_config.token,
                                       is_json_parse_error=True)
                return _error(request_id, "INFERENCE_FAILED", "Inference could not be completed", 500)
            if not isinstance(output, dict):
                error = ValueError("generated JSON is not an object")
                _write_lite_diagnostic(value, worker, generated, error, current_config.token,
                                       is_json_parse_error=True)
                return _error(request_id, "INFERENCE_FAILED", "Inference could not be completed", 500)
            _write_lite_diagnostic(value, worker, generated, auth_token=current_config.token)
        except InferenceTimeout:
            return _error(request_id, "RUNTIME_UNAVAILABLE", "Runtime is unavailable", 504)
        except RuntimeUnavailable:
            return _error(request_id, "RUNTIME_UNAVAILABLE", "Runtime is unavailable", 503)
        except InferenceFailure as error:
            _write_lite_diagnostic(value, worker, generated, error, current_config.token)
            return _error(request_id, "INFERENCE_FAILED", "Inference could not be completed", 500)
        except Exception as error:
            _write_lite_diagnostic(value, worker, generated, error, current_config.token)
            return _error(request_id, "INFERENCE_FAILED", "Inference could not be completed", 500)
        prompt_versions = worker.prompt_versions
        runtime = {
            "modelId": worker.model_id,
            "promptVersion": prompt_versions[value["task"]],
        }
        success = {
            "contractVersion": "1.0", "requestId": request_id, "task": value["task"],
            "output": output, "runtime": runtime,
        }
        if validate_envelope("success", success):
            return _error(request_id, "INFERENCE_FAILED", "Inference could not be completed", 500)
        prefix = json.dumps({key: success[key] for key in ("contractVersion", "requestId", "task")}, ensure_ascii=False, separators=(",", ":"))[:-1]
        body = prefix + ',"output":' + raw_text + ',"runtime":' + json.dumps(runtime, ensure_ascii=False, separators=(",", ":")) + "}"
        return Response(content=body, media_type="application/json")

    return app


app = create_app(_worker_factory, RuntimeConfig.from_environment)
