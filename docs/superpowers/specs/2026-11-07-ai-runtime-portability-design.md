# AI Runtime Portability / Reproducible Handoff — Design Proposal

**Status:** APPROVED DOWNSTREAM DESIGN under CR-005 v1.0 and ADR-AI-001 v0.2 Accepted (09/11/2026); runtime implementation and profile acceptance remain pending
**Date:** 2026-11-07  
**Primary CR:** CR-005 v1.0 Approved
**Scope:** Deployment/runtime documentation and reproducibility for DACN MVP.

## Intent

The student's project must be handed in as source code and supporting data, and an evaluator must be able to install/run it. The evaluator may only have a normal laptop without GPU. CR-005 v1.0 replaces R3's Colab-only placement constraint with a portable runtime boundary while preserving R3 files and manifest. A CPU Ollama candidate runs but fails some workload; approved T4 FP16 Lite evidence verifies model-candidate smoke only. The runtime placement changes; application behavior and AI Contract v1.0 remain unchanged.

## Alternatives

1. **Colab only:** Keeps existing requirement, but does not provide self-contained installation independent of another account/session.
2. **CPU Ollama only:** Most portable, but SP-02 10 Topic repeated failures and no 6-task CPU evidence make full-inference acceptance claims unsound.
3. **Portable adapter with local CPU install and optional GPU profile (recommended):** Allows reinstallation, preserves NestJS contract, and represents remaining CPU performance gap explicitly.

Project Owner approved CPU-local as the preferred installation path and GPU as optional. Model conformance on CPU remains a separate, unresolved profile acceptance gate, not something a design document can assume.

## Proposed decisions

- Keep Next.js, NestJS, PostgreSQL/Prisma, existing roles/UC/API and AI Contract v1.0.
- Use one FastAPI adapter to implement `/v1/infer`, with provider/engine internal to runtime; Ollama CPU local mode must be documented.
- Remote GPU mode is optional, operator-owned, secure and evidence/profile-separated; existing Colab T4 Lite approval remains intact.
- Preserve per-attempt timeout 60 seconds, model/prompt/capacity binding, no retry/truncation, `AIRequestLog`, CR-003/004/Errata error boundaries.
- Use released CR-005 v1.0, ADR-AI-001 v0.2 Accepted, SRS v1.7, Architecture v1.2 and the AI Contract portability supplement; do not rewrite frozen R3 documents.
- Package source, migrations/seed, model manifest/digest, schema, prompt registry and true clean-install runbook; do not claim done until verified.

## Non-goals

- No redesign of frontend/API/DB, no new UC, no change in score/thresholds.
- No model certification claim from StudyPlan exploratory results.
- No GPU provision/purchase or real cloud deployment in documentation-update phase.
- No undocumented mock AI replies in end-user acceptance.

## Acceptance gates and open runtime evidence

Installability means another person can install and start the submitted source using the documented environment template, scripts, runbook, health checks, model identity/retrieval instructions, six-task contract tests and troubleshooting guide on a clean CPU-only host. It does not mean live inference is conformant or within 60 seconds.

AI Conformance/Capacity is evaluated separately for each exact model/runtime/hardware profile under AI Contract v1.0 §§15.4/17 and the approved portability supplement. CPU exploratory evidence and Colab T4 Lite smoke are not capacity certification. A profile without approved capacity evidence remains fail-closed. The remaining gates are implementation, clean-install evidence, and per-profile benchmark evidence; there is no unresolved owner decision in this design's portability direction.

## Released authority and artifact outputs

CR-005 v1.0, ADR-AI-001 v0.2 Accepted, SRS v1.7 and Architecture v1.2 downstream revisions, AI Contract Runtime Portability Supplement v1.0, traceability/cross-document audit, separate release checksums and updated Phase 2B plan. Runtime source/package, clean-install evidence and any capacity profile remain future Task 7/profile outputs. Task 7 requires a fresh read-only Plan Review PASS and separate authorization.
