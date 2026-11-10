# System Architecture v1.1 R3 → Đề xuất thay đổi cho version tiếp theo

**Status:** DRAFT CHANGE SET (chưa phải Architecture v1.2 Approved)  
**Authority:** R3 Architecture v1.1 + AI Contract v1.0 + Errata 1/2 + CR-002/003/004 + Governance v1.5  
**Change control:** CR-005 proposed / ADR-AI-001 proposed

## 1. Mục tiêu

Đổi **placement** AI Runtime từ Google Colab bắt buộc thành một **interface deployable** trên local CPU hoặc GPU, tránh thay đổi module boundaries, public API và AI Contract.

## 2. Áp dụng theo mục (anchor gốc v1.1)

| Architecture anchor | Thay đổi cụ thể |
|---|---|
| §4.4 Reliability | Đổi "AI runtime Colab có thể unavailable" thành runtime self-managed mọi môi trường có thể unavailable. Giữ non-AI independent. |
| §5.1 High-level architecture | Thêm FastAPI Adapter nằm sau AiGateway; engine CPU/GPU behind adapter; runtime không DB credential. |
| §6.1 Technology Stack | AI Runtime: self-managed FastAPI Adapter + pluggable inference engine; Ollama CPU local là target cài đặt; GPU profile optional. |
| AI Gateway/AI Transport | Tiếp tục `POST /v1/infer`; Ollama `/api/chat`/`/api/generate` là private native API phía sau adapter, không exposed ra NestJS. |
| §14 AI Integration | URL/token qua backend env, task registry và response validation/correlation; không thêm retry, cắt/chunk input. |
| §20.1–20.3 Environment | Nêu profile `local-cpu` và `remote-gpu`, model tag/digest, adapter URL/secret, capacity profile, timeout. |
| §21 Local Development | Next.js/NestJS/PostgreSQL local; adapter/Ollama local có thể dùng cùng Compose; GPU tùy chọn. Không còn coi Colab là bắt buộc. |
| §26 Deployment Position | Chốt local-first cho nộp/demo, GPU optional; không khóa cloud provider. Hướng dẫn clone/setup/test từ máy sạch. |
| §27, §28, §36, §37 decision/trace/revision/conclusion | Đối chiếu lại mọi anchor Colab, link CR-005 và ADR; không viết lại lịch sử được phê duyệt. |

## 3. Sơ đồ mục tiêu

```text
Next.js Browser (local)
        │ REST + user Bearer auth
        ▼
NestJS modular monolith (local)
        ├── Prisma → PostgreSQL (local)
        └── AiGateway + preflight + logs + Ajv2020
                     │ POST /v1/infer (contract 1.0)
                     ▼
              FastAPI AI Adapter
                     │ local engine internal API
                     ▼
              Ollama / compatible engine
              ├── CPU-only (local)
              └── GPU VM / supported GPU (optional)
```

## 4. Các env vars đề xuất bổ sung/chuẩn hóa

| Tên | Vai trò | Ghi chú |
|---|---|---|
| `AI_RUNTIME_BASE_URL` | URL adapter `/v1/infer` | Backend only; phân biệt local/remote |
| `AI_RUNTIME_TOKEN` | Backend → Adapter Bearer token | Không gửi frontend; dùng secret file/.env |
| `AI_REQUEST_TIMEOUT_MS` | 60000 | Không đổi contract timeout |
| `OLLAMA_BASE_URL` | Adapter → Ollama internal URL | Không công khai ra Internet |
| `OLLAMA_MODEL` | Model tag được cấu hình | Ghi digest vào manifest để cố định bản model |
| `AI_CAPACITY_PROFILE_PATH` | JSON release capacity profile | Không dựng giả từ benchmark exploratory |
| `AI_DEPLOYMENT_PROFILE` | `local-cpu`/`remote-gpu` (proposal) | Phân nhóm config/evidence, không quyết định business logic |

Không tự biến env proposal thành cấu hình hiện có; tên biến cần đối chiếu với repository khi merge. `AI_RUNTIME_BASE_URL`, `AI_RUNTIME_TOKEN`, timeout và các capacity settings vốn đã có authority trong AI Contract/Architecture. Tránh khai báo biến trùng chức năng.

## 5. Giao thức / ranh giới thực thi

- NestJS phải thực hiện eligibility + capacity preflight trước khi dispatch; thiếu/mismatch capacity profile thì **fail closed**, không có external attempt, không tạo AIRequestLog.
- FastAPI dùng task registry/prompts, gọi model và đóng success/error envelope. Không sửa sai output schema bằng cách xóa/đổi field.
- Model-generated malformed, empty hoặc non-object JSON → correlated HTTP 500 `INFERENCE_FAILED` theo **Erratum 2/CR-004**; parsed JSON object (kể cả sai schema task) trả unchanged vào correlated success envelope để NestJS validate.
- Runtime/provider 401/403, 400/422, inference errors theo Erratum 1 + CR-003; không sửa public error codes.
- `response.runtime.promptVersion` đến từ deployed registry, còn request **không có** `promptVersion` field (Governance v1.5); không thêm vào request envelope.
- Teacher 1 attempt; Admin 2 stages tuần tự và backend kiểm tra/kết xuất số đếm giữa stages; frontend HTTP/client/proxy đủ thời gian cho orchestration (khuyến nghị ~130s Admin).
- Không cho Frontend gọi trực tiếp runtime; không cho runtime truy cập DB; không cho Ollama cổng 11434 public.

## 6. Portable deployment nhưng chưa đạt certification

- `local-cpu` là **đường cài đặt cần hoàn thiện** (clean install, setup script, smoke, seed, AI dependency), không phải profile đã vượt production-grade model gate.
- SP-02 10 Topic fail; không được hard-code tối đa 4 Topic, giảm input hoặc bypass capacity preflight để tránh FAIL.
- `remote-gpu` có thể giúp latency nhưng cũng cần cùng AI Contract/capacity profile riêng. Existing Colab T4 Lite PASS chỉ là **demo model-candidate smoke** với mock auth/capacity in wire smoke.
- Đo và báo cáo từng profile riêng biệt; không dùng runtime tag/Q4 không xác minh làm nguồn chứng cứ cho FP16 trên Colab.

## 7. Release checklist

- [ ] Chốt ADR và CR-005 (đặc biệt tiêu chí CPU-only acceptance).
- [ ] Tạo Dockerfiles/Compose hoặc script thực sự có thể chạy; verify trên máy sạch.
- [ ] Pin image/model digest; `.env.example`, seed, migrations, instructions và no-secrets review.
- [ ] Kiểm tra `AI_CAPACITY_PROFILE` release-binding; không bỏ DenyAll policy nếu thiếu evidence.
- [ ] Chạy gateway contract/integration tests bao phủ CR-003/004 errata, timeout, logging, 6 task keys.
- [ ] Chạy acceptance trên môi trường đã khai báo; lưu PASS/FAIL nguyên vẹn.
- [ ] Cross-document audit; phát hành version mới và governance manifest.

**DRAFT — không thay thế Architecture v1.1 đã approved.**
