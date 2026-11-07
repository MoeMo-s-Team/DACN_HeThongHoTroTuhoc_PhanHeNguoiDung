# Phase 2B Task 1 — AI Contract & Governance Gate

**Ngày cập nhật:** 2026-11-07
**Kết quả hiện tại:** **PASS — Task 1 contract/authority gate.** Approved R3 alignment is applied and source-hash verified. Separate runtime gates remain BLOCKED.
**Scope:** Governance evidence and approved file-level R3 alignment. No business code, database, AI runtime or commit changed. Earlier BLOCKED statements in this report are historical and superseded by this update.

## 1. Kết luận

Các nguồn phát hành chính thức được tìm thấy trong lịch sử Git. Checksum AI Contract, Schema Pack Release 1, Erratum 1/2, CR-003/004 đã được đối chiếu; Schema archive có đúng 15 schema. Sáu task key, envelope, schema binding và E5/E6 được đối chiếu với nguồn phát hành. AI Contract v1.0 và R3 baseline hiện đã được đồng bộ vào vị trí active.

Task 1 trước đây bị BLOCKED do checkout chưa thống nhất R3. Disposition đã được phê duyệt và áp dụng từ commit `c8807f24ec66a2465521533878d54541762018a9`: active baselines, manifest và root/backend guidance nay cùng trỏ tới R3. API v1.5 khai báo `AI_RUNTIME_FAILURE`/`AI_INPUT_TOO_LARGE`, khớp SRS v1.6 và Contract v1.0. R2 được lưu trong `docs/archive/R2/`; authority không đổi vẫn nằm trong `docs/baseline/`.

R3 release manifest có nguyên vẹn 12 mục; 10 artifact còn thiếu được khôi phục từ commit đó, hai artifact đã có được giữ nguyên. AI Contract v1.0 được khôi phục từ release riêng `e9a44818c077faf7b7809ac9e4efa3280ba88ed4`, SHA-256 `44c6bc2f0f6d01a6590d216237d4eb7b5ffc02a0783ffe6fd271178a4c8d4056`. Các hash được xác minh trước khi sao chép. Design System hiện ở `docs/architecture/` và bản cũ được giữ nguyên tại `docs/baseline/`.

Task 1 hiện **PASS** cho contract và authority reconciliation. CR-005/ADR-AI-001, CPU capacity certification và terminal AIRequestLog insert-failure policy vẫn là blocker cho các hạng mục runtime/dispatch tương ứng.

CR-005 vẫn DRAFT/formal release pending; ADR-AI-001 vẫn pending CR-005. Điều này chặn FastAPI/Ollama như application runtime và Student AI inference cho tới khi portability được phê duyệt. Task 5 cũng chưa thể đóng: baseline yêu cầu log mọi external attempt, nhưng chưa quy định cách đáp ứng nếu insert terminal log thất bại sau dispatch. Không được giải quyết khoảng trống bằng `PENDING`, write-ahead record chưa được duyệt, retry inference, hoặc transaction mở qua network.

## 2. Artifact và provenance

Các nguồn chính thức được kiểm tra trực tiếp từ Git release; các artifact được đồng bộ vào active locations chỉ sau khi xác minh hash. Thư mục `ai-authority-recovery/` không được dùng làm nguồn authority.

| Artifact | Phiên bản / approval đã xác minh | Nguồn release và checksum | Kết quả |
|---|---|---|---|
| AI Contract | v1.0 Baseline Final; Approved Downstream AI Integration Artifact | Source tại release commit `e9a44818`; SHA-256 `44c6bc2f0f6d01a6590d216237d4eb7b5ffc02a0783ffe6fd271178a4c8d4056`, trùng hash nêu trong Schema Pack Validation Report và recovery copy | **VERIFIED** |
| Schema Pack | Release 1; APPROVED / NORMATIVE; 2026-10-28; đúng 15 Draft 2020-12 schemas | `e9a44818`; official sidecar + `SHA256SUMS`; archive SHA-256 `a28743c94b871b8b9346dea552f092ce184c288db8ff613c6ea07cc864144620`; kiểm tra ZIP pass, 15 entries | **VERIFIED** |
| Erratum 1 | AI Contract v1.0; approved 2026-10-28 | `e9a44818`; official `SHA256SUMS`; SHA-256 `2ceafc84b8f07165aabebae454e2ce91e0e6ff57c1c60e4e6b37e2cfd5d0f3b2` | **VERIFIED** |
| CR-003 | Approved by Project Owner, 2026-10-28; supplement to CR-002 XAI-002 | `e9a44818`; official `SHA256SUMS`; SHA-256 `d3cfb2501696dda27b1a94e9a2d81882a1a17a8db79fef135658eba7a8317aa6` | **VERIFIED** |
| Erratum 2 | Release v1.0; Approved downstream; effective 2026-10-29 | `e6fd1b3b`; official release `SHA256SUMS`; SHA-256 `c13bcf1a2117316bc3da2d77c049ba61e0efca3032f14838316d828e3a3b377b`, exactly matches recovery copy | **VERIFIED**, with wording note below |
| CR-004 | Approved downstream Runtime Generated Output Failure Policy | `e6fd1b3b`; official release `SHA256SUMS`; SHA-256 `cce63f819f42f54257f6a8eeb8ad62f1cfd30b398ab92a15c50447b3cc735eb1`, exactly matches recovery copy | **VERIFIED** |
| Phase 1D.3 Demo Acceptance Supplement | Release 1; Approved downstream; owner approval 2026-10-30 | Release source at `42db2105`; recovered text SHA-256 `b66c4d1558d4287590cf7e2ac23176d0d6ef38216fb332289fca2c60795686be` matches the Git release source. No standalone SHA-256 manifest for this Markdown file was found; supplement references evidence archive SHA-256 `e0fdb36dee70b307b8e999b19234a6de44e1c3440cee4bbbf02ed9c05ad2764f` | **CONTENT MATCH VERIFIED; publisher SHA manifest absent** |
| Governance Index v1.5 | Recovery copy says Approved downstream governance update, owner approval 2026-10-30 | Recovery SHA-256 `a153f235f8e0366fdb513c6f454d76542bebd2ab16508bc68b70f0fddddbc8bc` is recovery-only. A matching official release file/hash was not found in Git history. Its status claims are corroborated by the primary release records above, not relied on as their substitute | **CONTENT RECOVERED; OFFICIAL CHECKSUM UNVERIFIED** |
| R3 baseline freeze | Release commit `c8807f24ec66a2465521533878d54541762018a9`; `Requirements_UseCase_Baseline_Freeze_Record_v1.2.md`; R3 manifest | Freeze record declares R3 FROZEN under CR-002; all 12 manifest hashes recomputed and matched; commit is the approved source for the active file-level sync | **APPLIED; official release hashes verified** |
| Active baseline authority set | Current root `AGENTS.md` §2, backend guidance, active baselines and manifest | R3 SRS v1.6/API v1.5/BR v1.4/UCS v1.2; AI Contract v1.0 restored from official release | **ALIGNED to R3** |

Erratum 2's verified release text contains the phrase “This draft supplements…” despite its `APPROVED`, Release v1.0 metadata, formal approval record and release checksum. Record this as an editorial inconsistency; do not treat it as a Draft because the approved release record and CR-004 identify it as the effective downstream artifact.

The Contract's original Rev.4 archive remains unavailable. Schema Pack Release 1 is a separately named normative companion, not a substitute or relabeling of Rev.4. Recovery README/manifest hashes only prove the recovered bytes; they are not publisher hashes. The candidate portability ZIP was not used to establish any AI authority.

## 3. Task keys, schema binding, envelope

AI Contract v1.0 §AI-DD-003 defines exactly six keys; Schema Pack Release 1 maps each to one input and one output schema:

| Exact task key | Release 1 schema pair | Successful-flow attempts |
|---|---|---:|
| `STUDENT_LEARNING_ANALYSIS` | `student-learning-analysis.input.schema.json` / `student-learning-analysis.output.schema.json` | 1 |
| `STUDENT_STUDY_PLAN_GENERATION` | `student-study-plan-generation.input.schema.json` / `student-study-plan-generation.output.schema.json` | 1 |
| `STUDENT_STUDY_PLAN_ADJUSTMENT` | `student-study-plan-adjustment.input.schema.json` / `student-study-plan-adjustment.output.schema.json` | 1 |
| `TEACHER_CLASS_ANALYSIS` | `teacher-class-analysis.input.schema.json` / `teacher-class-analysis.output.schema.json` | 1 |
| `ADMIN_FEEDBACK_GROUPING_STAGE1` | `admin-feedback-grouping-stage1.input.schema.json` / `admin-feedback-grouping-stage1.output.schema.json` | 1 |
| `ADMIN_FEEDBACK_SUMMARY_STAGE2` | `admin-feedback-summary-stage2.input.schema.json` / `admin-feedback-summary-stage2.output.schema.json` | 1 |

Teacher analysis + recommendations remain one attempt; Admin remains two sequential attempts. Do not add aliases or infer keys from capability names.

The approved v1.0 wire shapes are:

- Request: `{contractVersion, requestId, task, locale, input}`. `contractVersion` is `"1.0"`; `locale` is `"vi-VN"`; **there is no request `promptVersion`**. Auth is configured `Authorization: Bearer <AI_RUNTIME_TOKEN>`.
- Success: `{contractVersion, requestId, task, output, runtime:{modelId,promptVersion}}`.
- Error: `{contractVersion, requestId, error:{code,message}}`; runtime codes are `INVALID_REQUEST`, `UNSUPPORTED_CONTRACT`, `UNSUPPORTED_TASK`, `INFERENCE_FAILED`, `RUNTIME_UNAVAILABLE`.
- Correlate success with request by exact `contractVersion`, `requestId` and `task`. Erratum 1 E1 binds the request task to registry/profile prompt settings without adding a wire field. Per-attempt timeout is 60 seconds; gateway no-auto-retry.

## 4. Errata/error mapping

| Case | Runtime behavior | Nest/public behavior | Attempt log |
|---|---|---|---|
| Erratum 2 E5: model-generated text malformed JSON, empty, or non-object | HTTP 500 correlated Release 1 error envelope, `INFERENCE_FAILED`; no fabricate/repair/echo | `502 AI_RUNTIME_FAILURE`, internal `AI_RUNTIME_INFERENCE_FAILURE` | exactly one `FAILED`; no retry or success context |
| E5 distinction: malformed HTTP JSON received by Nest | Protocol/parse failure, not model-generated E5 | `AI_INVALID_STRUCTURE` | one `FAILED` after dispatch |
| E5 distinction: empty HTTP response body | Empty transport response, not empty generated text | `AI_EMPTY_RESPONSE` | one `FAILED` after dispatch |
| Erratum 2 E6: generated text parses to a JSON object, including task-invalid object | Return object unchanged; Runtime does not add/remove/coerce/truncate/rewrite fields | Nest authoritative task schema/semantic validation; missing required content → `AI_INCOMPLETE_DATA`; other structure/semantic violation → `AI_INVALID_STRUCTURE` | exactly one `FAILED` if Nest rejects; success only after Nest validation |
| Erratum 1 E4 / CR-003: required text is whitespace after trim | Structural JSON may pass | `502 AI_INCOMPLETE_DATA` | exactly one `FAILED`; no retry |
| Erratum 1 E3 / CR-003: correlated, schema-valid response has mismatched runtime prompt version | Reject; no success context | existing `502 AI_RUNTIME_FAILURE`, diagnostic `AI_RUNTIME_PROMPT_VERSION_MISMATCH` | exactly one `FAILED`; no retry |

CR-004 formalizes generated-output policy and approves Erratum 2 downstream. Runtime and Nest HTTP-protocol errors remain distinct from model-generated output failure. FastAPI may parse model text and pass JSON objects through; NestJS alone authorizes business success.

The approved E5/E6 and CR-003/004 classifications now resolve against active API v1.5, which includes the `AI_RUNTIME_FAILURE` and `AI_INPUT_TOO_LARGE` mappings referenced by SRS v1.6 and AI Contract v1.0.

Erratum 2 E6 is an approved narrow exception to `ai/AGENTS.md` §5's output-conformance instruction. That scoped instruction remains unchanged; Task 7 includes the instruction update before FastAPI implementation.

## 5. AIRequestLog lifecycle review — Task 5

Verified lifecycle in AI Contract §14.2: capture `attemptStartedAt` immediately before network dispatch; the attempt begins at dispatch; every terminal path then persists one terminal row (`SUCCESS`/`FAILED`) with `createdAt=attemptStartedAt` and monotonic `durationMs` when available. `AIRequestLog.feature` is exactly the six task keys in §14.1. Prisma enum has only `SUCCESS` and `FAILED` (`apps/api/prisma/schema.prisma:46-49`); model has terminal `status`, `errorCode`, `durationMs`, and no lifecycle/pending fields (`:217-229`). SRS AI-REQ-018/019 and API §§13/AI-REQ-018 require one log per actual external attempt, no log for pre-dispatch rejection, and no raw prompt/response by default. Sequence diagrams show the terminal log persisted after the attempt outcome. Database Design §10.6 forbids holding a DB transaction across AI/network work.

Plan Task 5 is narrowed accordingly: use one of the six exact task keys as `feature`; capture `attemptStartedAt` just before dispatch; create no pre-dispatch placeholder and no `PENDING`; after classification write one short terminal `SUCCESS`/`FAILED` record using `createdAt=attemptStartedAt` and elapsed monotonic duration. No transaction spans inference. Persist the log before returning success or creating a StudyPlan preview. If the terminal insert fails, do not create success context and do not retry inference.

**Remaining blocker:** the authorities do not define how an already-dispatched attempt can satisfy “must have one log” when its terminal insert fails (for example, database outage). A pre-dispatch connectivity check cannot guarantee the later write; a PENDING/write-ahead record or transaction over inference would exceed the approved schema/lifecycle. Task 5 implementation and dependent dispatch tasks must wait for an approved failure disposition. The report does not invent the public error or recovery operation for this case.

## 6. Runtime portability, CPU profile and implementation boundary

- R3 SRS v1.6 specifies Google Colab at AI-REQ-020. CR-005 v0.1 is a Draft marked `OWNER ENDORSED DIRECTION` and `FORMAL CR RELEASE PENDING`; it says its candidate ID needs registry verification.
- ADR-AI-001 is owner-endorsed direction with ADR release pending CR-005. The Owner Decision Record itself says it does not approve the detailed CR/ADR or CPU acceptance.
- No approved CPU capacity profile exists. CPU StudyPlan exploratory evidence reports SP-02 10-topic failures; T4 Phase 1D.3 smoke is a separate demo-candidate result and does not certify CPU, app invocation, or production capacity.
- Capacity preflight remains fail-closed: missing/malformed/binding-mismatched profile → `502 AI_RUNTIME_FAILURE`; valid profile but full authoritative input over budget → `422 AI_INPUT_TOO_LARGE`; neither dispatches or logs. Never truncate/sample/chunk/pre-summarize to fit.

**Plan review:** Fresh read-only Plan Review Gate approved the materially updated plan on 2026-11-07. This is plan approval only; implementation still requires explicit user authorization.

**Task 1:** PASS for contract and authority reconciliation. Tasks 2, 3 and 4A may be considered after fresh plan review and explicit implementation authorization; no inference is enabled. Task 4B requires a released profile. Task 5 and dependent dispatch remain blocked on terminal-log insert failure disposition. FastAPI/Ollama application runtime and Student live AI additionally require formal CR-005/ADR-AI-001 release and matching capacity evidence.

## 7. Verification record

| Check | Result | Evidence |
|---|---|---|
| Locate official schema/Errata1/CR-003 source | PASS | Git release commit `e9a44818c077faf7b7809ac9e4efa3280ba88ed4`; source release records and `SHA256SUMS` read without restoring files |
| Verify Schema Pack Release 1 bytes | PASS | Recomputed archive SHA-256 `a28743c94b871b8b9346dea552f092ce184c288db8ff613c6ea07cc864144620`; matches release sidecar and manifest; `unzip -t` reports no errors; 15 entries |
| Verify Erratum 1 and CR-003 release hashes | PASS | Recomputed historical Git blobs match `SHA256SUMS`: `2ceafc84…d0f3b2`, `d3cfb250…8317aa6` |
| Verify Contract, Erratum 2, CR-004, Phase 1D.3 recovered content | PASS with limits | Contract hash matches release validation record (`44c6bc2f…8d4056`); Erratum 2/CR-004 match official manifest (`c13bcf1a…b3a377b`, `cce63f81…3b3b1`); supplement matches historical Git source hash but lacks standalone publisher checksum |
| Governance Index v1.5 publisher checksum | UNVERIFIED | Only recovery hash found; status assertions corroborated via primary release records and current CR/ADR files |
| Pre-alignment `pnpm verify:baseline` | PASS (historical) | All 14 entries in the prior manifest returned `OK`; current 12-entry official R3 manifest is verified separately below |
| Prior read-only plan review | PASS (conditional, historical) | Earlier review was superseded by R3 alignment edits |
| Fresh read-only Plan Review Gate | PASS | Reviewer approved current plan after Task 6/8 references were aligned to API v1.5; does not authorize implementation |
| Verify historical R3 freeze | PASS | Commit `c8807f24ec66a2465521533878d54541762018a9`; Freeze Record v1.2 declares `DACN-REQ-UC-BL-2026-10-26-R3` FROZEN; R3 manifest records checksums for SRS v1.6/API v1.5/BR v1.4/UCS v1.2; commit is absent from active branch |
| Reconcile active checkout with approved R3 freeze | PASS | Active files, manifest and guidance now align to R3; hashes are recorded in the current alignment report |
| Application tests, DB tests, AI inference | NOT RUN | No code, database or runtime was changed or invoked |
| Current Markdown whitespace/final-newline check | PASS | Six edited text files checked after final changes |
| Current `git diff --check` | PASS | No whitespace errors |
| Apply R3 manifest | PASS | `docs/baseline/BASELINE_MANIFEST.sha256` matches the official Git release bytes and all 12 listed SHA-256 values |
| Restore Contract v1.0 | PASS | Official release blob SHA-256 `44c6bc2f0f6d01a6590d216237d4eb7b5ffc02a0783ffe6fd271178a4c8d4056` |

## 8. Conditions to begin Task 2

Task 2 may start only after the materially updated plan receives fresh read-only Plan Review Gate approval and the user authorizes implementation. The approved R3 authority state is now aligned. Keep Task 2 inert: no outbound path, no Ollama/local profile, no capacity values. CR-005/ADR release is additionally required before Task 7/8 runtime portability work; any enabled profile also requires its own benchmark release. Task 5 and dependent dispatch remain gated on terminal-log write-failure disposition.
