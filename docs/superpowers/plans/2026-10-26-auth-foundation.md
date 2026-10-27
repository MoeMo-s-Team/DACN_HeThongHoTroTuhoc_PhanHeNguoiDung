# Auth Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Phase 1B authentication using the accepted Auth ADR and frozen API behavior.

**Architecture:** NestJS owns login, JWT validation, current-user lookup and protected logout. The browser stores the access token in `sessionStorage`, sends it through one API client, restores the User from `/me`, and clears auth plus TanStack Query cache on logout or confirmed invalid authentication.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Argon2id, HS256 JWT, Next.js, React, TanStack Query, Vitest, Jest, Playwright.

**Spec:** `docs/decisions/ADR_AUTH_001_Authentication_Architecture_Decision_v1.0_accepted.md`; `docs/baseline/API_Specification_v1.4_baseline_final.md`; `docs/baseline/System_Architecture_and_Technology_Stack_v1.0_baseline.md`; `docs/baseline/Business_Rules_v1.3_baseline_rev1.md`; `docs/baseline/SRS_v1.5_baseline_final.md`; login screen behavior in `docs/baseline/Wireframe_Screen_Specification_v1.0_baseline_final.md`.

## Global Constraints

- Preserve API base `/api/v1`, API payloads and error semantics.
- JWT uses HS256, 2-hour expiry, `sub`/`iat`/`exp`; `JWT_ACCESS_SECRET` is Base64 for at least 32 random bytes and startup rejects invalid configuration.
- Password verification uses existing Argon2id dependency with ADR parameters `memoryCost=19456`, `timeCost=2`, `parallelism=1`.
- Every protected request validates the JWT, looks up current User from Prisma, and rejects missing or `DISABLED` users.
- Frontend token storage is `sessionStorage`; `/me` network/5xx failures preserve token; confirmed auth failures clear token, User and query cache.
- No refresh token, blacklist, OAuth, registration, session store, or behavior beyond Auth Foundation.

## Review Focus

- Missing, malformed Base64, or decoded JWT secret below 32 bytes must stop startup; cover config validation.
- Unknown email and wrong password must return the same `401 INVALID_CREDENTIALS`; cover both and verify no token.
- Disabled account login and an account disabled after token issuance must be rejected; cover login and protected `/me`.
- Invalid, expired, wrong-algorithm, and wrong-signature tokens must not reach protected handlers; cover guard failures.
- `/me` network/5xx failure during reload must preserve token, while confirmed invalid/disabled responses clear auth and cache; cover frontend bootstrap cases.
- Logout must clear local auth and query cache even if the logout request fails; cover client and browser flow.

---

### Task 1: Backend authentication foundation

**Files:**
- Create `apps/api/src/auth/auth.module.ts`, `auth.controller.ts`, `auth.service.ts`, `auth.guard.ts`, `current-user.decorator.ts`, `dto/login.dto.ts`, and focused unit tests.
- Create `apps/api/src/common/api-exception.filter.ts`, `apps/api/src/auth/auth.service.spec.ts`, and `apps/api/src/auth/auth.config.spec.ts`.
- Modify `apps/api/src/app.module.ts`, `apps/api/src/main.ts`, `apps/api/jest.config.ts`, `apps/api/test/health.e2e-spec.ts`, `.env.example`, root dependency manifests/lockfile.
- Reuse `apps/api/src/prisma/prisma.service.ts`, Prisma `User`, and existing `argon2` dependency.

**Interfaces:**
- `POST /api/v1/auth/login` accepts `{ email, password }` and returns `{ accessToken, user }`.
- `GET /api/v1/me` returns the active User summary.
- `POST /api/v1/auth/logout` requires authentication and returns `204` without server revocation.
- Protected handlers receive the database-backed active User through request auth context.

- [ ] Configure Jest unit tests to include `src/**/*.spec.ts`; write failing `auth.service.spec.ts` tests for normalized email lookup, correct/wrong password, identical unknown/wrong credential errors, disabled login, JWT `sub`/`iat`/`exp` and 2h expiry; `auth.config.spec.ts` tests missing/invalid/short Base64 secret.
- [ ] Run `pnpm --filter @dacn/api test -- --runInBand` and confirm the new auth tests fail before implementation.
- [ ] Implement request DTO validation, startup secret validation, HS256-only signing/verification, Prisma current-user lookup/status check, login, `/me`, protected logout, and register the `{code,message,details}` error filter with Nest `APP_FILTER` so runtime and testing modules share auth/validation/database error semantics.
- [ ] Configure credential-free CORS for the single frontend origin from validated environment (`FRONTEND_ORIGIN`) so browser JSON/Bearer requests use the direct Nest API boundary.
- [ ] Update the existing health AppModule test to provide a valid test secret; run API unit/e2e tests and confirm they pass.

### Task 2: PostgreSQL-backed authentication integration coverage

**Files:**
- Create `apps/api/test/auth.integration-spec.ts`.
- Modify `apps/api/scripts/run-integration-tests.ts` only if required to include the auth suite.

**Interfaces:** Uses the actual Nest API, Prisma test database, and seeded or isolated test Users.

- [ ] Add integration cases for successful normalized login and JWT claims, wrong/unknown credentials returning the same `401 INVALID_CREDENTIALS`, disabled login `403 ACCOUNT_DISABLED`, valid `/me`, missing/invalid/expired/wrong-signature/wrong-algorithm tokens returning `401 AUTH_REQUIRED`, and ACTIVE-to-DISABLED after issuance.
- [ ] Run `pnpm test:integration` and confirm the expected status/body behavior against PostgreSQL.

### Task 3: Browser auth client and login flow

**Files:**
- Create `apps/web/app/auth/api.ts`, `auth-context.tsx`, `login-form.tsx`, `authenticated-home.tsx`, `apps/web/app/dang-nhap/page.tsx`, `apps/web/app/sinh-vien/tong-quan/page.tsx`, `apps/web/app/giao-vien/lop-hoc/page.tsx`, `apps/web/app/quan-tri/tong-quan/page.tsx`, and `apps/web/app/auth/auth.test.tsx`.
- Modify `apps/web/app/providers.tsx`, `apps/web/app/page.tsx`, and `apps/web/package.json` (include `.ts` in lint inputs).

**Interfaces:** One API client attaches the session token. Auth provider exposes current User, bootstrap status, login, and logout; `/` redirects to frozen login route `/dang-nhap`; reload calls `/me` when a token exists. Login redirects Student, Teacher, and Administrator to their frozen landing routes. Each route uses one shared authenticated shell with current-user identity and logout only; it adds no dashboard data or business functionality.

- [ ] Add failing tests in `apps/web/app/auth/auth.test.tsx` for login token storage/Bearer header, `/me` reload restoration, transient bootstrap failure preserving token, confirmed invalid/disabled response clearing auth/cache, and logout cleanup on request failure.
- [ ] Run `pnpm --filter @dacn/web test -- app/auth/auth.test.tsx` and confirm failures before implementation.
- [ ] Implement the API client/provider, `SCR-COM-001` login form with labeled email/password inputs and inline error states, role redirects to baseline routes, and shared auth-only landing shell.
- [ ] Include `app/**/*.ts` and `app/**/*.tsx` in web lint; run focused Vitest tests and confirm they pass.

### Task 4: End-to-end flow and requested gates

**Files:**
- Create `apps/web/e2e/auth.spec.ts` using a real browser page and real API.
- Create `apps/api/scripts/prepare-e2e.ts` to migrate and seed `TEST_DATABASE_URL` with the existing deterministic demo fixture and `SEED_PASSWORD`.
- Modify root `package.json` and `apps/web/playwright.config.ts` to prepare the isolated test DB and start the API using that DB, an ephemeral runtime-generated Base64 JWT secret, and the existing demo seed credential.

- [ ] Add Playwright browser E2E assertions: submit login form, reload so bootstrap restores User via protected `/me`, observe the protected `/me` request and protected `POST /auth/logout`, then verify the login form returns and `sessionStorage` has no token.
- [ ] Generate a fresh JWT secret from `crypto.randomBytes(32)` in Playwright config at runtime and pass it only to the API process; configure its allowed frontend origin as `http://127.0.0.1:3100`; start Playwright's API `webServer` against `TEST_DATABASE_URL`; run `pnpm test:e2e` and verify the end-to-end flow including browser CORS. Logout remains local-only; do not expect the server to revoke the same still-valid JWT.
- [ ] Run `pnpm verify:baseline`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, and `pnpm build`; resolve relevant failures and rerun.

## Traceability

- `UC-COM-001`, `UC-COM-002`, `UC-COM-004`; `FR-COM-001` through `FR-COM-004`; `BR-032`, `BR-039`; `API-COM-AUTH-001`, `API-COM-AUTH-002`, `API-COM-PROFILE-001`; login screen `SCR-COM-001`.
