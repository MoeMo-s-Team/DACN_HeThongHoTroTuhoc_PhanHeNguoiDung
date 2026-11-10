# AI Contract v1.0 — Erratum 2

**Status:** APPROVED — downstream release v1.0  
**Related:** CP-004; owner decision approved in principle, subject to governance release.  
**Approval:** Project Owner, explicit formal decision recorded 2026-10-29.  
**Release:** Erratum 2, Release v1.0, 2026-10-29.  
**Normative status:** Approved downstream interpretation, effective 2026-10-29.

This draft supplements AI Contract v1.0 without editing its frozen source bytes or Schema Pack Release 1. It applies to all six task keys: `STUDENT_LEARNING_ANALYSIS`, `STUDENT_STUDY_PLAN_GENERATION`, `STUDENT_STUDY_PLAN_ADJUSTMENT`, `TEACHER_CLASS_ANALYSIS`, `ADMIN_FEEDBACK_GROUPING_STAGE1`, and `ADMIN_FEEDBACK_SUMMARY_STAGE2`.

## E5 — Model-generated output that is not a JSON object

When model generation completes but its generated text is malformed JSON, empty, or parses to a non-object, the AI Runtime returns HTTP 500 with the existing correlated Release 1 error envelope and `error.code = INFERENCE_FAILED`. The Runtime does not fabricate, repair, or echo the generated output. NestJS applies existing mapping `502 AI_RUNTIME_FAILURE` and internal diagnostic `AI_RUNTIME_INFERENCE_FAILURE`. Because dispatch has started, exactly one existing FAILED `AIRequestLog` is recorded. No automatic retry or success-side context is created.

This clause distinguishes model text that Runtime cannot turn into a JSON object from malformed HTTP JSON received by NestJS. The latter continues to map to `AI_INVALID_STRUCTURE`; an empty HTTP response body continues to map to `AI_EMPTY_RESPONSE`.

## E6 — Parsed object task validation remains with NestJS

When generated text parses to a JSON object, Runtime returns the object unchanged in the existing correlated success envelope, even if it fails the task-specific schema. NestJS remains authoritative and maps task output validation according to existing behavior: missing required data to `AI_INCOMPLETE_DATA`, other schema/semantic structure violations to `AI_INVALID_STRUCTURE`. Runtime must not add, remove, coerce, truncate or rewrite output fields. Required text containing only whitespace continues to map to `AI_INCOMPLETE_DATA` under Erratum 1 E4 and CR-003.

This clause is the approved narrow exception to `ai/AGENTS.md` §5's runtime-output conformance sentence: Runtime may transport a parsed object for backend validation; only NestJS-validated output can be treated as business success. The scoped instruction must be updated only after this erratum is approved/released.

## Authority impact and approval conditions

E5 changes the observable error mapping for model-generated malformed/empty/non-object text to the existing `AI_RUNTIME_FAILURE`; it does not add an API code or change envelope shape. It supplements Contract §§6–7/AI-DD-004 and is authorized by approved downstream CR-004 because API callers observe the mapping. E6 clarifies the internal validation boundary and explicitly scopes an exception to the AI Runtime instruction; it does not permit business success before NestJS validation.

This erratum does not modify frozen R3/CR-002 documents, AI Contract v1.0 source bytes, public routes, schema pack, attempt count, retry policy, or AIRequestLog fields/lifecycle. Approval does not itself authorize implementation; the released artifact and re-approved Phase 1D.3 plan are required first.

**Project Owner decision:** APPROVED.  
**Official CR:** CR-004. **Release:** Erratum 2, v1.0. **Date:** 2026-10-29.  
**Authority:** Explicit formal Project Owner decision in this project session.  
**Implementation boundary:** Governance approval does not approve Phase 1D.3 plan or implementation; independent plan review remains required.
