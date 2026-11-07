# CHANGE REQUEST — CR-005 (ĐỀ XUẤT)
## Chuyển AI Runtime sang kiến trúc có thể cài đặt lại trên laptop CPU-only, hỗ trợ Ollama và GPU tùy chọn

**Dự án:** Hệ thống hỗ trợ tự học ứng dụng AI  
**Change ID:** `CR-005` (*candidate; xác minh registry trước phát hành*)  
**Phiên bản:** 0.1 DRAFT  
**Ngày:** 07/11/2026  
**Trạng thái:** OWNER ENDORSED DIRECTION (07/11/2026) — FORMAL CR RELEASE PENDING  
**Loại:** Deployment constraint / architecture portability / reproducibility.  
**Nguồn:** R3/CR-002; Governance Index v1.5 và Phase 1D.3 Demo Acceptance Supplement Release 1.

## 1. Bối cảnh

Frozen R3 `SRS_v1.6` vẫn khóa AI Runtime trên **Google Colab** qua CON-04, AI-REQ-020 và các giả định/phần mô tả khác. Người chấm yêu cầu nộp mã nguồn và dữ liệu để **tự cài đặt/chạy lại toàn bộ sản phẩm**, trong khi chưa biết có GPU hoặc tài khoản Cloud. Người thực hiện ưu tiên laptop CPU-only, 16 GB RAM.

Ollama `qwen2.5:1.5b` chạy thực tế trên CPU laptop Intel Core i7-1265U (Linux Mint). Tuy nhiên các bài thử StudyPlan exploratory phát hiện timeout, JSON bị cắt và một số vấn đề chất lượng; **không đạt chứng cứ chọn model cho toàn hệ thống**. Đây là bằng chứng về rủi ro, không phải đề nghị hợp thức hóa kết quả FAIL.

Mặt khác, dự án đã có bản `Phase 1D.3 Demo Acceptance Supplement` Approved cho Qwen2.5-1.5B-Instruct FP16/Tesla T4 và 6 task smoke; đây là môi trường/model artifact **khác** bản Ollama CPU. Quyền hạn của supplement này cần được bảo toàn.

## 2. Mục tiêu thay đổi

- Cho phép phát triển, chạy và cài đặt lại Next.js + NestJS + PostgreSQL + AI Adapter + Ollama bằng hướng dẫn độc lập với Google account người thực hiện.
- Tách **runtime interface** (`POST /v1/infer`) khỏi **provider/model executor** (Ollama CPU, Ollama GPU hoặc runtime đã duyệt trên Colab/T4).
- Đưa local CPU mode thành **mục tiêu portability/cài đặt lại**, không tự tuyên bố CPU đạt latency/capacity/quality đã baseline hóa.
- Có đầy đủ source, seed/migrations, prompt/JSON Schema, model manifest, environment template, script setup và kiểm thử reproducibility.

## 3. Phạm vi điều chỉnh đề xuất

### 3.1. Thay đổi nguồn yêu cầu

- `CON-04`: thay nghĩa bắt buộc Google Colab bằng self-managed AI Runtime deployable, được backend gọi qua AI Contract; ít nhất một hướng cài đặt CPU-only có tài liệu.
- `AI-REQ-020`: endpoint `/v1/infer`, token/config, runtime portability và yêu cầu benchmark theo từng model/config profile.
- `AS-03/05`, `AI-REQ-022`, `AI-INT-006`, OD-07/08, NFR-PERF-005, NFR-AVL-002: loại ràng buộc kỹ thuật riêng của Google Colab, thay bằng failure/availability trung lập môi trường.
- Bổ sung yêu cầu **reproducible installation** với acceptance checklist: chạy được các thành phần, restore DB seed, verify Ollama model/digest, chạy hợp đồng kỹ thuật, ghi rõ giới hạn AI CPU.

### 3.2. Thiết kế/integration

- Giữ Next.js, NestJS, PostgreSQL, Prisma và luồng browser → NestJS.
- FastAPI adapter hiện thực `/v1/infer`, chuyển các task qua engine được cấu hình, ví dụ Ollama `/api/chat` hoặc `/api/generate`. Ollama native API không thay thế trực tiếp AI Contract.
- CPU-only: local Docker/native Ollama trên máy không GPU; mặc định không tuyên bố hiệu năng đã đạt.
- GPU optional: chạy adapter và engine trên GPU-compatible environment; có thể dùng cloud nhưng **không yêu cầu truy cập vào tài khoản cá nhân nhóm**.

### 3.3. Ngoài phạm vi

Không thay: 27 Use Cases, 3 vai trò, metric/threshold, database domain schema, frontend API routes, 6 AI task keys, `contractVersion=1.0`, các schema release đã phê duyệt, Admin two-stage, Teacher one-attempt, human-in-the-loop, timeout per attempt 60 giây, no automatic retry, AIRequestLog, error semantics CR-002/003/004, Errata 1/2, capacity preflight no truncation.

Không đề nghị giảm input để né timeout, tăng 60 giây, chế ra benchmark/capacity profile hoặc bỏ validator.

## 4. Tác động & kế hoạch hồ sơ

| Artifact nguồn | Dự kiến | Căn cứ |
|---|---|---|
| SRS v1.6 R3 | DRAFT change set → bản mới sau approval | CON-04, AI-REQ-020/022, AS-03/05, NFR-PERF/AVL, OD-07/08, Deployment/Reproducibility |
| Architecture v1.1 R3 | DRAFT change set → bản mới sau approval | Runtime boundary, tech stack, local dev/deployment, env, ADR, traceability |
| AI Contract v1.0 frozen + errata/supplements | Supplement riêng; sửa source chỉ nếu thực sự cần | Giao thức vẫn `1.0`, khả năng đổi engine không đổi shape |
| Governance Index v1.5 | Thêm change reference sau approval | Không thay thế lịch sử CR-003/004 và Phase 1D.3 supplement |
| Freeze record R3 v1.2 | Giữ nguyên tới khi phát hành change chính thức | Không gán trạng thái FROZEN trước audit/hash |
| Business Rules, Use Case, API, DB, UI | Impact review; dự kiến không sửa | Không đổi hành vi observable theo đề xuất |
| Runbook, Test Strategy, Benchmark evidence | Tạo mới | Yêu cầu khả năng dựng lại/giới hạn vận hành |

## 5. Bằng chứng hiện có

- `sp_multi.zip`: 4/5 PASS; SP-02 10 Topic timeout 60s.
- `sp_multi_v2.zip`: 3/5 PASS; SP-01/SP-02 timeout.
- `sp_multi_v3.zip`: 4/5 PASS; SP-02 đạt 900 output tokens, `doneReason=length`, JSON chưa hoàn chỉnh.
- `sp_stability_v3.zip`: SP-01 3/3 PASS; SP-02 0/3 PASS vì timeout.
- `sp02_diagnostic.zip`: SP-02 không hoàn thành trong 60s, thiếu kết thúc inference; không ghi bằng chứng CPU hết RAM.
- Các bộ CPU dùng Ollama `qwen2.5:1.5b`; hiện chưa ghi immutable Ollama digest/runtime dependency vào approved model manifest.
- Approved Phase 1D.3-Lite: 6 task real inference trên Colab T4 FP16 với immutable model revision; smoke riêng, chưa chứng nhận app flow/capacity profile.

## 6. Rủi ro và quyết định đang mở (BLOCKING)

**R-01 — Nghiệm thu đầy đủ trên laptop CPU:** Yêu cầu 'giảng viên tự cài đặt và chạy lại *toàn bộ* sản phẩm' có thể được hiểu là *mọi chức năng AI phải hoạt động đạt 60 giây trên laptop không GPU*. Chưa có bằng chứng đáp ứng; SP-02 hiện thất bại liên tục. Không thể công bố yêu cầu đã được đáp ứng nếu không có kiểm chứng hoặc thay đổi nghiệm thu được phê duyệt.

**R-02 — CapacityProfile:** AI Contract §15.4 bắt buộc model/tokenizer/prompt/task-specific capacity profile được benchmark và release. Hiện CPU benchmark exploratory và Lite model smoke **không** tạo profile có thể tự ý dùng để bỏ `DenyAllAiInvocationPolicy`.

**R-03 — Hai model artifact khác nhau:** Ollama `qwen2.5:1.5b` và HF Qwen2.5-1.5B-Instruct FP16 không được dùng chung hiệu năng/evidence/digest/profile.

**R-04 — Dữ liệu đầu vào:** Không tự truncate/sample/chunk các authoritative inputs để làm CPU test PASS.

## 7. Acceptance đề xuất cho CR (không phải acceptance đã đạt)

- [ ] Project Owner phê duyệt rõ: CPU-only là mục tiêu `installable` hay bắt buộc `full AI conformance`; nếu là full, có phương án chứng minh/gate tương ứng.
- [ ] SRS và Architecture bản mới đã được review, versioned, không ghi đè R3.
- [ ] AI Contract compatibility review với CR-003/004 & Errata 1/2 PASS.
- [ ] Runbook hướng dẫn dựng lại trên môi trường sạch; repo có thật các Dockerfile/Compose/scripts được runbook tham chiếu.
- [ ] Test clean setup: migration + seed + login 3 role + sáu luồng AI hoặc công bố rõ các blocker chưa đạt; không dùng prerecorded outputs để giả làm inference.
- [ ] AI capacity preflight và timeout/AIRequestLog theo baseline, không bypass.
- [ ] Governance + cross-document audit + hash manifest được phát hành sau approval.

## 8. Decision

**OWNER ENDORSED ARCHITECTURE DIRECTION 07/11/2026.** Người dùng đã đồng ý với định hướng local CPU ưu tiên / GPU optional / công khai giới hạn hiệu năng. **Chưa coi đây là formal CR release hoặc nghiệm thu CPU.** CR-005 vẫn là mã đề xuất; phải kiểm tra registry và hoàn tất cross-document audit trước khi ban hành.
