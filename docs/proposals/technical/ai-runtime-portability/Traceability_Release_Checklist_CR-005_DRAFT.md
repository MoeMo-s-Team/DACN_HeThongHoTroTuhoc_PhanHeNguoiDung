# Cross-document Impact Audit / Release Checklist — CR-005 DRAFT

**Ngày:** 07/11/2026  
**Status:** OPEN, chưa pass cross-document audit, chưa phê duyệt.  
**Current authority:** R3/CR-002 frozen + Governance Index v1.5 + CR-003/004 + Errata 1/2 + Demo Acceptance Supplement Release 1.

## 1. Authority và phạm vi

| Tài liệu | Phiên bản hiện hành được xác minh | Impact | Hướng xử lý |
|---|---|---|---|
| SRS | 1.6 (R3, 26/10) | Bắt buộc | Bản mới sau CR approval; sửa Colab constraint, portability & reproducibility |
| System Architecture | 1.1 (R3, 26/10) | Bắt buộc | Bản mới sau CR approval; local CPU/GPU runtime placement |
| AI Contract | v1.0 frozen, Errata 1/2 approved | Review/addendum | Giữ v1.0 envelope và Release 1 schema pack; supplement không overwrite |
| Document Governance Index | 1.5, Approved 30/10 | Bắt buộc **sau** CR approved | Index mới, trace đầy đủ CR-005, không xóa lịch sử Lite/CR-003/004 |
| Freeze Record | R3 v1.2, frozen | Đánh giá release | Chỉ tạo record mới với manifest/hash sau audit/approval |
| Business Rules / UCD / UCS / Activity | R3 | Impact review | Không đổi nghiệp vụ, UC, attempts hoặc threshold |
| Frontend API Specification | v1.5 R3 | Impact review | Không đổi frontend-visible routes/error semantics nếu đúng proposal |
| Database Design | v1.0 | Impact review | Không thêm bảng/AIRequestLog fields ngoài contract |
| UI Sitemap / Wireframe | Current baseline | Impact review | Không thay màn hình/flow cho việc đổi runtime |
| ADR-AI-001 | Mới | Cần owner approval | Nêu lựa chọn và rủi ro CPU 60s |
| Deployment/Reproduction Guide | Mới | Implementation doc | Verify clean install, seed, model digest, secret review |
| CPU exploratory evidence | Mới | Technical evidence | Báo cả PASS và FAIL; không gọi là approved full benchmark |

## 2. Traceability anchors

| Requirement / Design | Đối chiếu |
|---|---|
| `CON-04`, `AI-REQ-020/022` | Self-managed runtime, endpoint, local CPU install path, GPU optional; CR-005 |
| `AI-INT-004/006/007` | Per-attempt 60s, env endpoint + token; giữ nguyên public contract |
| `NFR-PERF-004/005`, `NFR-AVL-001/002` | Latency gate và non-AI availability |
| `OD-07/08` | Model selection và runtime interruption; không giả định Colab-only |
| `AI Contract §§5–7, 15.3–15.4, 17` | Task registry, envelope, semantics, capacity, benchmark/demo scope |
| `CR-002`, `CR-003`, `CR-004`, Errata 1/2 | Không xóa/sửa error handling và validation boundary |
| `Phase 1D.3 Demo Acceptance Supplement` | Lite T4 FP16 demo candidate; không xem là CPU validation/application capacity release |
| `AIRequestLog` / DB Design | Started attempts: one terminal log; preflight rejects no log |

## 3. Kiểm tra nhất quán cần chạy khi áp dụng change set

- [ ] CR-ID tra registry, chốt số chính thức (CR-005 chỉ là đề xuất).
- [ ] SRS R3 source có đủ mọi `Colab` instance; phân loại câu normative hay lịch sử trước khi thay.
- [ ] Architecture R3 không còn tuyên bố Colab là **bắt buộc** tại tech table, local dev, deployment, decision summary.
- [ ] AI Contract vẫn `/v1/infer`, request **không có promptVersion**, response có runtime metadata và correlation.
- [ ] GPU Lite smoke acceptance vẫn được giữ đúng giới hạn; không đổi model revision/evidence digest.
- [ ] CR-003/004 và Errata 1/2 mapping được tôn trọng, không phát minh HTTP error code mới.
- [ ] Teacher one attempt; Admin two-stage; no retry; all external attempts logged.
- [ ] Capacity preflight fail-closed, không truncate/sample/chunk input để né timeout.
- [ ] CPU-local không tuyên bố đạt tất cả sáu AI tasks khi chưa có evidence; SP-02 FAIL được công bố.
- [ ] Quyết định chủ dự án chốt yêu cầu giảng viên chạy mọi AI flows trên laptop CPU hoặc chấp nhận profile GPU khi CPU không đạt.
- [ ] Docker/seed/migrations/service commands trong README trỏ tới file thật và đã test sạch.
- [ ] Release manifest SHA-256 của docs/artifacts cuối + update governance.
- [ ] Chỉ sau toàn bộ các gate này đổi DRAFT→APPROVED, không tự đóng OPEN-ARCH-003.

## 4. Release stop conditions

**STOP RELEASE** nếu:

- `CON-04` đã sửa nhưng source Architecture vẫn nói Google Colab bắt buộc;
- runtime CPU thay thế release T4 mà không có approval/evidence riêng;
- yêu cầu cài trên CPU bị mô tả thành mọi AI request đáp ứng latency dù SP-02 fail;
- capacity profile không tồn tại nhưng application service vẫn phát external AI attempt;
- error mapping khác CR-003/004/Errata 1/2;
- người chấm phải dùng tài khoản Google Cloud hoặc secret của nhóm mới khởi động được hệ thống;
- không có evidence clean install hoặc các script chưa tồn tại.

## 5. Kết luận audit

**DRAFT impact mapping complete; cross-document audit of actual merged files NOT YET RUN.** Không phát hành freeze hoặc nhãn `baseline_final` từ bộ change set này.
