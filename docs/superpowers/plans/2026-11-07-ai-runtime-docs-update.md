# DACN AI Runtime Documentation Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After formal approval, release a versioned, cross-document-consistent local-first AI runtime deployment amendment without corrupting the frozen R3 source or downstream approved supplements.

**Architecture:** Preserve the existing NestJS `POST /v1/infer` boundary and authoritative validation. Allow a local CPU Ollama engine behind FastAPI adapter and an optional independent GPU profile; distinguish reproducibility from AI performance certification.

**Tech Stack:** Markdown governance documents, Next.js, NestJS, PostgreSQL/Prisma, FastAPI, Ollama, Docker Compose (to be implemented in a separate runtime plan).

**Spec:** `docs/superpowers/specs/2026-11-07-ai-runtime-portability-design.md`

## Global Constraints

- Current frozen R3 requirements: SRS v1.6, Architecture v1.1; current downstream AI governance index v1.5.
- Protect AI Contract v1.0, Errata 1/2, CR-002/003/004, schema pack Release 1 and approved Phase 1D.3 Demo Acceptance Supplement.
- External attempt timeout stays **60s**, no automatic retry, no silent truncate/sample/chunk.
- Preserve Teacher one-attempt, Admin two-stage, response correlation and preflight/logging.
- Do not call exploratory CPU results a demo model-candidate acceptance or a capacity profile release.
- Never overwrite frozen Markdown or manifest SHA.

## Review Focus

- CPU installation may succeed but SP-02 timeout persists: clearly separate install PASS vs inference FAIL.
- Model/promptVersion/capacity profile changes: fail-closed unless released profile matches each task.
- Runtime generated malformed text vs malformed HTTP JSON: preserve CR-004 and Erratum 2 mapping.
- No accidental request `promptVersion` field; binding is server-side registry-based.
- Release governance: don't label docs Approved until owner decision, cross-document audit and manifest.

---

### Task 1 — Get formal owner decision and source freeze

**Files:** Proposed CR, ADR, latest R3 source files and governance index.

- [ ] Confirm next official CR ID and obtain signed/recorded approval for CPU-local vs GPU acceptance wording.
- [ ] Fetch exact approved repository source bytes for R3 SRS v1.6 / Architecture v1.1 / AI Contract and approved supplements; verify current manifest identity.
- [ ] Confirm no later Change Request invalidates this proposal.
- [ ] Save approval and source hashes before editing.

### Task 2 — Apply versioned SRS revision

**Files:** Create new version of `docs/baseline/SRS_...md` (name chosen by governance); source is v1.6. Use `SRS_v1.6_to_v1.7_Change_Set_DRAFT.md`.

- [ ] Copy original R3 SRS; preserve original read-only.
- [ ] Apply only CON-04, runtime/assumptions, interface, NFR and deliverability changes explicitly approved.
- [ ] Scan all `Google Colab` locations and classify historical vs normative; no blind replacement.
- [ ] Verify AI_REQ, NFR-PERF-004, FR/UC IDs, error catalog and no-truncation unchanged; document diff.
- [ ] Add release history and run Markdown/ID checks.

### Task 3 — Apply versioned Architecture + ADR

**Files:** Create new Architecture version, release ADR-AI-001; source v1.1. Use `System_Architecture_v1.1_to_v1.2_Change_Set_DRAFT.md`.

- [ ] Copy v1.1 Architecture, preserve source hash.
- [ ] Update component diagram, stack table, local dev/deployment, runtime adapters, env, capacity gate and optional GPU.
- [ ] Trace `POST /v1/infer`, role/access, non-AI isolation, log, timeout and no-retry in architecture.
- [ ] Verify `OPEN-ARCH-003` stays open for production model certification.
- [ ] Review no unexpected frontend/API/DB changes.

### Task 4 — AI Contract compatibility/addendum

**Files:** AI Runtime Portability Supplement; AI Contract v1.0, Errata 1/2, CR-003/004; schema pack Release 1.

- [ ] Confirm no change to envelope, contractVersion, task keys or schema pack; otherwise open separate change control.
- [ ] Verify runtime malformed vs parsed invalid-object error mapping and `promptVersion` registry behavior.
- [ ] Verify capacity profile model/tokenizer/task-prompt binding, preflight and AIRequestLog boundaries.
- [ ] Publish addendum only if it adds approved deployment guidance; do not edit frozen v1.0 bytes.

### Task 5 — Reproduction implementation and evidence (separate implementation workstream)

**Files:** Actual `deployment/` scripts/Compose, `.env.example`, model manifest, Prisma seed/migrations, clean-run logs; use `Deployment_Reproduction_Guide_v0.1_DRAFT.md`.

- [ ] Implement Docker/native local bootstrap instructions against actual repo paths; pin versions/digests.
- [ ] Test from clean Linux machine/container without personal cloud credentials.
- [ ] Verify DB migration/seed/auth roles/non-AI flows and real adapter gateway contract.
- [ ] Verify availability/error behavior with missing AI and missing capacity profile, no bypass.
- [ ] Record latency/schema/semantic outcomes as PASS/FAIL by profile, including SP-02 limitation.

### Task 6 — Cross-document release

**Files:** New Governance Index, new release manifest/freeze record if required, CR approval record, cross-doc audit.

- [ ] Run full trace review across SRS, Architecture, AI Contract, API, Business Rules, UCD/UCS, Activity, DB and UI.
- [ ] Ensure approved demo Lite evidence not rewritten as CPU/full-app acceptance.
- [ ] Compute final SHA-256 and governance records only after reviews pass.
- [ ] Preserve old R3 source and all approved errata/supplements; mark new files Approved only with explicit owner decision.

## Handoff

Start with owner approval of CR/ADR and resolution of CPU-only acceptance. Run Tasks 2–6 only after Task 1 passes. No runtime code is authorized or generated by this documentation-only plan.
