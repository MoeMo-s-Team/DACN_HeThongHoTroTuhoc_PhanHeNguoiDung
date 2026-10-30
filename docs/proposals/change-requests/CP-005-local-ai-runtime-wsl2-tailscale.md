# CP-005 — Local AI Runtime on WSL2 with Optional Tailnet Access

**Status:** APPROVED — downstream release  
**Created:** 2026-10-30  
**Owner approval:** Project Owner approved CP-005 on 2026-10-30.  
**Downstream release:** `docs/releases/local-ai-runtime-wsl2-tailscale-release1/`  
**Author:** Codex  
**Trigger:** Owner request to migrate the DACN demo runtime from Google Colab T4 to a teammate's Windows 11/WSL2 RTX 3050 Laptop 4GB with NF4, while NestJS runs on the user's separate Linux PC and reaches it over Tailscale Serve.

## 1. Summary

This approved change authorizes two independent developer clones, each running its own Next.js and NestJS: the user's clone on Linux and the teammate's clone on Windows 11. Only the teammate's GPU laptop runs the existing FastAPI Runtime and one Qwen model instance in WSL2. The teammate's NestJS uses loopback; the user's Linux NestJS reaches the same process through Tailscale Serve. Install Tailscale on the user's Linux machine and the teammate's Windows host; join both to the same tailnet. After verifying the GPU Windows host reaches FastAPI via Windows-to-WSL localhost forwarding, configure Tailscale Serve on that Windows host to proxy to `http://127.0.0.1:8000`. Keep FastAPI bound to loopback in WSL2. Restrict access with tailnet ACL and retain the AI Runtime Bearer token. No public tunnel/Funnel, contract, task, prompt, schema, validator, authorization, or capacity behavior changes are proposed.

This does not claim production readiness or that the RTX 3050 4GB has passed runtime/capacity validation.

## 2. Reason for Proposal

- [x] Existing baseline behavior needs to change to support a requested runtime host.

The frozen SRS and Architecture specify Google Colab as the MVP/demo AI runtime host. Hosting the same Runtime in local WSL2 conflicts with that location requirement even if the HTTP contract and user-visible AI behavior remain unchanged.

## 3. Affected Baseline

| Type | Reference | Current meaning |
|---|---|---|
| Use Case | N/A | No use case, actor, or user flow change proposed. |
| Requirement | SRS tech stack; CON-04; AS-03; AI-REQ-015, AI-REQ-020..022; AI-INT-006..007; OD-07..08 | Current host is Colab; runtime may be unavailable; endpoint/token are configuration; model candidate was selected in the Colab demo context. |
| Business Rule | N/A | No eligibility, permission, validation, calculation, state, or capacity rule change proposed. |
| API | `POST /v1/infer`; existing NestJS AI routes | No method, path, request, response, timeout, or error mapping change proposed. `AI_RUNTIME_URL` remains environment configuration. |
| Screen | N/A | No UI behavior change proposed. |
| AI | AI Contract v1.0 + approved errata/releases, especially §15.4 | Runtime boundary, six task contracts, bearer authentication, validation, no retries, and capacity preflight remain unchanged. |
| Architecture | `System_Architecture_and_Technology_Stack_v1.1_baseline.md` §4.4, AI Runtime stack table, §14.3, §21.1–21.3, deployment position | Colab is the specified runtime host; endpoint may change by session; app must tolerate runtime unavailability. |

## 4. Current Baseline Behavior

The SRS requires the self-managed AI model to run on Google Colab and says the MVP must be able to run there. It describes Colab session/endpoint availability and configures the endpoint through environment/config. Architecture likewise depicts Colab, says not to containerize Colab Runtime, and treats it as an external development/demo dependency. Approved Lite evidence is specifically Colab Tesla T4 FP16 and remains historical evidence for that environment.

The baseline also requires the NestJS gateway to own authorization, capacity preflight, logging, validation and business behavior; the AI Contract governs the internal runtime bearer-protected endpoint. This proposal does not waive those requirements.

## 5. Proposed Behavior

For development/demo, both members run their own Next.js and NestJS from separate repository clones. The user runs their clone on Linux with the Linux Tailscale client. Only the teammate's Windows 11 host runs the existing FastAPI Runtime in WSL2 with a compatible NVIDIA GPU, and only one Qwen model instance is started. The teammate's NestJS uses `http://127.0.0.1:8000`; the user's Linux host reaches the same FastAPI process through Serve. Join the Linux and Windows hosts to the same Tailscale network; do not install Tailscale inside WSL2. The model remains `Qwen/Qwen2.5-1.5B-Instruct` at immutable revision `989aa7980e4cf806f80c7fef2b1adb7bc71aa306`, explicitly using the existing NF4 loader. Keep FastAPI bound to WSL2 loopback. First prove the GPU Windows host reaches WSL FastAPI at `http://127.0.0.1:8000`; only then configure Windows-host Tailscale Serve to proxy that local port. Tailnet ACLs/HTTPS and the existing runtime bearer token all remain required. Configure the user's Linux NestJS with the Serve HTTPS origin as `AI_RUNTIME_URL`; the existing client appends `/v1/infer`. Tailscale Funnel and unauthenticated/public access are not permitted by this proposal.

Colab remains a historical PASS environment and may remain a fallback until Local GPU acceptance passes. Any archive of Colab operational files is a separate post-acceptance cleanup, retaining Lite PASS evidence and all historical/frozen artifacts.

## 6. Why Existing Baseline Cannot Satisfy the Request

The runtime host is explicitly Google Colab in frozen SRS/Architecture. A local WSL2 host could not satisfy that location constraint through an implementation-only change. The Project Owner has approved CP-005; this release issues downstream SRS v1.7 and Architecture v1.2 for the development/demo host decision. Frozen source versions and the R3 baseline manifest remain unchanged.

## 7. Impact Analysis

### Requirements / Use Cases

Runtime deployment location changes for the development/demo environment. No UC/FR task semantics or actor behavior changes. Exact requirement references are listed above.

### Business Rules

No change. Authorization, eligibility, capacity preflight, exact attempt/log lifecycle, validation and human confirmation remain enforced.

### API

No public or internal API shape changes. `AI_RUNTIME_URL` remains configurable and `RuntimeHttpClient` continues to send the existing Bearer token.

### UI / Wireframe

No change.

### Database

No change.

### AI

No change to the six tasks, prompts, prompt versions, schemas, validators, immutable Qwen revision, response contract, timeout, or retry behavior. NF4 selects the already implemented runtime loader mode; it does not change its shared default.

### Tests

Add/adjust only host/setup verification needed for the local environment after approval. Retain the existing Lite tests and evidence. Runtime checks on target hardware must include GPU passthrough, NF4 load, worker READY, verified full GPU placement without CPU offload, authenticated manual inference, repeated requests and shutdown. Preserve worker lock invariants: root-provision only the canonical root-owned sticky GPU lock directory and missing UUID lock file, validate exact ownership/mode/filesystem/no-symlink properties, then run the service as a normal user; do not weaken checks or run the whole runtime as root. With Tailscale installed on the user's Linux machine and teammate's Windows host, verify the order WSL-local runtime → GPU Windows host to WSL via `127.0.0.1:8000` → Tailscale Serve HTTPS from the user's Linux NestJS host. Test both independently cloned NestJS configurations: teammate `AI_RUNTIME_URL=http://127.0.0.1:8000`, user `AI_RUNTIME_URL=https://<gpu-host>.<tailnet>.ts.net`; in both, `AI_RUNTIME_API_KEY` matches the single WSL `AI_RUNTIME_TOKEN`. Add unit cases for both origins and explicitly run the existing opt-in runtime wire test once from each clone, separately for each route, recording outcomes. Run the Linux NestJS live wire case with Linux Node/pnpm and a Jest test-name filter so Python-spawning tests in the same spec are skipped; no WSL is required on the user's machine. Run the full fake-runtime spec separately in the Linux/Python regression environment. Its test-only mocked authorization/eligibility/preflight and in-memory logs must be documented; it does not exercise or alter production authorization/capacity and does not prove app readiness. Live configuration must fail closed before fetch unless the user explicitly opts in and sets valid route/origin/token/prompt bindings; require exact loopback origin or an HTTPS `*.ts.net` origin, reject credentials or extra URL components, and reject expected/configured-origin mismatch before sending Bearer auth. Skip the live test whenever `CI=true`; ordinary CI/unit tests never contact live services. Verify ACL-allowed and ACL-denied peers, runtime Bearer rejection, and no second model instance; keep FastAPI loopback-only and do not use Funnel. Add blank AI runtime variables only to `.env.example`. Run the existing six-task Lite smoke on the teammate's GPU WSL clone, which has Linux `SIGALRM` support and pnpm/API evaluator dependencies. Prefer the Serve HTTPS origin to test all six requests over Tailscale when WSL can resolve/reach that origin through the Windows Tailscale client. If it cannot reach Serve before dispatch, run all six on loopback and explicitly record that the six-task run was loopback-only; the user's Linux live wire test separately validates the Serve route. Never fallback or retry after an inference attempt fails, install a second Tailscale client in WSL, or use a public tunnel to work around routing. Require existing schema/semantic/reference checks to pass before post-PASS archive. Keep raw model outputs in a private temporary location and out of logs/reports. Do not run Full Benchmark.

### Existing Documentation

The approved downstream SRS v1.7, Architecture v1.2 and governance index v1.7 are published in the linked release. Operational docs, environment examples and opt-in route tests are updated under Phase A. Do not edit frozen SRS, Architecture, baseline manifest, approved records, or Lite evidence in-place. Record the Colab-to-local distinction in versioned downstream artifacts.

## 8. Risks

If approved:

- 4GB VRAM may constrain supported input/output sizes or fail NF4 loading; this requires real hardware and existing capacity-profile validation. Do not silently truncate or bypass preflight.
- WSL2 GPU passthrough, CUDA/PyTorch/bitsandbytes wheel compatibility, GPU UUID discovery, Windows-to-WSL loopback forwarding, and the subsequent Serve-to-WSL path depend on actual driver/network configuration. Serve must not be configured until the Windows-to-WSL hop works.
- Tailscale Serve expands access from one machine to authorized tailnet peers; verify the user's Linux host and teammate's Windows host joined the intended tailnet, an authorized Linux NestJS host can connect, an ACL-denied tailnet host cannot, and the runtime rejects missing/invalid bearer tokens. Misconfiguration could expose the service to unintended tailnet devices.
- Local laptop sleep, shutdown or network loss makes the runtime unavailable; existing runtime failure behavior remains necessary.

If the Local GPU acceptance gate fails, keep Colab artifacts/evidence and do not begin Phase B cleanup. The approved development/demo host decision does not waive runtime unavailability handling or authorize public exposure.

## 9. Proposed Downstream Updates

- [x] SRS (new version only; never edit current frozen file)
- [x] Architecture (new version only)
- [ ] AI Contract — no change proposed
- [ ] Business Rules — no change proposed
- [ ] API Specification — no change proposed
- [x] Test artifacts / operational runbook / `ai/AGENTS.md` and new `ai/LOCAL_GPU_HANDOFF.md` after approval
- [x] `.env.example` with non-secret AI runtime placeholders after approval
- [x] Other: versioned governance index update; preserve Colab Lite PASS evidence
- [ ] Local GPU acceptance report: PENDING actual GPU/Tailscale execution

## 10. Implementation Hold

**Affected implementation status:** Phase A source preparation authorized after this downstream release. Local GPU/Tailscale acceptance remains pending target-machine verification. Phase B source cleanup remains prohibited until Local GPU PASS.  
No runtime-host migration or Tailscale Serve configuration has been performed as part of this Phase A source-preparation task. The approved Phase A work covers downstream governance, operational documentation, environment examples and opt-in transport tests only; actual host activation and acceptance remain with the team on the target machines.

## 11. Decision

**Decision:** APPROVED  
**Reviewer:** Project Owner  
**Decision Date:** 2026-10-30  
**Notes:** Approved for development/demo only: Linux NestJS → Windows-host Tailscale Serve HTTPS → the single WSL2 FastAPI/Qwen NF4 runtime; teammate Windows NestJS → loopback to that runtime. AI Contract, model revision, six tasks, authorization and capacity preflight remain unchanged. Requires separate Local GPU PASS before Phase B cleanup; this decision is not GPU/Tailscale or production readiness evidence.
