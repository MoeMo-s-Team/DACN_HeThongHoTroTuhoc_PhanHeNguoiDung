# Current Implementation Audit — 2026-11-07

## Scope and method

Read-only audit of repository code, frozen baseline documents, approved/endorsed decision records, proposals and plans. Code structure was checked with CodeGraph first, then source inventories and direct file evidence. No application, database, migration, seed, configuration or baseline file was changed. This report is the only intended new artifact.

Status means:

- `IMPLEMENTED`: production code covers the named behavior; test evidence is stated separately.
- `PARTIAL`: some user-visible/backend behavior exists, but the baseline flow is incomplete.
- `MOCK_ONLY`: screen/demo shell or placeholder without the production operation.
- `NOT_IMPLEMENTED`: no corresponding production behavior found.
- `UNVERIFIED`: source exists, but runtime/database behavior could not be checked.

Baseline traceability uses the frozen `SRS_v1.6_baseline_final.md`, API Specification v1.4, Business Rules v1.3, Use Case Specification v1.1, Activity Diagram 3 and the frozen architecture documents. The repository manifest verifies SRS v1.6. The supplied/root `AGENTS.md` authority list still names SRS v1.5, which is not present; that reference is stale and should be reconciled separately. No baseline file was edited.

## Overall status

The repository has a working web-to-NestJS-to-Prisma application slice for authentication, Student dashboard/results/tasks/progress and feedback, plus Administrator user/feedback management and read-only analysis history. These features have unit/UI coverage and the current unit test, lint, typecheck and frozen-baseline checks pass.

It is **not ready for AI integration as an end-to-end product flow**. There is no production AI module/gateway/runtime source or Student AI request endpoint. The Student goal screen only validates and carries a browser-side draft; the StudyPlan screen explicitly says plan creation is not implemented. Teacher features are largely a role-gated landing shell. Administrator analysis history can read stored records, but nothing in the application creates those analysis records.

PostgreSQL/Prisma schema, an initial migration and development seed source exist. The database was unreachable during this audit, so the deployed migration state, seed contents, database integration behavior and end-to-end flows remain unverified.

## Functionality by role and platform

| Area / baseline trace | Status | Evidence and audit note |
|---|---|---|
| Authentication: login, current user, logout; `UC-COM-001`, `FR-COM-001` | `IMPLEMENTED` | Backend validates credentials/status and issues/verifies HS256 access tokens in `apps/api/src/auth/auth.service.ts:26-61`; `AuthGuard` resolves the active user in `apps/api/src/auth/auth.guard.ts:8-15`. Web session flow is in `apps/web/app/auth/auth-context.tsx:21-67`. Unit tests passed in this audit. |
| Authorization and ownership | `PARTIAL` | Student and Administrator service-level role checks and ownership checks exist (for example `apps/api/src/student/student-tasks.service.ts:31-33,63-87`, `apps/api/src/admin/admin.service.ts:26-40`). Teacher class/resource authorization has no teacher backend module/controller; `apps/api/src/app.module.ts:28-39` imports no TeacherModule. Thus the baseline's Teacher authorization path cannot be exercised. |
| PostgreSQL, Prisma, migration and seed source | `IMPLEMENTED` / runtime `UNVERIFIED` | PostgreSQL datasource and domain models are in `apps/api/prisma/schema.prisma:1-7,63-253`; one initial migration is present at `apps/api/prisma/migrations/20261026000000_init/migration.sql`; seed creates users/classes/assessment/plans/tasks/feedback in `apps/api/prisma/seed.ts:52-90,134-167,442-467`. `PrismaService` connects on app start (`apps/api/src/prisma/prisma.service.ts:6-17`). `docker compose ps` showed no running services; read-only `prisma migrate status` failed with P1001 at `localhost:5433`. No seed or integration test was run. |
| Frontend ↔ backend boundary and shared API contract | `IMPLEMENTED` for existing routes; `PARTIAL` overall | NestJS prefixes `/api/v1` and validates DTOs globally (`apps/api/src/main.ts:9-18`); web uses a shared API client (`apps/web/app/auth/api.ts:34-47`); generated contracts are under `packages/contracts/src/generated/`. Major frozen routes for AI and Teacher are absent, so route coverage is partial. |
| Student dashboard, `UC-STU-001` / `FR-STU-001` | `IMPLEMENTED` | `GET /student/dashboard` reads a student's own assessments/current plan/tasks in `apps/api/src/student/student-dashboard.controller.ts:22-30` and `apps/api/src/student/student-dashboard.service.ts:112-177`; UI calls that route in `apps/web/app/sinh-vien/tong-quan/student-dashboard.tsx:44-48`. UI and service tests passed. |
| Assessment results by topic, `UC-STU-002` / `FR-STU-002` | `IMPLEMENTED` (read/view behavior) | Latest result per topic is classified and returned by `apps/api/src/student/student-dashboard.service.ts:15-23,32-50,180-195`; API route at `apps/api/src/student/student-dashboard.controller.ts:44-53`; UI at `apps/web/app/sinh-vien/ket-qua-hoc-tap/student-assessment-results.tsx`. This slice reads assessment records; assessment-entry/evaluation is not implemented here and seed rows are fixtures. |
| Study goal/context, `UC-STU-003` / `FR-STU-003` | `PARTIAL` | Form validates goal, weekly hours and deadline, calls `POST /student/study-context/validate`, then stores the response in a browser draft (`apps/web/app/sinh-vien/muc-tieu-hoc-tap/study-context-form.tsx:17-43`; `apps/api/src/student/study-context.service.ts:7-20`; draft storage `study-context-draft.ts:7-27`). There is no durable goal endpoint or AI consumer in the current flow. Form tests passed. |
| Student AI analysis, `UC-STU-004` / `FR-STU-004` | `NOT_IMPLEMENTED` | No production AI endpoint/module/runtime. The student module only wires dashboard, context validation and tasks (`apps/api/src/student/student.module.ts:1-15`). |
| StudyPlan generation, preview, accept/apply, `UC-STU-005/006` / `FR-STU-005/006` | `PARTIAL` | Form-to-plan handoff exists, but `apps/web/app/sinh-vien/ke-hoach-hoc-tap/study-plan-handoff.tsx:18-23` explicitly reports plan creation is not implemented. No generate/apply controller/service was found, although the baseline defines `/student/study-plans/generate` and `/apply` (`docs/baseline/API_Specification_v1.4_baseline_final.md:516-518`). Current UI test covers only the handoff (`study-plan-handoff.test.tsx`). |
| StudyTask list/status, `UC-STU-007` / `FR-STU-007` | `IMPLEMENTED` | API list/update routes in `apps/api/src/student/student-tasks.controller.ts:25-54`; ownership, transactional state update, plan status and progress recalculation in `apps/api/src/student/student-tasks.service.ts:31-125`. Service/UI unit tests passed. DB integration remains unverified. |
| Progress, `UC-STU-008` / `FR-STU-008` | `IMPLEMENTED` | Exact calculations are backend-owned in `apps/api/src/student/student-dashboard.service.ts:53-75,81-109`; route at `student-dashboard.controller.ts:33-42`; UI `apps/web/app/sinh-vien/tien-do/student-progress.tsx`. Service/UI tests passed. |
| Student AI plan adjustment, `UC-STU-009` / `FR-STU-009` | `NOT_IMPLEMENTED` | No adjustment preview/apply route or AI call in production source; expected API routes are listed at `API_Specification_v1.4_baseline_final.md:522-523`. |
| Submit Feedback (`UC-COM` shared flow) | `IMPLEMENTED` | Validated create API and persistence in `apps/api/src/feedback/feedback.controller.ts:25-42`, `feedback.service.ts:18-25`; student UI in `apps/web/app/phan-hoi/gui/student-feedback.tsx`. Unit/UI tests passed. |
| Teacher landing page | `MOCK_ONLY` | `apps/web/app/giao-vien/lop-hoc/page.tsx:3-5` renders only `AuthenticatedHome` for the TEACHER role. |
| Teacher class/member/dashboard, `UC-TEA-001..004` / `FR-TEA-001..004` | `NOT_IMPLEMENTED` | No Teacher controller/module or Teacher API source exists in `apps/api/src`; API contract expects class/student/dashboard routes (`API_Specification_v1.4_baseline_final.md:524-527`). Seeded Class rows are fixtures, not class-management functionality. |
| Teacher AI analysis/recommendations, `UC-TEA-005/006` / `FR-TEA-005/006` | `NOT_IMPLEMENTED` | No AI call path or Teacher business module. |
| Teacher saved reports/history, `UC-TEA-007/008` / `FR-TEA-007/008` | `NOT_IMPLEMENTED` | `ClassAnalysisReport` schema exists, but no Teacher API or application write/read path was found. |
| Administrator dashboard, `UC-ADM-001` / `FR-ADM-001` | `IMPLEMENTED` (AI counts are only observational) | Backend aggregates user/feedback/AIRequestLog counts in `apps/api/src/admin/admin.service.ts:26-36`; UI at `apps/web/app/quan-tri/tong-quan/admin-dashboard.tsx:8-30`. AI log counts do not prove inference works because application code does not create logs. |
| Administrator user management, `UC-ADM-002` / `FR-ADM-002` | `IMPLEMENTED` | Guarded list/status routes in `apps/api/src/admin/admin.controller.ts:39-56`; service enforces administrator role and status rules in `admin.service.ts:39-71`; UI `apps/web/app/quan-tri/nguoi-dung/admin-users.tsx:14-76`. Unit/UI tests passed. |
| Administrator feedback list/filter, `UC-ADM-003` / `FR-ADM-003` | `IMPLEMENTED` | API/controller/service at `apps/api/src/admin/admin.controller.ts:59-69`, `admin-feedback.service.ts:13-41`; UI `apps/web/app/quan-tri/phan-hoi/admin-feedback.tsx:20-62`. Unit/UI tests passed. |
| Administrator AI analysis and saving, `UC-ADM-004..006` / `FR-ADM-004..006` | `NOT_IMPLEMENTED` | Feedback page has a disabled AI button and says the feature is unavailable (`apps/web/app/quan-tri/phan-hoi/admin-feedback.tsx:63`). The controller has no analysis/save POST routes (`admin.controller.ts:29-86`) though the baseline specifies them (`API_Specification_v1.4_baseline_final.md:536-537`). |
| Administrator analysis history read, `UC-ADM-007` / `FR-ADM-007` | `IMPLEMENTED` (read-only; no app-generated records) | Guarded list/detail routes `apps/api/src/admin/admin.controller.ts:71-85`, query service `admin-history.service.ts:13-43`, UI `apps/web/app/quan-tri/phan-hoi/lich-su-phan-tich/admin-history.tsx:41-60`. Tests exercise list/detail using seeded or mocked records, not a live AI-generated lifecycle. |

## AI infrastructure readiness

**Readiness: NOT READY for any real AI-dependent user flow.** Production source inventory contains no AI module/gateway/runtime implementation under `apps/api/src` or `ai/`; `ai/` contains only its scoped instructions. `apps/api/src/app.module.ts:28-39` has no `AiModule`, and `packages/contracts/src/generated/openapi.ts` contains no baseline AI routes.

| Component | Status | Evidence |
|---|---|---|
| NestJS `AiModule` / `AiGateway` | `NOT_IMPLEMENTED` | No source or module wiring; app module imports are at `apps/api/src/app.module.ts:28-39`. |
| FastAPI/Ollama runtime and `POST /v1/infer` | `NOT_IMPLEMENTED` | No tracked runtime source found in `ai/`; `/v1/infer` appears in owner-endorsed direction/proposal docs, not executable source. The owner decision explicitly says code/runbook implementation and release checks remain outstanding (`docs/decisions/Owner_Decision_Record_AI_Runtime_2026-11-07.md:17-25`). |
| Six task registry / invocation policy | `NOT_IMPLEMENTED` | No task registry or call sites found. Required six task capabilities map to Student analysis, plan generation, plan adjustment, Teacher analysis/recommendations, and the two Admin stages. Admin must run two external stages per `AI-REQ-024` (`SRS_v1.6_baseline_final.md:1605-1610`). |
| Structured output / schema validation | `NOT_IMPLEMENTED` | No AI schema package, runtime schema validation or AI response consumer found in production source. Baseline requires validation beyond JSON parsing (`AI-REQ-009/010`, `SRS_v1.6_baseline_final.md:1550-1555`). |
| `AIRequestLog` | `PARTIAL` | Prisma model/migration exists (`apps/api/prisma/schema.prisma:217-233`; initial migration), and Admin dashboard reads counts (`apps/api/src/admin/admin.service.ts:29-35`); no production AI-attempt path writes a log. Required attempt semantics are `AI-REQ-018/019` (`SRS_v1.6_baseline_final.md:1583-1596`). |
| 60-second per-attempt timeout and failure mapping | `NOT_IMPLEMENTED` | No backend external-call implementation exists. Baseline limit/error contract is `docs/baseline/API_Specification_v1.4_baseline_final.md:204-224`. The 15-second timeout in `apps/web/app/sinh-vien/nhiem-vu/student-tasks.tsx:14-44` applies only to StudyTask HTTP requests, not AI. |
| Capacity profile and preflight | `NOT_IMPLEMENTED` | No profile/config/preflight in production source. Frozen requirement is fail-closed before dispatch (`SRS_v1.6_baseline_final.md:1641-1653`). |
| Runtime/model quality and live latency | `UNVERIFIED` | No application-to-runtime integration ran. The owner decision warns the CPU profile is not certified for all contract flows and specifically records SP-02 failure evidence (`Owner_Decision_Record_AI_Runtime_2026-11-07.md:11-19`). |

### Code versus plans and demonstrations

- `docs/superpowers/plans/2026-11-07-ai-runtime-docs-update.md` is a documentation update plan, not runtime implementation.
- `docs/decisions/ADR_AI_001_Local_First_Runtime_Portability_v0.1_PROPOSED.md` records an owner-endorsed direction but says ADR release is pending CR-005. It cannot be treated as an approved replacement for frozen SRS v1.6 / architecture.
- `docs/proposals/technical/ai-runtime-portability/` and `docs/implementation/ai-runtime/Deployment_Reproduction_Guide_v0.1_DRAFT.md` contain draft/candidate design and runbook material. These do not prove the described gateway, FastAPI adapter, Ollama profile or tests exist.
- No demo/mock response was found being wired as a production AI result. The explicit Student plan handoff and disabled Admin AI button are placeholders, not AI functionality.

## Missing components and severity

### BLOCKER

1. **No runnable AI path:** missing NestJS AI boundary, runtime source/endpoint and Student AI route; therefore no Student AI flow can complete end to end (`AI-REQ-004`, `AI-REQ-020..024`).
2. **No safe dispatch gate:** no validated task schemas, capacity preflight, per-attempt timeout/error handling or `AIRequestLog` write path (`AI-REQ-009/010`, `AI-REQ-015..019`, CR-002 / SRS §5.8). The schema alone is not operational evidence.
3. **Live DB acceptance is blocked:** local PostgreSQL was not running/reachable. Applied migration state, fixture seed state, Prisma integration behavior and DB-backed endpoint flows were not verifiable. Do not claim deployment readiness from repository schema alone.
4. **Local CPU release is not approved/certified:** owner direction is recorded, but ADR release is pending CR-005 and SP-02 CPU capacity is not certified (`Owner_Decision_Record_AI_Runtime_2026-11-07.md:17-25`; `ADR_AI_001...:1-5`). This blocks claiming the portable CPU profile satisfies all six tasks; it does not change the frozen baseline by itself.

### MAJOR

1. Teacher class/member/dashboard, AI analysis, report persistence and history are absent (`FR-TEA-001..008`).
2. Student AI generation/apply/adjustment lifecycle is absent (`FR-STU-004..006, FR-STU-009`); the current goal draft and handoff do not establish the baseline AI flow or human-confirmed persistence.
3. Administrator AI analysis and save are absent (`FR-ADM-004..006`); history reads records without an application writer.
4. Root governance references SRS v1.5 while this repository freezes SRS v1.6. Resolve the authority pointer before future work to prevent implementation against the wrong baseline.

### MINOR

1. Seed data and Prisma schema provide useful development fixtures, but production-data completeness/seed idempotence against a live database was not demonstrated in this audit.
2. There is no verified live runtime availability/latency/quality result for any application AI task. Draft exploratory CPU evidence is not an application integration test.

## Recommended implementation order

1. **Restore a disposable local PostgreSQL verification environment** and run the read-only/setup gates plus migration, seed, API integration and critical Student E2E checks in that environment. Confirm no production database is targeted. This closes platform uncertainty before new persistence work.
2. **Close AI contract/release governance without editing frozen baseline:** resolve the SRS v1.5/v1.6 authority pointer; establish which already-approved AI Contract/schema pack/task keys and deployment profile govern implementation; complete CR-005/ADR release before claiming local CPU portability. Preserve the frozen `/api/v1` contract, six task semantics, human confirmation, and fail-closed capacity requirements.
3. **Build one Student AI vertical slice: generate a StudyPlan preview and apply only after explicit Student confirmation.** Reuse the existing context form and task/progress domain; implement the backend eligibility + capacity preflight → one bounded gateway attempt → structured schema validation → attempt log → preview reference → atomic apply/persistence path; then connect UI loading/empty/ineligible/runtime-error/confirm states. Add unit, DB integration and E2E evidence for the whole flow before expanding to other AI tasks.
4. Add the remaining Student analysis/adjustment flows through the same shared AI boundary and verify their eligibility/failure semantics.
5. Implement Teacher data authorization, dashboards, AI analysis/recommendations, report save and history before exposing Teacher AI UI.
6. Implement Admin's required two-stage feedback analysis and explicit save flow; reuse the existing history read UI only after application-created, validated records are supported.

## Verification record

| Check | Result | Details |
|---|---|---|
| `pnpm test` | `PASS` | API: 12 suites / 82 tests passed; Web: 17 files / 90 tests passed. These are unit/UI and health tests, not DB integration or AI runtime tests. |
| `pnpm lint` | `PASS` | API and web lint tasks succeeded. |
| `pnpm typecheck` | `PASS` | API, web and contracts tasks succeeded. |
| `pnpm verify:baseline` | `PASS` | All 14 files in the frozen baseline manifest reported `OK`. |
| `docker compose ps` | `PASS` (observation) | No services were running. |
| `pnpm --filter @dacn/api exec prisma migrate status` | `FAIL / UNVERIFIED` | Read-only status query failed P1001: PostgreSQL unavailable at `localhost:5433`. No migration was applied. |
| `pnpm test:integration` | `NOT RUN` | It applies Prisma migrations and executes DB-backed tests; the database was unavailable and the task forbids changing any database. |
| `pnpm test:e2e` | `NOT RUN` | E2E preparation requires a database and may mutate fixtures; same constraint/unavailable DB. |
| `pnpm build` | `NOT RUN` | Not needed to answer this audit; root build invokes Prisma client generation. |
| Live AI/runtime tests | `NOT RUN` | No application runtime/gateway source or reachable configured runtime exists in the repository evidence. |

These results establish that the current source checks cleanly and its existing unit/UI tests pass. They do not establish that PostgreSQL migrations/seed work on a live DB, that Teacher flows work, or that any AI flow works.
