# ADR-AI-001 — Local-first Application & Portable Self-managed AI Runtime

**Ngày:** 07/11/2026  
**Trạng thái:** HƯỚNG KIẾN TRÚC ĐÃ ĐƯỢC CHỦ DỰ ÁN ĐỒNG Ý 07/11/2026 — ADR release vẫn PENDING CR-005  
**Scope:** Deployment/runtime placement (không thay AI Contract 1.0, nghiệp vụ và API bên ngoài)

## Bối cảnh

- Frozen SRS R3/Architecture hiện buộc Google Colab cho AI.
- Nộp đồ án yêu cầu người đánh giá có thể dựng lại sản phẩm từ source và dữ liệu.
- Môi trường ưu tiên laptop thường không có GPU (máy phát triển kiểm thử: i7-1265U, RAM 16 GB, Linux Mint).
- Ollama CPU chạy được nhưng SP-02 StudyPlan 10 Topic không đạt 60 giây; chưa có model/capacity certification.
- R3/CR-002/CR-003/CR-004, AI Contract 1.0 + Errata và Demo Acceptance Supplement là các ràng buộc không thể tự bỏ.

## Các phương án

| Phương án | Ưu điểm | Nhược điểm | Đề xuất |
|---|---|---|---|
| A — Chỉ Google Colab | Giữ nguyên frozen baseline; đã có Lite model-candidate smoke trên T4 | Giảng viên cần tài khoản/môi trường GPU, Colab session không tự khởi động độc lập | Không phù hợp tiêu chí portability |
| B — Chỉ Ollama CPU local | Dễ dựng lại trên laptop; không phụ thuộc cloud | SP-02 fail, chất lượng chưa đủ, không chứng minh all-task acceptance | Không đủ điều kiện làm runtime duy nhất có tuyên bố đáp ứng AI Contract |
| **C — Portable runtime interface, CPU-local installation + GPU optional** | Backend giữ nguyên, người chấm có cấu hình chạy local, có đường nâng hiệu năng khi đủ tài nguyên | Cần docs/env rõ, separate model profiles/evidence, CPU performance là giới hạn phải công bố | **Hướng đã được owner đồng ý; ADR release pending** |

## Quyết định đề xuất

### Cấu trúc logic

```text
Web Browser / Next.js (local)
  └── HTTP → NestJS REST API (local)
                  ├── Prisma → PostgreSQL (local)
                  └── AiGateway POST /v1/infer (contractVersion 1.0)
                          └── FastAPI AI Adapter
                                └── Inference Engine
                                      ├── Ollama CPU (local, khả năng cài đặt ưu tiên)
                                      └── GPU-hosted engine (optional, deployment profile riêng)
```

**Chú ý:** adapter FastAPI không cần hoặc không được lấy trực tiếp database credentials; thông tin nghiệp vụ, score/count/role vẫn do NestJS quyết định. Thay đổi engine không được thay đổi route, schema, task key, log hoặc user-facing error semantics.

### Cấu hình A — `local-cpu` (để dựng lại)

- Local machine chạy Next.js, NestJS, PostgreSQL; adapter và Ollama có thể chạy local.
- Docker Compose/installation scripts **cần được triển khai và kiểm chứng**; tài liệu hiện chỉ mô tả thiết kế mục tiêu.
- Giảm phụ thuộc tài khoản cá nhân; demo/giám khảo có thể tái cài đặt mô hình từ nguồn hợp pháp theo model manifest.
- CPU-only **chưa được công nhận đủ AI performance/quality**; chức năng AI có thể trả timeout/runtime failure theo baseline.

### Cấu hình B — `remote-gpu` (tùy chọn)

- Next.js, NestJS, PostgreSQL vẫn local; NestJS gọi adapter qua kênh an toàn được cấu hình.
- GPU VM/cloud account là tài nguyên **của người triển khai**, không phụ thuộc hạ tầng riêng của nhóm.
- Ollama trên GPU hoặc runtime Colab FP16 hiện có là những engine khác nhau; mỗi model/profile/prompt cần evidence riêng.
- Không mở công khai cổng Ollama `11434`; dùng TLS/token cho adapter hoặc tunnel/private network.

## Ràng buộc không đổi

- 6 task keys; Teacher 1 external attempt, Admin 2 stage; `POST /v1/infer`; request envelope v1.0.
- Contract 1.0, schema pack Release 1, Errata 1/2, CR-003/004 error mapping.
- Timeout **tối đa 60 giây/attempt**; nếu Admin hai attempt tuần tự, end-to-end timeout các lớp upstream phải phù hợp (khuyến nghị xấp xỉ >=130s theo kiến trúc).
- `AIRequestLog` một bản ghi cho mỗi external attempt đã bắt đầu, không có log cho pre-dispatch rejections.
- Không auto retry, không tự sửa raw model output, không làm giả output, không silent truncate/sample/chunk.
- Capacity profile bind `modelId`, `tokenizerId`, `contractVersion`, `promptVersion` theo task; fail-closed nếu thiếu/mismatch.
- AiGateway là điểm duy nhất được gọi runtime; không frontend → runtime hoặc runtime → DB.

## Đầu ra bàn giao bắt buộc — đề xuất

- Versioned app source, Dockerfiles/Compose hoặc script tương đương, `.env.example` không chứa secret.
- Prisma schema, migrations, seed + tài khoản thử nghiệm được cấp hợp pháp; không có PII thật.
- AI adapter source, task registry, schema pack Release 1, prompt versions, Ollama model manifest (tag + immutable digest), runtime settings, CPU/GPU profiles riêng.
- Runbook cài đặt từ máy sạch, test script kiểm tra health DB/auth/AI, release checksum.
- Evidence chứng minh từng mode có thể chạy ở mức nào; lỗi timeout phải được ghi rõ.

## Trạng thái/điểm chưa giải quyết

`OPEN-ARCH-003` vẫn mở cho production model/capacity certification. Nghiệm thu **tự cài và chạy toàn bộ AI trên CPU** chưa được chứng minh; không được diễn đạt rằng chỉ cần Docker là chắc chắn đáp ứng 60 giây. Cần quyết định chủ dự án về tiêu chí nghiệm thu cụ thể trước khi accept ADR.

## Kết luận

**OWNER ENDORSED DIRECTION (không phải ADR release ACCEPTED).** Triển khai theo hướng này ở mức chuẩn bị, còn phát hành tài liệu mới và tuyên bố nghiệm thu cần CR-005/cross-document audit, xác minh clean-install và xử lý giới hạn CPU.
