# Candidate 1 Validation and Traceability Report

**Status: CANDIDATE — NOT APPROVED.** This report records validation evidence for a Phase 1D.1 candidate. It does not recover or replace the released Schema Pack Rev.4 and does not authorize Phase 1D.2.

**Candidate 1 status: CANDIDATE — NOT APPROVED.** Owner decisions were approved on 2026-10-28 and issued as the distinct normative Release 1 under `docs/releases/ai-contract-v1.0-schema-pack-release1/`. Candidate 1 remains non-normative and unchanged; this report records its review evidence and decision history, not Release 1 approval.

## Artifact identity

- Archive: `AI_Contract_v1.0_schema_pack_candidate1.zip`
- Contents: exactly 15 schema files from AI Contract §20; no fixtures or scripts in archive.
- SHA-256: `c08fcc3fe258521b613f859d290d096715e3e9cf5011309e5085c36e8403f858`
- Sidecar: `AI_Contract_v1.0_schema_pack_candidate1.zip.sha256`
- Every schema uses a candidate-specific `$id` namespace and `$comment: CANDIDATE — NOT APPROVED`.

## Checks run

| Check | Result | Evidence |
|---|---|---|
| AI Contract v1.0 present and manifest verified | PASS | `pnpm verify:baseline`; 13 listed baseline files reported `OK`. |
| Schema inventory and names | PASS | Runner asserts exact 15-file §20 set. |
| Draft 2020-12 and Ajv 8/Ajv2020 | PASS | Strict Ajv2020 registry compiled all 15 with `ajv-formats`; pinned `ajv@8.20.0`, `ajv-formats@2.1.1`. |
| `$id`, local `$ref`, object closure, request prompt field | PASS | Unique candidate namespace, schema marker, compile/registry assertions; all defined business objects with declared properties have `additionalProperties:false`; request envelope has no `promptVersion`. |
| Fixtures | PASS | 15 valid schema fixtures, 61 invalid cases with expected Ajv keyword/path, 5 optional/null/flow edge cases, and 1 proposal-only semantic case; runner reports 94 assertions. Includes missing required (including Stage 2 group `count` at `/issueGroups/0`), AI-supplied Stage 1 `count` rejected at `/issueGroups/0`, Stage 2 `issueGroups: []` accepted, wrong type, unknown property, applicable enum and `date-time` failures. |
| ZIP integrity and inventory | PASS | `unzip -t` reported no errors; archive listing count is 15. |
| SHA-256 sidecar | PASS | `sha256sum -c AI_Contract_v1.0_schema_pack_candidate1.zip.sha256` from candidate directory reported `OK`. |
| Frozen baseline/manifest unchanged by candidate work | PASS | Pre/post AI Contract hash `44c6bc2f0f6d01a6590d216237d4eb7b5ffc02a0783ffe6fd271178a4c8d4056`; pre/post manifest hash `cfd8cd619e38d80c40d57ee7845c85e0a0b31532ad1cdf2c36d27971f7abebd2`. These values match the pre-work snapshot. |
| Workspace lint/typecheck/test/build | HISTORICAL PASS | These commands passed for an earlier Candidate 1 revision; they were not rerun for the current schema/fixture/documentation revision. |

## Approval dossier

- Decision matrix: `docs/proposals/technical/AI-Contract-Candidate1-decision-matrix.md`.
- Approved contract erratum: `docs/releases/ai-contract-v1.0-schema-pack-release1/AI_Contract_v1.0_Erratum_1_approved.md`; the draft remains as review history.
- Approved upstream CR-003: `docs/releases/ai-contract-v1.0-schema-pack-release1/CR-003_AI_Runtime_Output_Error_Policy_approved.md`; the draft remains as review history.
- Release gates: `RELEASE_CHECKLIST.md`.
- Approver authority: Project Owner; explicit approval recorded in this project session on 2026-10-28. Approver name was not supplied.
- Release readiness must include comparison with original Rev.4 if that source is supplied. Candidate 1 is never labeled as recovered Rev.4.

## Verification run for this dossier revision (2026-10-28)

| Command/check | Result | Current evidence |
|---|---|---|
| `pnpm test:ai-schema-candidate` | PASS | `PASS: 15 schemas compiled; 94 valid/invalid, registry, format, and contract assertions passed.` |
| `pnpm verify:baseline` | PASS | All 13 paths listed by `BASELINE_MANIFEST.sha256` reported `OK`, including AI Contract v1.0. |
| `unzip -t AI_Contract_v1.0_schema_pack_candidate1.zip` | PASS | `No errors detected in compressed data`; listing contains exactly 15 entries. |
| ZIP/source byte comparison | PASS | All 15 archive member names match `schemas/*.schema.json`, and each archived schema is byte-identical to its source file. |
| `sha256sum -c AI_Contract_v1.0_schema_pack_candidate1.zip.sha256` | PASS | Candidate ZIP reported `OK`; current digest `c08fcc3fe258521b613f859d290d096715e3e9cf5011309e5085c36e8403f858`. |
| `git diff --check` | PASS | Exit code 0; no whitespace errors. |
| Frozen input hashes | UNCHANGED | AI Contract `44c6bc2f0f6d01a6590d216237d4eb7b5ffc02a0783ffe6fd271178a4c8d4056`; manifest `cfd8cd619e38d80c40d57ee7845c85e0a0b31532ad1cdf2c36d27971f7abebd2`. |

No workspace lint, typecheck, full test suite, or build was run for this documentation-only approval dossier. Earlier workspace-gate results remain historical and are not a current PASS claim. The independent review of the current revision is pending and will be recorded separately.

The runner tests schema validation only. Its proposal-only whitespace case proves that `summary: "   "` passes Ajv `minLength:1`, then checks that fixture metadata records proposed `AI_INCOMPLETE_DATA`, FAILED, and PENDING for a post-dispatch AI output. It does not implement/verify NestJS error mapping. It does not verify reference membership, request/response correlation, task minimum content, positive business quantities, deduplication, cross-field date windows, or trim-only blank text semantics.

## Contract and baseline trace

- The 3 envelope schemas and 12 task schemas are mapped individually in `TRACEABILITY.md` to AI Contract §§6.3–6.6 and §§8–13; the full file inventory matches §20.
- Schema keyword tests follow AI Contract §§4.9, 7.1 and 18: missing required properties fail under `required`; `minLength:1` is structural; whitespace-only strings remain a separate NestJS semantic check. Type/enum/unknown-property/correlation structure failures are distinct from missing required content.
- Teacher `attentionGroups[].studentIds` has `minItems:1` as explicitly required by §§11.3 and 22.
- R3/API sourced enums and shapes, including score classification, feedback tag/rating, `ProgressView`, nullable Teacher average/rate values and Teacher topic `{id,name}`, are traced in `TRACEABILITY.md`.
- CR-002 §§2–3 remain untouched: the schemas impose no static input-capacity maximum and do not alter pre-dispatch capacity checks, public errors, retries, or `AIRequestLog` semantics.
- The request envelope follows the §6.3 sample, is object-typed, and deliberately has no `promptVersion`. AI-DD-011's reference to `request.promptVersion` remains unresolved. The response `runtime.promptVersion` is metadata, not a correlation key. TP-001 proposes a fail-closed mismatch policy; Candidate 1 does not implement it.
- Admin projection: Stage 1 schema omits `count`; after backend reference validation, deduplication, empty-group removal and count calculation, Candidate 1 Stage 2 input requires an integer `issueGroups[].count`. This is supported by Contract §12.3 and API R3 orchestration/success example. Contract §13.1 does not enumerate the internal group projection, so this field remains a candidate assumption pending owner approval.
- TP-001 now recommends fail-closed treatment of runtime prompt-metadata mismatch after correlation as `AI_RUNTIME_FAILURE`, with one FAILED log/internal diagnostic for the already-dispatched attempt. This would change success to a public error; implementation requires an approved upstream change request and AI Contract erratum. A second pending proposal maps whitespace-only required AI output text to `AI_INCOMPLETE_DATA`/FAILED; it also requires upstream approval. Neither policy is implemented or made normative by Candidate 1.

## Review findings and disposition

Previous independent review found two in-scope coverage gaps required by AI Contract §18.2: rejection of AI-supplied Stage 1 `count` and acceptance of empty Stage 2 `issueGroups`; both were fixed. Fresh read-only independent review of the current 15 schemas, valid/invalid fixtures and runner, traceability, TP-001, decision matrix, erratum/CR drafts, README/report, and release checklist found no remaining blocking Candidate/dossier findings. Review also confirmed the current ZIP member names and bytes match all 15 schema sources exactly. Earlier dossier findings (missing API IDs/status, release-runner identity, archive/source comparison gate, and citation attribution) were corrected. This review is not owner approval. All five owner decisions and approval authority remain pending; no schema bytes changed during review.

## Decisions approved for Release 1

1. The owner approved Candidate 1's nested input mappings and backend-computed Stage 2 `count` projection; Erratum 1 records the approved mapping.
2. AI-DD-011 is clarified through Erratum 1; the request envelope has no `promptVersion` wire field.
3. CR-003 and Erratum 1 approve fail-closed runtime prompt mismatch → `502 AI_RUNTIME_FAILURE`, one FAILED log after dispatch, no retry.
4. CR-003 and Erratum 1 approve whitespace-only required AI output → `502 AI_INCOMPLETE_DATA`, one FAILED log after dispatch, no retry.
5. Release 1 has a separate identity, approval record, namespace, archive and SHA-256; see its validation report and release checklist.
6. Original Rev.4 was not recovered. If it later becomes available, compare it as provenance/audit evidence; do not relabel or replace Release 1 without a new owner decision.

Candidate 1 remains non-normative. Release 1 is the approved companion. Phase 1D.2 remains BLOCKED pending its separate authorization.
