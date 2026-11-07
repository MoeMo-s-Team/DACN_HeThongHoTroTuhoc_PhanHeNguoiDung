# DACN — Gói cập nhật tài liệu AI Runtime (DRAFT)

**Ngày soạn:** 07/11/2026  
**Trạng thái:** HƯỚNG KIẾN TRÚC ĐÃ ĐƯỢC ĐỒNG Ý (07/11/2026); tài liệu SRS/Architecture v1.7/v1.2 vẫn DRAFT CANDIDATE và chưa phát hành baseline mới  
**Chủ đề:** Khả năng cài đặt lại trên laptop CPU-only; Ollama/FastAPI; môi trường GPU là lựa chọn tăng tốc.

## 1. Tại sao gói này không ghi đè baseline?

Nguồn chuẩn đã phê duyệt mới nhất mà có thể xác minh bằng thư viện dự án:

- `SRS_v1.6_baseline_final.md` và `System_Architecture_and_Technology_Stack_v1.1_baseline.md` (R3/CR-002, 26/10/2026).
- `AI_Contract_v1.0_baseline_final.md` và các Erratum 1/2, CR-003, CR-004 được ghi tại `Document_Governance_and_Traceability_Index_v1.5.md` (30/10/2026).
- `Phase_1D3_Demo_Acceptance_Supplement.md` (Release 1, Approved 30/10/2026): thử nghiệm mức **demo model-candidate smoke** với Qwen2.5-1.5B-Instruct FP16 trên Google Colab T4, 6 AI task keys. **Không** chứng minh full application flow, capacity profile, production readiness.

Các file bản cũ được tải lên trong hội thoại (SRS v1.5, Architecture v1.0, Governance v1.1) đã không còn là bản hiện hành. Bản mới R3 có trong thư viện ở dạng tra cứu văn bản nhưng không được cung cấp dưới dạng tệp gốc có thể sửa trực tiếp. Vì thế gói này cung cấp **change set theo mục**, không tự nhận là bản SRS v1.7 hay Architecture v1.2 hoàn chỉnh.

## 2. Các tệp trong gói

| Tệp | Mục đích |
|---|---|
| `Change_Request_CR-005_AI_Runtime_Portability_v0.1_DRAFT.md` | Đề xuất thay đổi chính thức (mã CR-005 chỉ là mã đề xuất, cần đối chiếu registry trước phê duyệt). |
| `ADR_AI_001_Local_First_Runtime_Portability_v0.1_PROPOSED.md` | So sánh cách triển khai và kiến trúc đề xuất. |
| `SRS_v1.6_to_v1.7_Change_Set_DRAFT.md` | Nội dung sửa yêu cầu, nêu rõ câu chữ cũ/mới theo anchor. |
| `System_Architecture_v1.1_to_v1.2_Change_Set_DRAFT.md` | Thiết kế thành phần, cấu hình, deployment modes và các section cần sửa. |
| `AI_Contract_Runtime_Portability_Supplement_v0.1_DRAFT.md` | Bảo toàn transport, schema, log, timeout, capacity preflight, errata và Lite demo gate. |
| `Deployment_Reproduction_Guide_v0.1_DRAFT.md` | Hướng dẫn dự kiến để đóng gói và giảng viên dựng lại môi trường. |
| `CPU_StudyPlan_Exploratory_Evidence_2026-11-07.md` | Số liệu kiểm thử thật trên laptop; không suy diễn là đạt AI Contract. |
| `Traceability_Release_Checklist_CR-005_DRAFT.md` | Danh sách bước trước khi chấp nhận/phát hành và mức ảnh hưởng tài liệu. |
| `docs/superpowers/specs/2026-11-07-ai-runtime-portability-design.md` | Design proposal gắn với Change Request. |
| `docs/superpowers/plans/2026-11-07-ai-runtime-docs-update.md` | Các bước áp dụng lên repository sau khi duyệt. |

## 3. Quyết định định hướng đã được chủ dự án đồng ý — cần hoàn tất release gates

**D1.** Giữ nguyên mọi Use Case, nghiệp vụ, frontend API, AI Contract envelope, log và các giới hạn đã đóng băng.  
**D2.** Chuyển yêu cầu *bắt buộc chạy Colab* thành runtime self-managed triển khai độc lập môi trường, dùng FastAPI adapter giữ endpoint `/v1/infer`; Ollama CPU là cấu hình có thể cài đặt lại, GPU là cấu hình tăng tốc/tùy chọn.  
**D3.** Không tuyên bố CPU-only chạy được mọi trường hợp hợp lệ hoặc đạt 60 giây: bài thử SP-02 (10 Topic) đã fail 4/4 lượt v3.  
**D4.** Phân biệt rõ **cài được** (installation reproducibility) với **AI đáp ứng đầy đủ nghiệm thu** (inference conformance). Thiếu bằng chứng không được tự chuyển thành PASS.  
**D5.** Giữ nguyên quyền hạn của `Phase 1D.3 Demo Acceptance Supplement` cho model-candidate smoke trên Colab T4; benchmark Ollama CPU là exploratory riêng, không được dùng thay thế/nhận cùng release identity.  
**D6.** Release chỉ được thực hiện sau khi chủ dự án chốt cách xử lý xung đột: yêu cầu giảng viên tự chạy mọi chức năng AI trên laptop không GPU **vs.** giới hạn 60 giây/capacity profile mà CPU chưa đạt. Nếu chưa giải quyết, hồ sơ chỉ được giữ trạng thái Proposed/Draft.

## 3.1. Hồ sơ vừa thêm sau khi chủ dự án đồng ý

- `Owner_Decision_Record_AI_Runtime_2026-11-07.md`: ghi nhận phạm vi đồng ý thực tế.
- `SRS_v1.7_Runtime_Portability_DRAFT_CANDIDATE.md`: bản văn bản đầy đủ dựng từ bản R3 v1.6 đọc từ Project Library; **không phải raw-byte bản gốc**, kiểm tra bằng diff trước khi merge.
- `System_Architecture_and_Technology_Stack_v1.2_Runtime_Portability_DRAFT_CANDIDATE.md`: bản văn bản đầy đủ dựng từ R3 v1.1, kiểm tra bằng diff trước khi merge.
- `SRS_v1.6_to_v1.7_candidate.diff` và `System_Architecture_v1.1_to_v1.2_candidate.diff`: bản đối chiếu thay đổi.
- `CANDIDATE_QA_REPORT.json`: kiểm tra tự động các câu Colab normative, timeout, schema / no-truncation.

Các bản Candidate được dựng từ **nội dung text retrieval** từ thư viện và không được coi là bản sao byte-identical của nguồn frozen. Khi nhập vào repo cần đối chiếu với bản nguyên gốc trong repo trước khi release.

## 4. Thứ tự xử lý

1. Review và phê duyệt CR/ADR, chốt đặc tả chính xác về CPU-only và tiêu chí nghiệm thu.
2. Đưa các change set vào **bản sao** của R3 source trong repository, không chạm file frozen.
3. Cross-document audit, cập nhật Governance Index thành phiên bản mới, phát hành freeze/manifest nếu thực sự thay đổi scope nguồn chuẩn.
4. Triển khai và kiểm tra hướng dẫn cài đặt lại trên môi trường sạch; ghi evidence thực tế.
5. Chỉ sau các gate trên mới gắn `Approved` / `Baseline Final`.
