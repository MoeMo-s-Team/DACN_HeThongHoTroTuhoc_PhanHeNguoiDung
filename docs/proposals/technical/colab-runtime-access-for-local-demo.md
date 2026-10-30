# Technical Proposal: Local NestJS Access to the Colab AI Runtime

**Status: DRAFT — NOT APPROVED. Do not implement from this proposal.**

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
- Validate that no Access credentials are emitted in logs, verify Access denies unauthenticated traffic, verify FastAPI still rejects a missing/invalid runtime bearer token, and only then perform an end-to-end inference through the protected path.
- Keep AI invocation policy and capacity preflight as separate prerequisites. This proposal does not enable requests while `DenyAllAiInvocationPolicy` remains active or while a valid capacity profile/estimator is absent.

## Risks and open decisions

- Cloudflare Access/Tunnel becomes an additional trusted service and an external network hop for demo request data.
- The published hostname is internet-routable even though Access gates it; policy and service-token configuration must fail closed.
- Colab sessions are ephemeral. Tunnel availability ends with the VM/session and is not a persistent serving guarantee.
- Approve the provider, account/domain ownership, credential storage/rotation, and allowed caller identities before implementation.

## Approval

**Not approved.** Obtain explicit review and approval of this proposal before configuring Cloudflare, changing NestJS runtime client/configuration, or enabling external access.
