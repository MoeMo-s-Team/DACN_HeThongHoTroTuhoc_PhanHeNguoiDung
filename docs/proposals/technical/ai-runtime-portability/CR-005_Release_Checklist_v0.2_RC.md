# CR-005 / ADR-AI-001 Release Checklist — v0.2 RC

**Status:** RELEASE CANDIDATE — PENDING HUMAN APPROVAL  
**Date:** 09/11/2026  
**Authority retained:** R3 baseline + approved downstream CR-006 v1.0/addendum until release.

## 1. Registry and release identity

| Check | Result | Evidence / release action |
|---|---|---|
| `CR-005` collision check | PASS for uniqueness search; NOT REGISTERED | R3 index v1.2 lists CR-002; CR-006 v1.3 addendum registers CR-006 and explicitly says CR-005 remains Draft. Whole-repository Markdown search found no `CP-005` and no competing CR-005 registry entry. Register CR-005 only after Owner approval. |
| `ADR-AI-001` status | Proposed, not accepted | v0.1 is owner-endorsed direction only; v0.2 RC requires explicit approval after CR-005. |
| Owner Decision Record, 07/11/2026 | Direction endorsed only | Explicitly does not approve CR/ADR details, SRS v1.7, Architecture v1.2, or CPU full-AI acceptance. |
| CR-006 coexistence | PASS; retain as active authority | CR-006 remains independent and approved; its logging policy is carried into all candidates. |

## 2. Traceability matrix

| Source/reference | CR-005 impact | Required post-approval disposition |
|---|---|---|
| R3 SRS `CON-04`, `AI-REQ-020/022`, `AS-03/05`, `OD-07/08`, `NFR-PERF-005`, `NFR-AVL-002` | Colab-only constraint and runtime availability/deployment assumptions | Revise through a new SRS version or approved addendum. Preserve `/v1/infer`, 60-second timeout, non-AI availability and existing error semantics. |
| SRS `FR-COM-006`, `AI-REQ-018`, `NFR-LOG-002`, `BR-029`, `OD-37` | Candidate text must not contradict CR-006 | Carry forward one best-effort terminal insert attempt; post-Nest validation status; possible missing row; persisted-row aggregates/undercount; commit-then-ACK-timeout behavior. |
| Architecture v1.1 | Runtime placement and install requirements | Replace Colab-only placement with Next.js → NestJS → FastAPI `/v1/infer` → Ollama; CPU local preferred for installation, GPU optional. Preserve Nest ownership and runtime isolation. |
| AI Contract v1.0, six keys, Schema Pack Release 1 (15 schemas), Errata 1/2, CR-003/004 | No contract/schema changes | Keep frozen sources; portability supplement only. NestJS remains authoritative for output validation and E6 object pass-through remains unchanged. |
| CR-002 / capacity preflight | Per-profile capacity and full-input rules | Preserve exact binding, fail-closed behavior, no truncation/sample/chunking, and `AI_INPUT_TOO_LARGE`/`AI_RUNTIME_FAILURE` mapping. No invented profiles. |
| CR-006 v1.0 + Downstream Addendum | Terminal persistence/error/dashboard semantics | Preserve one insert attempt, no `PENDING` or retry, original inference error on persistence failure, 502 on successful inference with unconfirmed log, and persisted-row aggregate caveat. |
| API v1.5, Business Rules v1.4, Use Cases, Activity/UI, Database Design | Placement-only impact anticipated | Complete impact audit; preserve routes, response shape, schema, roles, business effects and CR-006 dashboard semantics. |
| Phase 2B Design/Implementation Plan | Task 7 and dependent runtime gates | Update only after approval; Task 7 remains gated by CR-005/ADR. Keep Task 4B capacity gate and all later task authorizations. Fresh Plan Review required before implementation. |

## 3. Installability acceptance package

The release candidate requires the handoff to include or point to:

- versioned source and exact release revision;
- database migrations and reproducible non-sensitive seed data;
- `.env.example`/environment template with placeholders only;
- setup scripts and verified CPU-local runbook; optional GPU configuration documented separately;
- model manifest with immutable digest/revision, quantization, license and reproducible download instructions;
- service health/readiness checks for Next.js, NestJS, PostgreSQL, FastAPI and configured Ollama engine;
- six-task v1.0 protocol/schema contract tests, explicitly labeled when using mocks/fixtures;
- troubleshooting steps for installation, configuration, health/readiness, model availability and common runtime failures;
- clean-install report from a separate/recreated CPU-only host, including versions, commands and PASS/FAIL evidence;
- secret and seed-data review.

Installability PASS establishes only that the documented software stack installs and starts. The required clean-install evidence is a post-Task-7 package acceptance check; it is not evidence that the package already exists at this RC stage. If there is no approved matching capacity profile, NestJS must still reject inference before dispatch. No test may disable preflight to manufacture a passing demo.

## 4. Separate AI Conformance/Capacity plan

For each exact model/digest + runtime + quantization/settings + tokenizer/estimator + prompts + hardware profile, apply AI Contract v1.0 §17's existing criteria to that target profile through the separately approved CR-005 portability supplement. Contract v1.0 source bytes and thresholds remain unchanged. This interpretation is a Project Owner approval item; if it is rejected, non-Colab profiles cannot be called conformant under current Contract authority.

1. Run AI Contract v1.0 §17 workloads with real inference: at least 20 fixtures per task; 0% timeout violations; at least 95% schema and semantic pass rates per task; 0 reference-boundary violations; manual Vietnamese quality at least 4/5 per task. Report all six tasks independently.
2. Validate envelope/correlation, Release 1 schema, NestJS semantic/reference checks and required content.
3. Score output quality only against criteria approved by current authority; this RC invents no threshold.
4. Measure attempt latency against the unchanged 60-second maximum and test valid capacity boundary/overflow behavior using the profile's declared tokenizer/estimator.
5. Release a profile bound to exact artifacts and settings before enabling dispatch; mismatch or absent profile remains fail-closed.

CPU exploratory evidence (including SP-02 failures) is not certification. Colab T4 FP16 Lite smoke is only demo-candidate evidence, not application capacity and not CPU evidence. Report CPU and GPU/Colab results separately. Conformance may remain `UNVERIFIED` after Installability passes.

## 5. Human decision checklist

- [ ] Approve CR-005 v0.2's replacement of the Colab-only requirement.
- [ ] Approve CPU-local as preferred installation path and GPU as optional.
- [ ] Approve Installability as independent from AI Conformance/Capacity; confirm no inference claim follows from clean installation.
- [ ] Confirm absent/unapproved profiles remain fail-closed and CPU exploratory/T4 smoke evidence does not create capacity approval.
- [ ] Approve applying the unchanged §17 benchmark method to each target profile through the portability supplement; otherwise keep non-Colab profiles non-conformant.
- [ ] Confirm the Contract, schema pack, six keys, 60-second timeout, no-retry, preflight and CR-006 policy remain unchanged.
- [ ] Approve the affected-document revision and release sequence in CR-005 §6–7.
- [ ] Approve ADR-AI-001 v0.2 RC after CR-005, or return both documents for revision.

## 6. Documents to publish after approval

1. CR-005 approved release and ADR-AI-001 accepted release, with the exact approved versions/checksums.
2. SRS v1.7 and Architecture v1.2 as revisions/addenda; never overwrite R3 files or `BASELINE_MANIFEST.sha256`.
3. AI Contract portability supplement, reconciled with Contract v1.0, Errata 1/2 and CR-006.
4. Updated downstream Governance Index/addendum and separate release checksum manifest.
5. Cross-document audit, traceability record and implementation-plan/design update.
6. Deployment/reproduction guide, package manifest and clean-install evidence; report AI Conformance/Capacity separately by profile.

Business Rules/API/Use Case/Database/UI artifacts receive impact review; revise only if the audit finds actual impacts beyond existing CR-006 authority.

## 7. Stop conditions

- Any candidate states or implies that CPU, the T4 Lite smoke, or installation success certifies all AI tasks/60-second capacity.
- Any candidate requires changing task keys, schemas, timeout, retry, preflight, business behavior or CR-006 logging policy.
- SRS/Architecture revisions edit frozen R3 files or the R3 manifest.
- Package scripts/runbook/health endpoints are referenced as implemented or tested when they are not present and verified.
- A capacity profile is created from exploratory/smoke evidence or inference is enabled without approved binding.
- CR-005/ADR is treated as approved before explicit Project Owner decision and governance release.

## 8. Fresh read-only review record

Review after this RC set is finalized must inspect CR-005, ADR-AI-001, AI Contract portability supplement, SRS/Architecture candidates, this checklist, active R3 sources, CR-006 release, and the current Phase 2B plan/design. Required verdict: internal consistency; every active authority conflict is named for Owner decision; Installability and Conformance/Capacity gates are distinct; all six keys/schema pack/timeout/no-retry/preflight/logging invariants trace; no unsupported evidence claim. The R3 Colab mandate and AI Contract §17 Colab benchmark wording remain controlling until an approved release. A release or material revision after this review requires another fresh review.

**Fresh read-only review:** PASS for RC presentation — coordinator reviewed the finalized RC set against R3, AI Contract v1.0/Errata, CR-006, and the current Phase 2B plan/design on 09/11/2026. Candidate-level contradictions found during review were corrected. The Colab placement and §17 scope conflicts are explicitly listed for Project Owner approval and remain unresolved authority until release.  
**Not run:** clean-install verification and real-profile AI Conformance/Capacity; both remain post-Task-7/profile gates. No Project Owner approval or implementation authorization is granted.
