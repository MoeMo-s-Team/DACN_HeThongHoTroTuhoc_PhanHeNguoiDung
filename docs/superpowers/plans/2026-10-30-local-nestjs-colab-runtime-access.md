# Local NestJS to Colab AI Runtime Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide an explicitly gated, Access-protected network path for local NestJS to call the existing Colab FastAPI Runtime only if Google confirms the intended Colab Free usage is permitted.

**Architecture:** Keep FastAPI on Colab loopback and use outbound `cloudflared` to a dedicated HTTPS hostname protected by Cloudflare Access Service Auth. Add optional server-side Access Service Token headers to `RuntimeHttpClient`, retaining the existing runtime Bearer token. The policy check is a hard first gate; current evidence is insufficient to authorize a Tunnel deployment.

**Tech Stack:** NestJS/TypeScript `fetch`, existing FastAPI/Uvicorn runtime, Cloudflare Tunnel + Access dashboard, Google Colab.

**Spec:** `docs/superpowers/specs/2026-10-30-local-nestjs-colab-runtime-access-design.md`

## Global Constraints

- **Hard gate:** Do not start a Tunnel or create a reachable public route on Colab Free unless Google explicitly confirms this local NestJS inference use is allowed. If confirmation is unavailable or negative, stop this plan before Task 1 and use the free alternatives in the design.
- **Zero-cost gate:** Require an already-owned domain on Cloudflare and confirmation the selected Tunnel/Access Service Token features are available at no cost on the current account. Do not purchase a domain or enable a paid feature; otherwise stop and use the free alternatives.
- FastAPI remains bound to `127.0.0.1:8000`; no direct inbound Colab port, Quick Tunnel, or alternate tunnel vendor to bypass the policy gate.
- A published hostname must use HTTPS and Cloudflare Access Service Auth; retain the existing runtime Bearer token.
- Access credentials, runtime token, and tunnel token must never appear in source, saved notebook output, command-line arguments, shell history, frontend configuration, or logs.
- Do not change AI Contract, public API, tasks, prompts, validators, authorization, `DenyAllAiInvocationPolicy`, capacity preflight, or runtime behavior.
- Do not send NestJS application-level inference requests while `DenyAllAiInvocationPolicy` or capacity preflight remains unresolved.

## Review Focus

- Colab policy confirmation missing/ambiguous: stop before any public hostname becomes reachable; record the no-go and use notebook-only/local-hardware demo.
- Only one Access credential configured, or either credential blank/whitespace: fail before network I/O; test partial/empty values.
- Access credentials configured with a non-HTTPS URL: fail before `fetch`; test no credentials are sent over HTTP.
- Access-enabled remote endpoint redirects: reject redirects; test `fetch` receives `redirect: 'error'` so credentials cannot be forwarded. Preserve existing no-Access client behavior.
- Access rejects the request with 401/403/302: do not follow redirects; distinguish Access denial from origin response using origin logs/Access logs.
- Strict service-token authentication is organization-wide: inspect its state, but do not change it without separate review/approval.
- Both access layers succeed: use invalid synthetic JSON/envelope and verify FastAPI returns its existing 400 before model inference; do not call NestJS application inference.

---

### Task 0: Resolve the Colab Free policy gate

**Files:**
- No repository files.

- [ ] Review the current official Colab FAQ restrictions for the intended free-tier usage. If official guidance does not explicitly confirm that a local NestJS caller may use a tunnel to invoke this Colab runtime, stop the Tunnel plan here.
- [ ] Confirm the account already has a Cloudflare-managed domain and that Tunnel plus Access Service Token authentication incur no new charge. If either is false or unclear, stop without creating resources.
- [ ] On no-go, do not create a Tunnel, route, or Access hostname. Use the existing notebook's local manual inference for a free runtime-only demo; if full NestJS integration is required at zero cloud cost, check available developer-owned hardware before choosing local serving.

### Task 1: Add optional Cloudflare Access headers to the runtime client (only after Task 0 passes)

**Files:**
- Modify: `apps/api/src/ai/runtime-http.client.ts`
- Modify: `apps/api/src/ai/ai.module.ts`
- Test: `apps/api/src/ai/runtime-http.client.spec.ts`
- Test: `apps/api/src/ai/ai.module.spec.ts`

**Interfaces:**
- Consume existing `AI_RUNTIME_URL` and `AI_RUNTIME_API_KEY` configuration.
- Add optional `AI_RUNTIME_ACCESS_CLIENT_ID` and `AI_RUNTIME_ACCESS_CLIENT_SECRET` server configuration.
- Continue posting only to `/v1/infer`; preserve the existing runtime Bearer header and 60-second timeout.

- [ ] Add client tests (expecting failure before implementation) for: both Access headers and runtime Bearer header are sent together; no Access pair preserves current behavior; a half/empty/whitespace pair fails before fetch; an Access-enabled HTTP URL fails before fetch; and `redirect: 'error'` is set only when Access credentials are configured.
- [ ] Add an `AiModule` provider-wiring test that sets `AI_RUNTIME_ACCESS_CLIENT_ID` and `AI_RUNTIME_ACCESS_CLIENT_SECRET`, resolves/instantiates the module's `RuntimeHttpClient`, sends a mocked request, and asserts both headers reach `fetch`; include a partial environment pair that fails before dispatch.
- [ ] Run `pnpm --filter api test -- runtime-http.client.spec.ts ai.module.spec.ts`; confirm the new cases fail before implementation.
- [ ] Implement optional Access headers with complete-pair validation, HTTPS required when Access credentials are configured, and redirect rejection for Access-enabled requests. Do not change requests without Access configuration.
- [ ] Re-run `pnpm --filter api test -- runtime-http.client.spec.ts ai.module.spec.ts` and `pnpm --filter api typecheck`.

### Task 2: Configure the protected demo route (only after Task 0 passes)

**Files:**
- Modify: `docs/proposals/technical/colab-runtime-access-for-local-demo.md`
- Modify: `ai/README.md` (short operational guide)

- [ ] Inspect the current organization-wide strict service-token authentication setting. Do not change it as part of this task; request separate approval if changing it is needed. Create the Access self-hosted application first with a Service Auth policy including only one dedicated Service Token. Do not start the connector yet.
- [ ] Add a dedicated published route from one HTTPS hostname to `http://127.0.0.1:8000`; verify the Access policy is active before starting `cloudflared`. Once the connector is up, make the no-Access request the first external request and verify denial before any authorized request.
- [ ] Install/use a `cloudflared` version supporting `TUNNEL_TOKEN_FILE`; read the token with `getpass`, write it to an ephemeral file with owner-only permissions, and pass only the file path to the process. Never put token text in process arguments or saved notebook cells/output.
- [ ] Document local NestJS configuration through a secret store or a verified ignored environment file: `AI_RUNTIME_URL`, existing `AI_RUNTIME_API_KEY`, `AI_RUNTIME_ACCESS_CLIENT_ID`, `AI_RUNTIME_ACCESS_CLIENT_SECRET`. Keep all values out of frontend configuration and logs.
- [ ] Verify in order: (a) use a raw HTTP probe with `allow_redirects=False`, body `{}`, a valid runtime Bearer token, and no Access headers; expect Access denial (302/401/403) and confirm FastAPI did not receive it. (b) use `RuntimeHttpClient` with a valid runtime Bearer token and a non-empty invalid Access pair; expect Access denial (or redirect rejection) and confirm FastAPI was not reached. (c) use `RuntimeHttpClient` with valid Access headers and a non-empty invalid runtime key; expect FastAPI 401. (d) use `RuntimeHttpClient` with both credential layers valid and body `{}`; expect FastAPI's existing 400 before inference. Use a secure prompt/secret store for raw-probe credentials, not command arguments or shell history; use Access/origin logs only to confirm reachability and never log credentials or raw request bodies.
- [ ] Stop the tunnel, securely remove the temporary tunnel token file, revoke the connector token and Access Service Token, then stop FastAPI.
- [ ] Confirm `DenyAllAiInvocationPolicy` and capacity preflight are unchanged; no app-level inference or smoke fixtures are run.

### Task 3: Regression and repository verification (only if Tasks 0–2 pass)

**Files:**
- No additional source files; inspect the complete implementation diff.

- [ ] Run `pnpm --filter api test -- runtime-http.client.spec.ts ai.module.spec.ts`.
- [ ] Run `pnpm verify:baseline`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- [ ] Have an independent reviewer verify secret handling, redirect rejection, Access-before-route ordering, unchanged authorization/capacity flow, and absence of contract changes.
- [ ] Record Colab/Tunnel checks not performed and any remaining usage-policy uncertainty. Do not report production readiness.
