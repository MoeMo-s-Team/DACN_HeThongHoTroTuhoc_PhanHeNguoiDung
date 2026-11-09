# AIRequestLog Terminal Persistence Failure — Design Decision Proposal

**Status:** DRAFT — PENDING HUMAN REVIEW  
**Created:** 2026-11-07  
**Author:** Codex  
**Related Task:** Phase 2B Task 5 Governance Decision; Implementation Plan Tasks 5–6

## 1. Context

After a runtime request has been dispatched, AI Contract v1.0 §14 requires exactly one terminal `AIRequestLog` (`SUCCESS` or `FAILED`). The attempt time is captured immediately before dispatch, stored as `createdAt`, and `durationMs` uses elapsed monotonic time when available. The database has no `PENDING` state. No database transaction may remain open across inference, and the gateway must not automatically retry inference.

The approved documents do not define recovery when the post-inference terminal insert fails. A pre-dispatch database check cannot guarantee a later insert. Under the existing lifecycle, an outage can therefore leave a real external attempt without a terminal row. This proposal recommends a response and operational disposition; it does not approve or amend any baseline requirement.

## 2. Baseline / Architecture References

- `AI-REQ-017` — user receives an understandable message and may retry when appropriate.
- `AI-REQ-018` — every actual external attempt must have an `AIRequestLog`.
- `AI-REQ-019` — do not store full prompts or raw responses by default.
- `AI-REQ-016` — AI errors must not lose existing business data.
- `FR-COM-006`, `BR-029`, `DATA-REQ-009` — AI request logging and dashboard aggregates.
- API Specification v1.5 §§11.3, 13; public `AI_RUNTIME_FAILURE` mapping in SRS v1.6 §10.5/XAI-002.
- AI Contract v1.0 §14.1–14.3; no automatic gateway retry in §6 and §14.
- Database Design v1.0 §§6.7, 10.6, 20.7; terminal `SUCCESS|FAILED` model, no transaction across external calls.
- R3 freeze: `DACN-REQ-UC-BL-2026-10-26-R3`.

## 3. Constraint

This proposal keeps the existing public error catalog and does not authorize a schema, migration, lifecycle, business behavior, or frozen API change. It introduces no `PENDING` row, pre-dispatch placeholder, long transaction, inference retry, queue, or new persistence service.

The recommended disposition cannot guarantee AI-REQ-018 when terminal persistence is unavailable. Therefore it cannot be implemented as a technical-only decision while AI-REQ-018 remains unchanged. A separately approved Change Request must explicitly resolve that requirement and the resulting dashboard undercount semantics before Tasks 5–6 may close or dispatch be enabled.

## 4. Problem and Failure Cases

The outcome of inference and the outcome of its later database insert are separate events. If the insert fails, the application cannot safely claim a persisted terminal log. A timed-out database call may have committed even when the client received no confirmation.

| Failure | What is known | Consequence under the existing schema |
|---|---|---|
| Temporary database connection loss | The insert may not have reached PostgreSQL. | No reliable terminal row; reconnecting later does not recreate it. |
| Insert rejected (constraint, invalid data, schema/configuration) | Usually a deterministic write failure. | Retrying the same invalid write is not useful; attempt can remain unlogged. |
| Persistence timeout / lost acknowledgement | Commit outcome is ambiguous. | Blind retry can create a duplicate because the current model has no attempt idempotency key. Not retrying can leave no row. |

The current contract provides no mechanism that can distinguish “not committed” from “committed but acknowledgement lost” using the available fields. A connectivity check before dispatch also cannot remove this race.

## 5. Options Considered

### Option A — Keep current schema and fail the application operation closed

Make one terminal insert attempt after the outcome is classified. If it fails, do not return inferred success, create a success context, or mutate business data. Do not retry inference or blindly retry an ambiguous insert. Return the existing public mapping described in §6 and emit a sanitized server diagnostic.

**Complexity:** Low. Uses existing schema and error catalog.  
**Recovery:** The failed log is not automatically recovered. An ambiguous timeout may have committed.  
**Consistency:** Prevents an unlogged inference result from becoming application success, but cannot ensure a terminal row exists.  
**Fit:** Best fit for a small project only if governance explicitly accepts and documents the residual logging gap.

### Option B — Retry terminal inserts

Retry transient database failures after inference.

**Complexity:** Low to medium if attempted naively; higher if made duplicate-safe.  
**Recovery:** Can recover from short outages when the first write definitely failed.  
**Consistency:** A retry after an ambiguous timeout can create duplicate rows. Safe deduplication needs a stable attempt identifier and uniqueness enforcement, which the current model does not have. Persistent failure still loses the row.  
**Fit:** Not recommended without a schema/contract change; it cannot provide the required guarantee by itself.

### Option C — Add durable attempt journal/outbox and reconciliation

Persist dispatch identity and terminal outcome to a durable recovery mechanism, then reconcile into `AIRequestLog`.

**Complexity:** High for this project; adds durable state, recovery lifecycle, monitoring, tests, and probably a schema or storage change.  
**Recovery:** Better after temporary outages if the journal is available and reconciliation is operated.  
**Consistency:** Still needs an approved definition for journal failure and for the period before the terminal `AIRequestLog` exists. It changes the current no-provisional-state lifecycle.  
**Fit:** Poor fit for the current MVP absent an approved architecture/change decision.

### Option D — Pre-write a placeholder or hold a transaction across inference

Write a pre-dispatch row and update it later, or keep a database transaction open until inference finishes.

**Complexity:** Medium.  
**Recovery:** A pre-write can identify in-flight attempts, but cannot truthfully store a terminal outcome before it is known. A transaction may fail or expire while the external service is running.  
**Consistency:** Conflicts with Contract §14 (no `PENDING`/pre-outcome fake status) and Database Design §10.6 (no transaction across inference).  
**Fit:** Rejected under current authority; would require contract and database change control.

## 6. Recommended Disposition (DRAFT)

**Recommendation:** Option A — one terminal write attempt, fail the application operation closed on write failure, and report the AI-REQ-018 gap through governance. Do not add a retry for inference or for an insert with an ambiguous outcome.

Proposed request handling:

1. Classify the inference result, then make the existing short terminal `SUCCESS`/`FAILED` insert. Keep `createdAt=attemptStartedAt` and monotonic `durationMs` when available.
2. If inference succeeded but log persistence was not confirmed, discard the runtime result, create no preview/context, perform no business mutation, and return `502 AI_RUNTIME_FAILURE` with the existing safe message: `AI tạm thời chưa thể xử lý yêu cầu. Vui lòng thử lại sau.`
3. If inference already failed, preserve its existing public error mapping (`AI_TIMEOUT`, `AI_CONNECTION_FAILURE`, `AI_EMPTY_RESPONSE`, `AI_INVALID_STRUCTURE`, `AI_INCOMPLETE_DATA`, or `AI_RUNTIME_FAILURE`). Record the secondary log-write failure only in safe server diagnostics; it must not replace a more specific frozen public error.
4. Do not retry inference automatically. A user retry, if offered by the existing UI, is a new request and may create a new external attempt. Keep the UI in its existing error state, show the mapped message, retain user input where the feature already does so, and let the user decide whether to retry later.
5. Emit a structured error diagnostic such as `AI_REQUEST_LOG_PERSISTENCE_FAILURE` to the existing server log path, with feature key, persistence error class/code, and whether the inference outcome was success/failure. Do not include secrets, prompt, raw output, or unnecessary user identifiers. Surface this error to the operator through the deployment's existing log/alert handling; no new monitoring service is proposed.

This is fail-closed for business success, not a guarantee of terminal persistence. If adopted, a separate Change Request must explicitly amend or otherwise resolve AI-REQ-018 and document that dashboard `totalAIRequests` / `failedAIRequests` can undercount attempts when the terminal write is unavailable. Until that Change Request is approved, this recommendation is not implementation authority and Task 5–6 remain blocked.

## 7. Guarantee and Change-Control Boundary

**Does the recommendation guarantee one terminal AIRequestLog for every external attempt? No.**

During a database outage, a rejected insert or an ambiguous timeout, the system cannot establish from the current schema whether the terminal row exists. Option A may leave an external attempt without a log; in an ambiguous timeout, it may also have committed despite the application receiving an error. This limitation means the recommendation does **not** meet the literal AI-REQ-018 guarantee and must not be reported as satisfying it.

Required governance before implementation:

- Approve a separate Change Request addressing AI-REQ-018 and the derived `FR-COM-006`/dashboard aggregate semantics if this residual gap is accepted; or
- Reject this recommendation and approve a different contract/schema/architecture that defines a durable, duplicate-safe recovery lifecycle.

Do not update baseline documents from this proposal. Human approval of this technical proposal alone does not waive AI-REQ-018.

## 8. Implementation Impact If Governance Approves the Recommended Disposition

- **Frontend:** No new endpoint or UI state. Reuse existing AI error handling; `AI_RUNTIME_FAILURE` message is already defined. Do not suggest automatic retry. A user retry remains a new attempt.
- **Backend:** Task 5 can classify persistence errors, prevent success/context creation after an unconfirmed write, preserve the primary inference error when inference already failed, and emit sanitized diagnostics. No inference or blind insert retry.
- **Database:** No schema change under Option A. A future guarantee-oriented alternative likely needs an approved change to the current model/lifecycle.
- **AI runtime:** No change; one dispatch remains one external attempt.
- **Operations:** Use existing deployment logs to alert on the stable diagnostic key. Since missing rows cannot be reconstructed, alerting detects the gap but does not recover it.
- **Tests:** Add the cases in §9 before enabling any dispatch.

## 9. Proposed Implementation Plan Updates

Only after the disposition and the separate Change Request are approved, revise the plan and obtain fresh read-only plan review:

- **Task 5 dependency/acceptance:** Replace the current unresolved persistence-failure blocker with the approved failure policy. Keep terminal `SUCCESS|FAILED`, `attemptStartedAt`, `createdAt`, monotonic duration, no `PENDING`, no long transaction and no inference retry. Add the success-plus-log-failure behavior (suppress success/context and return `AI_RUNTIME_FAILURE`), the inference-failure-plus-log-failure behavior (preserve the primary public code), and the safe diagnostic requirement. State explicitly that a successful DB write gives one terminal row, but a failed/ambiguous terminal write does not guarantee a row and is governed by the approved CR.
- **Task 5 tests:** Add deterministic rejected-insert and ambiguous-timeout cases. Assert no successful application result/context/business mutation on an unconfirmed terminal write, preservation of the primary inference error, one persistence attempt for ambiguous outcomes, no inference retry, and redaction of secrets/prompt/raw output.
- **Task 6 dependency/acceptance:** Keep dispatch blocked until Task 5 policy is implemented. Add an integration case where inference dispatches once and the terminal DB write fails; assert one outbound runtime request, the approved public response, no success context/business mutation, and a safe operator diagnostic. Continue asserting no transaction spans inference.
- **Scope gate:** Do not change database schema or add reconciliation under Option A. If the approved Change Request selects a guarantee-oriented alternative instead, replace these edits with that approved lifecycle and re-review the plan before implementation.

## 10. Verification Required After Approval

- [ ] Inference success + terminal insert rejection returns `502 AI_RUNTIME_FAILURE`; no success response, context, or business mutation escapes.
- [ ] Inference timeout/connection/output failure + terminal insert rejection retains its existing public error mapping.
- [ ] Terminal insert is attempted once; no automatic inference or ambiguous-write retry occurs.
- [ ] A simulated database connection outage after dispatch does not trigger a second runtime request.
- [ ] A persistence timeout with unknown commit outcome does not blindly create a duplicate; test both “committed but acknowledgement lost” and “not committed” outcomes.
- [ ] Logs contain the stable diagnostic key and safe error metadata only; assert secret, prompt, raw output, and unnecessary user identifiers are absent.
- [ ] No `PENDING`, provisional row, or DB transaction spans the inference call.
- [ ] Existing public errors, no-data-loss behavior, and unaffected non-AI API behavior remain unchanged.
- [ ] Integration tests use the isolated test database and inject post-dispatch database failures; do not use or reset the development database.
- [ ] Apply the Task 5/6 plan updates in §9 after the separate Change Request is approved, then obtain fresh plan review before execution.

## 11. Decision

**Decision:** PENDING HUMAN REVIEW  
**Recommended:** Option A, conditional on a separate approved Change Request for the AI-REQ-018 guarantee gap.  
**Implementation status:** BLOCKED until the required change-control decision and fresh Task 5–6 plan review are complete.
