# CR-006 Downstream Authority Addendum v1.0

**Date:** 09/11/2026  
**Status:** APPROVED — DOWNSTREAM RELEASE  
**Authority:** CR-006 v1.0 Approved  
**R3 freeze:** `DACN-REQ-UC-BL-2026-10-26-R3` remains immutable; this addendum supplements downstream interpretation and does not replace or rewrite frozen files.

## 1. Normative policy

1. When a dispatched handler reaches terminal persistence, it makes one insert attempt for `SUCCESS` or `FAILED`. It does not create `PENDING`, retry inference, or retry a terminal insert whose result is failed or unknown. No transaction spans inference.
2. The AI attempt outcome is classified after NestJS validates the response envelope/correlation, task schema, semantic/reference rules, and required content. Only then may the attempt be `SUCCESS`; a model response or HTTP 200 alone is insufficient. Validation/runtime failures after dispatch are `FAILED`.
3. If validated inference succeeded but terminal persistence is not acknowledged, discard the AI output, create no preview/context/business success, and return the existing `502 AI_RUNTIME_FAILURE` response. If inference already failed, preserve its original public error and emit only safe persistence diagnostics.
4. A database commit followed by lost/late acknowledgement still returns `502 AI_RUNTIME_FAILURE`; a committed row may remain `SUCCESS`. Do not query or insert again to resolve this ambiguity.
5. Option A is best-effort. A failed/ambiguous write or process termination before persistence can leave an external attempt without a row. No guarantee of one terminal row for every external attempt is made by this release.
6. `totalAIRequests` and `failedAIRequests` count persisted terminal rows (`COUNT(*)`, and `COUNT(*) WHERE status='FAILED'`, respectively); they can undercount actual attempts. A committed `SUCCESS` after acknowledgement timeout is counted in total and not failed even though the caller received HTTP 502.
7. Public error codes, statuses, messages, and response shapes are unchanged. The narrow mapping in item 3 is an explicit exception to generic `500 DATABASE_FAILURE`. Persistence failure does not replace an already established inference error.
8. Safe persistence diagnostics use `AI_REQUEST_LOG_PERSISTENCE_FAILURE`; do not log credentials, token, prompt, raw output, or unnecessary personal data. This diagnostic is not a durable audit record and does not recover missing rows.
9. Database schema, enum, fields, migrations, retention, endpoints, dashboard response shape, and automatic retry behavior do not change.

## 2. Artifact-specific downstream amendments

These clauses are authoritative amendments to the listed active R3 artifacts. Their frozen source files remain unchanged; read them together with this release.

| Artifact | Amendment |
|---|---|
| SRS v1.6, `FR-COM-006`, `AI-REQ-018`, `NFR-LOG-002` | Replace an absolute per-attempt row guarantee with one best-effort terminal insert when the handler reaches persistence. Explicitly permit no row after a failed/ambiguous insert or process termination before persistence. Keep `DATA-REQ-009` retention unchanged. |
| SRS v1.6, `OD-37`, `BR-029` | Define dashboard AI totals as counts of persisted AIRequestLog rows; state that counts can undercount attempts and explain commit-then-ACK-timeout behavior. |
| Business Rules v1.4, `OD-37`, `BR-029` | Same persisted-row aggregate definition; preserve lifetime scope and `failedAIRequests` as the subset of persisted rows with `FAILED`. |
| API Specification v1.5, §§3.8, 11.5, 13, 22 / `XAI-002` | Preserve the public error catalog and response shape. Add only the approved exception: successful validated inference with unconfirmed terminal log returns existing `502 AI_RUNTIME_FAILURE`; inference failure keeps its original public error if persistence also fails. Other database failures remain `500 DATABASE_FAILURE`. |
| AI Contract v1.0, §14.2 and lifecycle matrix | Define `SUCCESS`/`FAILED` after NestJS output validation and before the one terminal insert attempt. Distinguish inference result from persistence acknowledgement. Retain `attemptStartedAt`, `createdAt=attemptStartedAt`, monotonic `durationMs` when available, terminal-only statuses, privacy rules, and no transaction/retry. |
| Database Design v1.0, §§6.7, 10.6, 20.7 | No schema/migration change. Document that aggregate rows are best-effort persisted attempts; an absent row is possible and a `SUCCESS` row can coexist with caller HTTP 502 after ACK loss. |
| Use Case Specification v1.2, §3.2 `AI-ERROR` | On validated inference success plus unconfirmed log, show the existing AI runtime error and do not expose/apply output or create context. On inference failure plus logging failure, keep original public error. User-initiated retry remains a new request; no automatic retry. |
| Activity Diagram 3 v1.3 | Add a persistence decision after output validation/classification: confirmed terminal insert continues success/failure branch; unconfirmed write on inference success returns `AI_RUNTIME_FAILURE` without business effect; unconfirmed write on inference failure preserves original error. Mark the no-row/ACK ambiguity and no retry. |
| Wireframe v1.1 / `SCR-ADM-001` | Label/help text must describe totals as logged/recorded requests, not exact external-attempt counts, and disclose possible undercount. Existing AI error panel remains; no frontend automatic retry. |
| UI Sitemap v1.1 | No route or screen inventory change. The dashboard annotation follows the Wireframe amendment. |
| System Architecture v1.1 | NestJS remains the sole owner of validation and persistence. One short terminal insert follows the external attempt; no transaction spans inference and no recovery queue/journal is introduced. |

## 3. Traceability and unchanged scope

Affected references: `FR-COM-006`, `AI-REQ-016` through `AI-REQ-019` (only `AI-REQ-018` changes guarantee), `NFR-LOG-002`, `DATA-REQ-009` (unchanged), `BR-029`, `OD-37`, `API-ADM-DASH-001`, `XAI-002`, `UC-STU-004/005/009`, `UC-TEA-005/006`, `UC-ADM-004/005`, `UC-ADM-001`, `SCR-ADM-001`, and AI Contract §14. No actor, authorization, business eligibility, endpoint, response field, schema, retention period, or human-confirmation rule changes.

The twelve acceptance cases CR6-T01–T12 in CR-006 v1.0 remain normative for the Task 5 test plan. In particular, T01–T03 establish post-Nest validation classification; T04–T08 cover definite and ambiguous persistence outcomes; T09–T10 cover timing/redaction; T11 covers dashboard counts; T12 covers no-PENDING/no-long-transaction/non-AI isolation.

## 4. Implementation gate

This release removes the persistence-policy blocker from Task 5's design. It does not itself authorize implementation. Task 5 requires a fresh read-only Plan Review PASS and separate explicit implementation authorization. Task 6 remains blocked by Task 4B's approved capacity profile and its other runtime/governance dependencies. No code, database, or frozen baseline change is authorized by this addendum.
