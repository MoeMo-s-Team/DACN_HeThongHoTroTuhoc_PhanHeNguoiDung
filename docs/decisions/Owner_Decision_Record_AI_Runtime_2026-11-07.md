# Quyết định của Project Owner — AI Runtime Portability

**Ngày ghi nhận:** 07/11/2026  
**Loại:** Quyết định định hướng kiến trúc (owner endorsement)  
**Nguồn:** Project Owner trả lời **“đồng ý”** với câu hỏi chốt kiến trúc trong hội thoại DACN.  
**Phạm vi được đồng ý:** CPU-local là môi trường **ưu tiên cài đặt lại**; GPU cloud là **tùy chọn tăng tốc**; công khai rằng CPU chưa được chứng nhận đủ AI Contract.

## Quyết định đã chốt về định hướng

1. Web app dùng Next.js, NestJS, PostgreSQL; triển khai local-first để hỗ trợ giảng viên cài đặt lại.
2. FastAPI Adapter giữ hợp đồng `POST /v1/infer` v1.0; Ollama trên CPU là cấu hình cài đặt thử nghiệm; GPU là profile tùy chọn.
3. Không phụ thuộc tài khoản cloud cá nhân của nhóm. Đính kèm mã nguồn, migration/seed, prompt/schema, model manifest và hướng dẫn tái triển khai trong bộ nộp.
4. Không tuyên bố CPU đầy đủ hiệu năng: SP-02 (10 Topic) không hoàn tất hợp lệ trong 60s ở các lượt v3; giữ bằng chứng PASS và FAIL.
5. Giữ nguyên 60 giây/external attempt; sáu task AI; không automatic retry, truncate/sample/chunk, hay bypass capacity preflight; không thay frontend API/business rules/schema.
6. Giữ quyền hạn các quyết định hiện hành: R3/CR-002, CR-003/004, Errata 1/2, AI Contract v1.0, Schema Pack Release 1 và Phase 1D.3 Demo Acceptance Supplement (T4 FP16, demo-candidate smoke).

## Chưa được phê duyệt tự động

Quyết định **không đồng nghĩa** đã approve nội dung pháp quy chi tiết của CR-005/ADR, phát hành SRS v1.7/Architecture v1.2 hoặc đã hoàn thành yêu cầu giảng viên chạy **mọi** luồng AI hợp lệ trên laptop không GPU. Điều này còn vướng evidence hiệu năng/capacity profile và clean-install verification. Giữ tài liệu mới ở mức draft candidate cho đến khi hoàn tất thủ tục release.

## Hành động kế tiếp

- Đối chiếu số CR-005 với registry hiện hành trong repo; tạo acceptance và văn bản change-control chính thức.
- Review hai bản candidate đầy đủ; không sửa frozen v1.6/v1.1.
- Kiểm tra toàn bộ API/AI Contract/errata liên quan trước khi đánh dấu Approved.
- Tiến hành triển khai và thu evidence clean-install; release governance/hash sau khi kiểm chứng.
