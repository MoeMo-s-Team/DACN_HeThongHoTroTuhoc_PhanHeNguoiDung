# AGENTS.md — DACN Implementation Rules

## 1. Mission
Implement the MVP "Hệ thống hỗ trợ tự học ứng dụng AI" exactly from the approved baseline.
Act as an implementation agent, not a product designer.
Prefer correctness, traceability, and complete end-to-end flows over unnecessary abstraction.

## 2. Authority
Current approved freeze: `DACN-REQ-UC-BL-2026-10-26-R3` (CR-001 + CR-002 incorporated).
Use `docs/governance/Document_Governance_and_Traceability_Index_v1.7.md` for active downstream AI artifact authority and `docs/baseline/Requirements_UseCase_Baseline_Freeze_Record_v1.2.md` for the unchanged R3 requirements/use-case freeze scope. Governance indexes v1.2–v1.6 remain preserved historical records.
Use this order when decisions conflict:
1. `docs/baseline/SRS_v1.6_baseline_final.md`
2. `docs/baseline/Use_Case_Diagram_he_thong_ho_tro_tu_hoc_AI_v1.4_baseline_rev1.md`
3. `docs/baseline/Business_Rules_v1.4_baseline_rev1.md`
4. `docs/baseline/Use_Case_Specification_v1.2_baseline_rev1.md`
5. `docs/baseline/API_Specification_v1.5_baseline_final.md` (public REST contract)
6. `docs/baseline/Activity_Diagram_3_AI_Main_Flows_v1.3_baseline_final.md` (AI orchestration)
7. `docs/baseline/UI_Sitemap_v1.1_baseline.md` + `docs/baseline/Wireframe_Screen_Specification_v1.1_baseline_final.md`
8. `docs/baseline/AI_Contract_v1.0_baseline_final.md` plus approved `docs/releases/ai-contract-v1.0-schema-pack-release1/AI_Contract_v1.0_Erratum_1_approved.md` (internal NestJS ↔ AI Runtime contract). The approved `docs/releases/phase-1d3-demo-acceptance-release1/Phase_1D3_Demo_Acceptance_Supplement.md` narrowly supersedes §17 only for DACN demo model-candidate smoke acceptance; it does not alter §15.4, CR-002 capacity requirements, or production certification. Retired Full Benchmark source is mapped in `docs/archive/phase-1d3-full-benchmark-source-v1.md`.
9. `docs/architecture/Global UI Design System — Editorial Tech.md` (presentation only)
10. `docs/baseline/System_Architecture_and_Technology_Stack_v1.1_baseline.md`
11. Approved ADRs in `docs/decisions/`

Follow approved `CR-001`/`CR-002` in `docs/baseline/`, approved downstream `CR-003` in `docs/releases/ai-contract-v1.0-schema-pack-release1/`, and the scoped Phase 1D.3 Demo Acceptance Supplement and CP-005 Local AI Runtime release recorded in governance index v1.7. Higher-authority requirements/business/API sources win; the AI Contract and approved Erratum 1 govern internal inference except for that demo-only §17 supplement. CP-005 changes only the development/demo runtime host; it does not supersede AI Contract §15.4 or CR-002 capacity rules. Architecture/ADRs cannot override frozen behavior. Code/tests are implementation evidence, not authority. If active sources conflict, stop the affected task and report exact references; do not choose an archived version.

## 3. Frozen Baseline and Proposal Mode
Treat `docs/baseline/` as read-only during implementation. Never edit, rename, delete, regenerate, auto-format frozen files, or auto-update `BASELINE_MANIFEST.sha256`.
Archived R1/R2 documents are historical evidence only; never use them to override R3. If a referenced R3 file is missing, report the missing path rather than silently falling back to R2.

If a task requires changing frozen behavior, stop the affected implementation and use:
- `docs/proposals/technical/` for technical changes preserving observable behavior/API;
- `docs/proposals/change-requests/` for requirement, role, permission, business rule, state, Use Case, API, observable UI, or AI behavior changes.

Proposals must identify the conflict/change, affected `UC-*`/`FR-*`/`BR-*`/API/Screen IDs, current behavior, proposed behavior, and implementation impact.
Agents may draft proposals but never approve them or modify the frozen baseline from them.

## 4. Before Coding

### Workflow Routing
Before feature, bug, refactor, implementation-plan, plan-execution, review, or completion work, use `dacn-development-workflow` before task-specific exploration or edits.
It may not bypass baseline protection, Proposal Mode, or human approval gates. If unavailable, invoke the applicable Superpowers skill directly.

### Subagent Model Routing
When subagents are used, route by responsibility and never silently substitute a different subagent model or reasoning effort.
- Independent review subagent: role `reviewer`, model `gpt-6.1-terra`, reasoning `medium`, read-only. Use for plan review, code review, architecture/baseline/regression review, and reviewing another agent's output.
- Code-change subagent: role `implementer`, model `gpt-6-luna`, reasoning `low`. Use for implementation, bug fixes, refactors, tests, migrations, and code/config changes.
- A reviewer must not modify the plan or implementation it reviews. Return findings to the parent; plan edits belong to the parent/writer, and code fixes belong to `implementer`.
- Never let an implementation subagent approve its own work.
- If the required role/model/effort is unavailable, do not silently use another subagent. Fall back to parent execution only when the active workflow permits it; otherwise report `BLOCKED`.

### CodeGraph
When a healthy `.codegraph/` index exists, use CodeGraph first for code structure, call paths, dependencies, feature flow, symbol relationships, or blast radius.
Read source directly only for exact implementation context needed for editing/verification.
If CodeGraph is unavailable, stale, uninitialized, or insufficient, fall back to repository search/read.
CodeGraph never overrides baseline, architecture/ADRs, API, wireframes, scoped instructions, tests, or fresh verification.
Initialize/rebuild it only after meaningful source exists and bootstrap reaches the appropriate stage.

### RTK
Prefer RTK for supported Git, search, test, typecheck, build, and shell commands.
Use raw commands only when unsupported or when compact output hides details required for debugging, review, security inspection, or verification; then use `rtk bypass` or disable RTK for that command.
RTK affects output efficiency only; it never weakens governance, Git safety, TDD, approvals, or verification.

### Non-trivial Tasks
1. Restate outcome and boundaries.
2. Trace affected `UC-*`, `FR-*`, `BR-*`, API endpoints/decisions, and Screen IDs.
3. Read only relevant baseline sections, then Architecture/ADRs.
4. Inspect code/tests after baseline review.
5. Check for conflicts or open technical items.
6. Create or confirm an implementation plan before editing; if a plan is created, it must pass the workflow Plan Review Gate before execution.
7. Prefer a vertical slice: requirement → data → backend/API → frontend → tests → verification.

Do not expand scope because something is common or a "best practice".

## 5. Architecture and Scope
Stack: pnpm + Turborepo; Next.js + TypeScript + Tailwind + TanStack Query + React Hook Form; NestJS + TypeScript + Prisma + PostgreSQL; one self-managed AI runtime on the teammate's Windows 11 + WSL2 Local GPU host, reached by its NestJS over loopback and the user's Linux NestJS over HTTPS Tailscale Serve. Local GPU/Tailscale acceptance is pending actual hardware verification; preserve Colab Lite evidence and serving until PASS.

Required boundaries:
- Browser/frontend → NestJS REST API; no default BFF/proxy.
- Frontend never accesses PostgreSQL or AI runtime directly.
- AI runtime never accesses PostgreSQL or mutates business data.
- Backend owns authentication, authorization, validation, calculations, metrics, state transitions, transactions, and persistence.
- Keep business logic out of controllers, React components, Prisma hooks, and AI prompts.
- Validate structured AI output; AI must not calculate authoritative metrics the backend can compute exactly.
- Preserve required human confirmation before important AI suggestions are applied.
- Never hold DB transactions open across AI/external network calls.
- Keep required TemporaryContext claim/mutation/consume/replay operations atomic.
- API timestamps are ISO 8601/UTC; frontend converts for display.
- Secrets/config stay in environment/config, never frontend bundles or hard-coded source.

Do not add Redis, queues, microservices, refresh-token APIs, token blacklist, multi-session management, chatbot/RAG, or other out-of-scope features without approved change/decision.

## 6. API, AI Contract, and Security
Keep public API base path `/api/v1` and preserve frozen route/method/request/response/error shape. Preserve frozen error semantics except the two post-dispatch classifications explicitly approved by CR-003: runtime prompt-version mismatch and required output blank after trim. Internal AI endpoint is `POST /v1/infer` with `contractVersion=1.0`, not a frontend route.
Protected requests must validate token, user existence, `ACTIVE` status, role, and ownership/resource access as applicable.
Frontend route/menu visibility is UX only, never authorization. Follow approved JWT architecture; do not invent new auth behavior.
Never log passwords, hashes, bearer tokens, DB credentials, AI secrets, or full raw prompts/responses by default.

For AI features, follow AI Contract v1.0, Erratum 1, R3/CR-002 and CR-003:
- Validate eligibility/minimum data, then capacity preflight **before** external dispatch; no `AIRequestLog` if no attempt starts.
- Never silently truncate, sample, pre-summarize, page-limit, or chunk authoritative AI input to fit a model context.
- Valid capacity profile + oversized input → public `422 AI_INPUT_TOO_LARGE`; missing/malformed/mismatched profile → public `502 AI_RUNTIME_FAILURE`; both pre-dispatch with no AI call/log.
- After dispatch, record exactly one terminal SUCCESS/FAILED `AIRequestLog` per external attempt. Preserve separate network, timeout, empty, malformed, and incomplete-output mappings; classify other runtime technical failures as `502 AI_RUNTIME_FAILURE` with FAILED log.
- Teacher analysis + recommendations = exactly one external attempt; Admin success = Stage1 → backend validate/deduplicate/recount → Stage2, exactly two attempts/logs.
- Admin Stage1 success + Stage2 preflight budget reject → only Stage1 SUCCESS log; no Stage2 attempt/log or `analysisRef`.
- Limit each inference attempt to 60s; no automatic retry. Validate output with JSON Schema Draft 2020-12/Ajv 8 plus semantic/reference checks; AI cannot mutate business data.
- The request envelope has no `promptVersion`; bind `task` through the registry and require registry/profile/deployed configuration equality before dispatch. A post-dispatch runtime `promptVersion` mismatch is `502 AI_RUNTIME_FAILURE` with one FAILED log and no retry; required AI output blank after trim is `502 AI_INCOMPLETE_DATA` with one FAILED log.
- Use the approved 15-schema `docs/releases/ai-contract-v1.0-schema-pack-release1/AI_Contract_v1.0_schema_pack_release1.zip` as normative companion. It is a distinct approved release, not a recovered Rev.4 archive. Do not add `promptVersion` to the wire envelope.

## 7. Implementation Discipline
Make the smallest traced change that satisfies the requirement.
Follow project conventions unless they conflict with approved authority.
Avoid unrelated refactors and assumptions that turn open technical items into product behavior.
Prefer explicit, testable code over clever abstraction; comment rationale/invariants, not obvious code.
Keep generated artifacts/dependencies reproducible; commit required lockfiles/migrations.

## 8. Testing and Verification
Expected behavior comes from Acceptance Criteria, Business Rules, API Specification, and Wireframe/UI states—not current code.
Add/update tests for changed behavior. Run the narrowest relevant tests during development, then applicable gates before completion:
- `pnpm verify:baseline`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm test:integration` for DB/API/transaction changes
- `pnpm test:e2e` for critical user-flow changes

If a command is unavailable or cannot run, state that explicitly. Never claim completion while known relevant failures remain unexplained.

## 9. Git and Change Safety
Do not overwrite/revert unrelated user changes.
Prefer small, single-purpose commits; never commit secrets or real `.env` files.
Use a feature branch/worktree when supported.
Do not rewrite history, force-push, or perform destructive Git operations unless explicitly requested.

## 10. Completion Report
Report: what changed; affected requirement/use-case/business-rule/API/screen references; files changed; verification commands/results; skipped verification and why; remaining risks/open items/proposals.

## 11. Scoped Instructions
`apps/web/AGENTS.md`, `apps/api/AGENTS.md`, and `ai/AGENTS.md` may add area-specific rules.
They must not weaken this file, frozen baseline, Architecture, or approved ADRs. Higher authority wins; report conflicts.
