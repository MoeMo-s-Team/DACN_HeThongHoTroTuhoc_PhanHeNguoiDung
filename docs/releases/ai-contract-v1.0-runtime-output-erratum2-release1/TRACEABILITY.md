# CR-004 / AI Contract Erratum 2 Traceability

**Release:** AI Contract v1.0 — Erratum 2, Release v1.0  
**Status:** APPROVED downstream artifacts; Project Owner formal approval 2026-10-29.  
**Source basis:** frozen R3 + CR-002, AI Contract v1.0, Release 1 schemas, Erratum 1, CR-003. Frozen files and schema pack are unchanged.

| Decision | Authority reference | Scope / effect |
|---|---|---|
| E5 generated malformed/empty/non-object text | AI Contract §§6.5–6.6, §7.1; Release 1 error envelope; CR-002 XAI-002 | Correlated 500 `INFERENCE_FAILED`; NestJS `502 AI_RUNTIME_FAILURE`; one FAILED log; no retry. |
| E6 parsed object validation boundary | AI Contract §§4–7; Release 1 success envelope; `ai/AGENTS.md` §5 exception | Return parsed object unchanged; NestJS authoritative validation; invalid object never business success. |
| Whitespace-only required string | Erratum 1 E4 / CR-003 | `AI_INCOMPLETE_DATA`; one FAILED log; no retry. |
| Malformed HTTP JSON / empty HTTP body at NestJS | AI Contract §7.1 and current `AiGatewayService` | `AI_INVALID_STRUCTURE` / `AI_EMPTY_RESPONSE`, unchanged. |

Applies to `STUDENT_LEARNING_ANALYSIS`, `STUDENT_STUDY_PLAN_GENERATION`, `STUDENT_STUDY_PLAN_ADJUSTMENT`, `TEACHER_CLASS_ANALYSIS`, `ADMIN_FEEDBACK_GROUPING_STAGE1`, and `ADMIN_FEEDBACK_SUMMARY_STAGE2`. UC/FR/BR/API traceability: `UC-STU-004/005/009`, `UC-TEA-005/006`, `UC-ADM-004/005`; `AI-REQ-015..024`; `FR-STU-004..009`, `FR-TEA-005`, `FR-ADM-004/005`; `BR-007/008/013/014/015/018/021/026/028/034/035/036/037/041/042/043`; `API-STU-ANALYSIS-001`, `API-STU-PLAN-001`, `API-STU-ADJUST-001`, `API-TEA-ANALYSIS-001`, `API-ADM-ANALYSIS-001`. Screens: N/A.

This release does not amend frozen sources, public routes or envelopes, Release 1 schemas, retry behavior, attempt count, or AIRequestLog lifecycle. It does not approve runtime implementation or Phase 1D.3 completion.
