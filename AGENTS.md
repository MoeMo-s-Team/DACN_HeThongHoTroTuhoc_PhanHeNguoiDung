# AGENTS.md — DACN Implementation Rules

## 1. Mission
Implement the MVP "Hệ thống hỗ trợ tự học ứng dụng AI" exactly from the approved baseline.
Act as an implementation agent, not a product designer.
Prefer correctness, traceability, and complete end-to-end flows over unnecessary abstraction.

## 2. Authority
Use this order when decisions conflict:
1. `docs/baseline/SRS_v1.5_baseline_final.md`
2. `docs/baseline/Use_Case_Diagram_he_thong_ho_tro_tu_hoc_AI_v1.4_baseline_rev1.md`
3. `docs/baseline/Business_Rules_v1.3_baseline_rev1.md`
4. `docs/baseline/Use_Case_Specification_v1.1_baseline_rev1.md`
5. `docs/baseline/API_Specification_v1.4_baseline_final.md`
6. `docs/baseline/UI_Sitemap_v1.1_baseline.md` + `docs/baseline/Wireframe_Screen_Specification_v1.0_baseline_final.md`
7. `docs/architecture/Global UI Design System — Editorial Tech.md`
8. `docs/baseline/System_Architecture_and_Technology_Stack_v1.0_baseline.md`
9. Approved ADRs in `docs/decisions/`

Higher-authority business/API sources win. Architecture/ADRs define implementation details only and may not override frozen behavior. Existing code/tests are implementation evidence, not baseline authority.

## 3. Frozen Baseline and Proposal Mode
Treat `docs/baseline/` as read-only. Never edit, rename, delete, regenerate, auto-format, or auto-update `BASELINE_MANIFEST.sha256`.

If a task requires changing frozen behavior, stop the affected implementation and use:
- `docs/proposals/technical/` for technical changes preserving observable behavior/API;
- `docs/proposals/change-requests/` for requirement, role, permission, business rule, state, Use Case, API, observable UI, or AI behavior changes.

Proposals must identify the conflict/change, affected `UC-*`/`FR-*`/`BR-*`/API/Screen IDs, current behavior, proposed behavior, and implementation impact.
Agents may draft proposals but never approve them or modify the frozen baseline from them.

## 4. Before Coding

### Workflow Routing
Before feature, bug, refactor, implementation-plan, plan-execution, review, or completion work, use `dacn-development-workflow` before task-specific exploration or edits.
It may not bypass baseline protection, Proposal Mode, or human approval gates. If unavailable, invoke the applicable Superpowers skill directly.

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
6. Create or confirm an implementation plan before editing.
7. Prefer a vertical slice: requirement → data → backend/API → frontend → tests → verification.

Do not expand scope because something is common or a "best practice".

## 5. Architecture and Scope
Stack: pnpm + Turborepo; Next.js + TypeScript + Tailwind + TanStack Query + React Hook Form; NestJS + TypeScript + Prisma + PostgreSQL; self-managed AI runtime on Google Colab through NestJS.

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

## 6. API and Security
Keep API base path `/api/v1` and preserve frozen route/method/request/response/error semantics.
Protected requests must validate token, user existence, `ACTIVE` status, role, and ownership/resource access as applicable.
Frontend route/menu visibility is UX only, never authorization.
Follow approved JWT architecture; do not invent new auth behavior.
Never log passwords, hashes, bearer tokens, DB credentials, AI secrets, or full raw prompts/responses by default.

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