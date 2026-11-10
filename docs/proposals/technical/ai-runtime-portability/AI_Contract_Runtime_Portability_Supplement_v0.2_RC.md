# AI Contract v1.0 — Runtime Portability Supplement (v0.2 RC)

**Phiên bản đề xuất:** 0.2 Release Candidate  
**Ngày:** 09/11/2026  
**Trạng thái:** RELEASE CANDIDATE — PENDING HUMAN APPROVAL; **không sửa** AI Contract v1.0 frozen / schema pack Release 1 / Errata 1, 2 / CR-003, CR-004  
**Scope:** runtime adapter và deployment profile; không thay frontend API, 6 task keys hay public error catalog.

## 1. Authority cần tuân thủ

- `AI_Contract_v1.0_baseline_final.md`, 26/10/2026, R3/CR-002.
- Approved `AI Contract v1.0 Erratum 1`, `CR-003`, `CR-004_Runtime_Generated_Output_Failure_Policy_approved.md`, `AI_Contract_v1.0_Erratum_2_approved.md`.
- `Document_Governance_and_Traceability_Index_v1.5.md`, 30/10/2026.
- `Phase_1D3_Demo_Acceptance_Supplement.md` Release 1, 30/10/2026: Phase 1D.3 Full Benchmark đã được miễn làm điều kiện nghiệm thu **demo model-candidate**; Lite PASS trên T4 FP16, nhưng §15.4 capacity profile và application invocation gate không được miễn.
- `CR-006 v1.0 Approved` và `CR-006_Downstream_Addendum_v1.0.md`, 09/11/2026: terminal AIRequestLog persistence là best-effort theo một insert attempt; dashboards count persisted rows and may undercount attempts.

Các nguồn trên đã xác định lỗi malformed model text ở runtime vs malformed HTTP JSON tại NestJS theo hai cách xử lý khác nhau; adapter mới phải bảo toàn đúng ranh giới.

## 2. Không thay đổi request/response contract

```http
POST /v1/infer
Content-Type: application/json
Authorization: Bearer <AI_RUNTIME_TOKEN>   # nếu được cấu hình
```

Request envelope v1.0 dùng `contractVersion`, `requestId`, `task`, `locale`, `input`. **Không thêm `promptVersion` vào request**; promptVersion được resolve từ task registry, capacity profile và deployed runtime configuration theo Governance v1.5.

Success envelope chứa `contractVersion`, `requestId`, `task`, `output` (JSON object), `runtime.modelId`, `runtime.promptVersion`. NestJS kiểm tra correlation `contractVersion/requestId/task` và thực hiện schema/semantic/reference validation.

Không sửa 15 JSON Schemas của Schema Pack Release 1; **không ghi nhầm** thành `AI_Contract_v1.0_schema_pack_rev4.zip` nếu bản Rev.4 gốc chưa được thu hồi.

## 3. Runtime adapter đề xuất

```text
NestJS AiGateway → HTTPS/localhost POST /v1/infer → FastAPI Adapter
                                                      ├── Task registry (6 keys)
                                                      ├── Prompt templates/version
                                                      ├── Output parser (object only)
                                                      └── Ollama native API (internal)
```

- Ollama không expose trực tiếp `/v1/infer`; FastAPI adapter chuyển format/provider nhưng không tự sửa semantic/schema outcome.
- Ollama CPU (`qwen2.5:1.5b`) và Colab GPU FP16 là **hai model runtime profiles khác nhau**. Giữ profile-specific digest, tokenizer/estimator, prompts, context, temperature, sampling config, fixtures và evidence.
- Không sử dụng `modelId` trả về từ model như quyết định business rule.
- Runtime không có quyền DB; adapter không lưu raw prompt/response theo mặc định.

## 4. Output và lỗi — bảo toàn Errata

| Tình huống | Runtime → NestJS | NestJS/API |
|---|---|---|
| Model tạo JSON **object** | Correlated HTTP 200 success, `output` giữ nguyên | Ajv2020 + semantic/reference validation quyết định PASS/FAIL |
| Object thiếu required data | Không tự điền field | `AI_INCOMPLETE_DATA` theo schema/semantic mapping |
| Object sai type/enum/reference | Không tự sửa | `AI_INVALID_STRUCTURE` theo mapping hiện hành |
| Required text chỉ whitespace | Chuyển object không sửa | `AI_INCOMPLETE_DATA` theo Erratum 1 E4 / CR-003 |
| Generated text malformed JSON/empty/non-object | Correlated HTTP 500 `INFERENCE_FAILED` (không tự sửa) | `AI_RUNTIME_FAILURE`, internal `AI_RUNTIME_INFERENCE_FAILURE` theo Erratum 2/CR-004 |
| HTTP body từ runtime malformed | HTTP-level protocol failure | Gateway `AI_INVALID_STRUCTURE` theo scope hiện hành |
| Không có body | Empty HTTP body | `AI_EMPTY_RESPONSE` |
| Adapter unavailable/network failure | Connection failure | `AI_CONNECTION_FAILURE` |
| >60 giây per attempt | Timeout | `AI_TIMEOUT` |
| CPU input vượt budget **có profile hợp lệ** | Reject trước dispatch | `422 AI_INPUT_TOO_LARGE` / no AIRequestLog theo CR-002 |
| Profile thiếu/bind sai | Reject trước dispatch | `502 AI_RUNTIME_FAILURE` / no AIRequestLog, internal capacity mismatch |

Sau khi NestJS phân loại inference outcome theo validation của nó, handler chỉ thử một lần insert terminal `SUCCESS`/`FAILED` nếu còn chạy tới bước persistence. Không `PENDING`, không retry inference và không retry insert khi lỗi/ACK không xác định. Đây là best-effort theo CR-006, không bảo đảm có row cho mọi external attempt; process stop trước persistence cũng có thể để thiếu row. Nếu output hợp lệ nhưng insert không được xác nhận, không phát business success và trả lỗi CR-006 đã duyệt; nếu inference đã thất bại thì giữ public error gốc. `SUCCESS`/`FAILED` phản ánh inference outcome sau NestJS output validation, không phải việc client nhận được HTTP success. Dashboard aggregates đếm persisted rows và có thể thấp hơn số attempts thực tế.

## 5. Capacity profile & preflight

Lược đồ nguồn v1.0 §15.4 vẫn bắt buộc:

```text
capacityProfileVersion
modelId
model/checkpoint digest (proposed provenance metadata)
tokenizerId
contractVersion
promptVersion/task
contextWindowTokens
reservedOutputTokens/task
promptAndSchemaOverheadTokens/task
inputSafetyMarginTokens
estimator method + benchmark artifact
```

Trước request thật, NestJS xác nhận binding profile và tính đủ chi phí prompt/schema/reserve/margin cho từng task. Thiếu profile → fail closed, **không bypass trong demo**. Không tự cắt/summary/chunk authoritative inputs. **Không** tái sử dụng profile của Colab FP16 cho Ollama Q4/CPU hoặc ngược lại.

## 6. Installability and AI Conformance/Capacity gates

The proposed portability interpretation applies AI Contract v1.0 §17's existing benchmark criteria to the exact target runtime/hardware profile under review. It preserves Contract v1.0 source bytes and numerical thresholds; it does not turn the T4 Lite smoke or CPU exploratory runs into a benchmark pass. This interpretation requires Project Owner approval with CR-005. Until then, this supplement is non-authoritative and R3's Colab constraint continues to govern.

### A. Installability

Installability requires a clean documented setup from released source, environment template, setup scripts/runbook, model identity and retrieval steps, service health/readiness, six-task protocol/schema contract tests, and troubleshooting. Mock/fixture-engine contract tests are not live inference evidence. Installability PASS does not enable application dispatch without a released matching capacity profile.

### B. AI Conformance/Capacity (per exact profile)

For each model/runtime/hardware configuration, apply the existing AI Contract §17 benchmark criteria and §15.4 profile binding separately: at least 20 fixtures per task; 0% timeout violations; at least 95% schema and semantic pass rates per task; 0 reference-boundary violations; and manual Vietnamese quality of at least 4/5 per task. The deployed profile must also pass NestJS required-content validation and capacity-boundary checks before application dispatch is enabled. Missing or mismatched profile remains fail-closed.

Current evidence does not pass this gate:

- The Phase 1D.3 T4 FP16 Lite result is approved demo-candidate smoke only; its wire smoke used mocked authorization/preflight and is not application capacity certification.
- CPU Ollama exploratory runs include repeated SP-02 10 Topic failures under 60 seconds and do not constitute a six-task profile or capacity release.

Neither result transfers across model, runtime or hardware. Do not claim CPU-only completes every AI flow from Installability or demo smoke.

## 7. Implementation checks trước khi phát hành

- [ ] Docker/native adapter/engine service được pin và smoke từ env mới.
- [ ] Model provenance và quantization/digest/task promptVersion ghi rõ cho **mỗi** profile.
- [ ] 6 task registry entries dùng schema pack Release 1; test Ajv2020 thực chạy và reference boundary.
- [ ] Errata 1/2/CR-003/004 error/regression suite PASS với real adapter.
- [ ] Preflight `DenyAll` chỉ thay bằng invocation policy có bằng chứng/release hợp lệ, không bypass.
- [ ] CPU/GPU mode acceptance reports không dùng lẫn kết quả.
- [ ] Bảo vệ secret, không public Ollama API, không log full user inputs mặc định.

## 8. Handoff checks

- [ ] Installability checks (clean install, service health/readiness, environment template, setup scripts, runbook, model digest/retrieval and troubleshooting) pass independently of live model conformance.
- [ ] Six-task contract tests use the exact v1.0 envelope and Release 1 schemas; mock/fixture-engine results are labeled contract tests, not real inference or capacity evidence.
- [ ] Real model quality, schema/semantic acceptance and 60-second capacity are reported per task and exact hardware/runtime/model profile under AI Contract §§15.4/17; no profile is enabled without approved capacity evidence.

**Kết luận:** Supplement này chỉ đề xuất khả năng portability; không thay `contractVersion`, timeout, schema pack, AIRequestLog schema, public error catalog hoặc demo Lite approval. CR-006 lifecycle and aggregate semantics remain controlling. This supplement has no authority until approved with CR-005.
