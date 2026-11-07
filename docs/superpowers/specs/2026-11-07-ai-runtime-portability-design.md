# AI Runtime Portability / Reproducible Handoff — Design Proposal

**Status:** OWNER-ENDORSED DIRECTION (07/11/2026) — CR-005 formal approval and implementation acceptance pending  
**Date:** 2026-11-07  
**Primary CR:** proposed CR-005  
**Scope:** Deployment/runtime documentation and reproducibility for DACN MVP.

## Intent

The student's project must be handed in as source code and supporting data, and an evaluator must be able to install/run it. The evaluator may only have a normal laptop without GPU. Current frozen SRS R3 mandates self-managed AI on Google Colab. A CPU Ollama candidate runs but fails some workload; approved T4 FP16 Lite evidence verifies model-candidate smoke only. Change the *placement constraint*, not behavior or the existing AI contract.

## Alternatives

1. **Colab only:** Keeps existing requirement, but does not provide self-contained installation independent of another account/session.
2. **CPU Ollama only:** Most portable, but SP-02 10 Topic repeated failures and no 6-task CPU evidence make full-inference acceptance claims unsound.
3. **Portable adapter with local CPU install and optional GPU profile (recommended):** Allows reinstallation, preserves NestJS contract, and represents remaining CPU performance gap explicitly.

The user has consistently prioritized CPU-only laptop reinstallation; model conformance on that machine remains an unresolved acceptance decision, not something a design document can assume.

## Proposed decisions

- Keep Next.js, NestJS, PostgreSQL/Prisma, existing roles/UC/API and AI Contract v1.0.
- Use one FastAPI adapter to implement `/v1/infer`, with provider/engine internal to runtime; Ollama CPU local mode must be documented.
- Remote GPU mode is optional, operator-owned, secure and evidence/profile-separated; existing Colab T4 Lite approval remains intact.
- Preserve per-attempt timeout 60 seconds, model/prompt/capacity binding, no retry/truncation, `AIRequestLog`, CR-003/004/Errata error boundaries.
- Produce versioned change sets pending formal CR approval, not rewrite frozen documents.
- Package source, migrations/seed, model manifest/digest, schema, prompt registry and true clean-install runbook; do not claim done until verified.

## Non-goals

- No redesign of frontend/API/DB, no new UC, no change in score/thresholds.
- No model certification claim from StudyPlan exploratory results.
- No GPU provision/purchase or real cloud deployment in documentation-update phase.
- No undocumented mock AI replies in end-user acceptance.

## Unresolved acceptance blocker

What does "evaluator can run the entire product on a normal non-GPU laptop" mean? A reproducible installation is different from all AI actions completing in less than 60 seconds. Current CPU evidence fails the 10-topic case repeatedly, so a full-AI-on-CPU acceptance claim is not permissible. Project Owner must decide whether to accept a documented CPU limitation, supply compatible GPU, or authorize a separately controlled NFR/business change with evidence.

## Artifact outputs

Proposed CR/ADR, SRS and Architecture change sets, AI Contract supplement, reproduction guide, CPU evidence appendix, traceability checklist, and an execution plan. Architecture direction approved in chat; full document release and implementation acceptance remain pending audit and verification.
