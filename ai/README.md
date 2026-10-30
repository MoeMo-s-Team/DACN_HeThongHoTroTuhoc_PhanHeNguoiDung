# AI demo smoke

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
