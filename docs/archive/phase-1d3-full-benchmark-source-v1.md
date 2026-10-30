# Phase 1D.3 Full Benchmark source archive map

**Purpose:** Preserve deleted source bytes and six pre-cleanup snapshots for traceability after the approved source cleanup.

**Limits:** This is not a runnable/reproducible benchmark package, Colab run evidence, source proof, or a Full Benchmark PASS claim. Phase 1D.3-Lite remains the only demo smoke PASS. The archived Full Benchmark remains retired.

**Archive:** `phase-1d3-full-benchmark-source-v1.zip`
**External SHA-256:** see `phase-1d3-full-benchmark-source-v1.zip.sha256`.
**Internal manifest:** `SHA256SUMS.txt` lists SHA-256 for every source entry.

## Deleted active paths

| Original path | Archive member |
|---|---|
| `ai/colab/phase-1d3.ipynb` | `ai/colab/phase-1d3.ipynb` |
| `ai/benchmark/run.py` | `ai/benchmark/run.py` |
| `ai/benchmark/report.py` | `ai/benchmark/report.py` |
| `ai/benchmark/rubric.md` | `ai/benchmark/rubric.md` |
| `ai/benchmark/allowlist.py` | `ai/benchmark/allowlist.py` |
| `ai/benchmark/evaluator-smoke.jsonl` | `ai/benchmark/evaluator-smoke.jsonl` |
| `ai/benchmark/fixtures/fixtures.jsonl` | `ai/benchmark/fixtures/fixtures.jsonl` |
| `ai/benchmark/validate_fixtures.py` | `ai/benchmark/validate_fixtures.py` |
| `ai/benchmark/capacity-profile.candidate.json` | `ai/benchmark/capacity-profile.candidate.json` |
| `ai/colab/capacity.py` | `ai/colab/capacity.py` |
| `ai/colab/measure_capacity.py` | `ai/colab/measure_capacity.py` |
| `ai/colab/preflight.py` | `ai/colab/preflight.py` |
| `ai/colab/torch_provenance.py` | `ai/colab/torch_provenance.py` |
| `ai/constraints-colab.txt` | `ai/constraints-colab.txt` |
| `ai/requirements.lock.pending.md` | `ai/requirements.lock.pending.md` |
| `ai/tests/test_benchmark.py` | `ai/tests/test_benchmark.py` |
| `ai/tests/test_capacity.py` | `ai/tests/test_capacity.py` |
| `ai/tests/test_colab_preflight.py` | `ai/tests/test_colab_preflight.py` |
| `ai/tests/test_fixtures.py` | `ai/tests/test_fixtures.py` |
| `ai/tests/test_report.py` | `ai/tests/test_report.py` |

## Pre-cleanup snapshots of modified files

| Active path before change | Archive member |
|---|---|
| `ai/runtime/app.py` | `before-cleanup/ai/runtime/app.py` |
| `ai/runtime/worker.py` | `before-cleanup/ai/runtime/worker.py` |
| `ai/tests/test_contract.py` | `before-cleanup/ai/tests/test_contract.py` |
| `ai/tests/test_worker.py` | `before-cleanup/ai/tests/test_worker.py` |
| `ai/tests/test_inference.py` | `before-cleanup/ai/tests/test_inference.py` |
| `apps/api/src/ai/ai-benchmark-evaluator.spec.ts` | `before-cleanup/apps/api/src/ai/ai-benchmark-evaluator.spec.ts` |
