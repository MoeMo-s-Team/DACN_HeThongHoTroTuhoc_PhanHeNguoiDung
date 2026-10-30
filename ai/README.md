# AI demo smoke

## Approved Local GPU target (hardware acceptance pending)

CP-005 approves two independent application clones and one AI Runtime: the teammate's Windows 11/WSL2 RTX 3050 4GB host runs FastAPI/Qwen NF4; their Windows NestJS clone calls `http://127.0.0.1:8000`; the user's Linux NestJS clone calls the same runtime over HTTPS Tailscale Serve. Keep FastAPI loopback-only, retain the runtime Bearer token, and restrict Serve with tailnet ACL. Do not enable Funnel or start a second model process.

Follow [`LOCAL_GPU_HANDOFF.md`](LOCAL_GPU_HANDOFF.md) for setup and verification. Local GPU/Tailscale acceptance has not passed until the teammate completes the real hardware and network checks, including all six Lite tasks. Colab serving and Lite evidence remain available and unchanged until then. Application AI authorization/capacity blockers remain separate and must not be bypassed.

## Colab serving (retained until Local GPU acceptance)

The Colab notebook remains a historical/reproducible serving path while the Local GPU acceptance gate is pending; it is not the approved target topology after CP-005 and is not evidence of Local GPU PASS.

### Serve the runtime from VS Code and Google Colab

Open [`colab/serve-ai.ipynb`](colab/serve-ai.ipynb) in VS Code and select a Google Colab kernel with a Tesla T4. In the first cell, enter the repository URL and full commit SHA containing the AI Runtime source, then run all cells. Choose the existing Colab PyTorch environment; the notebook checks it, reuses installed FastAPI `>=0.93.0,<1.0`, Uvicorn `>=0.21.0,<1.0`, and Transformers `>=4.37.0,<6.0`, and installs only missing pinned runtime packages. It preserves existing package versions and uses the normal Hugging Face cache.

Enter the AI Runtime token only at the hidden prompt. After the Start cell, Status reports HTTP availability separately from worker/model `READY_AT_STARTUP`; this runtime has no live worker health endpoint. Run All intentionally leaves the server running. When finished, run `stop_runtime()` in a new code cell. The notebook does not run inference fixtures or smoke tests.

FastAPI is bound to `127.0.0.1:8000` inside Colab, so a NestJS process on your local machine cannot reach it through localhost. No tunnel is created by the notebook. Cloudflare Tunnel plus Access is described separately as an unapproved technical proposal. Colab may stop the runtime after disconnect; continuous availability is not promised.

For the VS Code kernel picker and remote notebook basics, see [VS Code Jupyter notebooks](https://code.visualstudio.com/docs/datascience/jupyter-notebooks) and [Google Colab](https://colab.research.google.com/notebooks/welcome.ipynb).

---

AI model verification for the DACN demo uses the Lite Colab notebook. The Phase 1D.3 Full Benchmark is retired as required demo work. Qwen2.5-1.5B-Instruct is a verified **demo candidate**, not a production-certified model.

## Run the Lite smoke on Colab

1. Select a Google Colab Tesla T4 runtime and open [`colab/phase-1d3-lite.ipynb`](colab/phase-1d3-lite.ipynb).
2. Use the verified source commit `9a5494edb5788eed5455742361caeafdb414c2bf` to reproduce the recorded PASS. The notebook pins model revision `989aa7980e4cf806f80c7fef2b1adb7bc71aa306` and uses FP16 with Colab's existing PyTorch.
3. In the first code cell set `LITE_TASK_FILTER = "all"` and `RUN_LIVE_NESTJS_SMOKE = True`, then run all cells. Enter the runtime token only in the hidden prompt. Leave `ENABLE_LITE_DIAGNOSTICS = False` for the normal smoke.
4. Review the per-task outputs and final summary under `/content/lite-evidence`. Each task must pass the existing schema, semantic, and reference validation; any failure remains FAIL.

The notebook uses synthetic fixtures. It does not run the full benchmark. The recorded NestJS-to-FastAPI smoke uses real model inference but mocks authorization and capacity preflight; it does not prove the production `AiModule` path or end-user application readiness. The Lite acceptance boundary is documented in the [approved demo supplement](../docs/releases/phase-1d3-demo-acceptance-release1/Phase_1D3_Demo_Acceptance_Supplement.md), the [PASS report](../docs/proposals/technical/phase-1d3-lite-report.md), and the preserved [evidence archive](phase-1d3-lite-PASS-20261030-042947-70b2a79d.zip).

## Local regression checks

Run `python -m pytest ai/tests -q` from a preconfigured Python 3.12 CPU test environment with the test dependencies installed; run the applicable API AI tests as well. The repository does not publish a separate CPU test lock. `requirements.in` is the shared runtime dependency declaration, including PyTorch/NF4 support, and is not CPU test installation instructions. Do not install or replace system PyTorch to prepare local tests. Scripted responses are regression fixtures, not model evidence.

Application AI requests still require the existing authentication/invocation policy and a valid benchmark-bound capacity profile with fail-closed preflight. The Lite smoke does not satisfy or bypass those deployment requirements.

## Historical Full Benchmark materials

The Full Benchmark notebook, runner, 120-fixture corpus, rubric, provenance and capacity tools have been removed from active source paths under the [approved source cleanup CR](../docs/proposals/change-requests/CR-DRAFT-PHASE-1D3-SOURCE-CLEANUP.md). Their source bytes and the pre-cleanup snapshots are preserved in the [source archive map and checksum](../docs/archive/phase-1d3-full-benchmark-source-v1.md). The archive is historical source only; it is not runnable benchmark evidence or a PASS result. The [approved plan](../docs/superpowers/plans/2026-10-29-phase-1d3-real-model-benchmark.md) remains unchanged as governance history. No full benchmark PASS or production model selection is claimed; `OPEN-ARCH-003` remains open.
