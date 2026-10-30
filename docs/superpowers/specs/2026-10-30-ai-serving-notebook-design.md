# AI Serving Notebook Design

## Intent

Add a small Google Colab notebook for repeatedly serving the existing FastAPI AI Runtime during DACN development and demos. The notebook should start the runtime once, wait for the runtime worker's real READY state, and leave it running until the user stops it.

## Goals and boundaries

- Use Tesla T4, `Qwen/Qwen2.5-1.5B-Instruct`, immutable revision `989aa7980e4cf806f80c7fef2b1adb7bc71aa306`, and explicit `AI_RUNTIME_LOAD_MODE=fp16`.
- Reuse Colab's Torch and normal Hugging Face cache. Install only missing pinned runtime dependencies; never run Lite tests, benchmark/provenance, Node, pnpm, or Prisma setup.
- Use the existing FastAPI lifespan and worker lifecycle. Keep one Uvicorn child process alive across requests, with READY, status/log, failure, stop, and restart handling.
- Bind only to `127.0.0.1`; do not add runtime routes, alter contracts/tasks/prompts/validators/NF4 behavior, write secrets to notebook/logs, or create a tunnel.
- Add short `ai/README.md` instructions and focused notebook regression checks. Existing Lite evidence and behavior remain untouched.
- Draft a separate, explicitly unapproved technical proposal for local NestJS-to-Colab access. Recommend Cloudflare Tunnel protected by Access service-token policy plus existing runtime bearer authentication. The Access layer requires two additional server-side headers/configured secrets; the proposal must trace that required internal gateway/config change. Implementation requires separate approval.

## Approaches

1. **Uvicorn subprocess on loopback (selected):** a Python cell starts the existing `ai.runtime.app:app`, captures a local log, and polls startup completion. A later cell checks status and another stops the process. This fits the runtime's multiprocessing worker lifecycle and permits the notebook to remain interactive.
2. **Uvicorn in the notebook foreground:** simplest launch command but occupies the cell and makes a separate status/stop workflow awkward.
3. **Uvicorn in a notebook thread or custom serving wrapper:** adds lifecycle and multiprocessing complexity without improving the existing FastAPI runtime.

The user selected option 1. For external NestJS access, the serving notebook remains local-only. Cloudflare Tunnel plus Access is proposal-only; a public hostname would be access-gated, while FastAPI bearer authentication remains enabled. The current API runtime client sends only the runtime Authorization header, so a real Access integration would need server-side Access client ID/secret headers and environment configuration, without changing `/v1/infer` or its request/response contract. This proposed connection does not enable the current `DenyAllAiInvocationPolicy` or solve application capacity preflight.

## Runtime design

The setup cell checks out and verifies a user-provided immutable repository commit. The environment cell verifies one Tesla T4/CUDA and records its GPU UUID, verifies existing Torch, checks runtime dependency versions against `ai/requirements-lite.txt`, and installs only missing top-level runtime packages. Before installing, it constrains the resolver to all currently installed distribution versions and the current Torch version, performs a no-mutation resolver check, then installs only if no installed distribution would change; it verifies the pins and Torch again after installation. Installed runtime packages at an unexpected version fail closed with instructions to use a fresh Colab runtime instead of changing dependencies. The start cell obtains the runtime token through `getpass`, passes it only in the child process environment, sets the T4 UUID and pinned model configuration, clears inherited Lite-diagnostics and benchmark-mode flags, and starts Uvicorn on loopback. FastAPI's lifespan blocks until `WorkerController.start()` receives worker READY; Uvicorn's `Application startup complete` log therefore signals worker startup readiness. Hugging Face's default cache is left in place. Status reports HTTP availability from process liveness plus local `GET /openapi.json`, and separately reports worker/model startup readiness from the existing startup-complete and model-loaded log markers. The current runtime has no endpoint or state signal for ongoing worker health after startup, so status labels this as READY-at-startup rather than current liveness. Neither probe sends an inference request. Recent log lines are redacted. Stop sends SIGTERM and waits for graceful FastAPI lifespan cleanup; on timeout it performs bounded process-group cleanup so the non-daemon worker cannot keep the GPU lock. The notebook defines `stop_runtime()` but never calls it as part of Run All; users call it explicitly after the serving session.

## Verification

Add a pytest regression test that loads notebook JSON and exercises extracted notebook helpers with mocked process, HTTP, dependency, environment, and Git boundaries. Cover invalid/mismatched source SHA, missing versus mis-versioned runtime dependencies, resolver constraints preventing changes to installed packages, post-install Torch/pin verification, clearing inherited Lite-diagnostics and benchmark flags, worker READY gating, HTTP-not-ready and start failures, logs/token redaction, persistent startup with no Run-All stop call, status distinction between HTTP availability and READY-at-startup, explicit user-callable stop, process-group shutdown, and restart without GPU or network access. Run existing `ai/tests` as runtime regression where the configured environment supports them. Run repository baseline, lint, typecheck, test, and build gates where applicable, recording actual results. A real Colab/T4 startup and repeated inference remain manual because local CI has no Colab GPU; the notebook must not auto-run inference or smoke fixtures.

