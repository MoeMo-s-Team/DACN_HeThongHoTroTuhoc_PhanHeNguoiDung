# AI Serving Notebook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a simple Colab serving notebook that runs the existing AI Runtime on a T4 and keeps it available until explicitly stopped.

**Architecture:** The notebook checks out a verified source SHA, preserves Colab Torch, starts the existing FastAPI app as a loopback-only Uvicorn subprocess, and uses FastAPI startup completion as the worker READY signal. README instructions and a separate unapproved connection proposal document how local NestJS access can be evaluated without creating a tunnel.

**Tech Stack:** Jupyter notebook JSON, Python standard library, existing FastAPI/Uvicorn runtime, pytest.

**Spec:** `docs/superpowers/specs/2026-10-30-ai-serving-notebook-design.md`

## Global Constraints

- Model: `Qwen/Qwen2.5-1.5B-Instruct`; revision: `989aa7980e4cf806f80c7fef2b1adb7bc71aa306`; load mode: `fp16`.
- Keep Uvicorn bound to `127.0.0.1:8000`; do not create or configure any tunnel.
- Preserve FastAPI runtime, runtime bearer authentication, all six task implementations, validators, contracts, prompts, NF4 default, and Lite PASS evidence.
- Preserve installed Colab Torch; install only missing runtime dependencies and reuse the default Hugging Face cache. Reuse Colab FastAPI when `0.93.0 <= version < 1.0` and Uvicorn when `0.21.0 <= version < 1.0`; keep their current versions as resolver constraints. Other runtime packages remain pinned.
- Do not run benchmark, Lite smoke, Node, pnpm, Prisma, pip-compile, provenance, or capacity profiling from the notebook.
- Do not print or persist the runtime token, prompts, or responses.
- Do not claim production readiness or continuous service after Colab disconnects.

## Review Focus

- Repository checkout points at the requested 40-character SHA, rejects tracked/untracked changes and ignored importable Python artifacts using NUL-delimited Git output, and fails before server startup.
- Dependency installation must not replace Torch or any already installed distribution. Test resolver constraints for all installed versions, pre-install resolver failure on a proposed replacement, and post-install version verification.
- A compatible installed FastAPI/Uvicorn must be reused without version changes; reject FastAPI older than 0.93.0 or at least 1.0, and Uvicorn older than 0.21.0 or at least 1.0. Incompatible versions of other pinned runtime packages fail closed rather than upgrading them. Mock package metadata and assert only absent packages are installed.
- Uvicorn is READY only after FastAPI lifespan completes (which follows worker READY). Mock startup logs and assert readiness waits, and that timeout/start failure triggers cleanup.
- Status must report HTTP availability separately from worker/model READY-at-startup. Mock `GET /openapi.json`, `Application startup complete`, and model-loaded log markers independently. Do not claim ongoing worker liveness because FastAPI has no worker health endpoint/state route.
- Startup must leave the server alive after the cell returns; Run All must not call `stop_runtime()`. Test the stop function exists and is only called explicitly by the user after Run All.
- Stop/restart must be bounded and idempotent. Mock process groups to assert graceful SIGTERM first and group cleanup on timeout, including no leaked worker preventing restart.
- Recent logs use a strict allowlist of Uvicorn lifecycle/model-load lines and omit prompts, responses, tracebacks, and arbitrary secret-bearing output. Assert status remains safe after the token is cleared on stop.
- `jsonschema[format]` is complete even when the base distribution already exists; inspect installed metadata and request the pinned extra only when its requirements are missing.
- Inherited `AI_RUNTIME_LITE_DIAGNOSTICS`, `AI_RUNTIME_LITE_DIAGNOSTICS_DIR`, and `AI_RUNTIME_BENCHMARK_MODE` must not affect serving or persist raw outputs. Test that the child environment clears them.

---

### Task 1: Add notebook regression tests

**Files:**
- Create: `ai/tests/test_serve_ai_notebook.py`
- Test: `ai/colab/serve-ai.ipynb`

**Interfaces:**
- Consumes notebook JSON cells from `ai/colab/serve-ai.ipynb` and executes only extracted helper definitions under mocked Git, pip, process, HTTP, and logging boundaries.
- Produces pytest assertions for cell layout, source validation, dependency handling, lifecycle, status, secret redaction, and prohibited setup behavior; no GPU/network access is used.

- [x] **Step 1: Write failing tests** for valid notebook JSON and about five code cells; pinned model/revision/FP16 and loopback-only host; invalid/mismatched source SHA; missing-only dependency installs, compatible framework-version boundaries/reuse and wrong-version fail-closed behavior; constraints over all installed distribution versions; pre-install resolver rejection of a replacement; unchanged installed pins/Torch after install; clearing inherited diagnostic/benchmark flags; READY waits and failed-start cleanup; separate HTTP availability versus worker/model READY-at-startup signals; server persistence with no automatic Run-All stop; callable `stop_runtime()` only on explicit invocation; bounded process-group stop/restart; token/log redaction; and no Lite/benchmark/Node/pnpm/Prisma/provenance commands.
- [x] **Step 2: Run `python3 -m pytest ai/tests/test_serve_ai_notebook.py -q`** and confirm it fails because the notebook does not exist.

### Task 2: Add the serving notebook, instructions, and connection proposal

**Files:**
- Create: `ai/colab/serve-ai.ipynb`
- Modify: `ai/README.md`
- Create: `docs/proposals/technical/colab-runtime-access-for-local-demo.md`

**Interfaces:**
- Notebook exposes about five code cells: setup, environment, start, and status/log. The final Stop instruction is Markdown or non-stopping code; `stop_runtime()` is only called when the user explicitly runs it, never as part of Run All.
- `ai/README.md` explains connecting VS Code to Colab, selecting a T4, running setup through start, using Status/Stop, and the loopback limitation.
- The proposal records current behavior, proposed Cloudflare Tunnel plus Access service-token design, the additional server-side Access client ID/secret headers required by `RuntimeHttpClient`, runtime bearer authentication, scope/impact, and explicitly states NOT APPROVED / not implemented. It must also state this does not change `/v1/infer`, authorize AI invocation, or provide capacity preflight.

- [x] **Step 1: Implement the notebook** with immutable source checkout validation; T4/CUDA/GPU UUID and Torch checks; missing-only runtime dependency installation constrained to existing distribution versions, preceded by a no-mutation resolver check and followed by dependency/Torch verification; reuse FastAPI `>=0.93,<1.0` and Uvicorn `>=0.21,<1.0` while preserving their versions; fail closed for incompatible pinned non-framework dependencies; existing Hugging Face cache; hidden token input; explicit model/revision/fp16 and GPU UUID environment; removal of inherited Lite-diagnostics/benchmark flags; subprocess Uvicorn on `127.0.0.1`; startup log READY/timeout/failure handling; status that reports HTTP availability and worker/model READY-at-startup separately; bounded graceful shutdown followed by process-group cleanup; and a stop instruction that does not call stop during Run All. Do not execute inference or smoke fixtures.
- [x] **Step 2: Update README and draft the connection proposal** without changing Lite instructions or enabling external access.
- [x] **Step 3: Run `python3 -m pytest ai/tests/test_serve_ai_notebook.py -q`** and confirm the notebook regressions pass.
- [x] **Step 4: Run `python3 -m pytest ai/tests -q`** when the configured Python test dependencies are available; report an environment limitation without installing/replacing Torch if unavailable. (`python3 -m pytest` is unavailable locally; the repository RTK pytest runner passed the notebook-specific suite.)
- [x] **Step 5: Run `pnpm verify:baseline`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`** as repository gates. Report actual results and any command skipped because it is unavailable or outside this notebook-only change. (Forced Turbo typecheck passed all three packages; plain `pnpm typecheck` returned compiler help without diagnostics.)
- [x] **Step 6: Validate notebook JSON and inspect changed files/diff.** Confirm there are no changes to runtime, baseline, Lite evidence, or historical archive files.

### Task 3: Independent review and final verification

**Files:**
- Review changed files and the notebook/runtime boundary; no reviewer edits.

**Interfaces:**
- Reviewer returns findings only; fixes are applied by the implementation owner and re-reviewed.

- [x] **Step 1: Obtain an independent read-only reviewer review** of notebook lifecycle, secret handling, dependency preservation, scope, and README/proposal consistency.
- [x] **Step 2: Fix any valid findings and rerun the focused tests.**
- [x] **Step 3: Report actual verification, skipped Colab-only checks, and that the tunnel proposal is unapproved.**

