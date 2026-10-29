# AI runtime and benchmark

The Python service is a Colab demonstration runtime. It listens on `127.0.0.1`; expose it to NestJS only through an owner-authorized private network path. This repository never starts a public tunnel.

## Local checks

Use the CPU test environment described in `requirements.lock.pending.md`; do not install or replace PyTorch locally. Run `python ai/benchmark/validate_fixtures.py`, then the Python tests. The 120 fixtures are synthetic test inputs, not model output or quality evidence.

## Google Colab run order

1. Select a Tesla T4 runtime and follow `colab/phase-1d3.ipynb` from a clean reviewed Git commit or a SHA-256-verified `.tar`/`.tar.gz` source archive. The notebook verifies the exact checkout it executes. Record Python, Torch/CUDA, GPU, installed file hashes and `pip freeze` before installing anything. If the exact installed Torch wheel provenance cannot be established, stop.
2. Resolve `requirements.in` in a separate Python 3.13/Linux resolver environment with `pip-tools==7.5.2` and the observed official wheel index. Record the exact existing Torch wheel URL and SHA-256, inspect the dry-run report and prove no Torch action is planned. Otherwise keep `requirements.lock` Pending.
3. Run `pip check`, import checks and the T4/NF4 model-load preflight. Any mismatch blocks inference.
4. Start Uvicorn on `127.0.0.1:8000`, validate fixtures and run the HTTP benchmark. Establish and separately verify the actual NestJS-to-runtime route; do not treat the local runner as proof of that route.
5. Review every output with `benchmark/rubric.md`; save one five-dimension score record per attempted fixture in `scores.json`. Failed and unattempted fixtures remain in the denominator.
6. Write `evidence.json` only after separately verifying real-model, lock, GPU, transport and analytical capacity evidence; set `ownerApproval` true only after explicit owner approval. Rerun the report. Missing evidence keeps the report Pending.
7. Return the full run directory, source hash, lock and wheel evidence, environment snapshot, fixture hash, attempts, evaluator outputs, manual scores, capacity measurements and transport evidence.

If a run times out or loses transport, restart the runtime process first. Resume only never-dispatched fixtures in a new run ID: rerun the same command with `--resume /path/to/prior-run --runtime-restarted`; the runner rejects a different fixture or config hash and carries prior attempts into the new denominator. A fixture marked ATTEMPTED without a finalized attempt becomes an INTERRUPTED failure and is never retried.

Model candidate: `Qwen/Qwen3-4B-Instruct-2507` at immutable revision `cdbee75f17c01a7cc42f958dc650907174af0554`. It is a candidate only; no GPU compatibility, quality or capacity result is asserted here.
