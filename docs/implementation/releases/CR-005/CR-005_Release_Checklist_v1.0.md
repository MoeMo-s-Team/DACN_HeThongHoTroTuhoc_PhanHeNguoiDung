# CR-005 / ADR-AI-001 Release Checklist — v1.0

**Status:** RELEASED — CR-005 v1.0 APPROVED; ADR-AI-001 v0.2 ACCEPTED  
**Date:** 09/11/2026  
**Authority retained:** R3 baseline, plus approved CR-005 and CR-006 downstream addenda.

| Check | Result | Evidence |
|---|---|---|
| CR-005 identity | PASS — registered as CR-005 v1.0 | R3/CR-006/AI governance indices checked; no CR-005 or CP-005 collision before registration |
| Owner approval | PASS | `Project_Owner_Approval_Record_CR-005_2026-11-09.md` |
| ADR identity/status | PASS — ADR-AI-001 v0.2 Accepted after CR-005 | `ADR_AI_001_Local_First_Runtime_Portability_v0.2_accepted.md` |
| SRS revision | PASS — SRS v1.7 downstream revision issued | CR-005 release package; R3 SRS v1.6 retained unchanged |
| Architecture revision | PASS — Architecture v1.2 downstream revision issued | CR-005 release package; R3 Architecture v1.1 retained unchanged |
| Contract supplement | PASS — v1.0 approved | Contract v1.0 and Release 1 schemas remain unchanged |
| CR-006 alignment | PASS | One best-effort terminal insert, no retry/PENDING, status after NestJS validation, possible missing row/undercount retained |
| Cross-document audit | PASS | `Cross_Document_Audit_CR-005_v1.0.md` |
| Fresh Phase 2B Plan Review | PASS — read-only review of the updated plan against both design specs, R3, CR-005, CR-006, AI Contract/Errata and Task 7 acceptance gates | See review record below |
| Separate checksum | PASS after manifest generation | `SHA256SUMS.txt`; excludes itself, covers release docs and updated plan/design |
| R3 manifest | PASS unchanged | `pnpm verify:baseline`; 12 frozen entries match |
| Clean install | NOT RUN | Task 7 package/handoff does not yet exist |
| AI Conformance/Capacity | NOT RUN / UNVERIFIED | No CPU or GPU profile approved; no profile invented |
| Task 7 | NOT AUTHORIZED | Fresh read-only Plan Review PASS; separate explicit authorization still required |

## Released decisions

- Runtime: Next.js → NestJS → FastAPI `/v1/infer` → Ollama.
- CPU-local installation is preferred; GPU/Colab remains optional.
- Installability and per-profile AI Conformance/Capacity are independent gates.
- Missing/unapproved capacity profile remains fail-closed.
- CPU exploratory and T4 Lite smoke evidence is not capacity certification.
- Six task keys, 15 Release 1 schemas, 60-second timeout, no-retry, full-input preflight and CR-006 policy are unchanged.

See the Governance Index v1.6 addendum for current authority and `SHA256SUMS.txt` for released document integrity.

## Fresh read-only Plan Review — 09/11/2026

**Reviewer:** coordinator, read-only review after the plan update.  
**Verdict:** PASS for requesting separate Task 7 implementation authorization; this review is not that authorization.

Review confirmed that CR-005/ADR release satisfies the Task 7 portability-authority prerequisite; Task 7 still has explicit Plan Review and separate authorization gates. Its acceptance now proves clean CPU installability only, while Task 11 applies the exact existing §17 thresholds and profile-bound capacity checks separately. The plan preserves all six task keys, 15 Release 1 schemas, 60-second timeout, no-retry, complete-input fail-closed preflight and CR-006 terminal logging semantics. Task 4B and dispatch remain blocked without an approved matching profile. No contradiction with R3 outside CR-005's scoped Colab placement replacement, or with CR-006, was found. The previously missing clean-install and exact §17 acceptance details were added before this read-only review.
