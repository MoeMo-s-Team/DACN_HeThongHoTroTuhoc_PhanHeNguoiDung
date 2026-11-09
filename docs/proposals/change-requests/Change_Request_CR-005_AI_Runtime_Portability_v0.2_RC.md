# CHANGE REQUEST — CR-005
## Portable self-managed AI runtime and reproducible local installation

**Project:** Hệ thống hỗ trợ tự học ứng dụng AI  
**Change ID:** `CR-005` — proposed; unique in the checked repository, not yet registered  
**Version:** 0.2 Release Candidate  
**Date:** 09/11/2026  
**Status:** RELEASE CANDIDATE — PENDING HUMAN APPROVAL  
**Owner direction:** CPU-local installation preferred; GPU optional (07/11/2026). This endorsement is not approval of this CR or runtime conformance.  
**Related decision:** ADR-AI-001 v0.2 RC  
**Scope:** Runtime placement, installation reproducibility, and runtime-specific acceptance gates.

## 1. Decision requested

Approve replacing the R3 Google Colab-only placement constraint with a portable runtime boundary:

```text
Next.js → NestJS → FastAPI POST /v1/infer → Ollama
```

CPU-local is the preferred installation path. A GPU-backed deployment is optional. The choice of runtime placement does not certify any model, hardware profile, or AI task.

The Project Owner is asked to approve these specific decisions:

1. Replace the mandatory Google Colab deployment constraint in SRS v1.6/Architecture v1.1 with a self-managed runtime that can be installed locally; retain the existing NestJS-to-runtime contract boundary.
2. Accept **Installability** as a distinct handoff criterion from **AI Conformance/Capacity**. A clean CPU install may pass while application AI dispatch remains denied for lack of a released capacity profile.
3. Keep GPU/Colab as optional deployment profiles. Evidence belongs to its exact model, immutable digest, runtime settings, prompts, tokenizer/estimator, hardware and task; it cannot be transferred between profiles.
4. Preserve AI Contract v1.0, the six task keys, the 15 Release 1 schemas, Errata 1/2, the 60-second per-attempt timeout, no automatic retry, complete-input preflight and CR-006 logging policy.
5. Accept that current CPU exploratory evidence and the approved Colab T4 smoke do not certify AI Conformance/Capacity for any new profile.

## 2. Current authority and conflict

R3 SRS v1.6 and Architecture v1.1 require Google Colab as the AI Runtime environment, including SRS `CON-04`, `AI-REQ-020`, deployment assumptions and related architecture text. This conflicts with the requested reproducible installation independent of a team member's cloud account. This CR requests a controlled revision; it does not edit or supersede R3 before approval and release.

The owner decision record dated 07/11/2026 endorses the direction only. Governance Index v1.3 downstream addendum says CR-005 remains Draft. Repository search found no `CP-005` and no registered CR-005 collision. `CR-005` appears only as a proposal/reference; it is not registered until formal release. CR-006 remains an independent, approved downstream authority.

## 3. Proposed requirement change

Replace the Colab-specific deployment restriction with these requirements in the post-approval SRS revision:

- The AI path is `Next.js → NestJS → FastAPI /v1/infer → Ollama`; the browser never calls FastAPI/Ollama, and runtime services have no database access.
- The submitted source and runbook provide a clean-install path on a CPU-only machine, with CPU-local Ollama as the preferred installation target. GPU is optional.
- Runtime unavailability continues to affect AI-dependent operations only; NestJS remains authoritative for eligibility, preflight, output validation, persistence and business effects.
- Installation acceptance does not imply successful AI inference, model quality, task coverage, or capacity within 60 seconds.
- An AI deployment may dispatch only when its exact deployment has a separately approved, correctly bound capacity profile. Missing/malformed/mismatched profile continues to fail closed under R3/CR-002.

This is a deployment constraint/reproducibility change. It does not add use cases, public endpoints, task keys, schemas, data fields, or business behavior.

## 4. Two independent acceptance gates

### 4.1 Installability

Installability answers: **Can another person install and start the submitted software from the released source and instructions?** It does not answer whether real inference is conformant or fast enough.

Pass requires a witnessed clean installation on a separate/recreated CPU-only machine, from a pinned source revision, with:

- Next.js, NestJS, PostgreSQL, FastAPI Adapter and Ollama installed and started using documented commands;
- database migration and seed steps reproducible;
- versioned environment template with placeholders only, setup scripts and a runbook;
- model manifest identifying the exact model, immutable digest/revision, quantization and reproducible retrieval instructions (ship model weights only where licensing permits);
- service health/readiness checks, including adapter-to-configured-engine availability;
- six-task contract tests against the unchanged v1.0 envelope and Release 1 schemas, with mock/fixture engine tests clearly labeled as contract tests, not real inference;
- troubleshooting instructions for setup, model download, service health, auth/configuration and common runtime failures;
- evidence recording host/OS/tool versions, source revision, commands and PASS/FAIL results; secret and sample-data review.

If no approved capacity profile exists, the clean install must demonstrate that NestJS remains fail-closed for application inference. It must not bypass preflight to make a demo appear successful.

### 4.2 AI Conformance/Capacity

Conformance answers: **Does a specific model/runtime configuration on specific hardware produce NestJS-accepted outputs of adequate quality for each task within the existing 60-second per-attempt limit, and does its capacity profile safely admit only supported inputs?**

This is a separate release/enablement gate for each exact profile. Evidence must bind at least the model and immutable digest, quantization, runtime/engine version and settings, tokenizer/estimator, contract version, task prompt versions, hardware, test inputs and per-task results. It must include schema, semantic/reference and required-content validation, latency and capacity-boundary evidence under AI Contract v1.0 §§15.4 and 17 and active CR-002 policy. The proposed portability supplement applies §17's existing benchmark method/thresholds to the exact target profile being considered; Contract v1.0 source bytes and thresholds remain unchanged. This downstream interpretation is part of the approval request, not yet authority. Do not invent quality thresholds or capacity values in this CR.

CPU exploratory runs, including SP-02 failures, remain exploratory evidence. The Phase 1D.3 Colab T4 FP16 Lite result remains demo-candidate smoke evidence only. Neither is a certified capacity profile, and neither transfers to another model, runtime or hardware profile. A profile that has not passed this gate must remain unable to dispatch application inference.

CR-005 approval and Installability PASS do not require every CPU/GPU profile to pass AI Conformance/Capacity. They also do not allow the project to claim that all AI flows work on a CPU laptop.

## 5. Unchanged downstream authority

The following remain unchanged and applicable:

- AI Contract v1.0 and exactly six AI task keys;
- exactly 15 JSON Schemas in Schema Pack Release 1;
- Errata 1/2, CR-003/004 and NestJS authoritative validation, including E6 object pass-through;
- `POST /v1/infer`, envelope/correlation and runtime error behavior;
- 60-second timeout per external attempt; no automatic inference retry;
- R3/CR-002 capacity-profile binding, complete authoritative input, fail-closed preflight and no truncation/sample/chunking;
- CR-006 v1.0 and Downstream Addendum: one best-effort terminal insert attempt when persistence is reached, no `PENDING`, no insert retry, no inference retry, preserved inference error on logging failure, and persisted-row dashboard aggregates that may undercount actual attempts;
- database schema, public API routes/shape, user roles, eligibility, human confirmation, business calculations and state transitions.

The six keys remain exactly: `STUDENT_LEARNING_ANALYSIS`, `STUDENT_STUDY_PLAN_GENERATION`, `STUDENT_STUDY_PLAN_ADJUSTMENT`, `TEACHER_CLASS_ANALYSIS`, `ADMIN_FEEDBACK_GROUPING_STAGE1`, and `ADMIN_FEEDBACK_SUMMARY_STAGE2`.

The AI Contract portability supplement is subordinate to Contract v1.0 and its errata and must be read with CR-006. It cannot restore an absolute per-attempt row guarantee that CR-006 explicitly relaxed.

## 6. Traceability and affected documents

| Authority/reference | Proposed handling after approval |
|---|---|
| SRS v1.6 `CON-04`, `AI-REQ-020/022`, `AS-03/05`, `OD-07/08`, `NFR-PERF-005`, `NFR-AVL-002` | Revise to self-managed portable runtime and split installation from per-profile conformance; preserve timeout/unavailability semantics. |
| SRS `FR-COM-006`, `AI-REQ-018`, `NFR-LOG-002`, `BR-029`, `OD-37` | Carry forward CR-006 v1.0/addendum semantics exactly: best-effort terminal log and persisted-row aggregates; no stronger guarantee. |
| Architecture v1.1 | Revise Colab-only deployment language; show Next.js → NestJS → FastAPI `/v1/infer` → Ollama, with local CPU install preferred and GPU optional. Include CR-006 logging and capacity boundaries. |
| AI Contract v1.0 + Release 1 schemas + Errata 1/2 | Keep frozen. Issue a separate reviewed portability supplement only; conform it to CR-006. |
| API v1.5, Business Rules v1.4, UCD/UCS, Activity, UI, Database Design | Cross-document impact review. No public API, business, schema, dashboard or logging change beyond CR-006 is proposed. |
| ADR-AI-001 | Release after CR-005 approval; deployment decision only, not model/capacity certification. |
| Governance Index / Freeze Record / checksums | Register CR-005 and released ADR/addenda only after approval and cross-document audit. Preserve R3 files and manifest; publish a separate release manifest. |
| Deployment/Reproduction Guide and package manifest | Revise against actual source/scripts, then verify on clean CPU machine; include model provenance, env template, health/contract checks and troubleshooting. |
| Phase 2B Plan and Design | Reconcile Task 7 and downstream runtime gates after authority release; obtain fresh read-only Plan Review before implementation. |

## 7. Test and acceptance plan

### Installability tests

1. Verify the release source revision and package manifest/checksums.
2. On a clean CPU-only host, follow the runbook without team-owned cloud credentials; install/start all services, migrate/seed PostgreSQL, and check health/readiness.
3. Verify the model manifest digest and that the configured Ollama model is available; record licensing/retrieval constraints.
4. Run six-task contract tests against the FastAPI adapter using a test engine/mock and the official schemas. Label these as protocol/contract evidence, not live model or quality evidence.
5. Verify NestJS reports an absent/unapproved profile as unavailable and issues zero runtime requests; non-AI routes remain usable.
6. Review logs, environment files and seed data for secrets/PII; execute documented troubleshooting checks for at least one unavailable dependency.

### AI Conformance/Capacity tests (separate profile release)

For each candidate hardware/runtime/model profile, run the AI Contract v1.0 §17 workload and quality suite with the real pinned model: at least 20 fixtures per task, timeout violation rate 0%, schema and semantic pass rates at least 95% per task, reference-boundary violations 0%, and manual Vietnamese quality at least 4/5 per task, alongside each task's NestJS required-content checks and capacity-boundary evidence. Verify exact profile binding and fail-closed behavior on mismatch. Report CPU and GPU/Colab evidence separately. A failed or absent result is `FAIL`/`UNVERIFIED`, never inferred from installability or smoke evidence.

### Release gates

- CR-005 and ADR-AI-001 receive explicit Project Owner approval; owner endorsement alone is insufficient.
- Fresh read-only review confirms internal consistency and that every authority conflict is explicit in the approval checklist; R3's Colab requirement and AI Contract §17's Colab benchmark scope remain active until the Owner approves the requested downstream change.
- SRS/Architecture change sets are revised without modifying R3 sources; CR-006 lifecycle/aggregate rules are reconciled in all affected candidate text.
- CR-005/ADR approval authorizes downstream implementation planning only; it does not assert that the install package already exists or passes. Clean-install verification is a post-Task-7 handoff/package acceptance gate. AI Conformance/Capacity is a separate profile gate and blocks dispatch until approval.
- Governance registration, versioning, checksums, cross-document audit and Phase 2B plan update occur only after approval. Obtain fresh read-only Plan Review before Task 7 or related implementation.

## 8. Project Owner decision checklist

- [ ] Approve the replacement of R3's mandatory Google Colab runtime constraint with the portable runtime boundary in §3.
- [ ] Approve CPU-local as preferred installation mode and GPU as optional, without claiming CPU AI conformance.
- [ ] Approve distinct Installability and AI Conformance/Capacity gates in §4, including the requirement that unapproved profiles remain fail-closed.
- [ ] Confirm CPU exploratory evidence and T4 Lite smoke are not capacity certification.
- [ ] Approve the portability supplement's application of existing AI Contract §17 benchmark criteria to each target profile, without changing Contract v1.0 bytes or thresholds; otherwise non-Colab profiles cannot be called conformant under current authority.
- [ ] Confirm AI Contract v1.0, six task keys, 15 Release 1 schemas, timeout/no-retry/preflight and CR-006 policy remain unchanged.
- [ ] Approve the post-approval document/release sequence in §§6–7; preserve R3 baseline and manifest.

**Current decision:** PENDING. No Project Owner approval of CR-005 v0.2 RC or ADR-AI-001 v0.2 RC is recorded.

## 9. Release state

`CR-005` is a proposed identifier that is unique in the repository search performed for this RC; it is not yet registered or approved. The governance release must register it only after the Project Owner approves this exact version. CR-006 remains approved and active. No runtime implementation, capacity certification, baseline edit, or implementation-plan authorization is granted by this RC.
