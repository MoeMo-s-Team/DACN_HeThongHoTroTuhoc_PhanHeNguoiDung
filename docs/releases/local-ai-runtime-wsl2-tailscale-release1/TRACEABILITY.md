# CP-005 Local AI Runtime Downstream Release — Traceability

**Release:** Local AI Runtime on Windows 11/WSL2 with Linux Tailscale Serve, Release 1  
**Status:** APPROVED downstream runtime-host decision; Project Owner approval recorded 2026-10-30.  
**Source:** CP-005 approved by the Project Owner on 2026-10-30.  
**Frozen source:** R3 `DACN-REQ-UC-BL-2026-10-26-R3`, frozen SRS v1.6 and Architecture v1.1 remain unchanged.

## Released downstream documents

- [SRS v1.7](SRS_v1.7_local_ai_runtime_approved.md) supersedes only the development/demo runtime-host constraint and related runtime-host assumptions in SRS v1.6. It does not alter user-visible AI behavior, business rules, API, authorization, or capacity semantics.
- [Architecture v1.2](System_Architecture_and_Technology_Stack_v1.2_local_ai_runtime_approved.md) describes the two-clone topology and is authoritative for this approved development/demo hosting choice.
- The exact CP-005 decision and boundaries remain in [`CP-005-local-ai-runtime-wsl2-tailscale.md`](../../proposals/change-requests/CP-005-local-ai-runtime-wsl2-tailscale.md).

## Approved topology

| Node | Application/runtime | Runtime route |
|---|---|---|
| User's Linux machine | Independent Next.js + NestJS clone; Linux Tailscale client | NestJS uses HTTPS Tailscale Serve origin on the Windows GPU host |
| Teammate's Windows 11 machine | Independent Next.js + NestJS clone; Windows Tailscale client; one FastAPI/Qwen NF4 instance inside WSL2 | NestJS uses `http://127.0.0.1:8000` after Windows-to-WSL localhost reachability is verified |

Only one FastAPI/Qwen process is permitted. FastAPI remains loopback-bound in WSL2. Serve proxies the same process and is tailnet-only; Funnel/public exposure is not allowed. Tailscale ACL and HTTPS supplement, and do not replace, the AI Runtime Bearer token.

## Unchanged authority and acceptance boundary

- Preserve the existing Qwen model ID and immutable revision `989aa7980e4cf806f80c7fef2b1adb7bc71aa306`, using the existing NF4 loader explicitly.
- Preserve the AI Contract, six AI task behaviors, prompts, schemas, validators, bearer authentication, gateway authorization, capacity preflight, attempt/log semantics, no-retry policy, and NestJS API.
- Colab Phase 1D.3-Lite PASS remains historical T4/FP16 evidence. It does not establish Local GPU PASS.
- Local GPU PASS requires actual GPU/WSL/NF4/runtime placement, readiness, authenticated inference, repeated request, shutdown, Windows-to-WSL, Serve/ACL/Bearer, and six-task Lite verification as specified in the approved implementation plan.
- `DenyAllAiInvocationPolicy` and capacity profile/preflight readiness remain application-flow blockers. Runtime transport verification does not bypass or resolve them.
- Phase B cleanup is prohibited until target-machine Local GPU PASS is recorded. No hardware/network pass is asserted by this release.
