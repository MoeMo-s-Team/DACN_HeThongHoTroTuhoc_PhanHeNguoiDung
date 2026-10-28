# AI Schema Pack Candidate Implementation Plan

> **For agentic workers:** Use this plan task-by-task; run the independent review gate before implementation.

**Goal:** Build a non-normative, testable 15-schema candidate pack and evidence bundle from AI Contract v1.0 without changing frozen/public behavior.

**Architecture:** Keep schemas, fixtures, validation, packaging, and reports under `docs/proposals/technical/candidates/AI_Contract_v1.0_schema_pack_candidate1/`. Add pinned Ajv 8/Ajv2020 and `ajv-formats` as root dev dependencies so one executable Node test can compile the entire registry and exercise checked-in fixtures. Package only the 15 schema files into the ZIP; retain tests and evidence alongside it.

**Tech Stack:** JSON Schema Draft 2020-12; Ajv 8 `Ajv2020`; `ajv-formats`; Node.js and Python standard library for validation/package scripts.

**Spec:** `docs/baseline/AI_Contract_v1.0_baseline_final.md` §§5–8, 9–13, 18, 20, 22; R3/CR-002; `docs/proposals/technical/TP-001-ai-contract-prompt-version-binding.md`.

## Global Constraints

- Exactly the 15 filenames listed in AI Contract §20; candidate identity must not use `rev4`.
- Every schema declares Draft 2020-12, has a unique `$id`, closes its defined business objects with `additionalProperties: false`, and adds no undocumented business constraint. The generic `input`/`output` payload in the envelope is intentionally shape-open at envelope stage; the separate task schema closes it, matching §§6.3 and 7's two-stage validation.
- The request envelope follows §6.3 and does not gain `promptVersion`; the AI-DD-011 discrepancy remains recorded, not silently resolved.
- Schema checks cover structure only; NestJS semantic/reference/temporal checks remain separate. The explicit §22 `attentionGroups[].studentIds.minItems = 1` rule is included in the Teacher output schema.
- Any nested shape not fully specified in the contract is listed with its source and marked as a candidate assumption in `TRACEABILITY.md`; do not invent constraints or imply those assumptions are approved.
- Do not modify `docs/baseline/`, `BASELINE_MANIFEST.sha256`, public API, AI Gateway, or Phase 1D.2.
- Candidate status is `CANDIDATE — NOT APPROVED`; no normative claim.

### Pre-work integrity snapshot

- [ ] Before any candidate/dependency edits, record SHA-256 for the AI Contract and baseline manifest; compare them after verification without updating either frozen file.

## Review Focus

- Request/sample vs AI-DD-011 promptVersion conflict: request schema must not add the field; report it as unresolved.
- Required versus minimum-content error classification: absent required properties map to Ajv `required`/`AI_INCOMPLETE_DATA`; non-empty string schema constraints use `minLength: 1`; trim-only whitespace checks remain NestJS semantic validation. Task-specific minimum-content checks such as non-empty generated plan tasks remain semantic unless the contract explicitly assigns a schema keyword.
- Date-time and enum constraints: use only contract-declared formats/enums; do not encode NestJS cross-field/reference checks.
- Validation phases: envelope validation stays generic, followed by task-specific input/output schema validation; local `$defs` `$ref`s exercise reference compilation without merging these stages.
- Candidate ZIP: only 15 schema files, no fixtures/tests, checksum generated after archive creation.

---

### Task 1: Create schema candidate validation fixtures first

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`
- Create: candidate `TRACEABILITY.md` field/source matrix before the schema and fixture files
- Create: `docs/proposals/technical/candidates/AI_Contract_v1.0_schema_pack_candidate1/fixtures/valid/*.json`
- Create: `docs/proposals/technical/candidates/AI_Contract_v1.0_schema_pack_candidate1/fixtures/invalid/*.json`
- Create: `docs/proposals/technical/candidates/AI_Contract_v1.0_schema_pack_candidate1/fixtures/edge-cases.json`
- Create: `docs/proposals/technical/candidates/AI_Contract_v1.0_schema_pack_candidate1/tests/validate.cjs`

- [ ] Record a field/source matrix for every schema property. Mark underspecified nested inputs as candidate assumptions and keep contract/business semantic rules out of schema keywords.
- [ ] Pin Ajv 8 and `ajv-formats` as root dev dependencies and add candidate validation/pack scripts so the test runner can load its required packages.
- [ ] Add valid fixtures for each schema and invalid fixtures per schema for missing required, wrong type, and unknown properties; add enum/date-time cases for every schema where those keywords apply. Each negative case records expected Ajv keyword and instance path.
- [ ] Implement a Node `assert` runner that expects the exact §20 filename set, compiles all files in one Ajv2020 registry, rejects duplicate `$id`/unresolved local `$ref`, applies `ajv-formats`, validates each fixture and expected keyword/path, and checks every defined business object is closed.
- [ ] Run `node .../tests/validate.cjs` before schemas exist; confirm RED is only the expected missing-schema failure.

### Task 2: Add pinned validator dependencies and create 15 schemas

**Files:**
- Create: `schemas/admin-feedback-grouping-stage1.{input,output}.schema.json`
- Create: `schemas/admin-feedback-summary-stage2.{input,output}.schema.json`
- Create: `schemas/inference-{error,request,success}-envelope.schema.json`
- Create: `schemas/student-learning-analysis.{input,output}.schema.json`
- Create: `schemas/student-study-plan-adjustment.{input,output}.schema.json`
- Create: `schemas/student-study-plan-generation.{input,output}.schema.json`
- Create: `schemas/teacher-class-analysis.{input,output}.schema.json`

- [ ] Implement all 12 task schemas from Contract §§8–13 and three envelopes from §§6.3–6.6; apply the documented candidate field/source matrix, and keep reference, uniqueness, cross-field date, task-specific minimum-content, and trim-only whitespace rules in the traceability report as semantic-only. Encode explicit `minLength: 1` schema constraints where §4.9 requires them.
- [ ] Ensure request envelope has no `promptVersion`; keep its `input` object generic at envelope stage, then validate against the selected task input schema in a separate step. Do likewise for success `output` and task output schemas.
- [ ] Encode only explicit schema-level constraints, including `attentionGroups[].studentIds.minItems = 1` from §22; preserve section 7.1 classifications for required vs invalid-structure cases.
- [ ] Run validation tests and resolve failures without expanding contract constraints.

### Task 3: Package and document candidate evidence

**Files:**
- Modify: candidate `TRACEABILITY.md`
- Create: candidate `README.md`, `VALIDATION_REPORT.md`
- Create: candidate `scripts/package.py`
- Create: `AI_Contract_v1.0_schema_pack_candidate1.zip` and `.sha256`

- [ ] Document all 15 schema-to-contract mappings and separate schema assertions from NestJS semantic assertions.
- [ ] Build a deterministic ZIP containing exactly the 15 schemas; assert names/count, run `unzip -t`, and generate SHA-256.
- [ ] Mark every candidate artifact `CANDIDATE — NOT APPROVED`; state release-owner review/approval remains required.

### Task 4: Verify and review

**Files:** all candidate files and root package changes above.

- [ ] Run `pnpm test:ai-schema-candidate`, pack script, `unzip -t`, schema count, and checksum verification.
- [ ] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` because root dependencies/scripts change.
- [ ] Run `pnpm verify:baseline`; confirm baseline/manifest files remain unchanged by this task.
- [ ] Compare the pre-work SHA-256 snapshot of `docs/baseline/AI_Contract_v1.0_baseline_final.md` and `docs/baseline/BASELINE_MANIFEST.sha256`; do not overwrite the pre-existing user changes.
- [ ] Obtain independent read-only review against AI Contract, R3/CR-002, and the plan; fix all important findings and rerun affected checks.

**Stop condition:** deliver candidate only when all executable schema/archive checks pass and independent review has no unresolved critical/important findings. Candidate remains non-normative and Phase 1D.2 is not implemented.
