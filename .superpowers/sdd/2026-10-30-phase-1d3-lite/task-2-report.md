# Phase 1D.3-Lite Task 2 — TDD and Verification Report

## Scope

Implemented only Task 2 files: six-task synthetic fixture selection, standalone real-runtime smoke/evidence runner, fail-closed pip report parser, Colab Run All notebook, pinned lightweight requirements, README guidance, Pending Lite report, and opt-in NestJS live-runtime spec. No frozen baseline, old Phase 1D.3 notebook/evidence, Task 1 runtime file, CR, or approved plan was edited.

## TDD

- RED: `/tmp/dacn-phase1d3-lite-test/bin/python -m pytest ai/tests/test_lite_smoke.py -q` failed during collection because `ai.benchmark.lite_smoke` did not yet exist.
- GREEN: initial Task 2 focused test run passed 18 tests.
- Review RED: added cases failed because actual pip report version `"1"` was rejected, malformed and non-JSON response bodies were discarded, and notebook BLOCKED handling had an undefined helper/order and did not catch GPU/Torch prerequisite failures.
- Review GREEN: current report validator accepts exact pip version `"1"` only; focused suite passes 22 tests covering the original cases plus the review regressions.
- Local synthetic fixtures are test inputs only. They are not model outputs and do not establish Lite PASS.

## Verification

- PASS — `/tmp/dacn-phase1d3-lite-test/bin/python -m pytest ai/tests/test_lite_smoke.py -q` (18 passed at initial completion).
- PASS — `/tmp/dacn-phase1d3-lite-test/bin/python -m pytest ai/tests/test_inference.py -q` (19 passed).
- PASS — `/tmp/dacn-phase1d3-lite-test/bin/python -m pytest ai/tests/test_worker.py -q` (16 passed).
- PASS — Lite JSONL fixtures piped into `pnpm --filter @dacn/api exec tsx ../../ai/benchmark/validate-inputs.ts` (`validated 6 fixture inputs`).
- PASS — `DACN_PYTHON=/tmp/dacn-phase1d3-lite-test/bin/python pnpm --filter @dacn/api exec jest --runInBand src/ai/ai-runtime-wire.spec.ts` (16 passed, 1 opt-in live case skipped at initial completion).
- PASS — `pnpm verify:baseline`.
- PASS — `pnpm lint`.
- PASS — `pnpm typecheck`.
- PASS — `PATH=/tmp/dacn-phase1d3-lite-test/bin:$PATH pnpm test` (14 API suites; 155 passed, 1 opt-in live case skipped; 13 web tests passed). An initial unconfigured `pnpm test` failed because `python` was absent from PATH; rerunning with the task's test Python on PATH passed.
- PASS — `pnpm build`.
- PASS — all notebook Python code cells compile; they were not executed against Colab.
- PASS — `git diff --check` (PASS on the final review-round diff).
- NOT RUN — actual Colab/T4 inference and real NestJS-to-FastAPI call; no GPU/Colab is available locally. The optional real-runtime Jest case therefore remains unverified.

## Self-review

- Runner creates one HTTP attempt per fixture and retains six result rows even after failures; no retry path exists. Per-attempt elapsed time is bounded to at most 60 seconds.
- PASS is fail-closed on v1.0 success envelope/correlation, model and task prompt bindings, schema, semantic, and reference checks. Actual outputs or returned errors are preserved; the hidden token is redacted from persisted and printed evidence.
- Notebook checks T4, records UUID/Torch version/path, rejects missing/malformed pip reports and planned Torch operations before install, uses the same interpreter/requirements/constraint for dry-run and install, starts Uvicorn once, waits for lifespan startup, and records measured load time and dependency versions.
- NestJS live smoke uses the actual loopback RuntimeHttpClient path and current prompt registry values; only policy/preflight/log persistence are test doubles. It is opt-in and normal tests do not need GPU or secrets.
- Lite report intentionally remains Pending until actual Colab evidence is returned. Official Phase 1D.3 remains incomplete.

## Review round 1 corrections

The reviewer found the pip report schema check had assumed an integer `version`; the pip report format uses string `"1"`. The validator and tests now accept exactly that real format and reject malformed/other versions. Additional RED tests reproduced loss of malformed 200 and non-JSON HTTP error bodies; the runner now preserves sanitized returned bodies while replacing the runtime token and serialized input, and redacts prompt/authorization/token fields. Notebook ordering and prerequisite failure tests exposed the setup helper ordering and unchecked GPU/Torch commands; the helper now precedes source validation and those prerequisites write BLOCKED evidence. The live NestJS smoke now receives `AI_RUNTIME_PROMPT_VERSIONS` generated from `ai.runtime.prompts.PROMPT_VERSIONS` in the checked-out notebook source; test-double bindings remain separate.

- RED — focused Python tests failed on numeric pip version acceptance, string version rejection, dropped malformed/error bodies, and notebook helper ordering.
- GREEN — `/tmp/dacn-phase1d3-lite-test/bin/python -m pytest ai/tests/test_lite_smoke.py -q` → 22 passed.
- GREEN — `DACN_PYTHON=/tmp/dacn-phase1d3-lite-test/bin/python pnpm --filter @dacn/api exec jest --runInBand src/ai/ai-runtime-wire.spec.ts` → 17 passed, 1 opt-in live-runtime case skipped.
- The Colab notebook code is structurally checked and compiled by the focused Python test; it is not executed locally. No T4 inference or live NestJS-to-FastAPI success is claimed. The Lite report stays Pending.

## Review round 2 corrections

- RED — `/tmp/dacn-phase1d3-lite-test/bin/python -m pytest ai/tests/test_lite_smoke.py -q` → 5 failed, 22 passed. Valid-header pip reports exposed empty package names passing; body sanitization tests exposed missing token-key and partial/structured input redaction, and old HTTP-error assertions did not include body hashes.
- GREEN — `/tmp/dacn-phase1d3-lite-test/bin/python -m pytest ai/tests/test_lite_smoke.py -q` → 27 passed.
- GREEN — `DACN_PYTHON=/tmp/dacn-phase1d3-lite-test/bin/python pnpm --filter @dacn/api exec jest --runInBand src/ai/ai-runtime-wire.spec.ts` → 17 passed, 1 opt-in live-runtime case skipped.
- Pip reports now require version `"1"`, an environment object, list install entries, and a non-empty package name in each entry; Torch rejection tests use otherwise valid reports.
- Returned response evidence recursively removes input/prompt/authorization/token/credential fields, scrubs input keys and values from text and structure, removes token occurrences from keys and values, and keeps sanitized body, HTTP status/diagnostic, and SHA-256 of the original bytes. No Colab/T4 result is claimed; Lite stays Pending.

## Review round 2 follow-up

- RED — `/tmp/dacn-phase1d3-lite-test/bin/python -m pytest ai/tests/test_lite_smoke.py -q` → 5 failed, 22 passed. Failures covered empty package names, body wrappers/hashes, and nested sensitive content.
- RED — `/tmp/dacn-phase1d3-lite-test/bin/python -m pytest ai/tests/test_lite_smoke.py -q -k malformed_or_empty_install_names` → 1 failed, 6 passed, 23 deselected for an invalid package-name token.
- GREEN — `/tmp/dacn-phase1d3-lite-test/bin/python -m pytest ai/tests/test_lite_smoke.py -q` → 30 passed.
- GREEN — `DACN_PYTHON=/tmp/dacn-phase1d3-lite-test/bin/python pnpm --filter @dacn/api exec jest --runInBand src/ai/ai-runtime-wire.spec.ts` → 17 passed, 1 opt-in live-runtime case skipped.
- PASS — `git diff --check`.

The response sanitizer now replaces sensitive field names and values recursively, scrubs input keys/scalars and partial echoes from text, redacts token occurrences in dictionary keys and values, and stores sanitized body plus SHA-256 (and HTTP status where applicable). The Lite report remains Pending; no Colab/T4 result is claimed.

## Review round 3 corrections

- RED — `/tmp/dacn-phase1d3-lite-test/bin/python -m pytest ai/tests/test_lite_smoke.py -q -k 'partial_input_words or runtime_output_sha256_key'` → 1 failed, 1 passed, 30 deselected; runtime output `sha256` value leaked the bearer token.
- RED — `/tmp/dacn-phase1d3-lite-test/bin/python -m pytest ai/tests/test_lite_smoke.py -q -k partial_input_words` → 1 failed, 31 deselected; a lowercase partial input echo remained.
- GREEN — `/tmp/dacn-phase1d3-lite-test/bin/python -m pytest ai/tests/test_lite_smoke.py -q` → 32 passed.
- GREEN — `DACN_PYTHON=/tmp/dacn-phase1d3-lite-test/bin/python pnpm --filter @dacn/api exec jest --runInBand src/ai/ai-runtime-wire.spec.ts` → 17 passed, 1 opt-in live-runtime case skipped.
- PASS — `git diff --check`.

The error-body sanitizer now scrubs partial input words case-insensitively and removes labeled secret/prompt/input/auth/token assignments and bearer strings from non-JSON text. The generic redactor no longer exempts `sha256`; only the runner-generated raw response hash is restored outside the sanitized body. Successful outputs are not input/prompt-scrubbed, and the regression confirms an ordinary PASS output remains unchanged apart from token redaction. No Colab/T4 success is claimed; Lite report remains Pending.

## Review round 4 corrections

- RED — `/tmp/dacn-phase1d3-lite-test/bin/python -m pytest ai/tests/test_lite_smoke.py -q -k 'http_error_token_matching_error_key or response_digest_is_unavailable_when_it_contains_short_bearer_token'` → 2 failed, 32 deselected. The `error` bearer token renamed the evidence field before hash restoration, and a short token present in the SHA-256 digest was persisted.
- GREEN — the same focused command → 2 passed, 32 deselected.
- GREEN — `/tmp/dacn-phase1d3-lite-test/bin/python -m pytest ai/tests/test_lite_smoke.py -q` → 34 passed.
- GREEN — `DACN_PYTHON=/tmp/dacn-phase1d3-lite-test/bin/python pnpm --filter @dacn/api exec jest --runInBand src/ai/ai-runtime-wire.spec.ts` → 17 passed, 1 opt-in live-runtime case skipped.

Runner now retains each original error mapping and response digest separately while sanitizing the containing evidence record, then restores the sanitized error under the stable evidence field without looking it up through the redacted map. A digest containing the bearer token is marked unavailable (`sha256: null`). Existing body/key/value redaction coverage and ordinary successful output behavior remain covered. No Colab/T4 result is claimed; Lite report remains Pending.

## Review round 5 corrections

- RED — `/tmp/dacn-phase1d3-lite-test/bin/python -m pytest ai/tests/test_lite_smoke.py -q -k 'persisted_hashless_http_error_with_results_token or persisted_error_omits_digest_when_digest_contains_token'` → 2 failed, 34 deselected. Token `results` caused `KeyError` after outer-record redaction; a short token embedded in the response hash was restored as a digest string rather than tested in persisted evidence.
- GREEN — same focused command → 2 passed, 34 deselected.
- GREEN — `/tmp/dacn-phase1d3-lite-test/bin/python -m pytest ai/tests/test_lite_smoke.py -q` → 36 passed.
- GREEN — `DACN_PYTHON=/tmp/dacn-phase1d3-lite-test/bin/python pnpm --filter @dacn/api exec jest --runInBand src/ai/ai-runtime-wire.spec.ts` → 17 passed, 1 opt-in live-runtime case skipped.
- PASS — `git diff --check`.

Evidence redaction now preserves trusted result/row structure and sanitizes row values before persistence, avoiding lookups through token-redacted keys. End-to-end tests read the written JSON for a hashless HTTP 502 with token `results` and for a token embedded in the digest; six rows and useful sanitized status/body remain, and the digest is `null` when it contains the token. No Colab/T4 result is claimed; Lite report remains Pending.
