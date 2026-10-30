# Draft Change Request — Phase 1D.3-Lite Demo

**Status:** Approved — Project Owner decision recorded  
**Created:** 2026-10-30  
**Scope:** Add a lightweight demo lane alongside the approved Phase 1D.3 benchmark plan.

## 1. Requested Change

Add a demo-only path that loads `Qwen/Qwen2.5-1.5B-Instruct` at immutable Hugging Face revision `989aa7980e4cf806f80c7fef2b1adb7bc71aa306` in FP16 on a Google Colab Tesla T4, runs one real inference for each existing AI Contract v1.0 task, validates each result with the existing schema/semantic/reference validators, and proves one real NestJS-to-FastAPI request. The model is a demo candidate only; this does not select a production model.

## 2. Reason

The approved Phase 1D.3 benchmark workflow is too heavy for a time-limited DACN demo. A small, reproducible smoke path is needed to demonstrate that the existing six-task runtime can execute on Colab and connect to NestJS.

## 3. Affected Scope and Traceability

| Area | References |
|---|---|
| Use cases / requirements | UC-STU-004 / FR-STU-004; UC-STU-005 / FR-STU-005; UC-STU-009 / FR-STU-009; UC-TEA-005/006 / FR-TEA-005/006; UC-ADM-004 / FR-ADM-004; UC-ADM-005 / FR-ADM-005 |
| Business rules | BR-007/008/013/014/015/018/021/026/028/034/035/036/037/041/042/043; unchanged |
| AI contract | AI Contract v1.0 §§5–13, 16–18; Release 1 schema pack; unchanged |
| Public API | API-STU-ANALYSIS-001, API-STU-PLAN-001, API-STU-ADJUST-001, API-TEA-ANALYSIS-001, API-ADM-ANALYSIS-001; unchanged |
| Screens | None |
| Internal runtime | `POST /v1/infer`; existing request/response envelope and task bindings; unchanged |

The proposed lane changes only demo execution scope and its local acceptance. It does not change frozen contract behavior or replace the official Phase 1D.3 benchmark criteria.

## 4. Current Approved Behavior

The approved Phase 1D.3 plan uses a pinned Qwen3-4B NF4 candidate and requires 20 fixtures per task, manual quality scoring, capacity evidence, full dependency/source evidence, and separately verified NestJS transport. The current runtime loader uses NF4. Its notebook, evidence, plan, and official acceptance remain intact and continue to govern completion of the full phase.

## 5. Proposed Lite Behavior and Acceptance

Create a separate `phase-1d3-lite.ipynb` that supports Run All, checks for a Tesla T4, installs only missing runtime dependencies while using Colab's existing PyTorch, loads the pinned candidate once in FP16, and calls the existing runtime for six real synthetic fixtures (one per task). A failure remains FAIL with its diagnostic; no output is repaired, substituted, or counted as valid without passing the existing schema, semantic, and reference validators.

Lite acceptance is limited to:

1. Qwen2.5-1.5B-Instruct loads on a Tesla T4 in FP16 from the recorded immutable revision.
2. Each of the six tasks completes a real inference and has at least one output passing the existing schema, semantic, and reference validation.
3. One request from the NestJS AI inference path reaches the running FastAPI runtime and succeeds using real model output.
4. A compact report records model/revision, dependency versions, GPU, measured model-load duration, each actual inference result/output (or error), and PASS/FAIL per task.

The NestJS smoke uses an owner-authorized private/loopback route. The notebook will not create a public tunnel. If the route or a task fails, the report records the blocker and Lite is not all-PASS.

For a failed task, first inspect the existing prompt and improve bounded output-generation settings while preserving the approved task prompt and promptVersion. Keep the failed result and record any manual rerun as a distinct attempt. Do not change the model, auto-retry, or rewrite output to pass. Changing prompt text or its binding would affect the shared official path and requires a separate controlled change.

## 6. Explicitly Unchanged

- Frozen baselines, AI Contract v1.0, schema pack, API schemas, and business rules.
- Existing `ai/colab/phase-1d3.ipynb` and all Phase 1D.3 evidence.
- Official Phase 1D.3 acceptance: 120 fixtures, manual scoring, capacity profiling, and its full provenance/dependency gates remain outstanding and unchanged.
- `OPEN-ARCH-003`; no production model selection, capacity profile, or production activation.
- Runtime default behavior: NF4 remains the default; FP16 is an explicit internal demo configuration.

## 7. Implementation Impact

After approval, add the separate notebook, a six-input smoke fixture set and a small runner that validates envelope/correlation/runtime bindings and calls the existing output validator, add an explicit FP16 load mode with regression coverage while preserving NF4 default behavior, verify the loaded FP16 model parameters remain on the T4 GPU, record measured model-load duration without changing the public or internal AI response envelope, add a real-runtime NestJS integration smoke, and provide short Colab instructions plus a report that starts Pending until real evidence is collected. If a task fails, inspect its prompt and first consider bounded generation-setting improvements while keeping the approved task prompt and promptVersion unchanged; retain all attempts. Do not add a benchmark framework, manual rubric, capacity profiler, full provenance pipeline, or new public contract behavior.

## 8. Decision

**Requested decision:** Approve this scoped demo lane and its Lite acceptance criteria.  
**Owner decision:** Approved by Project Owner in this session on 2026-10-30.  
**Implementation hold:** Lifted for the scope in this CR. The approved implementation plan and independent review gate still apply.

## Sources

- Approved plan: `docs/superpowers/plans/2026-10-29-phase-1d3-real-model-benchmark.md`
- AI Contract benchmark criteria: `docs/baseline/AI_Contract_v1.0_baseline_final.md` §17
- Model revision: [Qwen/Qwen2.5-1.5B-Instruct on Hugging Face](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct/tree/989aa7980e4cf806f80c7fef2b1adb7bc71aa306)
