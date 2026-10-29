# Phase 1D.3 Model Selection Proposal

**Status:** Pending evidence and owner approval. This proposal does not select or approve a model.

## Candidate

Evaluate `Qwen/Qwen3-4B-Instruct-2507` at immutable revision `cdbee75f17c01a7cc42f958dc650907174af0554` as the initial candidate. Alternatives `Llama 3.1 8B Instruct` and `Mistral 7B Instruct` are unmeasured; no comparison result or rank is assigned.

## Evidence gate

Do not select a candidate until its exact Colab dependency lock preserves the existing Torch/CUDA installation; a real Tesla T4 run proves NF4 model load; all six tasks meet the frozen count, schema, semantic, reference, latency and manual-quality criteria; actual NestJS-to-runtime transport is verified; and a conservative task capacity boundary is supported by exact matching tokenizer serialization plus an analytical bound. Failed and unattempted cases remain visible. A finite sample alone does not establish a universal capacity bound.

## Scope and traceability

This is an implementation proposal for model evaluation only. It changes no frozen requirement, public API, task behavior or baseline. Trace: UC-STU-004/005/009, UC-TEA-005/006, UC-ADM-004/005; FRs and BRs listed in the approved Phase 1D.3 plan; API-STU-ANALYSIS-001, API-STU-PLAN-001, API-STU-ADJUST-001, API-TEA-ANALYSIS-001, API-ADM-ANALYSIS-001. No screen changes.

## Decision requested after evidence

An owner may review a completed evidence package and decide whether to select a candidate, approve a capacity profile, or keep the work Pending. Until then there is no selected model, no production capacity profile, no release, and no closure of `OPEN-ARCH-003`.
