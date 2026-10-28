#!/usr/bin/env python3
"""Build the deterministic, schema-only normative Release 1 archive."""
from hashlib import sha256
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
SCHEMAS = ROOT / "schemas"
ARCHIVE = ROOT / "AI_Contract_v1.0_schema_pack_release1.zip"
EXPECTED = {
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

files = sorted(path for path in SCHEMAS.iterdir() if path.name.endswith(".schema.json"))
if {path.name for path in files} != EXPECTED:
    raise SystemExit("schema directory does not match the exact AI Contract §20 filename set")
for path in files:
    import json
    schema = json.loads(path.read_text())
    if not schema["$id"].startswith("urn:dacn:ai-contract:v1.0:schema-pack-release1:"):
        raise SystemExit(f"non-release1 $id in {path.name}")
    if "$comment" in schema:
        raise SystemExit(f"candidate marker/comment remains in {path.name}")

with ZipFile(ARCHIVE, "w") as archive:
    for path in files:
        info = ZipInfo(path.name, date_time=(2026, 10, 28, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, path.read_bytes())

digest = sha256(ARCHIVE.read_bytes()).hexdigest()
(ROOT / f"{ARCHIVE.name}.sha256").write_text(f"{digest}  {ARCHIVE.name}\n")
print(f"Created {ARCHIVE.name}: {len(files)} schemas, SHA-256 {digest}")
