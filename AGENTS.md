# AGENTS.md — DACN Implementation Rules

## 1. Mission

Implement the MVP "Hệ thống hỗ trợ tự học ứng dụng AI" exactly from the approved project baseline.
Act as an implementation agent, not as a product designer.
Prefer correctness, traceability, and a complete end-to-end flow over unnecessary abstraction.

## 2. Source of Truth

Before making a behavior decision, use this authority order:

1. `docs/baseline/SRS_v1.5_baseline_final.md` — requirements, data, AI behavior, NFRs.
2. `docs/baseline/Use_Case_Diagram_he_thong_ho_tro_tu_hoc_AI_v1.4_baseline_rev1.md` — actors, boundary, UC relationships.
3. `docs/baseline/Business_Rules_v1.3_baseline_rev1.md` — validation, authorization, state, calculations, integrity.
4. `docs/baseline/Use_Case_Specification_v1.1_baseline_rev1.md` — main/alternate/exception flows and acceptance behavior.
5. `docs/baseline/API_Specification_v1.4_baseline_final.md` — frontend/backend REST contract.
6. `docs/baseline/UI_Sitemap_v1.1_baseline.md` and `Wireframe_Screen_Specification_v1.0_baseline_final.md` — screens, routes, UI behavior.
7. `docs/architecture/Global UI Design System — Editorial Tech.md` — current visual/component direction.
8. `docs/baseline/System_Architecture_and_Technology_Stack_v1.0_baseline.md` — implementation architecture and technology decisions.
9. Approved ADRs under `docs/decisions/` — local technical decisions only.

When sources conflict, higher-authority business sources win.
Architecture and ADRs may define implementation details but must not override frozen business/API behavior.
Existing code and tests are evidence of implementation, not authority over the baseline.

## 3. Frozen Baseline Protection

Treat `docs/baseline/` as read-only during bootstrap, feature, fix, refactor, and test tasks.
Never edit, rename, delete, regenerate, or auto-format frozen baseline files.
Never auto-update `docs/baseline/BASELINE_MANIFEST.sha256`.
Run the baseline integrity check when available and report any mismatch.
If a task appears to require changing frozen behavior, stop that part of the implementation and use Proposal Mode.

## 4. Proposal Mode

Do not invent or silently change observable behavior.
For a technical change that preserves behavior/API semantics, draft a proposal or ADR under `docs/proposals/technical/`.
For a change to requirement, role, permission, business rule, state transition, Use Case, API contract, observable UI behavior, or AI business behavior, draft under `docs/proposals/change-requests/`.
A proposal must state:

- the conflict or requested change;
- affected `UC-*`, `FR-*`, `BR-*`, API endpoint/decision, and Screen ID when applicable;
- current baseline behavior;
- proposed behavior;
- implementation impact.
  Agents may draft proposals but may not approve them or modify the frozen baseline from them.

## 5. Before Coding

### Automatic Superpowers Routing

Before exploring or editing for feature, bug, refactor, implementation-plan, plan-execution, review, or completion tasks, use the repository skill `dacn-development-workflow`.
The workflow skill routes the task to the installed Superpowers skills and must run before task-specific exploration or edits.
It must never bypass Frozen Baseline Protection, Proposal Mode, or any human-approval gate.
If the repository workflow skill is unavailable, invoke the applicable Superpowers skill directly instead of proceeding without the workflow.

### RTK Command Efficiency

RTK is installed and should be preferred for supported development commands.

Before issuing Git, file-search, text-search, test, typecheck, build, or other
supported shell commands, use the RTK form when available.

Examples:

- `rtk git status` instead of `git status`
- `rtk git diff` instead of `git diff`
- `rtk find ...` instead of broad raw `find`
- `rtk grep ...` instead of broad raw text search when supported

Follow the installed global RTK guidance in `~/.codex/RTK.md` when needed.

Use raw commands when RTK does not support the required operation.

If compact RTK output omits information needed for debugging, code review,
security inspection, or verification evidence, rerun the relevant command
with `rtk bypass` or temporarily disable RTK for that command.

RTK is an output-efficiency layer only. It must not weaken repository
governance, Git safety, TDD, approval requirements, or verification.

For every non-trivial task:

1. Restate the requested outcome and boundaries.
2. Identify affected `UC-*`, `FR-*`, `BR-*`, API endpoints/decisions, and Screen IDs.
3. Read only the relevant baseline sections, then Architecture and relevant ADRs.
4. Inspect existing code and tests after reading the baseline.
5. Check whether the request conflicts with frozen behavior or an open technical item.
6. Create or confirm an implementation plan before editing code.
7. Prefer a vertical slice: requirement → data change if needed → backend/API → frontend → tests → verification.

Do not expand scope because a feature is common, fashionable, or a "best practice".

## 6. Architecture Invariants

The MVP is a pnpm + Turborepo monorepo.
Frontend: Next.js + TypeScript + Tailwind CSS + TanStack Query + React Hook Form.
Backend: NestJS + TypeScript + Prisma ORM + PostgreSQL.
AI Runtime: self-managed external runtime on Google Colab, accessed through NestJS.

Required boundaries:

- Browser/frontend calls the NestJS REST API; do not add a default BFF/proxy hop.
- Frontend must never access PostgreSQL directly.
- Frontend must never call the AI Runtime directly for business flows.
- AI Runtime must never access PostgreSQL directly or mutate business data.
- Backend is authoritative for authentication, authorization, validation, calculations, metrics, state transitions, transactions, and persistence.
- Keep business logic out of controllers, React components, Prisma hooks, and AI prompts.
- AI output must be structured and validated before use.
- AI must not calculate authoritative metrics that the backend can calculate exactly.
- Preserve required human confirmation before applying important AI suggestions.
- Do not keep a database transaction open while waiting for AI/external network calls.
- Temporary-context claim/mutation/consume/replay operations that require atomicity must remain atomic.
- API timestamps are ISO 8601/UTC; frontend converts them for display.
- Secrets and AI endpoint configuration come from environment/config, never frontend bundles or hard-coded source.

Do not add Redis, queues, microservices, refresh-token APIs, token blacklist, multi-session management, chatbot/RAG, or other out-of-scope infrastructure/features unless approved through the proper decision/change process.

## 7. API and Security Rules

Keep API base path `/api/v1` and preserve frozen route/method/request/response/error semantics.
Protected requests must enforce backend checks for valid token, existing user, `ACTIVE` status, role, and ownership/resource access as applicable.
Frontend route hiding or menu visibility is UX only, never authorization.
Follow the Architecture/API decision for JWT handling; do not create new authentication behavior without approval.
Never log passwords, hashes, bearer tokens, database credentials, AI secrets, or full raw prompts/responses by default.

## 8. Implementation Discipline

Make the smallest change that satisfies the traced requirement.
Follow existing project conventions unless they conflict with an approved source.
Avoid unrelated refactors in feature/fix tasks.
Do not convert open technical items into product behavior by assumption.
Prefer explicit, testable code over clever abstractions.
Use comments for rationale/invariants, not to restate obvious code.
Keep generated artifacts and dependencies reproducible; commit lockfiles/migrations when the task requires them.

## 9. Testing and Verification

Expected behavior comes from Acceptance Criteria, Business Rules, API Specification, and Wireframe/UI states — not from current implementation.
Add or update tests for changed behavior.
Run the narrowest relevant tests during development, then the applicable repository gates before completion:

- `pnpm verify:baseline`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm test:integration` for database/API/transaction changes
- `pnpm test:e2e` for critical user-flow changes

If a command is not yet available or cannot run, state that explicitly; never claim it passed.
Do not mark a task complete while known relevant failures remain unexplained.

## 10. Git and Change Safety

Do not overwrite or revert unrelated user changes.
Prefer small commits with one clear purpose.
Do not commit secrets or real `.env` files.
For feature work, use a feature branch/worktree when the environment supports it.
Do not rewrite history, force-push, or perform destructive Git operations unless explicitly requested.

## 11. Completion Report

When finishing a task, report:

- what changed;
- affected requirement/use-case/business-rule/API/screen references;
- files changed;
- tests/verification commands actually run and their results;
- any skipped verification and why;
- remaining risks, open items, or proposals.

## 12. Scoped Instructions

`apps/web/AGENTS.md`, `apps/api/AGENTS.md`, and `ai/AGENTS.md` may add area-specific implementation rules.
Scoped instructions must not weaken or override this file, frozen baseline, Architecture, or approved ADRs.
When a scoped rule conflicts with a higher-authority source, follow the higher-authority source and report the conflict.
