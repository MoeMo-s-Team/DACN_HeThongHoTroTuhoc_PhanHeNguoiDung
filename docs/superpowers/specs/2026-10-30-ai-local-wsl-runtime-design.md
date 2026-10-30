# AI Local Runtime on WSL2 — Cleanup Design

**Status:** Approved under CP-005; Local GPU acceptance pending target hardware
**Date:** 2026-10-30

## Goal and boundaries

Support two independent developer clones. The user develops on Linux, running their own Next.js and NestJS with the Linux Tailscale client. The teammate develops on Windows 11 with their own Next.js and NestJS; that machine also hosts one FastAPI/Qwen NF4 instance in WSL2 on an RTX 3050 Laptop 4GB. The teammate's NestJS uses `http://127.0.0.1:8000` after Windows-to-WSL localhost is verified. The user's Linux NestJS uses the GPU host's HTTPS Tailscale Serve origin. Serve only proxies the same FastAPI process; it does not start a second model. Preserve the AI Contract, all six task flows, prompt/schema/validator behavior, bearer authentication, authorization and capacity preflight, Lite PASS evidence, approved changes, and frozen baseline. This is a runtime-host migration proposal, not production readiness evidence.

CP-005 is approved and released through the downstream SRS v1.7, Architecture v1.2 and governance index v1.7. This design keeps Phase A limited to handoff/runbook, environment example and opt-in route-test preparation. No Phase B deletion/archive move or baseline edit is authorized; Colab files/evidence remain until Local GPU PASS.

## Proposed runtime shape

```text
NestJS (user's Linux PC; Tailscale client)
  ── HTTPS https://<gpu-windows-host>.<tailnet>.ts.net ──> Tailscale Serve (GPU teammate's Windows host)
  ── http://127.0.0.1:8000 ──> Windows localhost forwarding ──> FastAPI (WSL2 127.0.0.1:8000)

NestJS (GPU teammate's Windows PC) ── http://127.0.0.1:8000 ──> Windows localhost forwarding ──> the same FastAPI process in WSL2
```

- Install Tailscale on the user's Linux machine and the teammate's Windows host; authenticate both into the same tailnet. Do not install/run Tailscale inside WSL2.
- Keep FastAPI bound to `127.0.0.1:8000` inside WSL2. Before configuring Serve, prove the Windows GPU host can reach that service at `http://127.0.0.1:8000`; do not bind FastAPI to `0.0.0.0`, enable Funnel, or add a public tunnel to fix a failed check.
- Configure Tailscale Serve on the GPU teammate's Windows host to proxy its local `http://127.0.0.1:8000` to the WSL service. Serve requires tailnet HTTPS certificates. Set tailnet ACL to permit only the user's Linux device/identity to access the GPU host's Serve listener; verify the Linux device is allowed and a denied tailnet device is blocked.
- Set NestJS `AI_RUNTIME_URL` to the HTTPS Serve origin `https://<gpu-windows-host>.<tailnet>.ts.net` (origin only; `RuntimeHttpClient` appends `/v1/infer`). Keep the AI Runtime Bearer token in backend configuration and the matching runtime token in WSL. Never put the token in frontend config, source, terminal history, or logs.
- Use per-clone backend environment values: on the teammate's Windows clone, `AI_RUNTIME_URL=http://127.0.0.1:8000`; on the user's Linux clone, `AI_RUNTIME_URL=https://<gpu-windows-host>.<tailnet>.ts.net`. In both NestJS `.env` files, `AI_RUNTIME_API_KEY` must match the single WSL runtime's `AI_RUNTIME_TOKEN`. Keep both files local/ignored; `.env.example` contains blank token placeholders only. The user's Linux machine runs no model/runtime process.
- Retain Bearer authentication across both network hops. Tailscale ACLs and HTTPS are additional access controls, not replacements for runtime auth. Test missing/invalid Bearer token through Serve as well as Tailscale allow/deny behavior.
- Reuse `ai/runtime/` and `RuntimeHttpClient`; do not add another model loader, inference engine, endpoint, retry, or contract.
- Continue using the existing NF4 loader and immutable model revision `989aa7980e4cf806f80c7fef2b1adb7bc71aa306`. No model, prompts, schemas, validators, or task changes.
- Run with a dedicated Linux virtual environment in WSL and existing runtime requirements. Do not install a Linux NVIDIA driver in WSL; the Windows NVIDIA driver exposes CUDA to WSL. Do not overwrite a working system PyTorch without a verified compatible CUDA wheel.
- Preserve the existing worker's GPU lock invariants. The canonical `/tmp/dacn-ai-gpu-locks` must be a root-owned sticky `01777` directory on an approved local `/tmp` filesystem shared with the host mount namespace; the UUID-specific lock file must be root-owned, regular, single-link and mode `0666`. Provision only this directory/file with privilege when absent, inspect existing paths instead of replacing them, then run FastAPI as the normal WSL user. Never run the whole runtime as root or weaken the checks; stop if WSL cannot satisfy the validator.
- Verify GPU UUID discovery, `nvidia-smi`, `torch.cuda.is_available()`, compute capability, bitsandbytes NF4 load, worker READY, one manual inference, multi-request persistence, token rejection, and graceful shutdown on the target machine. A 4GB card is not assumed to fit the complete model plus KV cache for every input; actual supported context/capacity must follow the existing capacity profile/preflight policy.

Test the path in order: (1) FastAPI/worker READY and an authenticated synthetic request inside WSL; (2) teammate's Windows host reaching `127.0.0.1:8000` and making the same authenticated request; only then (3) configure Serve and test from the user's Linux NestJS host. An `/openapi.json` or TCP check proves only HTTP/port reachability, not worker/model readiness. Tailscale Serve is tailnet-only and distinct from public Funnel; Serve requires HTTPS certificates and Tailscale ACL applies. Tailscale recommends running its client on the Windows host only rather than both Windows and WSL. WSL localhost forwarding is supported by default, but the exact path must be verified on the target Windows/WSL networking mode.

## Repository inventory and disposition

No deletion candidate is proposed. “ARCHIVE” means preserve bytes/history under a clearly historical path after the local path has passed its acceptance checks; it does not mean remove evidence.

| Disposition | Paths / group | Reason and dependency check |
|---|---|---|
| KEEP | `ai/runtime/{app,model,worker,diagnostics,prompts,schemas}.py`; `ai/runtime/__init__.py` | Shared serving, NF4 loading, worker lifecycle, six tasks and validation boundary. Direct runtime dependencies; preserve. |
| KEEP | `ai/requirements.in` | Shared runtime dependency declaration, including Torch/CUDA, Transformers, Accelerate, bitsandbytes and runtime packages. Required by local setup; do not replace with the Colab subset. |
| KEEP | `ai/benchmark/{lite_smoke.py,evaluate.ts,reference.ts,validate-inputs.ts,fixtures/lite-smoke.jsonl}` | “benchmark” path includes the active six-task Lite smoke/evaluator, not the retired Full Benchmark. It reuses production validators and fixtures and is needed for regression/acceptance. |
| KEEP | `ai/tests/{test_contract.py,test_inference.py,test_worker.py,test_lite_smoke.py}`, `ai/tests/runtime_http_server.py`; `apps/api/src/ai/ai-benchmark-evaluator.spec.ts` | Shared runtime and Lite behavior tests. The API spec imports `ai/benchmark/evaluate`; `test_lite_smoke.py` tests the runner and should remain independent of hosting. |
| KEEP | `ai/phase-1d3-lite-PASS-20261030-042947-70b2a79d.zip`; Lite PASS report and approved Demo Acceptance Supplement / CR evidence | Frozen/historical verification evidence explicitly required to remain unchanged. No re-run or regeneration. |
| KEEP | `ai/colab/phase-1d3-lite.ipynb`, `ai/requirements-lite.txt` | Approved Full Benchmark source-cleanup CR explicitly retained these for Lite reproduction. Preserve their original bytes and Colab instructions even after local runtime becomes the preferred serving path. |
| KEEP | Full Benchmark historical plan/report/model-selection records, `docs/archive/phase-1d3-full-benchmark-source-v1.{md,zip}`, checksum/map, approved source-cleanup records | Retired benchmark source/history is archived already. The old report/proposal explicitly say pending/no evidence; preserve as history. No execution, cleanup, or evidence rewrite. |
| KEEP | Existing Cloudflare proposal `docs/proposals/technical/colab-runtime-access-for-local-demo.md` and prior local↔Colab plan/spec | Unapproved user-authored design history only; there is no tunnel dependency or implementation. Leave unchanged and do not treat as selected/approved infrastructure. |
| KEEP | `docs/baseline/**`, approved CR/release artifacts and governance indexes | Frozen authority/history. Colab references require CP-005 and later governed release; no direct edits. |
| MODIFY / CREATE (only after CP-005 and plan approval) | `ai/README.md`, `ai/AGENTS.md`, new `ai/LOCAL_GPU_HANDOFF.md`, relevant architecture/runbook pointers | Update local-serving references and create a Linux-user ↔ Windows/WSL2-GPU handoff while preserving Colab PASS evidence and limitations. `ai/AGENTS.md` currently declares Colab as the MVP host. The handoff file does not exist yet. |
| MODIFY (only after approval) | `.env.example` | Add non-secret `AI_RUNTIME_URL` and blank `AI_RUNTIME_API_KEY` placeholders; document that each clone sets its own route. Never place a shared token value in the template. |
| MODIFY tests (only after approval) | `apps/api/src/ai/runtime-http.client.spec.ts`, `apps/api/src/ai/ai-runtime-wire.spec.ts` | Add explicit configuration coverage for loopback and Serve HTTPS origins. The current opt-in live wire smoke is hard-coded to Colab notebook loopback; adapt it into two explicitly selected live paths without changing runtime behavior/contract. Test-only live configuration must fail closed before fetch on missing opt-in, route, expected origin, token, or prompt bindings, reject origins outside the exact loopback/HTTPS `.ts.net` forms, and remain skipped whenever `CI=true`. |
| KEEP | `ai/benchmark/lite_smoke.py` endpoint configuration | Existing `--endpoint` / `AI_RUNTIME_BASE_URL` already supports a local endpoint; no code change is needed. Keep execution explicit and sequential, never automatic on runtime start. |
| ARCHIVE after local PASS | `ai/colab/serve-ai.ipynb`, `ai/tests/test_serve_ai_notebook.py` | Colab serving/provisioning and its notebook-specific test stop being operational entry points. Preserve together as non-runnable historical snapshots outside active test paths; the serving notebook pins a repo commit and the structural test depends on its path/content. Do not archive/delete before Local GPU acceptance. |
| DELETE | None identified | Existing items are either shared runtime/test dependencies, required acceptance evidence, frozen authority, or historical material. No safe deletion is needed to migrate. |

The previous Full Benchmark source cleanup intentionally retained the Lite smoke runner, its evaluator/reference and fixtures, `requirements.in`, Lite tests, and PASS archive. Their filenames do not mean they are Full Benchmark leftovers.

## Two-stage cleanup

### Stage A — prepare and validate before migration

1. Keep all current Colab notebooks/evidence and source in place. No cleanup deletion or archival.
2. After CP-005 is approved, add `ai/LOCAL_GPU_HANDOFF.md` covering both clones on Linux and Windows, Tailscale installation/authentication on the user's Linux machine and teammate's Windows host, route-specific `AI_RUNTIME_URL`/`AI_RUNTIME_API_KEY` settings, the single runtime/token ownership, same-tailnet/ACL setup, safe setup/verification of the existing GPU lock directory and UUID lock file, Windows-to-WSL pre-Serve reachability check, Serve setup/disable, and security/limitations. Add blank AI runtime placeholders to `.env.example`, link the handoff from `ai/README.md`, and update scoped runtime instructions. Leave Colab PASS evidence linked and unchanged.
3. On the GPU teammate's laptop, use a WSL Linux virtual environment and exact versions in `ai/requirements.in`; validate Windows driver GPU passthrough, CUDA-enabled PyTorch, NF4 bitsandbytes compatibility, GPU UUID lock, worker READY, bearer auth, manual inference, repeated requests and shutdown. Provision the exact existing lock directory/file as root only when absent, verify ownership/mode/type/filesystem, and launch FastAPI as the normal user. Do not replace unexpected paths, run the runtime as root, silently change dependency pins, or weaken lock checks; stop if the existing validator fails.
4. Before Serve, verify WSL FastAPI/model readiness and authenticated synthetic inference within WSL, then verify Windows host access to `http://127.0.0.1:8000` and repeat the authenticated request from Windows. A TCP/openapi check is only transport reachability, not model READY. If Windows cannot reach WSL via localhost forwarding, diagnose WSL networking mode; never widen FastAPI bind to `0.0.0.0`.
5. Configure Serve on the Windows GPU host only after Step 4 passes. Check the HTTPS `*.ts.net` origin from the user's separate Tailscale-connected Linux machine; verify the Linux device is ACL-allowed and a denied tailnet device is blocked (use a third tailnet peer or temporarily deny the Linux NestJS device, then restore allow and reverify), plus missing/invalid Bearer token. Configure the Linux clone's NestJS `AI_RUNTIME_URL` as the HTTPS origin (the client appends `/v1/infer`) and the teammate's Windows clone as `http://127.0.0.1:8000`; both NestJS `AI_RUNTIME_API_KEY` values must match the one WSL `AI_RUNTIME_TOKEN`. Only one FastAPI/model worker may run. Never enable Funnel.
6. Record actual `hf_device_map`/parameter placement and CUDA allocated/reserved memory if observable through the existing worker. READY and `nvidia-smi` memory alone do not prove full model placement. Require full placement on the RTX 3050 without CPU offload for a Local GPU PASS; if current runtime cannot expose this fact without code changes, stop and request a separate reviewed diagnostics proposal.
7. Run the existing Python/API regressions. Adapt the existing opt-in API live wire smoke so it is explicitly run in two configurations: (a) teammate's NestJS-side Windows environment with loopback URL; (b) user's NestJS-side Linux environment with Serve HTTPS URL. Run only the named live test with a Jest test-name filter from each clone; the selected test does not invoke Python-spawning fake-runtime helpers, so the user's Linux machine needs Node/pnpm but no WSL. Run the full fake-runtime spec separately in the Linux/Python regression environment. Add unit cases for both origins and fail-closed validation for absent opt-in, missing/invalid route, missing expected origin/token/prompt bindings, disallowed origin shape, and expected/configured-origin mismatch before any fetch. The live smoke must remain skipped whenever `CI=true`, even if the opt-in variable is accidentally present; ordinary unit/CI tests must never contact live endpoints. Map test-only `AI_RUNTIME_BASE_URL` to that clone's `AI_RUNTIME_URL`, `AI_RUNTIME_TOKEN` to its `AI_RUNTIME_API_KEY` without printing either secret, and `AI_RUNTIME_PROMPT_VERSIONS` to the prompt-version map read from the runtime registry. Only an explicit local live-smoke command may set `AI_RUNTIME_LIVE_SMOKE=1` plus route and expected-origin selectors. This isolated test constructs its own service with test-only mocked authorization, eligibility and preflight plus in-memory logs; it does not invoke/alter `AiModule` or production policy and proves only the Runtime receive boundary, not app authorization/capacity readiness. Never start another FastAPI/model process. Run the six-task Lite smoke on the teammate's GPU WSL clone because the runner needs Linux `SIGALRM` and pnpm/API evaluator dependencies. Prefer the final Serve HTTPS origin if WSL can resolve/reach it through the Windows Tailscale client; otherwise run the six tasks by loopback and record that scope. Only use loopback fallback after a pre-dispatch route-reachability check fails; do not retry or fallback after inference begins. Require every existing schema/semantic/reference validation to pass. This is not startup automation. Use existing `AI_RUNTIME_BASE_URL`/`--endpoint`, write outputs to an ignored/private temporary directory, redirect full stdout, and report statuses only because the runner writes raw model output to JSON/stdout.
8. Do not modify or weaken `DenyAllAiInvocationPolicy`, authorization, capacity preflight/profile, or claim end-user AI flow readiness. Current app-level AI invocation is still denied and capacity estimator/profile is separate work.

### Stage B — source cleanup after Local GPU PASS

1. Record a small Local GPU runtime verification report with hardware, driver/CUDA/PyTorch/bitsandbytes versions, pinned model revision/load mode, actual device map and memory, six-task Lite status, test scope and limitations. Keep raw model output outside the repository and out of the report. Do not label it production readiness or a Full Benchmark result.
2. Archive only `ai/colab/serve-ai.ipynb` and `ai/tests/test_serve_ai_notebook.py` as a group. Keep the Lite reproduction notebook and `requirements-lite.txt` because the approved source-cleanup CR explicitly retained them. Keep Lite runner/evaluator/fixtures/tests and PASS archive.
3. Update README/runbook references and test imports/paths affected by the archive; search all tracked references before moving anything.
4. Keep the prior Cloudflare proposal and associated plan/spec unchanged as historical draft material. Run dependency/reference searches and relevant tests. Keep retired Full Benchmark archives and all approved/frozen evidence unchanged.
5. Delete nothing unless a later review proves a file has no active or historical value; none is currently proposed.

## Acceptance and known limits

- Existing Runtime starts on the target RTX 3050 4GB in NF4 at the pinned revision and reports worker READY.
- One manual request returns the existing contract envelope; additional requests are served without reloading the model.
- Invalid/missing bearer token is rejected. NestJS gateway config remains unchanged except endpoint configuration.
- The two-machine route works: Windows GPU host reaches WSL first, then Serve provides HTTPS from the user's Linux NestJS machine under explicit Tailscale ACL and Bearer authentication. No public exposure/Funnel.
- All six synthetic Lite fixtures pass the existing schema, semantic, and reference validation before Stage B; raw result JSON/stdout stays in an ignored/private temporary location. This does not certify NestJS app authorization/capacity.
- Both independent NestJS clones have tested their configured path to the same FastAPI process; the user's clone has not started a local model, and the teammate's runtime log/model load evidence confirms one model instance.
- Existing auth and capacity gates remain active; no app-path readiness claim while `DenyAllAiInvocationPolicy` and capacity work remain unresolved.
- No Colab/Tailscale/GPU test can be claimed before the user's actual hardware is exercised.

## Platform references

- Microsoft, [Accessing network applications with WSL](https://learn.microsoft.com/en-us/windows/wsl/networking)
- Microsoft, [WSL interoperability](https://learn.microsoft.com/en-us/windows/wsl/interop)
- NVIDIA, [CUDA on WSL User Guide](https://docs.nvidia.com/cuda/wsl-user-guide/)
- bitsandbytes, [Installation and hardware requirements](https://github.com/bitsandbytes-foundation/bitsandbytes/blob/main/docs/source/installation.mdx)
- Tailscale, [Install on Linux](https://tailscale.com/docs/install/linux), [Serve](https://tailscale.com/docs/features/tailscale-serve), [Serve examples](https://tailscale.com/docs/reference/examples/serve), and [Tailscale on Windows with WSL2](https://tailscale.com/docs/install/windows/wsl2)
- Tailscale, [Access control](https://tailscale.com/docs/features/access-control)
- PyTorch, [Start Locally](https://pytorch.org/get-started/locally/)
