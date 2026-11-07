# AI Contract v1.0 — Runtime Portability Supplement (DRAFT)

**Phiên bản đề xuất:** 0.1  
**Ngày:** 07/11/2026  
**Trạng thái:** Proposed, **không sửa** AI Contract v1.0 frozen / schema pack Release 1 / Errata 1, 2 / CR-003, CR-004  
**Scope:** runtime adapter và deployment profile; không thay frontend API, 6 task keys hay public error catalog.

## 1. Authority cần tuân thủ

- `AI_Contract_v1.0_baseline_final.md`, 26/10/2026, R3/CR-002.
- Approved `AI Contract v1.0 Erratum 1`, `CR-003`, `CR-004_Runtime_Generated_Output_Failure_Policy_approved.md`, `AI_Contract_v1.0_Erratum_2_approved.md`.
- `Document_Governance_and_Traceability_Index_v1.5.md`, 30/10/2026.
- `Phase_1D3_Demo_Acceptance_Supplement.md` Release 1, 30/10/2026: Phase 1D.3 Full Benchmark đã được miễn làm điều kiện nghiệm thu **demo model-candidate**; Lite PASS trên T4 FP16, nhưng §15.4 capacity profile và application invocation gate không được miễn.

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

Mọi external attempt đã bắt đầu phải có đúng một terminal AIRequestLog; không auto retry. Không thêm retry tại adapter làm xuất hiện external attempt mới ngoài logic backend.

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

## 6. Hai acceptance gates cần phân biệt

### A. Approved demo model-candidate smoke gate (đã có)

`Phase_1D3_Demo_Acceptance_Supplement.md` cho phép dùng Lite PASS để xác nhận **model candidate** trên Colab T4 FP16, 6 task keys, live inference và NestJS→FastAPI wire smoke; wire smoke có mock authorization/preflight. Không có nghĩa full app business flow đã PASS.

### B. Application runtime deployment gate (chưa hoàn thành)

Người đánh giá chạy hệ thống từ UI thật cần auth, eligibility, **valid released capacity profile/estimator**, logging, NestJS validators, timeout, secure endpoint. Hiện governance mô tả runtime production module dùng `DenyAllAiInvocationPolicy`; không tuyên bố có thể bật ứng dụng AI end-to-end nếu chưa giải quyết gate này.

### C. CPU-local exploratory evidence (không được nâng thành gate A/B)

Ollama `qwen2.5:1.5b` dùng một provisional schema fixture cho `STUDENT_STUDY_PLAN_GENERATION`. Bài SP-02 10 Topic thất bại lặp lại dưới 60 giây; chỉ có bằng chứng cho một tác vụ, không có 6-task schema pack + CPU capacity release. Vì thế CPU-only **không được công bố hoàn tất mọi luồng AI**.

## 7. Implementation checks trước khi phát hành

- [ ] Docker/native adapter/engine service được pin và smoke từ env mới.
- [ ] Model provenance và quantization/digest/task promptVersion ghi rõ cho **mỗi** profile.
- [ ] 6 task registry entries dùng schema pack Release 1; test Ajv2020 thực chạy và reference boundary.
- [ ] Errata 1/2/CR-003/004 error/regression suite PASS với real adapter.
- [ ] Preflight `DenyAll` chỉ thay bằng invocation policy có bằng chứng/release hợp lệ, không bypass.
- [ ] CPU/GPU mode acceptance reports không dùng lẫn kết quả.
- [ ] Bảo vệ secret, không public Ollama API, không log full user inputs mặc định.

**Kết luận:** Supplement DRAFT chỉ thiết kế khả năng thay thế môi trường; không thay `contractVersion`, timeout, schema pack, AIRequestLog, public errors hoặc demo Lite approval hiện có.
