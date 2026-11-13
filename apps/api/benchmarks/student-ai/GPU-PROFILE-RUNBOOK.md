# Student AI GPU Profile Runbook

This runbook moves the existing Ollama workload to a dedicated NVIDIA GPU host. It does not change production inference, the model manifest, contract, schemas, prompts, fixture data, 60-second timeout, retry policy, or capacity preflight. GPU evidence is kept separate from the CPU and Iris Xe runs.

## Profile identity to preserve

Use the checked-in `deployment/model-manifest.json` unchanged:

- Model: `qwen2.5:1.5b`, digest `65ec06548149b04c096a120e4a6da9d4017ea809c91734ea5631e89f96ddc57b`, quantization `Q4_K_M`.
- Ollama `0.40.15`; `num_ctx=32768`, `num_predict=-1`, temperature `0`, `top_p=1`.
- Contract `1.0`, Release 1 schemas, all six registered prompt versions, unchanged FastAPI source and official fixture hashes.
- Do not edit `capacityCertification`; the current value `NONE` is correct until a profile is separately released.

If the GPU host cannot load this exact digest/runtime/options, stop and open a distinct profile review. Do not substitute a model or transfer CPU/Colab evidence.

## GPU host setup and binding checks

1. Use a dedicated Linux machine with an NVIDIA discrete GPU and a supported driver/container runtime. Capture `nvidia-smi` output (GPU model, VRAM, driver) and host CPU/RAM. Confirm Docker can pass the GPU through before starting inference.
2. Copy the same repository source tree, including benchmark fixtures and schema checksums. Compare `git rev-parse HEAD`, `git status --short`, manifest SHA-256, and the benchmark runner's source-binding report with the tested checkout. Keep `.env` private and use the same FastAPI runtime token configuration; never put it in a command line or report.
3. From the repository root, start only Ollama first, pull the manifest model, then start FastAPI. The stable project name is required because the current benchmark runner verifies `ai-runtime-1` and `ai-ollama-1` by container name:

   ```bash
   docker compose -p ai -f ai/compose.yaml -f ai/compose.gpu.yaml up -d --wait ollama
   docker exec ai-ollama-1 ollama pull qwen2.5:1.5b
   docker exec ai-ollama-1 ollama --version
   docker compose -p ai -f ai/compose.yaml -f ai/compose.gpu.yaml up -d --wait runtime
   docker exec ai-ollama-1 ollama ps
   nvidia-smi
   ```

4. Check the serving Ollama `/api/tags` digest against the manifest. Check `ollama ps` and `nvidia-smi` during a warm inference to confirm layers and GPU memory are actually in use. If Ollama falls back to CPU, stop; that run is not the target GPU profile.
5. Confirm FastAPI `/health/ready` and the runner's runtime image/source/manifest hash checks pass. Do not run a benchmark against a different checkout just because the model digest matches.

## Staged inference

Choose a unique, shell-safe profile label before running, for example `PROFILE_ID="gpu-discrete-host1-20261113"`. First run only the official 24-topic Generation case (`student_study_plan_generation-boundary-02`). It is a one-case triage gate:

```bash
pnpm --filter @dacn/api benchmark:student-ai -- \
  --task STUDENT_STUDY_PLAN_GENERATION \
  --fixture student_study_plan_generation-boundary-02 \
  --report="benchmarks/student-ai/runs/${PROFILE_ID}-generation-triage.json" \
  --capture-output="benchmarks/student-ai/captures/${PROFILE_ID}-generation-triage.jsonl"
```

The report must say `TRIAGE_ONLY`; it cannot pass a task or establish capacity. Check under 60 seconds, HTTP/envelope status, `AiOutputValidator` cross-check, output schema, semantic and reference-boundary results, and manually inspect the synthetic output. If it times out, fails validation, or Ollama did not use the GPU, stop and record the evidence. Do not proceed to the broad run by hiding the failure.

Only after that case passes, run the complete three-task Student suite (20 unchanged fixtures per task, 10 normal + 10 boundary):

```bash
pnpm --filter @dacn/api benchmark:student-ai -- \
  --report="benchmarks/student-ai/runs/${PROFILE_ID}-student-20x3.json" \
  --capture-output="benchmarks/student-ai/captures/${PROFILE_ID}-student-20x3.jsonl"
```

Use a new profile-specific report name; never merge GPU rows into the CPU report. Preserve all 60 elapsed times and validation outcomes. For each task require zero timeouts, at least 19/20 schema and semantic passes, zero reference-boundary violations, five-dimension Vietnamese mean at least 4/5, and zero hard-boundary violations. The current harness intentionally records manual quality and hard-boundary review as `null`; fill a separate local review sheet for every output with scores for relevance/task fulfillment, groundedness/reference fidelity, actionability, Vietnamese clarity, and boundary/prohibited inference. Any hard-boundary violation fails its fixture regardless of average score. The capture file contains model output; keep it local with restrictive permissions and do not commit it.

## Token and Ollama timing diagnostics

FastAPI returns the validated contract envelope, not Ollama's token/timing fields. After the FastAPI run, pass a captured fixture to a separately labeled direct Ollama diagnostic. The command below uses the exact FastAPI `_prompt` builder, Release 1 output schema and manifest options, then reports only Ollama metrics (not generated output):

```bash
python3 -c 'import json,sys; rows=(json.loads(line) for line in open(sys.argv[1])); d=next(row for row in rows if row["fixtureId"]==sys.argv[2]); print(json.dumps({"task":d["task"],"input":d["input"]},ensure_ascii=False))' \
  "benchmarks/student-ai/captures/${PROFILE_ID}-generation-triage.jsonl" \
  student_study_plan_generation-boundary-02 \
| docker exec -i ai-runtime-1 python -c '
import json, urllib.request
from app.config import RuntimeSettings
from app.main import SCHEMA_DIR, _prompt
from app.tasks.registry import TASKS
s=RuntimeSettings.from_env(); request=json.load(__import__("sys").stdin)
schema=json.loads((SCHEMA_DIR / TASKS[request["task"]]["output_schema"]).read_text())
body={"model":s.model,"prompt":_prompt(request["task"],request,schema),"stream":False,"format":"json","options":s.generation_options}
r=urllib.request.urlopen(urllib.request.Request(s.ollama_base_url+"/api/generate",data=json.dumps(body).encode(),headers={"Content-Type":"application/json"}),timeout=60)
d=json.load(r); print(json.dumps({k:d.get(k) for k in ("model","created_at","total_duration","load_duration","prompt_eval_count","prompt_eval_duration","eval_count","eval_duration")}))'
```

Run one diagnostic for each fixture whose token/timing evidence is required and key the outputs by fixture ID and profile in a companion file. This is a second direct model attempt and a runtime diagnostic only: it does not replace the original FastAPI latency, envelope checks, NestJS `AiOutputValidator`, semantic checks, or human review. Do not change FastAPI response/logging to expose metrics. If exact prompt/options parity cannot be demonstrated, mark the metrics unverified.

The existing Student fixture set is not a near-budget capacity set. Capacity evidence requires a verified tokenizer or profile-bound conservative estimator, prompt/schema overhead, reserved output and safety margin, plus at least one near-budget collection fixture and (where applicable) one large scalar-text fixture per task. Add those as separately versioned capacity fixtures; do not edit or replace the official 20-per-task fixtures. Exercise NestJS preflight to prove over-budget inputs are rejected before dispatch and within-budget inputs dispatch normally.

## Release gate before enabling dispatch

This three-task report remains partial evidence. Production dispatch stays fail-closed until all the following are complete for the exact GPU profile:

- AI Contract §§15.4/17 evidence for all six task keys, with at least 20 official benchmark fixtures per task and the existing thresholds above.
- Verified `tokenizerId` or benchmarked conservative estimator, per-task prompt/schema overhead, reserved output, safety margin, near-budget capacity fixtures, and NestJS preflight tests.
- Human Vietnamese rubric and hard-boundary review for each task; runtime/model/prompt/source/fixture/hardware binding artifacts retained.
- The capacity profile has been reviewed and approved by the Project Owner, released/versioned, bound atomically to runtime and NestJS config, and preflight contract tests pass. Do not manually set a profile, disable preflight, or treat smoke/benchmark output as approval.

