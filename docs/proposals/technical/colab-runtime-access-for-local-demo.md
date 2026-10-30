# Technical Proposal: Local NestJS Access to the Colab AI Runtime

**Status: DRAFT — NOT APPROVED. Do not implement from this proposal.**

## Audit update — 2026-10-30

**Technical compatibility:** Cloudflare Tunnel + Access Service Token fits the existing transport. `RuntimeHttpClient` posts to `/v1/infer` and sends `Authorization: Bearer <AI_RUNTIME_API_KEY>`; Access can authenticate the same request with its two additional service-token headers. `AiModule` already reads the URL and runtime token from server environment. The proposed code delta is limited to optional server-only Access headers and pair validation. The FastAPI loopback bind and runtime bearer validation remain in place.

**Colab Free suitability is currently NO-GO:** `cloudflared` can connect outbound and route the public hostname to `http://127.0.0.1:8000`, but Google's current FAQ restricts bypassing the notebook UI to interact primarily through a web UI on free runtimes. A local NestJS app invoking Colab FastAPI through a tunnel appears to fit that restricted pattern; this classification is an inference, not a ruling from Google. Since this audit cannot confirm permission, do not create a tunnel. Free fallback: demonstrate actual model inference from a Colab notebook cell (runtime-only, no NestJS connection), or use developer-owned hardware if available. Local hardware can prove the transport/runtime path, but real application-level NestJS inference still requires separately approved authorization and capacity-preflight work. Other tunnel vendors do not change the Colab restriction.

**Access is a gate, not a private hostname:** the hostname is internet-routable; Access must fail closed with a Service Auth policy for one dedicated token. Keep both Access headers and the existing runtime Bearer token, test both authentication layers independently, and use HTTPS from NestJS. The Tunnel connector uses outbound connections, so no inbound Colab port is needed. A Cloudflare-managed domain is required. With a zero-dollar budget, proceed only if the domain is already owned and Tunnel + Service Token features are available at no added cost; do not buy a domain or enable paid features. Strict service-token authentication is organization-wide, so inspect its current setting but do not change it without separate review and approval. Do not use Quick Tunnels.

The reviewed design and implementation plan are in [`docs/superpowers/specs/2026-10-30-local-nestjs-colab-runtime-access-design.md`](../../superpowers/specs/2026-10-30-local-nestjs-colab-runtime-access-design.md) and [`docs/superpowers/plans/2026-10-30-local-nestjs-colab-runtime-access.md`](../../superpowers/plans/2026-10-30-local-nestjs-colab-runtime-access.md). Both remain drafts pending independent review and user approval.

## Problem and current behavior

The serving notebook binds FastAPI to `127.0.0.1:8000` inside Google Colab. That address is reachable only from the same Colab VM, so local NestJS cannot call it directly. The runtime requires its existing bearer token. The NestJS `RuntimeHttpClient` currently sends that runtime authorization header but has no Cloudflare Access credentials.

The application-level AI path is separately not enabled for real user requests: `AiModule` still uses `DenyAllAiInvocationPolicy`, and the live application capacity profile/estimator is incomplete. This network proposal does not change or bypass those controls.

## Affected references and boundaries

- Public API: no `/api/v1` route, method, request, response, error, or authorization change proposed.
- Internal AI Contract: `POST /v1/infer` remains unchanged; keep its existing runtime bearer authentication.
- AI tasks, prompts, prompt versions, schemas, business rules, and persisted behavior: no change.
- Technical surface: NestJS runtime client/configuration and Colab network exposure only.
- No frozen UC/FR/BR behavior is proposed to change. This is a network/configuration design for the existing internal inference path.

## Proposed demo flow

1. FastAPI remains bound to loopback in Colab.
2. `cloudflared` makes an outbound-only connection from Colab to Cloudflare Tunnel; do not open an inbound port on Colab.
3. A Cloudflare Access application protects the published hostname with a machine-to-machine service-token policy. Unauthenticated requests must be denied at Access.
4. NestJS sends the two Access service-token headers (`CF-Access-Client-Id` and `CF-Access-Client-Secret`) from server-side environment configuration, then sends the existing runtime bearer token to FastAPI through the tunnel.
5. Keep all credentials out of frontend configuration, notebooks, source control, and logs. Rotate/revoke Access credentials and the runtime token independently.

The endpoint would have a public hostname at the network edge but would require Access authentication before reaching the Colab origin; FastAPI's own bearer check remains a second layer. Do not use an unauthenticated Quick Tunnel or publish an unprotected endpoint.

## Implementation impact if approved

- Add optional, server-only Access credential configuration to NestJS and include the two Access headers in `RuntimeHttpClient` requests when configured.
- Add a separately invoked Cloudflare Tunnel/Access setup procedure for the Colab demo. Keep it disabled by default and out of `serve-ai.ipynb` Run All.
- Preserve all public API and AI Runtime wire shapes. No frontend credential changes.
- Validate that no Access credentials are emitted in logs, verify Access denies unauthenticated traffic, and verify FastAPI still rejects invalid runtime bearer tokens. Only test full NestJS application inference after authorization policy and capacity preflight have been separately implemented, verified, and approved; this proposal does not authorize bypassing those prerequisites.
- Keep AI invocation policy and capacity preflight as separate prerequisites. This proposal does not enable requests while `DenyAllAiInvocationPolicy` remains active or while a valid capacity profile/estimator is absent.

## Risks and open decisions

- Cloudflare Access/Tunnel becomes an additional trusted service and an external network hop for demo request data.
- The published hostname is internet-routable even though Access gates it; policy and service-token configuration must fail closed.
- Colab sessions are ephemeral. Tunnel availability ends with the VM/session and is not a persistent serving guarantee.
- Colab policy may not permit externally serving inference from a managed runtime; this is a go/no-go prerequisite, not a risk that Access can mitigate.
- Approve the provider, account/domain ownership, credential storage/rotation, and allowed caller identities before implementation.

## Approval

**Not approved.** Obtain explicit review and approval of this proposal before configuring Cloudflare, changing NestJS runtime client/configuration, or enabling external access.
