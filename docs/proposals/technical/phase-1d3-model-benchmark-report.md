# Phase 1D.3 Real Model Benchmark Report

**Status:** Pending real Colab/T4 evidence. This is a local implementation report, not benchmark evidence and not a model quality claim.

## Candidate and environment

- Initial candidate: `Qwen/Qwen3-4B-Instruct-2507`, immutable revision `cdbee75f17c01a7cc42f958dc650907174af0554`.
- Runtime and dependencies: Pending. The checkout has CPU-only Python 3.12; Colab Python 3.13, Torch/CUDA compatibility, official Torch wheel provenance and the full hashed lock have not been verified.
- GPU/NF4 load, real inference, actual NestJS-to-runtime transport, capacity bounds and manual ratings: Pending; no Tesla T4 evidence was supplied or generated.
- User-reported smoke results: none supplied. There is no independently verified smoke evidence.

## Required evidence

For each of the six tasks, return at least 20 actual attempts (10 normal and 10 boundary/adversarial). The report must retain failed, timed-out, unparseable and unattempted fixtures in the denominator. Each task needs schema and semantic success at or above 95%, no reference violation or UNKNOWN, every inference under 60 seconds, and at least five manual dimensions (relevance, groundedness, actionability, Vietnamese, boundary) scoring 4/5 or higher for every fixture.

Current local corpus: 120 synthetic request fixtures, 20 per task, sourced from Release 1 valid input examples and independently varied synthetic values. These are test inputs only. There are no model attempts, output archive, manual scores or GPU measurements yet.

## Artifacts to return from Colab

Return the reviewed source commit or source archive and SHA-256; pre/post environment snapshot; official installed Torch wheel URL, SHA-256 and RECORD comparison; complete hash-pinned requirements lock and no-Torch-action pip dry-run report; `pip check`, imports, NF4 and startup output; fixture SHA-256; one immutable attempt record for each attempted fixture; evaluator JSONL; manual score file; capacity measurements; NestJS-to-runtime transport evidence; and a SHA-256 manifest of the returned artifacts. Do not include tokens or other secrets.

## Current decision

No benchmark pass, model selection, capacity profile validation, production activation or release is supported. `OPEN-ARCH-003` remains open until real evidence and owner approval satisfy the frozen criteria.
