# apps/api/AGENTS.md — Backend Rules

## 1. Scope
These instructions apply to `apps/api/`.
They extend the root `AGENTS.md` and must not override frozen baseline, Architecture, API Specification, or approved ADRs.

## 2. Backend Authority
Use NestJS + TypeScript.
Use Prisma ORM as the standard data-access layer to PostgreSQL.
The backend is authoritative for:
- authentication;
- authorization;
- final validation;
- exact calculations and metrics;
- business state transitions;
- transactions;
- AI orchestration;
- AI-output validation;
- persistence.

Do not move authoritative business logic to the frontend, AI prompt, or database hook.

## 3. Layering
Use the direction:

`Controller → Application/Domain Service → Repository/Data Access or External Gateway`

Controllers should only:
- receive the request;
- rely on DTO/framework validation;
- read auth context;
- call application/domain services;
- map HTTP responses/status.

Do not place business rules in controllers.
Keep services cohesive around business capabilities.
Use module boundaries compatible with Auth, Users, Student, Teacher, Admin, Feedback, AI, Context, and Database responsibilities.

## 4. API Contract
Treat `API_Specification_v1.4_baseline_final.md` as the frontend/backend contract authority.
Preserve:
- `/api/v1`;
- routes and HTTP methods;
- required request fields;
- response semantics;
- error codes;
- pagination/filter semantics;
- context/reference semantics;
- authorization behavior.

Do not add convenience endpoints or observable behavior outside the frozen API without approved change control.
Expose Swagger/OpenAPI in development as a downstream representation of the frozen API; generated OpenAPI must not redefine the baseline.

## 5. Authentication and Authorization
Protected requests must enforce the applicable checks:
1. token is valid;
2. user exists;
3. user status is `ACTIVE`;
4. role is permitted;
5. ownership/resource relationship is valid.

Frontend guards never replace backend authorization.
Follow the approved JWT implementation decision.
Do not add refresh-token endpoints, token blacklist, or multi-session behavior outside the baseline.

## 6. Validation and Business Rules
Use `class-validator`, `class-transformer`, and global `ValidationPipe` at the HTTP boundary.
Whitelist expected DTO fields according to project policy.
Normalize data in explicit service/helper code where appropriate.
Keep business rules in named services/domain helpers that can be unit tested.
Do not use Prisma hooks or raw SQL to hide business behavior.

## 7. Prisma and Database
Use Prisma for normal application data access and migrations.
Do not use ad-hoc raw SQL when Prisma can express the requirement.
Raw SQL is allowed only for a correctness/performance primitive Prisma cannot express cleanly, with rationale and integration-test coverage.
Use migrations for tracked schema changes once implementation is established.
Keep test and development databases separate.

Store timestamps in UTC and expose API timestamps as ISO 8601.
Treat API identifiers as opaque strings; do not make frontend behavior depend on database ID format.

## 8. Transactions and Temporary Context
Use database transactions for multi-step mutations requiring atomic behavior.
Do not keep a PostgreSQL transaction open while waiting for AI or any external network call.

For mutation flows using temporary contexts, preserve the required atomic semantics for:
- claim/serialization;
- authorization and state revalidation;
- business mutation;
- context consume;
- fingerprint/replay metadata.

A failed atomic operation must not leave a partial business mutation.
Concurrent requests must not produce duplicate mutations from the same valid context.
Preserve replay-retention semantics required by the frozen API.

## 9. AI Orchestration
All business AI calls go through the backend AI boundary.
Use `AiGateway` for transport concerns such as base URL, auth header, timeout, serialization, parsing, and network-error normalization.
Keep business eligibility outside `AiGateway`.
Read AI URL/secrets from validated backend configuration; never hard-code them.
Validate structured AI output before treating it as successful.
Do not treat successful JSON parsing alone as sufficient validation.
AI failure must not corrupt existing business state.

Create AI request logs only according to frozen semantics.
Do not log full raw prompts/responses, bearer tokens, passwords, hashes, or secrets by default.

## 10. Performance and Queries
Avoid N+1 queries and unnecessary graph loading.
Use database aggregation for exact counts/statistics where appropriate.
Respect API pagination/filter/order semantics.
Optimize query/index design before adding new infrastructure such as Redis.
Do not introduce microservices, queues, or caches merely as a best practice.

## 11. Backend Verification
Use Jest for backend unit/integration tests.
Unit-test calculations, normalization, eligibility, deduplication, and pure rules.
Integration-test authorization, Prisma/PostgreSQL behavior, transactions, context TTL/consume/replay, concurrency, AI logging semantics, and endpoint contracts when affected.
Run applicable root gates, including `pnpm test:integration` for database/API/transaction changes.
Do not report completion without fresh verification evidence.

## 12. Escalation
If implementation requires changing a frozen endpoint, business rule, permission, state transition, context semantics, or observable behavior:
- stop that change;
- identify affected UC/FR/BR/API references;
- use root Proposal Mode;
- do not modify frozen documents or silently reinterpret the contract.