# Proposal archive — AI Contract v1.0 Erratum for Candidate 1 Decisions

**Status:** DRAFT RETAINED AS REVIEW HISTORY — APPROVED RELEASE COPY ISSUED AS Erratum 1  
**Approved copy:** `docs/releases/ai-contract-v1.0-schema-pack-release1/AI_Contract_v1.0_Erratum_1_approved.md`  
**Authority:** None until formally approved and versioned under project governance. This file does not modify frozen `docs/baseline/AI_Contract_v1.0_baseline_final.md`.

## Purpose and traceability

Clarify internal contract interpretations identified while preparing Candidate 1. The DRAFT must be reconciled with the released Rev.4 schema pack if that source is supplied. Approval authority/name: **TBD by project owner**.

Affected AI task flows: `FR-STU-004..009`, `FR-TEA-005`, `FR-ADM-004/005`; `UC-STU-004/005/009`, `UC-TEA-005/006`, `UC-ADM-004/005`; `AI-REQ-015..018`, `AI-REQ-020..024`; applicable `BR-007/008/013/014/015/018/021/026/028/034/035/036/037/041/042/043`. API IDs: `API-STU-ANALYSIS-001`, `API-STU-PLAN-001`, `API-STU-ADJUST-001`, `API-TEA-ANALYSIS-001`, `API-ADM-ANALYSIS-001`. No public route/shape or screen change proposed; Screen IDs: N/A. Rows marked observable require upstream CR.

## Proposed text (each item requires explicit approval)

### E1 — AI-DD-011 and §6.3 prompt binding (internal clarification)

Current text references `request.promptVersion` in AI-DD-011 while the §6.3 envelope example has no such property. Proposed clarification: **the wire request contains no `promptVersion`; `request.task` resolves through the task registry to the active prompt version, and the active capacity profile and deployed task configuration must bind to the same value before dispatch.** Response correlation remains exactly `contractVersion`, `requestId`, and `task`; response `runtime.promptVersion` is metadata. If released Rev.4 includes a request property, this proposed text is not adopted until the conflict is resolved.

Current behavior: ambiguous contract wording; example has no field. Proposed behavior: internal registry/profile binding without adding a wire field. Implementation impact: NestJS preflight/config conformance only; no frontend API/business behavior change. TP-001 decision 2.

### E2 — §13.1 Admin Stage 2 projection (internal mapping clarification)

Proposed clarification: after backend validation, deduplication, empty-group removal and `count=feedbackIds.length`, Stage 2 receives each group as `{title,summary,feedbackIds,count}`. Stage 1 AI output remains `{title,summary,feedbackIds}` and may not supply `count`.

Current behavior: §12.3 specifies backend calculation, §13.1 omits the exact Stage 2 group shape, while API R3 exposes the count. Proposed behavior: explicit internal input projection. Implementation impact: internal NestJS-to-runtime mapping/schema only. No public response or business calculation change. TP-001 decision 1. Approval must confirm Candidate 1 nested mappings as well.

### E3 — §6.4 response prompt metadata mismatch (**observable; requires approved upstream CR**)

Proposed clarification: after dispatch, if an otherwise correlated/schema-valid success response reports `runtime.promptVersion` different from both the task registry and active capacity profile, reject the business success as `502 AI_RUNTIME_FAILURE`; record exactly one FAILED `AIRequestLog` for the started attempt with internal diagnostic `AI_RUNTIME_PROMPT_VERSION_MISMATCH`; do not retry or create success-side context.

Current behavior: §6.4 treats prompt metadata as trace/debug/benchmark metadata; no explicit mismatch mapping. Proposed behavior changes an otherwise successful response into public failure. Implementation impact: NestJS post-response validation and existing terminal log mapper. No new wire field or API shape. Requires upstream CR because observable; see `../change-requests/CR-DRAFT-AI-RUNTIME-OUTPUT-ERROR-POLICY.md` and TP-001 decision 3.

### E4 — §7.1 whitespace-only required AI output (**observable; requires approved upstream CR**)

Proposed clarification: required AI output text that is nonempty at JSON level but blank after trimming is rejected as `502 AI_INCOMPLETE_DATA` using the existing API error envelope; because dispatch occurred, record exactly one FAILED `AIRequestLog`. Caller input rejected before dispatch continues to create no attempt/log.

Current behavior: contract requires rejecting whitespace-only required text but does not name the public code. Proposed behavior adds exact error classification. Implementation impact: NestJS semantic validation and existing terminal log mapper. No API shape change. Requires upstream CR; see `../change-requests/CR-DRAFT-AI-RUNTIME-OUTPUT-ERROR-POLICY.md` and TP-001 decision 4.

## Baseline and approval impact

E1/E2 are proposed internal-contract clarifications; they require approval and a versioned erratum before normative use. E3/E4 change observable failure classification/outcome and therefore require an approved upstream Change Request plus this erratum. CR-002 `XAI-001` and `XAI-002` remain unchanged: capacity preflight, no attempt/log before dispatch, one terminal log per started attempt, no retries, and existing API error envelope remain. No frozen R3 document, manifest, public API, or business behavior is amended by this draft.

Do not implement any item until the owner records decisions and authorized governance updates the applicable approved sources. Candidate 1 remains `CANDIDATE — NOT APPROVED`.
