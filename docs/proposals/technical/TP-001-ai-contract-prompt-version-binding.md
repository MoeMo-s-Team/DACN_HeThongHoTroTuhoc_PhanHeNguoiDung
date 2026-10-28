# TP-001 — AI Contract Prompt Version Binding and Artifact Gate

**Status:** APPROVED BY PROJECT OWNER  
**Approval date:** 2026-10-28  
**Approval record:** Explicit owner approval in this project session; approver name not supplied.  
**Dossier/release reference:** `docs/releases/ai-contract-v1.0-schema-pack-release1/` — this is an independent release, not recovered Rev.4.
**Created:** 2026-10-28  
**Author:** Codex  
**Related Task:** Phase 1D.1 — AI Contract Artifacts Finalization

## 1. Context

R3/CR-002 requires each capacity profile to bind the task's active `promptVersion`. The repository's Architecture v1.1 describes `taskProfiles[task].promptVersion`, and requires a newly benchmarked/released capacity profile when the active prompt changes. The task reports an inconsistency across the task registry, capacity profile, request envelope, and runtime response.

`AI_Contract_v1.0_baseline_final.md` is present in `docs/baseline/`, and its manifest checksum verifies. Candidate 1 remains a technically tested, non-normative 15-schema review artifact; original Rev.4 remains absent. AI-DD-011 refers to `request.promptVersion` while §6.3 omits it. Owner-approved Erratum 1 resolves the discrepancy without a wire field: bind task through registry/profile/config and keep response correlation to `contractVersion`, `requestId`, and `task`. Release 1 supplies the approved normative schema companion under a new identity.

## 2. Baseline / Architecture References

- Freeze: `DACN-REQ-UC-BL-2026-10-26-R3`.
- CR: `CR-002 v1.0 Approved`, decisions `XAI-001` and `XAI-002`.
- `AI-REQ-015..018`, `AI-REQ-020..024`; `NFR-PERF-004/005`; relevant task flows `FR-STU-004..009`, `FR-TEA-005`, `FR-ADM-004/005`.
- Related Use Cases: `UC-STU-004/005/009`, `UC-TEA-005`, `UC-ADM-004/005`.
- Public API errors: `AI_INPUT_TOO_LARGE` (`422`), `AI_RUNTIME_FAILURE` (`502`), and `AI_INCOMPLETE_DATA` (`502`). CR-003 approves the two exact post-dispatch mappings; no endpoint or payload shape changes.
- Architecture v1.1, §§14.7–14.8: task prompt version in the capacity profile; profile binding and runtime failure boundary.
- Business Rules v1.4 Rev.1, CR-002/XAI-001 and XAI-002 sections; Activity Diagram v1.3 §4.1; Use Case Specification v1.2 §3.5; SRS v1.6 §§5.8 and 10.5.1; API Specification v1.5 §§11.4–11.5.
- Screen IDs: N/A; no UI change.
- AI Contract v1.0: `docs/baseline/AI_Contract_v1.0_baseline_final.md`; present and covered by the passing `pnpm verify:baseline` check.

## 3. Constraint

Owner approval recorded below accepts the recommendations in TP-001. Implementation remains outside this document's release scope and must follow Phase 1D.2 authorization. Preserve the frontend REST shape, AI attempt count, one terminal `AIRequestLog` per started attempt, and human-confirmation requirements. The request envelope must not gain or lose fields by inference. Observable error mappings are authorized by the paired CR-003 and AI Contract Erratum 1.

## 4. Problem and Evidence

### Available evidence

- Architecture v1.1 §14.7 includes `taskProfiles[task].promptVersion` in each deployment's capacity profile and requires a new benchmarked profile when the active prompt version changes.
- CR-002 §3 requires capacity profile binding to include `contractVersion + modelId + tokenizerId + task/promptVersion`, among other capacity values.
- R3 requires capacity-profile binding mismatch to fail before dispatch as `502 AI_RUNTIME_FAILURE`, with no `AIRequestLog`; post-dispatch technical/protocol failure maps to `AI_RUNTIME_FAILURE` and has a FAILED attempt log.
- The governance index and CR-002 audit identify AI Contract v1.0 as a downstream authority. `AGENTS.md` requires the released 15-schema rev4 pack, and `README_R3_CR002.md` states it is a separate companion that must come from its released source.
- AI Contract §§12.3 and 13.1 place backend validation/deduplication/counting between Admin Stage 1 and Stage 2. §13.1 does not enumerate Stage 2's `issueGroups` fields. API R3's Admin orchestration and successful response show backend-computed `count`; Erratum 1 records the owner-approved internal projection.

### Confirmed prompt-version inconsistency in AI Contract v1.0

| Contract location | Defined behavior | Finding |
|---|---|---|
| AI-DD-009 | Task registry assigns one initial `promptVersion` to each of the six task keys. Runtime returns `promptVersion` in metadata. | Registry is the available canonical task-to-prompt mapping. |
| AI-DD-011, Capacity-profile binding rule | Says `request.promptVersion` must exactly match `taskProfiles[task].promptVersion`. | Normative binding explicitly refers to this request property. |
| §6.3 Request envelope example | Shows `contractVersion`, `requestId`, `task`, `locale`, and `input`; no `promptVersion`. | The example and binding rule are inconsistent or incomplete. Without the released schema pack, field presence/requiredness cannot be decided. Do not add or remove a wire field by inference. |
| §6.4 Success envelope | Returns `runtime.modelId` and `runtime.promptVersion`; says these are trace/debug/benchmark metadata, not business-rule inputs. | Runtime prompt version is metadata, not a request-correlation field. |
| §6.4.1 Response correlation | Requires exact `contractVersion`, `requestId`, and `task` correlation. | These remain the only defined response-correlation keys. |

The contract table lists these task/prompt bindings: `STUDENT_LEARNING_ANALYSIS` → `stu-learning-analysis-v1`; `STUDENT_STUDY_PLAN_GENERATION` → `stu-study-plan-v1`; `STUDENT_STUDY_PLAN_ADJUSTMENT` → `stu-study-adjust-v1`; `TEACHER_CLASS_ANALYSIS` → `tea-class-analysis-v1`; `ADMIN_FEEDBACK_GROUPING_STAGE1` → `adm-feedback-group-v1`; `ADMIN_FEEDBACK_SUMMARY_STAGE2` → `adm-feedback-summary-v1`.

### Missing evidence

- `AI_Contract_v1.0_baseline_final.md` is now in `docs/baseline/` and its SHA-256 is verified by `pnpm verify:baseline`.
- `AI_Contract_v1.0_schema_pack_rev4.zip` remains absent from the repository, Downloads, and the inspected R3 documentation bundle. The bundle contains 13 files (12 Markdown documents and one SHA-256 manifest), with no schema archive. Archive integrity, schema count, dialect, and Ajv compilation therefore cannot be verified.
- Concrete deployed task registry, capacity profile, and runtime configuration are not present. The contract itself provides the six initial registry bindings above, enough to confirm the request-field contradiction but not to prove deployment values match.
- Candidate 1 has 15 Ajv-validated schemas including Stage 2 `count`. It remains non-normative; approved Release 1 carries the owner-approved projection.

## 5. Options Considered

### Option A — Restore released authorities, then reconcile against them (recommended)

Use the checksum-verified AI Contract v1.0 already in the repository and obtain the released schema pack rev4 from its source. Compare the registry, profile, envelope, and response to those authorities. Keep any erratum as a DRAFT proposal until human approval; if the contract and schema pack disagree, stop for owner resolution and a versioned contract decision.

**Advantages**
- Preserves frozen wire semantics and approved schema provenance.
- Makes the claimed mismatch verifiable and gives a traceable basis for any correction.

**Disadvantages**
- Phase 1D.1 artifact finalization remains blocked until the released schema pack and erratum decision are available.

### Option B — Reconstruct the contract and schemas from R3 prose

Infer the missing envelope and schemas from the downstream baseline descriptions.

**Advantages**
- Produces files quickly.

**Disadvantages**
- Not authoritative; may fabricate schema or wire semantics and contradict the explicit R3/CR-002 implementation gate. Rejected.

## 6. Recommended Option

**Recommendation:** Option A.

Approved prompt-version binding, with no new wire field:

1. Resolve `request.task` against the AI-DD-003/009 task registry.
2. Before dispatch, require `capacityProfile.taskProfiles[task].promptVersion` to equal the registry's active `promptVersion` exactly. Require the released runtime deployment configuration to use that same task prompt version; publish it atomically with the profile as CR-002 requires.
3. The approved Release 1 request schema has no `request.promptVersion`; do not add it. Erratum 1 resolves AI-DD-011 against §6.3 without changing the wire shape.
4. On a success response, first correlate only `contractVersion`, `requestId`, and `task` as §6.4.1 specifies. Do not use `runtime.promptVersion` as a correlation key or add it to the request envelope.

### Approved runtime metadata mismatch policy — not yet implemented

AI Contract §6.4 currently says runtime model/prompt metadata is for trace/debug/benchmark and is not trusted for business rules. TP-001 evaluates two policies:

| Policy | Result | Contract and logging effect |
|---|---|---|
| Diagnostic-only (current §6.4 reading) | Return a schema-valid, correlated success even if `runtime.promptVersion` differs; emit safe conformance diagnostic/release evidence. | Preserves current observable behavior and existing response-correlation rules. |
| Fail-closed (approved in CR-003 / Erratum 1) | After standard response correlation and schema validation, compare response `runtime.promptVersion` with both the task registry and active capacity profile. On mismatch, discard the success and return `502 AI_RUNTIME_FAILURE`. | The external attempt has already started: write exactly one FAILED `AIRequestLog` with internal diagnostic `AI_RUNTIME_PROMPT_VERSION_MISMATCH`; do not create temporary context or return business success; do not retry. This changes a previously successful case; owner approved the observable mapping through CR-003. |

The fail-closed option preserves the existing public error code and does not add a wire field, but it changes observable success/failure behavior. It was approved through CR-003 and AI Contract Erratum 1. The runtime policy is approved but not implemented in this Phase 1D.1 artifact release.

Apply the contract's existing error distinctions:

| Condition | Public mapping | Log behavior |
|---|---|---|
| Missing/malformed/mismatched capacity profile before dispatch | `502 AI_RUNTIME_FAILURE` | No attempt, no `AIRequestLog`. |
| Runtime protocol/auth/inference/technical provider failure after dispatch | `502 AI_RUNTIME_FAILURE` | One FAILED log with the internal diagnostic. |
| JSON parse fails; envelope/type/enum is invalid; requestId/task correlation fails; ID/reference or other semantic structure is invalid | `AI_INVALID_STRUCTURE` | One FAILED log. |
| Required field is missing or task-specific minimum content is missing | `AI_INCOMPLETE_DATA` | One FAILED log. |
| Required AI output text is nonempty by JSON length but blank after `trim()` | **Approved `502 AI_INCOMPLETE_DATA`** | One FAILED log because the external attempt has started. |
| Successful response's `runtime.promptVersion` differs from the registry/profile after standard correlation | **Approved `502 AI_RUNTIME_FAILURE`** | One FAILED log with `AI_RUNTIME_PROMPT_VERSION_MISMATCH`; no business success/temp context. |
| Network/unavailable, timeout, or empty response | Preserve `AI_CONNECTION_FAILURE`, `AI_TIMEOUT`, or `AI_EMPTY_RESPONSE` respectively. | Preserve existing per-attempt logging rules. |

The established mappings follow AI Contract §§6.6 and 7.1 and CR-002 XAI-002. For Ajv classification, a `required` failure maps to `AI_INCOMPLETE_DATA`; other schema violations, including type, enum, and `additionalProperties`, map to `AI_INVALID_STRUCTURE`. Semantic rejection of a disallowed ID/reference maps to `AI_INVALID_STRUCTURE`; task-specific minimum content missing maps to `AI_INCOMPLETE_DATA`. Contract §4.9/§7.1 requires rejecting required output text whose trimmed value is blank, but §7.1 does not assign its public code. Erratum 1 and CR-003 approve `502 AI_INCOMPLETE_DATA` because required content is absent in substance, with one FAILED log for the post-dispatch attempt. Pre-dispatch invalid/missing caller input remains no attempt/no `AIRequestLog`.

For runtime prompt metadata mismatch, `AI_RUNTIME_FAILURE` is preferred over `AI_INVALID_STRUCTURE`: the response may be valid JSON, satisfy both schemas, and correlate by contractVersion/requestId/task; the mismatch indicates runtime/profile conformance failure. CR-003 and Erratum 1 approve one FAILED log after dispatch, unlike the pre-dispatch profile mismatch, which has no attempt/log.

Candidate 1's semantic proposal fixture validates that a required `summary: "   "` passes the structural schema's `minLength: 1` check while recording proposed `AI_INCOMPLETE_DATA`, FAILED, and PENDING metadata. It is a policy review fixture, not a NestJS runtime classification test.

If the actual AI Contract and schema pack are mutually inconsistent, or resolving the mismatch requires changing frozen envelope/response semantics, stop and request an authority decision. Do not resolve that conflict by technical proposal alone.

## 7. Schema Pack Recovery and Verification (Proposed)

1. Original `AI_Contract_v1.0_schema_pack_rev4.zip` was not supplied/recovered. Release 1 is published under a distinct identity below and must never be called Rev.4.
2. Inspect the archive listing and require exactly 15 intended `.json` schema files, with no path traversal or unexpected payload. Run archive integrity validation (`unzip -t`) and extract into a temporary review directory.
3. Parse every JSON file; confirm the declared JSON Schema Draft 2020-12 dialect and compile all 15 schemas with the project's pinned Ajv 8 setup. Record schema filenames, IDs, compile output, and archive checksum in an audit record.
4. Cross-check the schema set and each contract task against AI Contract v1.0: task/request/response coverage, required fields, version/correlation fields, and references. Do not infer missing schemas from prose.
5. The owner-approved normative companion is `docs/releases/ai-contract-v1.0-schema-pack-release1/AI_Contract_v1.0_schema_pack_release1.zip`. Candidate 1 remains preserved as `CANDIDATE — NOT APPROVED` review history. Release 1 is not recovered Rev.4; its identity, hashes, approval and verification are recorded in its release directory.

## 8. Implementation Impact

- Frontend: none; `/api/v1` request/response/error contract remains unchanged.
- Backend: Phase 1D.2 may implement only the approved contract/schema rules after separate authorization. Verify task registry/profile binding before dispatch and response correlation after dispatch; do not add `request.promptVersion`.
- Database: none; preserve `AIRequestLog` semantics.
- AI runtime: no runtime changes in this release; no new wire field is authorized.
- Tests: Phase 1D.2 runtime tests must cover registry/profile equality, no request prompt field, pre-dispatch profile mismatch, approved §7.1 error classifications, and post-dispatch correlation mismatch (`AI_INVALID_STRUCTURE`). Verify runtime metadata mismatch → `AI_RUNTIME_FAILURE`, exactly one FAILED log with `AI_RUNTIME_PROMPT_VERSION_MISMATCH`, no business success/temp context, no retry; whitespace-only required output → `AI_INCOMPLETE_DATA`, one FAILED log. Release 1 runner validates schema fixtures only, not runtime behavior.
- Admin mapping: Stage 1 output contains no `count`; backend validates/deduplicates/removes empty groups and computes count before Stage 2. Erratum 1 approves Stage 2 receiving `count`.
- Configuration/deployment: publish the capacity profile atomically with the already active task prompt version, model, and tokenizer as required by CR-002.

## 9. Verification Required

### Gates before Phase 1D.2

- [x] AI Contract v1.0 is present in `docs/baseline/` and its manifest checksum passes `pnpm verify:baseline`.
- [x] Approved Schema Pack Release 1 with identity, provenance statement and verification report is available. It is not recovered Rev.4.
- [x] TP-001 and Erratum 1 approved; request envelope has no `promptVersion` wire field.
- [x] Stage 2 `issueGroups[].count` projection approved in Erratum 1.
- [x] CR-003 and Erratum 1 approve post-dispatch mismatch and whitespace-only output classifications.
- [ ] Separate Phase 1D.2 implementation authorization remains required.

### Gates before deployment (not prerequisites to start Phase 1D.2)

- [ ] Benchmark and release a capacity profile bound to contract, model, tokenizer, and all task prompt versions; deploy it atomically with matching runtime configuration.
- [ ] Compare the deployed registry, capacity profile, and runtime configuration against all six AI-DD-009 bindings and retain the release evidence.
- [ ] Confirm registry/profile equality before dispatch, no request `promptVersion` wire field, and response correlation by `contractVersion`/`requestId`/`task`; apply the approved fail-closed runtime metadata mismatch policy from CR-003/Erratum 1.
- [ ] Verify the approved §7.1/error mappings and `AIRequestLog` counts in implementation; preserve API shape, approved business behavior, attempt counts and human confirmation.

## 10. Decision

**Decision:** APPROVED BY PROJECT OWNER — 2026-10-28  
**Approved record:** `docs/releases/ai-contract-v1.0-schema-pack-release1/`; approved erratum and CR-003 contain the operative text.  
**Phase 1D.1:** Decision and release approval recorded. Candidate 1 remains historical `CANDIDATE — NOT APPROVED`; the separately identified Release 1 is normative. Release verification is in `docs/releases/ai-contract-v1.0-schema-pack-release1/VALIDATION_REPORT.md`.  
**Phase 1D.2:** Not started; separate implementation authorization is still required. Runtime configuration, benchmarked capacity profile, and six deployed prompt-binding checks are deployment gates, not prerequisites to start Phase 1D.2.  
**Deployment readiness:** BLOCKED / NOT VERIFIED until the separate pre-deployment checks in §9 pass.
