# Phase 1D.3-Lite Demo Report

**Status: PASS — Lite demo acceptance only.** This result is based on the Colab evidence archive listed below. It does not complete official Phase 1D.3, satisfy its 120-fixture/manual-scoring/capacity/full-provenance gates, or select a production model. `OPEN-ARCH-003` remains open; frozen baseline documents are unchanged.

## Run evidence

| Evidence | Colab result |
|---|---|
| Run ID | `20261030-042947-70b2a79d` |
| Source commit | `9a5494edb5788eed5455742361caeafdb414c2bf` |
| Source URL | Not captured in the archive; immutable source commit is recorded |
| Model candidate | `Qwen/Qwen2.5-1.5B-Instruct` |
| Model revision | `989aa7980e4cf806f80c7fef2b1adb7bc71aa306` |
| Load mode | FP16 — source commit configures `AI_RUNTIME_LOAD_MODE=fp16`; runtime loader checks CUDA/float16 parameters and archived Uvicorn log records successful load. The evidence JSON does not capture dtype as a separate field. |
| GPU | Tesla T4, `GPU-c2fcc4d2-8433-7738-e032-741feb46412e`, 15360 MiB |
| Torch observed by Lite run | `2.11.0+cu130` at `/usr/local/lib/python3.13/dist-packages/torch/__init__.py` |
| Model load duration | 10.425 seconds |
| Lite dependencies | FastAPI 0.162.0; Uvicorn 0.54.0; jsonschema 4.26.0; Transformers 5.21.0; Accelerate 1.15.0; LM Format Enforcer 0.11.3 |
| Six-task smoke | PASS; six selected tasks, six real HTTP 200 inference results |
| NestJS → loopback FastAPI live smoke | PASS; exit code 0 |
| Evidence archive | [`ai/phase-1d3-lite-PASS-20261030-042947-70b2a79d.zip`](../../../ai/phase-1d3-lite-PASS-20261030-042947-70b2a79d.zip), SHA-256 `e0fdb36dee70b307b8e999b19234a6de44e1c3440cee4bbbf02ed9c05ad2764f` |
| Diagnostic raw-generation capture | Not requested for this successful run |

The archive's run metadata and Colab evidence identify the same source commit and model revision. Its task attempt records include each generated output and the existing schema, semantic and reference validation results. The smoke summary and NestJS live-smoke status are both PASS.

## Task results

| Task | Status | HTTP | Schema | Semantic | Reference |
|---|---:|---:|---:|---:|---:|
| `STUDENT_LEARNING_ANALYSIS` | PASS | 200 | PASS | PASS | PASS |
| `STUDENT_STUDY_PLAN_GENERATION` | PASS | 200 | PASS | PASS | PASS |
| `STUDENT_STUDY_PLAN_ADJUSTMENT` | PASS | 200 | PASS | PASS | PASS |
| `TEACHER_CLASS_ANALYSIS` | PASS | 200 | PASS | PASS | PASS |
| `ADMIN_FEEDBACK_GROUPING_STAGE1` | PASS | 200 | PASS | PASS | PASS |
| `ADMIN_FEEDBACK_SUMMARY_STAGE2` | PASS | 200 | PASS | PASS | PASS |

The live NestJS check was recorded as PASS with process exit code 0. No failed task is hidden or rewritten in this report; this run's six attempt records each contain status PASS and successful validators.

## Scope and remaining gates

This PASS applies only to the approved Phase 1D.3-Lite demo acceptance: model load on Tesla T4, six real task inferences with existing validators passing, and one successful NestJS-to-FastAPI inference path. It is not a benchmark result for full Phase 1D.3. The Lite run does not provide 120-fixture coverage, manual quality scoring, capacity profiling, or full Torch provenance. Qwen remains a demo candidate, not the production model decision. `OPEN-ARCH-003` remains open.
