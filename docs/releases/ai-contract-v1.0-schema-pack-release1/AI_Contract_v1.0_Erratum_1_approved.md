# AI Contract v1.0 — Erratum 1

**Status:** APPROVED BY PROJECT OWNER  
**Approval date:** 2026-10-28  
**Authority record:** User's explicit approval in this project session. Approver name was not supplied.  
**Applies with:** `AI_Contract_v1.0_schema_pack_release1.zip` (Release 1; not recovered Rev.4).

This is a versioned erratum. The frozen source `docs/baseline/AI_Contract_v1.0_baseline_final.md` is unchanged. Where this erratum clarifies an internal contract ambiguity, read it with AI Contract v1.0. It does not alter public API shape.

## E1 — AI-DD-011 / §6.3 prompt binding

The wire request has no `promptVersion` property. Resolve `request.task` through the task registry to its active prompt version. Before dispatch, require the active capacity profile and deployed task configuration to match that registry value. The response correlation keys remain exactly `contractVersion`, `requestId`, and `task`; `runtime.promptVersion` is response metadata and is checked under E3 below. Do not add a wire field.

## E2 — §13.1 Admin Stage 2 input projection

After backend validation, deduplication, empty-group removal, and calculation `count = feedbackIds.length`, Stage 2 receives each group as `{title, summary, feedbackIds, count}`. Stage 1 AI output remains `{title, summary, feedbackIds}` and must not supply `count`. Backend calculations remain authoritative.

## E3 — §6.4 runtime prompt metadata mismatch

After dispatch, if an otherwise correlated and schema-valid success response has `runtime.promptVersion` different from either the task registry or active capacity profile, reject the success and return the existing `502 AI_RUNTIME_FAILURE` error envelope. Record exactly one FAILED `AIRequestLog` for the started attempt with internal diagnostic `AI_RUNTIME_PROMPT_VERSION_MISMATCH`; do not create success-side context and do not retry. The existing pre-dispatch profile mismatch continues to create no attempt and no log.

## E4 — §7.1 required output blank after trim

Required AI output text that is nonempty as a JSON string but blank after trimming is incomplete content. Reject it as existing-envelope `502 AI_INCOMPLETE_DATA`. Since dispatch occurred, record exactly one FAILED `AIRequestLog`; do not retry. Caller input rejected before dispatch continues to create no attempt/log. `AI_INVALID_STRUCTURE` remains for wrong type, enum, correlation, and semantic structure.

## Approval and limits

Project Owner approved these four clarifications and the related CR-003 on 2026-10-28. This erratum does not authorize implementation of Phase 1D.2. It does not modify AI Contract v1.0's source bytes, R3/CR-002 files, public routes or payload shape, business calculations, attempt count, or terminal-log count per started attempt.
