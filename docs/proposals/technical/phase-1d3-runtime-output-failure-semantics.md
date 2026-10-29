# Technical Proposal — Phase 1D.3 Runtime Output Failure Semantics

**Status:** APPROVED IN PRINCIPLE; formal downstream governance issued as CR-004 / Erratum 2 Release v1.0. This proposal remains historical, non-normative.  
**Date:** 2026-10-29  
**Scope:** Internal NestJS ↔ AI Runtime behavior only. No public REST route or payload changes proposed.

## Decision requested

Approve or reject the interpretation below for model-generated output failures. Approval would authorize updating the Phase 1D.3 implementation plan and adding contract regression tests. It does not by itself authorize changing the frozen AI Contract, Schema Pack Release 1, runtime code, model selection, or capacity profile.

## Authority and implementation evidence

The controlling sources are AI Contract v1.0 §§6–7 and AI-DD-004; Schema Pack Release 1's `inference-success-envelope` and `inference-error-envelope`; Erratum 1 E3–E4; CR-003; root and `ai/AGENTS.md`; and the Phase 1D.2 implementation.

Release 1's success envelope requires `output` to be an object and has no error discriminator for invalid generated content. Its error envelope permits only `INVALID_REQUEST`, `UNSUPPORTED_CONTRACT`, `UNSUPPORTED_TASK`, `INFERENCE_FAILED`, and `RUNTIME_UNAVAILABLE`. Contract §7.1 says malformed JSON received at NestJS is `AI_INVALID_STRUCTURE`; Contract §6 maps a correlated `INFERENCE_FAILED` runtime error to public `AI_RUNTIME_FAILURE`. Erratum 1/CR-003 explicitly map blank required text after trim to `AI_INCOMPLETE_DATA` and preserve `AI_INVALID_STRUCTURE` for structural/correlation/semantic structure errors.

Current `AiGatewayService` parses HTTP bodies: malformed HTTP JSON on 2xx becomes `AI_INVALID_STRUCTURE`; correlated 5xx `INFERENCE_FAILED` becomes `AI_RUNTIME_FAILURE` with internal `AI_RUNTIME_INFERENCE_FAILURE`. `AiInferenceService` validates the success envelope and then output schema; required-field schema errors map `AI_INCOMPLETE_DATA`, other schema errors `AI_INVALID_STRUCTURE`, blank required text maps `AI_INCOMPLETE_DATA`, and each dispatched attempt receives one terminal log. `SchemaRegistryService` uses the approved Draft 2020-12 schemas. `AiSemanticValidator` performs schema-adjacent semantic/reference checks. No production code is changed by this proposal.

## Proposed interpretation

1. Parsed schema-valid object: runtime returns HTTP 200 with correlated success envelope; NestJS performs authoritative schema and semantic validation.
2. Parsed object invalid against the task schema: runtime returns HTTP 200 carrying the parsed object unchanged; NestJS classifies it as `AI_INVALID_STRUCTURE` or `AI_INCOMPLETE_DATA` using current validation behavior. Runtime must not repair, fill, remove, or rewrite fields.
3. Required text that is whitespace-only: runtime returns the parsed object unchanged in HTTP 200 success envelope; NestJS returns existing `502 AI_INCOMPLETE_DATA` per Erratum 1 E4/CR-003.
4. Model-generated text that is malformed JSON, empty, or a non-object: runtime returns correlated HTTP 500 with the existing `INFERENCE_FAILED` error code. NestJS returns existing `502 AI_RUNTIME_FAILURE` and records the existing FAILED attempt with internal `AI_RUNTIME_INFERENCE_FAILURE` diagnostic. This classifies failure to produce a structured result as inference execution failure; it does not introduce an error code.
5. Malformed HTTP JSON actually received at NestJS remains `AI_INVALID_STRUCTURE` under the existing gateway parser. This is distinct from model text that the runtime itself could not parse before constructing an HTTP response.
6. No retries, fabricated task output, new public/internal error codes, changes to terminal log count/lifecycle, or business mutations.

## Authority impact assessment

This proposal changes an observable error mapping for model-generated malformed/empty/non-object text: current AI Contract §7.1 and the error classification tables describe malformed/empty structured output as `AI_INVALID_STRUCTURE` / `AI_EMPTY_RESPONSE`, while the proposed runtime 500 maps to `AI_RUNTIME_FAILURE`. Although the wire error code is already allowed and NestJS mapping already exists, the output classification is visible to API callers. Therefore this is **not safely classifiable as interpretation-only** under the present approved sources. It requires an approved downstream Change Request/erratum (or explicit owner determination that an existing approved source already resolves this distinction) before the interpretation becomes normative. No baseline, contract, or schema files are changed here.

The task-schema-invalid-object route also raises a scoped rule question: `ai/AGENTS.md` §5 says runtime output must conform to the approved schema, while the proposal intentionally allows invalid model output to cross the internal boundary so NestJS can classify it authoritatively. The owner decision must explicitly approve this validation-boundary interpretation, or direct that runtime reject invalid objects and identify the intended existing classification. Do not silently choose a path.

## Alternatives considered

- Return an invalid success envelope (`output: null`) for malformed generation: rejected; violates Release 1 success-envelope type.
- Synthesize an empty/placeholder object: rejected; fabricates output and can change classification.
- Return raw malformed model text as HTTP body: rejected; violates structured runtime response and risks exposing raw output.
- Return `INFERENCE_FAILED` for malformed generation: proposed; uses existing error envelope and gateway behavior but changes the observable mapping described above, so it requires approval.
- Add a new runtime error code: rejected in this proposal; it is outside Release 1's enum and requires schema/contract change control.

## Traceability and implementation impact

Affected AI tasks: all six task keys. Trace: `UC-STU-004/005/009`, `UC-TEA-005/006`, `UC-ADM-004/005`; `AI-REQ-015..024`; relevant `FR-*`, `BR-*`; internal endpoint `POST /v1/infer`; public errors `AI_INVALID_STRUCTURE`, `AI_INCOMPLETE_DATA`, `AI_RUNTIME_FAILURE`. No screen change. If approved, plan Task 1 will add runtime-to-NestJS contract tests for valid output, wrong type/enum/additional property, missing required field, whitespace-only required text, malformed generated text, empty generation, non-object generation, malformed HTTP body, generation exception and timeout, asserting HTTP classification, public error, one FAILED/SUCCESS log, and no retry. Task 5 will define FastAPI module-level `app` plus lifespan that constructs worker controller on lifespan startup (without model load at import); tests use app factory/injected worker and lifespan-managed model initialization.

## Decision record

**Project Owner decision:** Approved in principle and formally approved for release 2026-10-29.  
**Normative downstream artifacts:** CR-004 and AI Contract v1.0 Erratum 2 Release v1.0 in `docs/releases/ai-contract-v1.0-runtime-output-erratum2-release1/`.  
**Boundary:** This proposal itself remains non-normative; implementation still requires the updated Phase 1D.3 plan to receive independent `Approved` verdict.
