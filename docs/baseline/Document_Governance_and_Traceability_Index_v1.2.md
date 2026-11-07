# DOCUMENT GOVERNANCE & TRACEABILITY INDEX
## Hệ thống hỗ trợ tự học ứng dụng AI

**Phiên bản:** 1.2  
**Ngày:** 26/10/2026  
**Trạng thái:** Baseline Governance Index — R3  
**Phạm vi:** Requirements / Use Case / Downstream API, UI, Architecture & AI Contract sau CR-002

---

# 1. Mục đích

Tài liệu xác định authority, trạng thái phiên bản và quan hệ truy vết của baseline R3 sau CR-002. Baseline cũ R1/R2 vẫn được giữ để truy vết và không bị ghi đè.

# 2. Baseline hiện hành

| Tài liệu | Phiên bản / trạng thái | Vai trò |
|---|---|---|
| Software Requirements Specification | **v1.6 Baseline Final** | Nguồn chuẩn cao nhất về requirement |
| Business Rules Specification | **v1.4 Baseline Rev.1** | Rule/validation/state/AI governance |
| Use Case Diagram | **v1.4 Baseline Rev.1** | Actor/system boundary/27 Use Case |
| Use Case Specification | **v1.2 Baseline Rev.1** | Main/alternate/exception flow |
| Activity Diagram — 3 AI Main Flows | **v1.3 Baseline Final** | Downstream AI orchestration |
| UI Sitemap | **v1.1 Frozen Baseline** | 22 screens/routes; không đổi bởi CR-002 |
| Wireframe / Screen Specification | **v1.1 Baseline Final** | UI state/message cho public error mới |
| API Specification | **v1.5 Baseline Final** | Frontend ↔ NestJS public API contract |
| System Architecture & Technology Stack | **v1.1 Baseline** | Technical architecture/capacity profile boundary |
| Database Design | **v1.0 Baseline Final** | Database authority; không đổi bởi CR-002 |
| Auth ADR | **ADR-AUTH-001 v1.0 Accepted** | Authentication architecture |
| AI Runtime Contract | **v1.0 Baseline Final** | NestJS ↔ AI Runtime contract |
| Change Request | **CR-002 v1.0 Approved** | Authority cho XAI-001/XAI-002 |
| Freeze Record | **v1.2 / R3** | Freeze manifest cho requirements/use-case baseline |
| Cross-Document Audit | **CR-002 v1.0 PASS** | Consistency evidence |

# 3. Authority order

```text
SRS v1.6
  ↓
Business Rules v1.4 + Use Case Diagram v1.4
  ↓
Use Case Specification v1.2
  ↓
Activity / API / UI / Architecture
  ↓
AI Contract / Database / Test / Implementation
```

CR-002 là authority cho đúng hai cross-cutting decision `XAI-001` và `XAI-002`; không được dùng CR-002 để mở rộng scope khác.

# 4. R3 change scope

- `422 AI_INPUT_TOO_LARGE` cho valid authoritative input vượt validated model capacity;
- `502 AI_RUNTIME_FAILURE` cho runtime/provider/integration technical failure;
- capacity-profile version/binding/preflight;
- no-truncation/no-hidden-chunking;
- pre-dispatch vs post-dispatch `AIRequestLog` semantics;
- Teacher one external attempt được downstream AI Contract khóa;
- Admin vẫn two-stage.

# 5. Freeze / change-control policy

Không sửa trực tiếp artifact frozen. Mọi revision sau R3 phải phát hành version/revision mới. Nếu thay observable business behavior/public API/Use Case/role/state transition/AIRequestLog semantics thì phải đánh giá Change Request. Technical refactor giữ nguyên contract có thể đi qua architecture/implementation review.

# 6. Handoff cho Codex

Agent phải đọc Task → R3 baseline liên quan → API/UI/Architecture → AI Contract → existing code/tests. Nếu source còn lẫn R2/R3, agent phải ưu tiên R3 theo index này và báo conflict thay vì tự hòa giải bằng code.
