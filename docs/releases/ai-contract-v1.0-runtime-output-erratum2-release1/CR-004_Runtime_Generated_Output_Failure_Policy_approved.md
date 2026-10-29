# CR-004 — Runtime Generated Output Failure Policy

**Status:** APPROVED — downstream Change Request release  
**Created:** 2026-10-29  
**Author:** Codex  
**Trigger:** Owner Decision — Phase 1D.3 Runtime Output Failure Semantics (approved in principle, subject to governance release)

## 1. Summary

Request a downstream governance decision for how AI Runtime represents model-generated output that cannot be parsed as a JSON object. Proposed behavior: return correlated HTTP 500 `INFERENCE_FAILED`; existing NestJS gateway maps this to public `502 AI_RUNTIME_FAILURE`. Parsed objects, including task-schema-invalid objects, use the HTTP 200 success envelope unchanged so NestJS remains authoritative for task schema and semantic classification. Whitespace-only required text remains `AI_INCOMPLETE_DATA` under Erratum 1 E4/CR-003.

## 2. Reason for Proposal

- [x] Existing AI runtime behavior needs an exact failure mapping.
- [x] Proposed mapping is observable to API consumers and needs governance release.

Contract §7.1 classifies malformed JSON received at NestJS as `AI_INVALID_STRUCTURE`, while §6.6 maps correlated runtime `INFERENCE_FAILED` to `AI_RUNTIME_FAILURE`. This proposal distinguishes malformed model text rejected inside Runtime from malformed HTTP JSON actually received by NestJS.

## 3. Affected Baseline

| Type | Reference | Current meaning |
|---|---|---|
| Use Cases | `UC-STU-004/005/009`, `UC-TEA-005/006`, `UC-ADM-004/005` | Six approved AI task flows |
| Requirements | `AI-REQ-015..018`, `AI-REQ-020..024`; related `FR-STU-004..009`, `FR-TEA-005`, `FR-ADM-004/005` | Structured AI output, failure and task behavior |
| Business Rules | `BR-007/008/013/014/015/018/021/026/028/034/035/036/037/041/042/043` | Existing validation, orchestration and attempt constraints |
| API | `API-STU-ANALYSIS-001`, `API-STU-PLAN-001`, `API-STU-ADJUST-001`, `API-TEA-ANALYSIS-001`, `API-ADM-ANALYSIS-001` | Existing `/api/v1` error envelope/catalog; no route or payload change proposed |
| AI | AI Contract v1.0 §§6–7, AI-DD-004; Erratum 1 E3–E4; CR-003; Release 1 success/error envelope | Runtime classification and structured output boundary |
| Screen | N/A | No screen/UI change |

## 4. Current Baseline Behavior

AI Contract §7.1 says malformed JSON received by NestJS maps to `AI_INVALID_STRUCTURE`; empty HTTP body maps to `AI_EMPTY_RESPONSE`. Correlated runtime `INFERENCE_FAILED` maps to `AI_RUNTIME_FAILURE` under §6.6. Release 1 success envelope requires `output` to be an object. Release 1 error envelope allows `INFERENCE_FAILED` and has no output-specific failure code. Erratum 1 E4 / CR-003 map required whitespace-only text to `AI_INCOMPLETE_DATA`. Every started attempt has one terminal `AIRequestLog`; no retry.

## 5. Proposed Behavior

| Model result at Runtime | Runtime response | Existing NestJS/API result |
|---|---|---|
| Parsed object passes task schema | Correlated HTTP 200 success envelope | Continue existing correlation and semantic validation; success only if valid |
| Parsed object violates task schema | Correlated HTTP 200 success envelope containing object unchanged | Existing NestJS validation: `AI_INVALID_STRUCTURE` for structural violations; `AI_INCOMPLETE_DATA` for required fields missing |
| Required text whitespace-only | HTTP 200 success envelope containing object unchanged | `502 AI_INCOMPLETE_DATA` per E4/CR-003 |
| Model text malformed, empty, or JSON non-object | Correlated HTTP 500 `INFERENCE_FAILED` error envelope | Existing `502 AI_RUNTIME_FAILURE`, internal `AI_RUNTIME_INFERENCE_FAILURE` |
| Malformed HTTP JSON received by NestJS | Runtime is not involved in this classification | Existing gateway returns `AI_INVALID_STRUCTURE`; empty HTTP body remains `AI_EMPTY_RESPONSE` |

No fake output, output repair, new error code, retry, public response shape change, AIRequestLog lifecycle/count change, or business mutation. An attempt that has started receives exactly one existing terminal log.

## 6. Why Existing Baseline Cannot Fully Resolve This Without a Decision

The sources define both malformed JSON received at NestJS (`AI_INVALID_STRUCTURE`) and runtime `INFERENCE_FAILED` (`AI_RUNTIME_FAILURE`), but do not explicitly say whether model text rejected inside the Runtime is malformed *runtime HTTP response* or an inference execution failure. The distinction affects a public error classification. The owner has now selected the latter interpretation in principle; this CR-004 is the formal downstream governance release. No source is silently reinterpreted as already approving that boundary.

## 7. Impact Analysis

### Requirements / Use Cases

No use case/task scope changes. Applies to all six task keys and their listed UC/FR/BR references.

### API

No route, method, request/response schema or error code addition. Existing public outcome changes for model-generated malformed/empty/non-object text from the structural classification to existing `AI_RUNTIME_FAILURE`; requires explicit compatibility acknowledgment.

### AI

This defines an internal validation boundary: Runtime parses model text and returns `INFERENCE_FAILED` if no JSON object can be constructed; task schema and semantic validation remain authoritative in NestJS for parsed objects. This interpretation must be reflected in `ai/AGENTS.md` under approved Erratum 2 / CR-004.

### Tests

Add end-to-end gateway regression cases for valid object, invalid task schema, missing required fields, whitespace-only text, malformed/empty/non-object model text, malformed HTTP JSON, empty HTTP body, generation exception, timeout, correlation, exactly one terminal log and no retries. Repeat representative object cases across all six task keys; malformed transport/runtime cases are task-independent, with at least one correlation case per task.

### Existing Documentation

Completed downstream release actions: Erratum 2 v1.0 issued, governance index v1.4 created, and approved validation-boundary exception added to `ai/AGENTS.md`. Phase 1D.3 plan Task 1 is updated and awaits independent plan review. Frozen AI Contract v1.0 bytes, R3 sources and baseline manifest remain unchanged.

## 8. Risks

Under this approved policy, clients see `AI_RUNTIME_FAILURE` where malformed model output was previously grouped with invalid structure; diagnostics identify inference-generation failure without leaking raw output. Until the updated plan receives independent approval, runtime implementation remains blocked. Parsed invalid objects crossing the internal boundary require explicit scoped-rule exception and must remain unmodified and untrusted until NestJS validation.

## 9. Proposed Downstream Updates

- [x] AI Contract v1.0 downstream Erratum draft and release record
- [x] `ai/AGENTS.md` scoped clarification (only after approval)
- [ ] Runtime/contract regression tests: PENDING implementation under approved plan.
- [ ] Phase 1D.3 plan independent re-review: IN PROGRESS; not yet Approved.
- [ ] Frozen baseline files — no edits proposed

## 10. Implementation Hold

**Affected implementation status:** BLOCKED PENDING Phase 1D.3 independent plan approval; CR-004 does not itself authorize implementation.

## 11. Decision

**Project Owner formal decision:** APPROVED 2026-10-29; operative downstream release is this CR-004 and Erratum 2 v1.0.  
**Formal CR decision:** APPROVED — Project Owner formal decision 2026-10-29.  
**Approver / date / official CR ID:** Project Owner / 2026-10-29 / CR-004.  
**Release status:** APPROVED downstream policy effective 2026-10-29. Phase 1D.3 implementation remains gated by independent plan approval.
