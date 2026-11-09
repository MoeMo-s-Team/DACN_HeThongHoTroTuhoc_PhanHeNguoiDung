# Project Owner Approval Record — CR-005 / ADR-AI-001

**Date:** 09/11/2026  
**Decision:** Approve CR-005 v0.2 RC content for release as CR-005 v1.0 Approved and accept ADR-AI-001 v0.2.  
**Authority effect:** Downstream runtime portability authority after release package registration; R3 baseline files remain unchanged.

## Approved decisions

1. Replace the mandatory Google Colab runtime requirement in R3 for the scoped runtime-placement requirements with `Next.js → NestJS → FastAPI /v1/infer → Ollama`.
2. Prefer CPU-local for installation; GPU remains optional.
3. Keep Installability separate from AI Conformance/Capacity. Successful installation does not establish inference conformance.
4. Keep application inference fail-closed without an approved capacity profile.
5. Apply the existing AI Contract v1.0 §17 criteria to each exact runtime/model/hardware profile through the approved portability supplement. Do not change AI Contract v1.0 or its thresholds.
6. Do not treat CPU exploratory evidence or Colab T4 Lite smoke as capacity certification.
7. Preserve the six AI task keys, 15 Release 1 schemas, 60-second timeout, no-retry, complete-input preflight, and CR-006 logging policy.

## Scope limits

This approval authorizes release of CR-005, ADR-AI-001 and the scoped downstream documents, governance registration, cross-document audit, checksum publication, and plan/design update. It does not authorize Task 7 or other runtime implementation, create or approve a capacity profile, certify CPU conformance, change database/API business contracts or CR-006 semantics, modify R3 files/manifest, or authorize a commit.
