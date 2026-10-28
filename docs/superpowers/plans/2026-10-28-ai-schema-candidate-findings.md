# AI Schema Candidate Review Findings Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this approved plan task-by-task. Steps use checkbox syntax.

**Goal:** Resolve Candidate 1 review findings about Admin Stage 2 group counts and document/test two proposed error policies without changing frozen behavior.

**Architecture:** Keep all changes in TP-001 and Candidate 1. Treat contract-underspecified Stage 2 projection and proposed error classifications as explicit, unapproved decisions; keep schema validation distinct from proposed NestJS semantic policy.

**Tech Stack:** Markdown, JSON Schema Draft 2020-12, Ajv 8/Ajv2020, Node.js fixtures/runner, ZIP/SHA-256.

**Spec:** AI Contract §§6.3–7.1, 12–13, 18, 20; API R3 Admin orchestration; CR-002 §§2–3; TP-001; Candidate 1.

## Global Constraints

- Do not modify `docs/baseline/` or `BASELINE_MANIFEST.sha256`.
- Do not add a `promptVersion` request field, alter public API/business behavior, approve TP-001/schema pack, or implement Phase 1D.2.
- Keep Candidate 1 marked `CANDIDATE — NOT APPROVED`; label all proposed runtime policies pending owner approval.
- Preserve exactly the §20 schema inventory and one-log-per-attempt AIRequestLog semantics.
- Before any edits, record SHA-256 for the currently user-modified AI Contract and manifest; compare afterward without changing either frozen file.

## Review Focus

- Admin Stage 2 `issueGroups[].count`: R3 API shows backend-calculated count in successful analysis; Contract §§12–13 do not explicitly enumerate Stage 2's internal projection. Include `count` as a traced candidate assumption pending approval.
- `runtime.promptVersion` mismatch: distinguish the post-correlation deployment-conformance check from response correlation; fail-closed would add a success-to-502 path, so require an approved upstream change request for the observable error behavior plus an AI Contract erratum. Do not implement policy.
- Required whitespace-only output text: assert it passes Draft 2020-12 `minLength:1`, and record proposed semantic `AI_INCOMPLETE_DATA` as unapproved for a post-dispatch AI output; since this establishes an observable error mapping left unspecified by §7.1, require upstream change-request/contract approval. Input validation rejected before dispatch has no `AIRequestLog`.

### Pre-work integrity snapshot

- [ ] Before edits, record SHA-256 of `docs/baseline/AI_Contract_v1.0_baseline_final.md` and `docs/baseline/BASELINE_MANIFEST.sha256`; compare after all edits.

### Task 1: Update Stage 2 projection candidate

**Files:**
- Modify Candidate 1 `schemas/admin-feedback-summary-stage2.input.schema.json`
- Modify matching valid/invalid fixtures and `tests/validate.cjs` only if needed
- Modify Candidate `TRACEABILITY.md`, `README.md`, `VALIDATION_REPORT.md`

- [x] Add required integer `count` to the Stage 2 `issueGroups[]` item; keep Stage 1 output without `count`.
- [x] Update valid and invalid fixtures; include a missing-count negative case asserting Ajv `required` at the group path.
- [x] Document the sequence Stage 1 candidate groups → backend validates/deduplicates/drops empty groups/calculates count → Stage 2 receives counted groups. Cite AI Contract §§12.3/13.1 and API R3 Admin flow/example; mark the Stage 2 projection as a candidate assumption because §13.1 does not spell out group fields.
- [x] Run the schema candidate runner; require 15 schemas and precise expected keyword/path for the new negative case.

### Task 2: Propose prompt metadata and whitespace classifications

**Files:**
- Modify `docs/proposals/technical/TP-001-ai-contract-prompt-version-binding.md`
- Create Candidate 1 `fixtures/semantic-proposals.json`
- Modify Candidate 1 `tests/validate.cjs`
- Modify Candidate `TRACEABILITY.md`, `README.md`, `VALIDATION_REPORT.md`

- [x] Add a fail-closed option/recommendation for successful runtime responses whose `runtime.promptVersion` differs from registry/profile: after standard correlation, map as proposed `502 AI_RUNTIME_FAILURE`, internal diagnostic `AI_RUNTIME_PROMPT_VERSION_MISMATCH`, one FAILED log for the already-started attempt, no business success/temp context, no retry. Contrast current §6.4 metadata-only behavior and state that this changes success/failure behavior; require an approved upstream change request and AI Contract erratum before implementation.
- [x] Keep the request envelope unchanged with no `promptVersion`; distinguish profile/registry equality before dispatch from post-dispatch runtime metadata conformance.
- [x] Recommend proposed semantic mapping of required whitespace-only AI output text after dispatch to `AI_INCOMPLETE_DATA`, one FAILED log; state AI Contract §7.1 leaves this classification unspecified and an upstream change request/contract erratum is required because it adds an observable error mapping. Preserve pre-dispatch input rejection with no `AIRequestLog`.
- [x] Add fixture fields `case`, `schema`, `property`, `data`, `schemaExpectedValid`, `proposedClassification`, `proposedLogState`, `scope`, and `approvalStatus`. Target `admin-feedback-summary-stage2.output.schema.json`; clone `fixtures/valid/admin-feedback-summary-stage2.output.json`, replace only required `summary` with `"   "`; mark scope `post-dispatch-ai-output`, classification `AI_INCOMPLETE_DATA`, log `FAILED`, approval `PENDING`.
- [x] In `validate.cjs`, validate the full fixture against that schema; assert Ajv passes, `summary.trim().length === 0`, and metadata records `AI_INCOMPLETE_DATA`/`FAILED`/`PENDING`. Do not apply that mapping in runtime code or claim a NestJS implementation test.

### Task 3: Repackage, independent review, and verify

**Files:** Candidate ZIP/checksum and validation report.

- [x] Rebuild the deterministic ZIP and checksum; assert exactly 15 schema entries and verify `unzip -t`/sidecar.
- [x] Run `pnpm test:ai-schema-candidate` and `pnpm verify:baseline`.
- [x] Obtain independent read-only Superpowers review of schema, wire compatibility, error mapping/log semantics, traceability, and report; fix in-scope findings and rerun affected checks.
- [x] Record current outputs and final review verdict; preserve `CANDIDATE — NOT APPROVED` and state approval decisions still open.

**Stop condition:** report `READY FOR APPROVAL` only if all requested artifacts/evidence and independent review pass; otherwise report `BLOCKED`. Neither outcome approves a proposal or candidate.
