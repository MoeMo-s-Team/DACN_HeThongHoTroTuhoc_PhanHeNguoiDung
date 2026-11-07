# REQUIREMENTS / USE CASE BASELINE FREEZE RECORD
## Hệ thống hỗ trợ tự học ứng dụng AI

**Phiên bản:** 1.1  
**Ngày freeze:** 21/10/2026  
**Freeze ID:** `DACN-REQ-UC-BL-2026-10-21-R2`  
**Change Request:** `CR-001`  
**Trạng thái:** FROZEN  

---

# 1. Quyết định freeze

CR-001 đã được áp dụng đầy đủ và cross-document audit đạt PASS. Bộ baseline mới gồm 27 Use Case được đóng băng tại các phiên bản trong record này.

Baseline v1.0/R1 trước đó vẫn được giữ nguyên để truy vết; không file frozen cũ nào bị ghi đè.

# 2. Thay đổi so với freeze trước

- thêm `FR-TEA-008 / UC-TEA-008`;
- thêm `FR-ADM-007 / UC-ADM-007`;
- tổng Use Case: 25 → 27;
- thêm `OD-45/46`, `BR-045/046`;
- UI Sitemap history screens trở thành baseline chính thức;
- 3 AI main flows không thay đổi logic.

# 3. Authority sau freeze

1. SRS v1.5 Baseline — requirement authority.
2. Business Rules v1.3 Baseline Rev.1 — rule/data-integrity authority.
3. Use Case Diagram v1.4 Baseline Rev.1 — actor/system boundary/27 UC authority.
4. Use Case Specification v1.1 Baseline Rev.1 — detailed flow authority.
5. Governance Index v1.1 — authority/traceability index.

# 4. Integrity manifest

- `cbf62f59283bbfbe0b1deda2e875cb57a32523ebdda2289581536687c6fd8307`  `Change_Request_CR-001_AI_Analysis_History_v1.0_approved.md`
- `ebfb98de1e44e6b43ff16a7a0db6f8c0dc45709ef693908aa6ffd9906a4d5810`  `SRS_v1.5_baseline_final.md`
- `082dc3b76a6cb70d863b681f9277d1432b555036ffaa089d491f325919676da0`  `Business_Rules_v1.3_baseline_rev1.md`
- `cac878ef85181140fa4eb3b7709d3929e0c35199b031ecc1f62ec0b13d4eb2db`  `Use_Case_Diagram_he_thong_ho_tro_tu_hoc_AI_v1.4_baseline_rev1.md`
- `47f7e0d9ba414c867455fa92ae1bc834987490960b95bb228d04d628b7d269d0`  `Use_Case_Specification_v1.1_baseline_rev1.md`
- `ec218863d5f3021e91af7a1defebab03b50cdfb702a0418419dd48adf19e3582`  `Activity_Diagram_3_AI_Main_Flows_v1.2_baseline_final.md`
- `7774775bff0f56e028ca5f5c3358952a8d5492526e0d253efe77e5aa2155fdba`  `UI_Sitemap_v1.1_baseline.md`
- `2c1d8a2096b3de4ea1e1fd39af3acdbff9f74c3fc3b12e8823fd7266318b0a4b`  `Document_Governance_and_Traceability_Index_v1.1.md`
- `7b3d16878aea2399cfeb2a5a0600716aa25bc9248b7a0515c3471d6678a4c1aa`  `Cross_Document_Audit_CR-001_v1.0.md`

# 5. Điều kiện sử dụng downstream

Mọi Sequence Diagram, API Specification, AI Contract, Database Design, Test Case và Wireframe/Screen Specification tạo sau freeze phải dùng đúng IDs của baseline R2. Nếu một artifact cần thay đổi observable behavior, phải mở Change Request mới.

# 6. Kết luận

Baseline R2 được xem là FROZEN kể từ Freeze ID `DACN-REQ-UC-BL-2026-10-21-R2`.
