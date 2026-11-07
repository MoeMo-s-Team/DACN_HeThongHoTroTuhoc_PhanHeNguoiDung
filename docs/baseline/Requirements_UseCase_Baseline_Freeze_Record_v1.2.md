# REQUIREMENTS / USE CASE BASELINE FREEZE RECORD
## Hệ thống hỗ trợ tự học ứng dụng AI

**Phiên bản:** 1.2  
**Ngày freeze:** 26/10/2026  
**Freeze ID:** `DACN-REQ-UC-BL-2026-10-26-R3`  
**Change Request:** `CR-002 v1.0 Approved`  
**Trạng thái:** FROZEN

---

# 1. Quyết định freeze

CR-002 đã được áp dụng và cross-document audit đạt PASS. Baseline R3 thay thế R2 làm nguồn hiện hành cho downstream implementation nhưng không xóa/ghi đè R1/R2.

# 2. Artifact requirements/use-case thuộc R3

1. `SRS_v1.6_baseline_final.md` — requirement authority.
2. `Business_Rules_v1.4_baseline_rev1.md` — rule/AI governance authority.
3. `Use_Case_Diagram_he_thong_ho_tro_tu_hoc_AI_v1.4_baseline_rev1.md` — actor/system boundary/27 UC; **không đổi**.
4. `Use_Case_Specification_v1.2_baseline_rev1.md` — detailed flow authority.
5. `Activity_Diagram_3_AI_Main_Flows_v1.3_baseline_final.md` — downstream AI-flow synchronization.
6. `UI_Sitemap_v1.1_baseline.md` — screen/route authority; **không đổi**.

# 3. Downstream synchronized artifacts

- `API_Specification_v1.5_baseline_final.md`;
- `Wireframe_Screen_Specification_v1.1_baseline_final.md`;
- `System_Architecture_and_Technology_Stack_v1.1_baseline.md`;
- `AI_Contract_v1.0_baseline_final.md`;
- `Database_Design_v1.0_baseline_final.md` (không đổi schema);
- `ADR_AUTH_001_Authentication_Architecture_Decision_v1.0_accepted.md` (không đổi).

# 4. CR-002 frozen decisions

- XAI-001: `422 AI_INPUT_TOO_LARGE`, no truncation/chunking, no pre-dispatch AIRequestLog.
- XAI-002: `502 AI_RUNTIME_FAILURE`, phân biệt pre-dispatch configuration failure với post-dispatch technical failure/logging.
- Capacity profile bind/version với model/tokenizer/contract/prompt/task budget.
- Không thêm Use Case, role, database entity hoặc async orchestration.

# 5. Downstream rule

Mọi AI Contract/Test/Implementation tạo sau freeze phải dùng IDs và behavior của R3. Nếu artifact downstream cần thay đổi observable behavior, public API hoặc AIRequestLog semantics thì phải mở Change Request mới.

# 6. Freeze result

Baseline R3 được xem là FROZEN kể từ Freeze ID `DACN-REQ-UC-BL-2026-10-26-R3`.
