# SRS R3 v1.6 → Đề xuất thay đổi cho SRS phiên bản tiếp theo

**Loại:** Change Set (DRAFT, không phải SRS v1.7 Baseline Final)  
**Nguồn:** `SRS_v1.6_baseline_final.md` (26/10/2026; frozen)  
**Liên quan:** CR-005 proposed; ADR-AI-001 proposed  
**Nguyên tắc:** Chỉ áp dụng vào bản sao mới của R3 sau duyệt. Không lùi về SRS v1.5 đã cũ.

## 1. Các thay thế có thể xác định bằng anchor

### Header `Tech stack bắt buộc` (SRS v1.6 dòng 7)

**Hiện tại:** AI model self-managed **trên Google Colab**.

**Đề xuất:**

> **Tech stack bắt buộc:** Next.js, NestJS, PostgreSQL; AI model self-managed thông qua AI Runtime với hợp đồng `POST /v1/infer`. MVP hỗ trợ cấu hình triển khai local CPU-only có hướng dẫn cài đặt lại và cấu hình GPU tương thích tùy chọn. Việc hỗ trợ cài đặt local CPU không đồng nghĩa đã đạt hiệu năng/chất lượng AI; phải có evidence tương ứng trước khi tuyên bố đạt.

### §2.1 Product Perspective — Thay sơ đồ thành phần AI

```text
Browser / Next.js
      │
      ▼
NestJS Backend API
      ├── Prisma → PostgreSQL
      └── AiGateway POST /v1/infer
                       │
                       ▼
               FastAPI AI Adapter
                       │
                       ▼
             Self-managed AI Engine
             ├── Ollama CPU local (installation target)
             └── compatible GPU runtime (optional)
```

### §2.5 Operating Environment — AI Runtime

**Đề xuất thay toàn bộ tiểu mục AI Runtime bằng:**

- AI Runtime self-managed độc lập với provider, có thể được NestJS gọi qua `POST /v1/infer` đúng AI Contract v1.0 và các erratum/supplement đã được phê duyệt.
- MVP có hướng dẫn triển khai **CPU-local** để người đánh giá cài lại từ source mà không phải dùng tài khoản cloud của nhóm; môi trường GPU phù hợp là lựa chọn khi cần tốc độ/chất lượng.
- Các profile CPU/GPU, model/digest/prompt/tokenizer/context budget và kết quả benchmark được quản lý riêng; không được chuyển chứng cứ từ GPU sang CPU hoặc ngược lại.
- Đặc tính chạy hoàn chỉnh trong 60 giây trên CPU **chưa xác minh**; mọi claim nghiệm thu phải gắn với profile, fixture và evidence cụ thể.

### §2.6 CON-04

**Hiện tại:** `AI của MVP phải có khả năng chạy trong Google Colab.`

**Đề xuất:**

> **CON-04 (sửa đổi)** — AI của MVP phải là self-managed runtime triển khai được từ mã nguồn và cấu hình bàn giao, không ràng buộc bắt buộc vào Google Colab hoặc tài khoản cloud cá nhân. Tài liệu và gói bàn giao phải có hướng dẫn cài đặt trên laptop CPU-only; GPU là cấu hình khả dụng khi có tài nguyên. Mỗi mode phải công bố rõ mức độ kiểm chứng về schema, semantic, quality, capacity và latency. Mọi application AI attempt vẫn tuân AI Contract và timeout 60 giây.

**Giữ nguyên CON-05..12**, đặc biệt frontend không gọi trực tiếp runtime, runtime không truy cập DB, backend là nguồn metric và human-in-the-loop.

### §2.7 AS-03 / AS-05

> **AS-03 (sửa đổi):** AI Runtime có thể unavailable khi tiến trình Ollama/adapter tắt, kết nối bị gián đoạn hoặc cấu hình model/capacity profile không hợp lệ; các chức năng không phụ thuộc AI tiếp tục hoạt động.

> **AS-05 (sửa đổi):** Model cụ thể được lựa chọn theo bằng chứng thực nghiệm của từng môi trường và các gate đang áp dụng; việc một model vượt smoke demo trên GPU không chứng minh nó phù hợp CPU. Không dùng các output benchmark thử nghiệm làm nguồn dữ liệu nghiệp vụ tự động.

### §3.1 System Context

Đổi tên `AI Runtime trên Google Colab` thành `Self-managed AI Runtime (FastAPI Adapter + inference engine)`. Không sửa mô tả actor, quyền truy cập và việc AI không được trực tiếp thao tác database.

### §5.7 AI-REQ-020 / AI-REQ-022

> **AI-REQ-020 (sửa đổi):** Backend gọi AI Runtime thông qua endpoint kỹ thuật `POST /v1/infer` với `contractVersion=1.0`, các task keys, schema, correlation, semantic validation và bảo mật theo AI Contract hiện hành. Runtime implementation có thể thay đổi giữa CPU-local và GPU profile, nhưng không được thay đổi observable API hoặc mô hình log/thử lại. Mọi profile dùng cho application inference phải đáp ứng capacity preflight theo CR-002/AI Contract §15.4.

> **AI-REQ-022 (sửa đổi):** Không giả định AI Runtime luôn sẵn sàng. Khi adapter/Ollama/server không chạy, kết nối lỗi hoặc input/model profile chưa đáp ứng điều kiện, backend xử lý theo các mã lỗi đã baseline hóa và không làm hỏng dữ liệu nghiệp vụ; các chức năng non-AI vẫn hoạt động.

### §8.4 AI-INT-006

> **AI-INT-006 (sửa đổi):** AI Runtime base URL/secret được cấu hình qua backend environment; không hard-code phụ thuộc Colab hoặc một nhà cung cấp cụ thể. Mọi đối tượng gọi runtime vẫn đi qua AiGateway.

### §9.2 NFR-PERF-005

> **NFR-PERF-005 (sửa đổi):** Ngưỡng response mục tiêu của API không gọi AI không áp dụng cho inference. Mỗi external attempt AI vẫn chịu giới hạn 60 giây theo NFR-PERF-004/AI Contract v1.0; benchmark/acceptance phải đo theo profile CPU/GPU thực tế và không coi timeout là PASS.

### §9.4 Availability

Thay chú thích chỉ dành cho Google Colab bằng:

> MVP không cam kết uptime production cho self-managed AI Runtime ở môi trường local/demo. API không phụ thuộc AI hoạt động độc lập; khi AI unavailable, ứng dụng phải trả kết quả lỗi rõ ràng mà không làm mất dữ liệu đã lưu.

### OD-07, OD-08 (nếu vẫn giữ cùng anchor trong v1.6)

- **OD-07:** Không khóa model theo tên ở SRS; việc lựa chọn model/cấu hình phụ thuộc release artifact và benchmark được phê duyệt, tách riêng CPU-local vs GPU.
- **OD-08:** AI runtime là dependency có thể gián đoạn bất kể provider; xử lý fail-closed, không làm mất dữ liệu.

### SRS phụ lục/Kết luận và các vị trí `Colab` còn lại

Quét toàn bộ `Google Colab`, `Colab`, `endpoint thay đổi theo phiên Colab`. Chỉ thay những chỗ quy định runtime deployment/selection; **không xóa các câu lịch sử** mô tả bằng chứng triển khai Colab đã thực hiện. Không đổi con số performance, số task hay luật Admin hai stage.

## 2. Yêu cầu mới đề xuất (mã chính thức phải do SRS owner cấp)

### `NFR-DEP-NEW-01` — Cài đặt lại từ bộ nộp

Sản phẩm phải bàn giao các thành phần để người đánh giá tự dựng lại môi trường, bao gồm code Next.js/NestJS/FastAPI, PostgreSQL schema/migrations/seed, AI JSON Schema và prompt, model manifest, environment templates, script thiết lập và hướng dẫn kiểm tra health.

### `NFR-DEP-NEW-02` — Minh bạch theo deployment profile

Mỗi môi trường local CPU/GPU phải chỉ rõ cấu hình tối thiểu đã kiểm thử, model digest, giới hạn đã biết, kiểm thử đã PASS/FAIL và nguồn evidence. Không được dùng một smoke có mock authorization/capacity làm bằng chứng ứng dụng đã tích hợp business flow đầy đủ.

### `NFR-DEP-NEW-03` — Tách điều kiện cài đặt và điều kiện vận hành đầy đủ

Cài đặt lại thành công (services lên, database seed, model nạp, contract checks) **không tự động chứng minh** tất cả AI request đều hoàn thành dưới 60 giây. Nếu cần cam kết mọi chức năng AI chạy đạt yêu cầu trên laptop CPU, Project Owner phải duyệt acceptance và có evidence đạt tương ứng; hiện là OPEN/BLOCKING.

## 3. Những gì KHÔNG được sửa bằng change set này

- Không đổi `NFR-PERF-004` timeout tối đa 60 giây.
- Không đổi public API HTTP routes, error codes và schema đã phê duyệt bởi CR-002/003/004, Errata 1/2.
- Không đổi Teacher one-attempt, Admin two-stage và logging semantics.
- Không đổi BR thresholds, data models hoặc giới hạn số Topic để né model context.
- Không thể viết "model Qwen2.5 1.5B đã đáp ứng cả 6 task CPU" vì chưa có evidence.

## 4. Điều kiện áp dụng

1. Chốt CR-005/ADR và CPU-only acceptance wording.  
2. Lấy file gốc `SRS_v1.6_baseline_final.md` từ repo authority và chỉnh thành revision mới (không overwrite).  
3. Cross-document audit và version history.  
4. Đưa vào governance/freezing sau approval.  

**Trạng thái:** DRAFT — chưa tạo `SRS_v1.7_baseline_final.md`, không gán Approved.
