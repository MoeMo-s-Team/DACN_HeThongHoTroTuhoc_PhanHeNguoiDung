# Local AI Runtime

**Status:** Task 7 implementation PASS. Installation on this workspace is not a clean-machine acceptance result. This package is not a capacity profile and does not enable NestJS inference dispatch.

The runtime path is `Next.js → NestJS → FastAPI /v1/infer → Ollama`. CPU-local Ollama is the default. The optional Compose overlay uses NVIDIA GPU reservations. Ollama has no host-published port; FastAPI is bound to `127.0.0.1` only. The runtime has no PostgreSQL dependency or credentials.

## Pinned runtime

`deployment/model-manifest.json` is the source for model identity and generation options:

- Model: `qwen2.5:1.5b`, local digest `sha256:65ec06548149b04c096a120e4a6da9d4017ea809c91734ea5631e89f96ddc57b`.
- Quantization: `Q4_K_M`; license: Apache-2.0 for this model size. See the [official Ollama model library](https://ollama.com/library/qwen2.5).
- Ollama image: `ollama/ollama:0.40.15`; `num_ctx=32768`, `num_predict=-1`, `temperature=0`, `top_p=1`.
- Per-attempt runtime deadline: fixed at 60 seconds. No retries, model fallback, JSON repair, output coercion, or input truncation.
- Prompt versions are fixed in `app/tasks/registry.py` and match the NestJS registry. `promptVersion` is never accepted in the request.

Readiness stays false unless Ollama reports the configured model name and full digest. Setup also rejects a pulled model whose reported digest prefix differs from the manifest. Do not edit the manifest to make an alternate model pass; another model/hardware combination needs separate evidence and approval.

## Install and run

For Windows 11, use [the WSL2 + Docker Desktop setup guide](../docs/implementation/ai-runtime/AI_LOCAL_WINDOWS_SETUP.md) and its [installability checklist](../docs/implementation/ai-runtime/AI_LOCAL_WINDOWS_INSTALLABILITY_CHECKLIST.md). Run the Bash scripts below in Ubuntu/WSL2, not PowerShell.

Requirements: Linux x86_64, Docker Engine with Compose v2, Python 3.12, `uv`, and `curl`. CPU is the default. The first install downloads the pinned Ollama image and about 1 GB of model weights.

```bash
./ai/scripts/setup.sh
./ai/scripts/smoke.sh
./ai/scripts/stop.sh
```

The setup script creates a private local `.env` and fills an empty runtime token with a random local value, downloads the model, checks its digest prefix, builds the adapter and waits for model-specific readiness. Keep `.env` private. Re-run `./ai/scripts/start.sh` after setup to start both services.

For an NVIDIA GPU host with NVIDIA Container Toolkit configured for Docker:

```bash
AI_RUNTIME_GPU=1 ./ai/scripts/setup.sh
AI_RUNTIME_GPU=1 ./ai/scripts/start.sh
AI_RUNTIME_GPU=1 ./ai/scripts/stop.sh
```

GPU availability or successful installation does not certify AI Conformance/Capacity. The separate overlay does not create a capacity profile.

## Contract tests

```bash
./ai/scripts/test-contract.sh
```

These fixture/mock-engine tests cover all six official task keys, Release 1 input schemas, auth, correlation, E5/E6, malformed/empty inbound HTTP JSON, timeout, readiness, digest mismatch and schema byte equality with NestJS. They do not call Ollama and are not model-quality or latency evidence.

The standalone runtime endpoints are `GET /health/live`, `GET /health/ready`, and `POST /v1/infer`. The inference endpoint requires `Authorization: Bearer $AI_RUNTIME_TOKEN`. It accepts only the v1.0 envelope. Malformed inbound HTTP JSON maps to `INVALID_REQUEST`; generated empty, malformed or non-object text maps to `INFERENCE_FAILED`; a parsed JSON object is returned unchanged for NestJS validation. The adapter does not validate output task schema or business references.

For a separate real-runtime smoke, start the stack and send one small official fixture to `/v1/infer` using its auth token. Record the model digest, host, Ollama version, task and elapsed time. Label this as smoke only. Do not use it as a capacity benchmark or disable NestJS's fail-closed preflight.

## Troubleshooting

- **Setup rejects the model digest:** stop; inspect `ollama list` and the full digest from Ollama `/api/tags`. Do not pull another tag or change the manifest to bypass the pin.
- **`/health/ready` returns 503:** check `docker compose --env-file .env -f ai/compose.yaml ps` and `docker compose --env-file .env -f ai/compose.yaml logs --tail=50 ollama runtime`. Logs contain no request bodies, prompt text, generated output or token.
- **Runtime returns 401:** confirm the same private `AI_RUNTIME_TOKEN` is configured for NestJS and the adapter. Never paste the token into a ticket or shell transcript.
- **Runtime returns 503:** verify Ollama is healthy and the exact model digest is present. No model fallback is attempted.
- **Runtime returns 504 / `INFERENCE_FAILED`:** the one generation exceeded the runtime's 60-second deadline. There is no automatic retry.
- **Port 8001 is occupied:** set `AI_RUNTIME_PORT` in `.env` and use that URL for `AI_RUNTIME_BASE_URL`.

Installability and AI Conformance/Capacity remain separate gates under CR-005. CPU exploratory runs and T4 smoke evidence are not certification; application dispatch remains blocked until a matching profile is approved.
