from __future__ import annotations

import hashlib
import json
import zipfile
from functools import lru_cache
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[2]
ARCHIVE = ROOT / "docs/releases/ai-contract-v1.0-schema-pack-release1/AI_Contract_v1.0_schema_pack_release1.zip"
SCHEMA_NAMES = {
    "admin-feedback-grouping-stage1.input.schema.json",
    "admin-feedback-grouping-stage1.output.schema.json",
    "admin-feedback-summary-stage2.input.schema.json",
    "admin-feedback-summary-stage2.output.schema.json",
    "inference-error-envelope.schema.json",
    "inference-request-envelope.schema.json",
    "inference-success-envelope.schema.json",
    "student-learning-analysis.input.schema.json",
    "student-learning-analysis.output.schema.json",
    "student-study-plan-adjustment.input.schema.json",
    "student-study-plan-adjustment.output.schema.json",
    "student-study-plan-generation.input.schema.json",
    "student-study-plan-generation.output.schema.json",
    "teacher-class-analysis.input.schema.json",
    "teacher-class-analysis.output.schema.json",
}
TASK_FILES = {
    "STUDENT_LEARNING_ANALYSIS": "student-learning-analysis",
    "STUDENT_STUDY_PLAN_GENERATION": "student-study-plan-generation",
    "STUDENT_STUDY_PLAN_ADJUSTMENT": "student-study-plan-adjustment",
    "TEACHER_CLASS_ANALYSIS": "teacher-class-analysis",
    "ADMIN_FEEDBACK_GROUPING_STAGE1": "admin-feedback-grouping-stage1",
    "ADMIN_FEEDBACK_SUMMARY_STAGE2": "admin-feedback-summary-stage2",
}
ENVELOPE_FILES = {
    "request": "inference-request-envelope.schema.json",
    "success": "inference-success-envelope.schema.json",
    "error": "inference-error-envelope.schema.json",
}


@lru_cache(maxsize=1)
def _validators() -> tuple[dict[str, Draft202012Validator], dict[str, dict]]:
    sidecar = ARCHIVE.with_suffix(ARCHIVE.suffix + ".sha256")
    expected = sidecar.read_text(encoding="utf-8").split()[0]
    if hashlib.sha256(ARCHIVE.read_bytes()).hexdigest() != expected:
        raise RuntimeError("AI Contract schema archive checksum mismatch")
    with zipfile.ZipFile(ARCHIVE) as archive:
        names = {Path(name).name for name in archive.namelist()}
        if names != SCHEMA_NAMES or len(archive.namelist()) != len(SCHEMA_NAMES):
            raise RuntimeError("AI Contract schema archive inventory mismatch")
        schemas = {Path(name).name: json.loads(archive.read(name)) for name in archive.namelist()}
    ids = [schema.get("$id") for schema in schemas.values()]
    if None in ids or len(ids) != len(set(ids)):
        raise RuntimeError("AI Contract schema IDs are missing or duplicated")
    registry = Registry().with_resources(
        (schema["$id"], Resource.from_contents(schema)) for schema in schemas.values()
    )
    validators = {}
    for name, schema in schemas.items():
        Draft202012Validator.check_schema(schema)
        validators[name] = Draft202012Validator(schema, registry=registry, format_checker=FormatChecker())
    return validators, schemas


def validate_envelope(kind: str, value: object) -> list[str]:
    filename = ENVELOPE_FILES.get(kind)
    if not filename:
        return ["unsupported envelope kind"]
    validator = _validators()[0][filename]
    return [error.message for error in validator.iter_errors(value)]


def validate_output(task: str, output: object) -> list[str]:
    slug = TASK_FILES.get(task)
    if not slug:
        return ["unsupported task"]
    validator = _validators()[0][f"{slug}.output.schema.json"]
    return [error.message for error in validator.iter_errors(output)]


def validate_request(value: object) -> None:
    if validate_envelope("request", value):
        raise ValueError("request envelope is invalid")
    task = value["task"]  # type: ignore[index]
    if _validators()[0][f"{TASK_FILES[task]}.input.schema.json"].is_valid(value["input"]):  # type: ignore[index]
        return
    raise ValueError("task input is invalid")


def task_schema(task: str, direction: str) -> dict:
    slug = TASK_FILES.get(task)
    if direction not in {"input", "output"} or not slug:
        raise ValueError("unknown AI task schema")
    return _validators()[1][f"{slug}.{direction}.schema.json"]
