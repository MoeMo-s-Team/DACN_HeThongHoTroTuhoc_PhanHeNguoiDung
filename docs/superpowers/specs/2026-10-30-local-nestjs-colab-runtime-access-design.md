# Local NestJS to Colab AI Runtime Access — Design

**Status: DRAFT — recommendation only; not approved for implementation.**

## Intent and boundaries

Evaluate a free, short demo where local NestJS calls the existing FastAPI runtime in Colab. Keep the current FastAPI loopback bind and runtime Bearer token. Keep the AI Contract, tasks, prompts, validators, user authorization, `DenyAllAiInvocationPolicy`, and capacity preflight unchanged. This is network plumbing only; it does not make application AI invocation available.

## Approaches

1. **Cloudflare Tunnel + Access Service Token (conditional only):** technically fits the current HTTP client and Colab loopback topology, but should be used on Colab Free only if Google explicitly confirms the intended external API access is permitted. The current public policy does not clearly permit it; this is a no-go until confirmed.
2. **Free Colab-only demo (recommended under current evidence):** use `serve-ai.ipynb` to start FastAPI on loopback and send a manual request from a Colab cell. This exercises real model inference without exposing a public endpoint, but does not demonstrate local NestJS integration.
3. **Developer-owned local hardware:** run the same FastAPI runtime beside local NestJS and keep loopback transport. This can demonstrate the runtime transport/inference at no cloud cost if hardware is sufficient; full NestJS application inference still requires separate resolution of `DenyAllAiInvocationPolicy` and capacity preflight. Hardware and performance are not verified here.
4. **Owned VM:** supported operational path if a remote NestJS-to-model demo is required, but not zero-cost in general.

Other public tunnel vendors do not resolve the Colab policy uncertainty and are not a fallback. Do not use Quick Tunnels or another tunnel to bypass Colab limits.

## Current policy assessment

Google's current Colab FAQ says free managed runtimes disallow “bypassing the notebook UI to interact primarily via a web UI,” and that managed runtimes prohibit some web service offerings unrelated to interactive compute. A local NestJS process making AI requests to a FastAPI endpoint through a tunnel appears to fit the first restricted pattern; that classification is an inference, not a ruling from Google. Since no authoritative confirmation that this use is allowed is available in the audit, the recommended decision for Colab Free is **NO-GO for tunnel setup**. Do not attempt to resolve the issue by switching tunnel providers. Resume the tunnel plan only after explicit policy confirmation; otherwise use approach 2 or 3.

## Conditional network design (only after policy confirmation)

- FastAPI remains on `127.0.0.1:8000`; `cloudflared` on that VM forwards to it over an outbound-only tunnel.
- Create the HTTPS Access application and restrictive Service Auth policy before starting the connector or making the route reachable. Inspect the organization-wide strict service-token setting, but do not change it without separate review/approval. After the connector starts, verify unauthenticated denial before sending an authorized request.
- NestJS `RuntimeHttpClient` sends `CF-Access-Client-Id` and `CF-Access-Client-Secret` alongside the existing `Authorization: Bearer <AI_RUNTIME_TOKEN>` header. Use only HTTPS for remote URLs with Access credentials and reject HTTP redirects so credentials cannot be forwarded.
- Keep runtime token and Access credentials separate, server-side, independently revocable, and out of logs/source/notebook outputs. Store local credentials in a verified ignored `.env`/secret store. In Colab, use a short-lived `TUNNEL_TOKEN_FILE` with restrictive permissions; never put a tunnel token in command arguments or notebook source/output.
- Stop and revoke the connector and both tokens after the demo.

Zero-cost prerequisites are an already-owned domain in the Cloudflare account and confirmation that Tunnel + Service Token policy can be used on the existing plan without charge. Do not buy a domain or enable a paid feature for this task. Strict service-token authentication is organization-wide: inspect its current status, but do not change that setting without separate review and approval.

## Security and operational constraints

- A hostname is internet-routable even when Access denies unauthenticated traffic. Make the Access policy active before starting the connector; verify denial with the first external request before sending any authorized request. Keep FastAPI Bearer authentication as a second gate.
- Cloudflare terminates the public HTTPS connection and is an additional trusted processor/network hop. Do not send sensitive personal/learning data beyond the minimum demo payload.
- Colab sessions are ephemeral; resource availability and maximum lifetime vary. A tunnel cannot provide an uptime guarantee.
- No public API, `/v1/infer` envelope, task, prompt, validator, authorization, capacity preflight, or business behavior changes.
- No NestJS application-level inference is permitted while `DenyAllAiInvocationPolicy` or capacity preflight remains unresolved. Network verification must use a deliberately malformed synthetic runtime envelope that FastAPI rejects before inference.

## Approval state

This design and its implementation plan are drafts. No tunnel, public hostname, code, or runtime configuration has been created or changed. User approval is required before implementation; Colab Free policy confirmation is an additional prerequisite for any Tunnel setup.
