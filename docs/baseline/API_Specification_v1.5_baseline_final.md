# API SPECIFICATION
## Hệ thống hỗ trợ tự học ứng dụng AI

**Phiên bản:** 1.5 Baseline Final  
**Ngày:** 26/10/2026  
**Trạng thái:** Frozen Baseline — Downstream API Design Artifact  
**Phạm vi:** Web Application MVP — Student, Teacher, Administrator  
**Phát hành:** Chính thức — CR-002 v1.0 Approved + Cross-Document Audit PASS (26/10/2026)  
**Kiến trúc liên quan:** Next.js Frontend → NestJS REST API → PostgreSQL / AI Service  
**Baseline nguồn:** `DACN-REQ-UC-BL-2026-10-26-R3`

---

# 1. Mục đích tài liệu

Tài liệu này chuyển Requirements / Use Case Baseline hiện hành thành hợp đồng API giữa Next.js Frontend và NestJS Backend cho MVP **Hệ thống hỗ trợ tự học ứng dụng AI**.

Mục tiêu:

- xác định endpoint REST cần triển khai;
- xác định request/response contract ở mức đủ để phát triển frontend/backend;
- xác định authentication, authorization và HTTP status;
- chuẩn hóa error response;
- khóa các contract quan trọng cho AI preview, deferred Save và history;
- truy vết endpoint về `UC-*`, `FR-*`, `BR-*`, `OD-*`;
- không tạo thêm observable business behavior ngoài baseline R3.

Tài liệu này **không phải AI Contract**. Các schema nội bộ giữa NestJS và AI Runtime có thể chi tiết hơn, nhưng response trả cho Frontend phải giữ contract được định nghĩa ở đây.

---

# 2. Nguồn authority

| Mức | Tài liệu | Vai trò |
|---|---|---|
| 1 | `SRS_v1.6_baseline_final.md` | Nguồn chuẩn cao nhất về requirement, data, AI behavior, error và interface |
| 2A | `Business_Rules_v1.4_baseline_rev1.md` | Validation, calculation, authorization, state, AI governance, data integrity |
| 2B | `Use_Case_Diagram_he_thong_ho_tro_tu_hoc_AI_v1.4_baseline_rev1.md` | Actor, system boundary, 27 Use Case, include/extend |
| 3 | `Use_Case_Specification_v1.2_baseline_rev1.md` | Main/alternate/exception flow, I/O, acceptance behavior |
| 4 | `Activity_Diagram_3_AI_Main_Flows_v1.3_baseline_final.md` | Thứ tự xử lý của 3 AI main flows |
| UI | `UI_Sitemap_v1.1_baseline.md` | Screen/route context dùng để xác định nhu cầu API của frontend |
| Change Control | `Change_Request_CR-002_AI_Input_Capacity_and_Runtime_Failure_Semantics_v1.0_approved.md` | Authority cho XAI-001/XAI-002 và public error semantics của R3 |
| Governance | `Document_Governance_and_Traceability_Index_v1.2.md` + `Requirements_UseCase_Baseline_Freeze_Record_v1.2.md` | Authority, freeze và change control |

Nếu API design làm thay đổi observable business behavior đã baseline hóa, phải mở Change Request mới. Các quyết định trong tài liệu này chỉ được phép cụ thể hóa transport, DTO, URL, HTTP status, context reference và những chi tiết kỹ thuật đã được upstream giao cho API/System Design.

---

# 3. Nguyên tắc API

## 3.1. Giao thức

- HTTP/HTTPS.
- REST API.
- Payload JSON, `Content-Type: application/json`.
- Base path: `/api/v1`.
- Frontend không truy cập PostgreSQL hoặc AI Runtime trực tiếp.
- Mọi AI request nghiệp vụ đi qua NestJS.

## 3.2. Authentication

### API-DD-001 — Bearer access token

MVP dùng access token theo header:

```http
Authorization: Bearer <accessToken>
```

`POST /auth/login` trả access token. `POST /auth/logout` kết thúc phiên phía client; MVP không bắt buộc token blacklist hoặc multi-session management.

Dù token còn hợp lệ về mặt chữ ký, **mọi protected endpoint vẫn phải kiểm tra `User.status = ACTIVE`** và quyền tài nguyên tại backend.

## 3.3. Authorization

Backend phải kiểm tra theo thứ tự:

1. token hợp lệ;
2. User tồn tại;
3. `User.status = ACTIVE`;
4. role có quyền gọi endpoint;
5. ownership/resource relation nếu endpoint có tài nguyên cụ thể.

Các nguyên tắc bắt buộc:

- Student không truyền `studentId` để truy cập dữ liệu cá nhân; backend lấy Student từ token.
- Teacher chỉ truy cập Class được phân công.
- Teacher chỉ truy cập Student thuộc Class được phân công.
- Administrator mới gọi được `/admin/*`.
- Ẩn menu/route trên frontend không thay thế authorization backend.

## 3.4. ID và timestamp

- Mọi ID trong API là **opaque string**. Client không được phụ thuộc vào việc ID là UUID, số tăng dần hay định dạng database cụ thể.
- Timestamp truyền qua API ở ISO 8601 UTC, ví dụ `2026-10-21T04:30:00.000Z`.
- Frontend chịu trách nhiệm chuyển timestamp sang local time để hiển thị.

## 3.5. Success response

API không bắt buộc bọc mọi response trong một envelope chung. Resource đơn trả object trực tiếp. Danh sách có thể dùng:

```json
{
  "items": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Pagination chỉ áp dụng cho các collection có thể tăng đáng kể: Admin users, Admin feedback, Teacher report history và Admin analysis history.

Query mặc định:

- `page=1`;
- `limit=20`;
- `1 <= limit <= 100`.

## 3.6. Error response chuẩn

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu đầu vào không hợp lệ.",
  "details": [
    {
      "field": "targetDeadline",
      "reason": "must_be_in_future"
    }
  ]
}
```

`details` có thể là `null` hoặc mảng/object nếu an toàn và cần thiết. Không trả stack trace, secret, password hash hoặc dữ liệu nội bộ nhạy cảm.

## 3.7. Backend-owned temporary contexts

Các luồng cần giữ kết quả tạm trước khi user xác nhận sử dụng server-owned opaque reference:

| Context | Reference field | Mục đích |
|---|---|---|
| StudyPlan preview | `planPreviewRef` | Giữ AI preview gốc và các field không được Student chỉnh |
| StudyPlan adjustment preview | `adjustmentRef` | Giữ đề xuất đã validate trước khi Student Accept |
| Teacher class analysis | `analysisRef` | Giữ `inputSnapshot + analysisResult` đúng lần phân tích để Save |
| Admin feedback analysis | `analysisRef` | Giữ `inputSnapshot + analysisResult` đúng two-stage flow để Save |

### API-DD-002 — Temporary Context Lifetime, Consumption and Replay

Quy tắc contract:

- reference là opaque string;
- reference gắn với user/role/resource tương ứng;
- client không thể đổi reference để dùng context của user/resource khác;
- TTL mặc định khi context còn `OPEN` là **60 phút**;
- response tạo context trả `expiresAt`;
- context hết hạn hoặc không tồn tại trả `409 CONTEXT_INVALID_OR_EXPIRED`;
- context là dữ liệu kỹ thuật tạm, không phải entity nghiệp vụ mới;
- concrete storage mechanism thuộc System Design, nhưng phải giữ đúng semantics trên.

Các context dùng cho thao tác gây mutation (`planPreviewRef`, `adjustmentRef`, `analysisRef`) có vòng đời logic:

```text
OPEN
  ├── validation/transaction thất bại → vẫn OPEN nếu context chưa hết hạn
  └── mutation thành công → CONSUMED + lưu replay result/resource identity

CONSUMED
  └── retry cùng reference, cùng user/resource → không mutation lần nữa;
      trả lại đúng logical result của lần thành công trước
```

Yêu cầu idempotency:

- context chỉ chuyển sang `CONSUMED` **sau khi** mutation nghiệp vụ thành công;
- việc ghi business mutation và ghi trạng thái/result dùng cho replay phải bảo đảm không tạo cửa sổ khiến mutation đã commit nhưng context vẫn có thể được Apply/Save lần hai;
- retry do double-click, browser retry hoặc mất response mạng không được tạo StudyPlan/report/analysis thứ hai và không được update adjustment lần hai;
- replay response có `replayed: true`; lần thành công đầu tiên có `replayed: false`;
- backend phải giữ mapping replay tối thiểu đến `expiresAt` và ít nhất **10 phút sau `consumedAt`**, lấy mốc muộn hơn;
- Reject preview/adjustment không gọi mutation API nên context không cần chuyển `CONSUMED`; nó tự hết TTL.

### Request identity và concurrent access

Với mutation có editable payload (**hiện tại là StudyPlan Apply**), backend phải tạo `requestFingerprint` từ **normalized mutation payload** của lần mutation thành công đầu tiên. Với mutation chỉ nhận opaque reference và không có field chỉnh sửa bổ sung, replay identity được xác định bởi reference + user/resource binding của context.

- với mutation có editable payload: cùng reference + cùng normalized payload → được xem là retry hợp lệ và replay logical result cũ;
- với mutation có editable payload: cùng reference + payload khác sau khi context đã `CONSUMED` → trả `409 CONTEXT_ALREADY_CONSUMED`, không mutation và không coi payload mới là retry hợp lệ;
- với mutation chỉ nhận opaque reference: retry cùng reference đã thành công → replay logical result cũ, không mutation lần hai;
- backend phải serialize/atomically claim một context `OPEN` để tại cùng thời điểm chỉ **một request** được phép thực hiện mutation với reference đó;
- hai request concurrent không được cùng quan sát `OPEN` rồi cùng commit mutation;
- nếu request đầu thành công, request concurrent còn lại phải replay logical result đã commit khi fingerprint tương đương hoặc trả `409 CONTEXT_ALREADY_CONSUMED` khi fingerprint khác;
- nếu request đầu rollback, context vẫn `OPEN` nếu chưa hết hạn và request hợp lệ tiếp theo có thể tiếp tục;
- concrete locking/atomic-claim mechanism thuộc System Design, nhưng implementation phải giữ đúng semantics trên.

## 3.8. AI orchestration

- Input validation / minimum-data / business eligibility phải chạy **trước** external AI call.
- Sau các check trên, capacity preflight theo CR-002 phải chạy trước network dispatch; không được truncate/sample/chunk authoritative input để né capacity.
- Request bị chặn trước external AI call không tạo `AIRequestLog`.
- Mỗi external AI attempt thực tế phải có `AIRequestLog`.
- AI output phải được backend validate trước khi trả như kết quả thành công.
- AI không tự tính score/count/ratio/metric mà backend có thể tính chính xác.
- AI failure không làm thay đổi dữ liệu nghiệp vụ cũ.
- Timeout tối đa cho một external AI request: `60 giây`.

Teacher Class Analysis được expose thành **một frontend API request**. Theo AI Contract v1.0, `UC-TEA-005 + UC-TEA-006` dùng **một external AI attempt** trả cả analysis và recommendations.

Admin Feedback Analysis được expose thành **một frontend API request**, nhưng backend bắt buộc orchestration:

```text
Dataset
  -> External AI Stage 1
  -> Backend validate + deduplicate + calculate count
  -> External AI Stage 2
  -> Backend validate
  -> analysisRef
```

### API-DD-003 — Synchronous AI Orchestration Timeout

Timeout `60 giây` là timeout cho **mỗi external AI attempt**, không phải timeout tổng của HTTP request Frontend → NestJS.

- HTTP client/proxy/controller timeout không được kết thúc request sớm hơn orchestration hợp lệ của backend.
- Với Admin two-stage flow, cấu hình end-to-end timeout **khuyến nghị tối thiểu 130 giây** (`2 × 60 giây` + overhead validate/orchestration).
- Với Teacher analysis, AI Contract v1.0 khóa đúng một external attempt; end-to-end timeout phải lớn hơn 60 giây cộng orchestration/validation overhead phù hợp.
- MVP giữ synchronous request/response; không tự chuyển sang async job/polling chỉ để xử lý timeout nếu chưa có Change Request hoặc System Design decision riêng.

---

# 4. Kiểu dữ liệu dùng chung

## 4.1. Enum

### Role

```text
STUDENT
TEACHER
ADMINISTRATOR
```

### UserStatus

```text
ACTIVE
DISABLED
```

### StudyPlanStatus

```text
ACTIVE
COMPLETED
ARCHIVED
```

### StudyTaskStatus

```text
TODO
COMPLETED
```

### Priority

```text
LOW
MEDIUM
HIGH
```

### FeedbackTag

```text
AI_PERFORMANCE
STUDY_PLAN
UI_UX
LEARNING_ANALYTICS
OTHER
```

### ScoreClassification

API dùng enum kỹ thuật sau; UI map sang nhãn tiếng Việt:

```text
GOOD                // score >= 80
NEEDS_REINFORCEMENT // 60 <= score < 80
PRIORITY            // score < 60
```

## 4.2. UserSummary

```json
{
  "id": "user_opaque_id",
  "fullName": "Nguyen Van A",
  "email": "student@example.com",
  "role": "STUDENT",
  "status": "ACTIVE"
}
```

Không endpoint nào được trả `passwordHash`.

## 4.3. TopicSummary

```json
{
  "id": "topic_opaque_id",
  "name": "Cấu trúc dữ liệu"
}
```

## 4.4. AssessmentResultView

```json
{
  "topic": {
    "id": "topic_opaque_id",
    "name": "Cấu trúc dữ liệu"
  },
  "score": 72.5,
  "classification": "NEEDS_REINFORCEMENT",
  "evaluatedAt": "2026-10-20T03:00:00.000Z"
}
```

## 4.5. StudyTaskView

```json
{
  "id": "task_opaque_id",
  "topic": {
    "id": "topic_opaque_id",
    "name": "Cấu trúc dữ liệu"
  },
  "title": "Ôn cây nhị phân",
  "goal": "Nắm được traversal và BST",
  "expectedMinutes": 60,
  "dueDate": "2026-10-25T16:59:59.000Z",
  "priority": "HIGH",
  "status": "TODO",
  "completedAt": null
}
```

## 4.6. ProgressView

```json
{
  "completedTasks": 2,
  "totalTasks": 5,
  "completionPercentage": 40.0,
  "actualProgress": 40.0,
  "expectedProgress": 60.0,
  "overdueTasks": 1,
  "slowProgress": false
}
```

Threshold phải được backend đánh giá trên giá trị gốc trước rounding.

Trong MVP, `completionPercentage` là **alias trình bày của `actualProgress`** trên current StudyPlan; hai field phải có cùng giá trị. Giữ cả hai field để UI đọc dễ hơn, không được triển khai thành hai công thức khác nhau.

## 4.7. TagStatistics

```json
{
  "AI_PERFORMANCE": 4,
  "STUDY_PLAN": 6,
  "UI_UX": 3,
  "LEARNING_ANALYTICS": 2,
  "OTHER": 1
}
```

Backend là nguồn tính count.

## 4.8. TeacherAnalysisInputSnapshot

Snapshot Teacher history lưu đúng dữ liệu backend đã tổng hợp tại **analysis-time**, không recompute khi đọc history:

```json
{
  "classId": "class_1",
  "studentCount": 30,
  "classAverageScore": 68.4,
  "topicAverageScores": [
    {
      "topic": { "id": "topic_1", "name": "Cấu trúc dữ liệu" },
      "averageScore": 58.7,
      "weakTopic": true
    }
  ],
  "classCompletionRate": 54.2,
  "overdueTaskCount": 18,
  "needsAttentionStudents": [
    {
      "studentId": "student_1",
      "fullName": "Nguyen Van A",
      "reasons": ["AVERAGE_SCORE_BELOW_60", "OVERDUE_TASKS_AT_LEAST_2"]
    }
  ],
  "progressWarnings": [
    {
      "studentId": "student_2",
      "fullName": "Tran Thi B",
      "actualProgress": 40.0,
      "expectedProgress": 70.0
    }
  ]
}
```

Các metric average/rate có thể `null` khi baseline quy định không đủ dữ liệu; count có rule riêng vẫn dùng giá trị số phù hợp.

## 4.9. TeacherAnalysisResult

```json
{
  "summary": "Lớp đang gặp khó khăn ở một số chủ đề nền tảng.",
  "weakTopics": [
    {
      "topicId": "topic_1",
      "topicName": "Cấu trúc dữ liệu",
      "reason": "Backend metric xác định averageScore < 60"
    }
  ],
  "progressIssues": [],
  "attentionGroups": [],
  "recommendations": [
    {
      "title": "Ôn lại chủ đề nền tảng",
      "description": "Tổ chức buổi củng cố và bài thực hành ngắn"
    }
  ]
}
```

## 4.10. FeedbackAnalysisFilter

```json
{
  "fromDate": "2026-10-01T00:00:00.000Z",
  "toDate": "2026-10-21T23:59:59.999Z",
  "rating": null,
  "tag": null
}
```

Tất cả field đều **optional và nullable**; backend normalize field có giá trị `null` như field bị omit. `{}` nghĩa là toàn bộ Feedback hiện có. Nếu cả `fromDate` và `toDate` có giá trị sau normalize thì phải thỏa `fromDate <= toDate`.

## 4.11. FeedbackAnalysisInputSnapshot

```json
{
  "filter": {
    "fromDate": "2026-10-01T00:00:00.000Z",
    "toDate": "2026-10-21T23:59:59.999Z",
    "rating": null,
    "tag": null
  },
  "feedbackIds": ["feedback_1", "feedback_2"],
  "totalFeedback": 2,
  "tagStatistics": {
    "AI_PERFORMANCE": 0,
    "STUDY_PLAN": 1,
    "UI_UX": 1,
    "LEARNING_ANALYTICS": 0,
    "OTHER": 0
  }
}
```

`feedbackIds`, `totalFeedback` và `tagStatistics` là authoritative values do backend tạo từ cùng filtered dataset.

## 4.12. FeedbackAnalysisResult

```json
{
  "issueGroups": [
    {
      "title": "Khó tìm chức năng",
      "summary": "Một số feedback phản ánh khó tìm các thao tác chính.",
      "feedbackIds": ["feedback_1"],
      "count": 1
    }
  ],
  "summary": "Các vấn đề nổi bật tập trung ở Study Plan và UI/UX.",
  "priorityAreas": ["Luồng tạo và điều chỉnh kế hoạch", "Khả năng tìm thấy CTA chính"],
  "recommendations": [
    {
      "title": "Làm rõ CTA chính",
      "description": "Tăng độ nổi bật cho thao tác tạo và điều chỉnh kế hoạch."
    }
  ]
}
```

`priorityAreas` là `string[]` do AI tạo và backend validate về kiểu/cấu trúc; **không phải enum cố định của API**. Nếu sau này muốn khóa taxonomy/enum riêng thì phải cập nhật AI Contract/API Specification tương ứng.

---

# 5. Danh mục endpoint

| API ID | Method | Path | Role | Use Case chính |
|---|---|---|---|---|
| API-COM-AUTH-001 | POST | `/api/v1/auth/login` | Public | UC-COM-001 |
| API-COM-AUTH-002 | POST | `/api/v1/auth/logout` | Authenticated | UC-COM-002 |
| API-COM-PROFILE-001 | GET | `/api/v1/me` | All | UC-COM-004 |
| API-STU-DASH-001 | GET | `/api/v1/student/dashboard` | Student | UC-STU-001 |
| API-STU-RESULT-001 | GET | `/api/v1/student/assessment-results` | Student | UC-STU-002 |
| API-STU-CONTEXT-001 | POST | `/api/v1/student/study-context/validate` | Student | UC-STU-003 |
| API-STU-ANALYSIS-001 | POST | `/api/v1/student/ai/learning-analysis` | Student | UC-STU-004 |
| API-STU-PLAN-001 | POST | `/api/v1/student/study-plans/generate` | Student | UC-STU-005 |
| API-STU-PLAN-002 | POST | `/api/v1/student/study-plans/apply` | Student | UC-STU-006 |
| API-STU-PLAN-003 | GET | `/api/v1/student/study-plans/current` | Student | UC-STU-005/006 |
| API-STU-TASK-001 | GET | `/api/v1/student/study-tasks` | Student | UC-STU-007 |
| API-STU-TASK-002 | PATCH | `/api/v1/student/study-tasks/{taskId}/status` | Student | UC-STU-007 |
| API-STU-PROGRESS-001 | GET | `/api/v1/student/progress` | Student | UC-STU-008 |
| API-STU-ADJUST-001 | POST | `/api/v1/student/study-plan-adjustments/generate` | Student | UC-STU-009 |
| API-STU-ADJUST-002 | POST | `/api/v1/student/study-plan-adjustments/apply` | Student | UC-STU-009 |
| API-TEA-CLASS-001 | GET | `/api/v1/teacher/classes` | Teacher | UC-TEA-001 |
| API-TEA-STUDENT-001 | GET | `/api/v1/teacher/classes/{classId}/students` | Teacher | UC-TEA-002 |
| API-TEA-STUDENT-002 | GET | `/api/v1/teacher/classes/{classId}/students/{studentId}` | Teacher | UC-TEA-002 |
| API-TEA-DASH-001 | GET | `/api/v1/teacher/classes/{classId}/dashboard` | Teacher | UC-TEA-003 |
| API-TEA-ANALYSIS-001 | POST | `/api/v1/teacher/classes/{classId}/analysis` | Teacher | UC-TEA-005 + UC-TEA-006 |
| API-TEA-REPORT-001 | POST | `/api/v1/teacher/classes/{classId}/analysis-reports` | Teacher | UC-TEA-007 |
| API-TEA-HISTORY-001 | GET | `/api/v1/teacher/classes/{classId}/analysis-reports` | Teacher | UC-TEA-008 |
| API-TEA-HISTORY-002 | GET | `/api/v1/teacher/classes/{classId}/analysis-reports/{reportId}` | Teacher | UC-TEA-008 |
| API-ADM-DASH-001 | GET | `/api/v1/admin/dashboard` | Administrator | UC-ADM-001 |
| API-ADM-USER-001 | GET | `/api/v1/admin/users` | Administrator | UC-ADM-002 |
| API-ADM-USER-002 | PATCH | `/api/v1/admin/users/{userId}/status` | Administrator | UC-ADM-002 |
| API-ADM-FEEDBACK-001 | GET | `/api/v1/admin/feedback` | Administrator | UC-ADM-003 |
| API-ADM-ANALYSIS-001 | POST | `/api/v1/admin/feedback/analysis` | Administrator | UC-ADM-004 + UC-ADM-005 |
| API-ADM-ANALYSIS-002 | POST | `/api/v1/admin/feedback/analyses` | Administrator | UC-ADM-006 |
| API-ADM-HISTORY-001 | GET | `/api/v1/admin/feedback/analyses` | Administrator | UC-ADM-007 |
| API-ADM-HISTORY-002 | GET | `/api/v1/admin/feedback/analyses/{analysisId}` | Administrator | UC-ADM-007 |
| API-FB-001 | POST | `/api/v1/feedback` | Student, Teacher | UC-FB-001 |

`FR-COM-003`, `FR-COM-005`, `FR-COM-006` và `FR-TEA-004` không có endpoint riêng vì là authorization/error/logging/internal rule dùng bên trong endpoint liên quan.

---

# 6. Common APIs

## 6.1. API-COM-AUTH-001 — Đăng nhập

**POST** `/api/v1/auth/login`  
**Auth:** Public

### Request

```json
{
  "email": "student@example.com",
  "password": "user-password"
}
```

### Validation

- `email` trim + lowercase trước lookup;
- không tiết lộ email có tồn tại hay không khi credential sai;
- user phải `ACTIVE`.

### Success — 200

```json
{
  "accessToken": "opaque-access-token",
  "user": {
    "id": "user_opaque_id",
    "fullName": "Nguyen Van A",
    "email": "student@example.com",
    "role": "STUDENT",
    "status": "ACTIVE"
  }
}
```

### Errors

- `401 INVALID_CREDENTIALS`;
- `403 ACCOUNT_DISABLED`;
- `500 DATABASE_FAILURE`.

### Traceability

`UC-COM-001`, `FR-COM-001`, `BR-039`, `ERR-001`, `ERR-002`, `DATA-REQ-012`.

---

## 6.2. API-COM-AUTH-002 — Đăng xuất

**POST** `/api/v1/auth/logout`  
**Auth:** Any authenticated user

### Request body

Không bắt buộc.

### Success — 204

Không response body.

### Semantics

- endpoint này là convenience API để frontend giữ flow logout thống nhất; **không đồng nghĩa token bị revoke ở server** trong MVP;
- frontend xóa access token/state hiện tại;
- backend không bắt buộc blacklist token trong MVP;
- token cũ của user bị `DISABLED` vẫn phải bị từ chối khi gọi protected API.

### Traceability

`UC-COM-002`, `FR-COM-002`, `BR-032`, `ERR-002`.

---

## 6.3. API-COM-PROFILE-001 — Xem hồ sơ hiện tại

**GET** `/api/v1/me`  
**Auth:** Any authenticated ACTIVE user

### Success — 200

```json
{
  "id": "user_opaque_id",
  "fullName": "Nguyen Van A",
  "email": "student@example.com",
  "role": "STUDENT",
  "status": "ACTIVE"
}
```

### Traceability

`UC-COM-004`, `FR-COM-003`, `FR-COM-004`, `BR-012`, `BR-023`, `BR-032`.

---

# 7. Student APIs

## 7.1. API-STU-DASH-001 — Dashboard học tập

**GET** `/api/v1/student/dashboard`

### Success — 200

```json
{
  "assessmentResults": [
    {
      "topic": { "id": "topic_1", "name": "Cấu trúc dữ liệu" },
      "score": 72.5,
      "classification": "NEEDS_REINFORCEMENT",
      "evaluatedAt": "2026-10-20T03:00:00.000Z"
    }
  ],
  "currentPlan": {
    "id": "plan_1",
    "title": "Kế hoạch 4 tuần",
    "goal": "Củng cố kiến thức",
    "status": "ACTIVE",
    "startDate": "2026-10-20T04:00:00.000Z",
    "endDate": "2026-11-20T04:00:00.000Z"
  },
  "progress": {
    "completedTasks": 2,
    "totalTasks": 5,
    "completionPercentage": 40.0,
    "actualProgress": 40.0,
    "expectedProgress": 60.0,
    "overdueTasks": 1,
    "slowProgress": false
  },
  "nearDueTasks": [],
  "overdueTaskItems": []
}
```

Nếu Student chưa có current plan:

- `currentPlan = null`;
- `progress = null`;
- vẫn trả assessment results nếu có.

### Traceability

`UC-STU-001`, `FR-STU-001`, `BR-001`, `BR-009`, `BR-017`, `BR-025`, `BR-027`, `BR-034`, `BR-036`.

---

## 7.2. API-STU-RESULT-001 — Kết quả học tập theo Topic

**GET** `/api/v1/student/assessment-results`

### Success — 200

```json
{
  "items": [
    {
      "topic": { "id": "topic_1", "name": "Cấu trúc dữ liệu" },
      "score": 72.5,
      "classification": "NEEDS_REINFORCEMENT",
      "evaluatedAt": "2026-10-20T03:00:00.000Z"
    }
  ]
}
```

Mỗi Topic trả tối đa một AssessmentResult hiện tại: bản ghi có `evaluatedAt` mới nhất.

### Traceability

`UC-STU-002`, `FR-STU-002`, `BR-001`, `BR-016`, `BR-034`, `DATA-REQ-008`, `DATA-REQ-010`.

---

## 7.3. API-STU-CONTEXT-001 — Validate mục tiêu và khả năng học

**POST** `/api/v1/student/study-context/validate`

Endpoint này **không lưu entity draft**. Nó chỉ validate/normalize dữ liệu để UI tiếp tục luồng.

### Request

```json
{
  "goal": "Cải thiện kiến thức cấu trúc dữ liệu",
  "availableHoursPerWeek": 7.5,
  "targetDeadline": "2026-11-30T16:59:59.000Z"
}
```

### Validation

- `goal` không rỗng sau trim;
- `availableHoursPerWeek > 0`;
- `targetDeadline > now`.

### Success — 200

```json
{
  "goal": "Cải thiện kiến thức cấu trúc dữ liệu",
  "availableMinutesPerWeek": 450,
  "targetDeadline": "2026-11-30T16:59:59.000Z"
}
```

### Traceability

`UC-STU-003`, `FR-STU-003`, `DATA-REQ-005`.

---

## 7.4. API-STU-ANALYSIS-001 — AI phân tích điểm mạnh/yếu

**POST** `/api/v1/student/ai/learning-analysis`

### Request

```json
{
  "goal": "Cải thiện kiến thức cấu trúc dữ liệu"
}
```

`goal` là optional. Có thể gửi `{}`.

Backend tự lấy:

- latest AssessmentResult theo Topic;
- progress hiện tại nếu có.

### Minimum data

Nếu không có AssessmentResult hợp lệ:

- không gọi AI;
- không tạo `AIRequestLog`;
- trả `422 INSUFFICIENT_DATA`.

Thiếu `goal` **không** tạo `INSUFFICIENT_DATA`.

### Success — 200

```json
{
  "strengths": ["Nắm khá tốt chủ đề A"],
  "areasToImprove": ["Cần củng cố chủ đề B"],
  "priorityTopics": [
    {
      "topicId": "topic_2",
      "topicName": "Cây và đồ thị",
      "reason": "Điểm hiện tại thấp hơn các chủ đề còn lại"
    }
  ],
  "reasons": ["Phân tích dựa trên các AssessmentResult mới nhất"]
}
```

### Errors

- `422 INSUFFICIENT_DATA`;
- `502 AI_CONNECTION_FAILURE`;
- `504 AI_TIMEOUT`;
- `502 AI_EMPTY_RESPONSE`;
- `502 AI_INVALID_STRUCTURE`;
- `502 AI_INCOMPLETE_DATA`.

### Traceability

`UC-STU-004`, `FR-STU-004`, `FR-COM-005/006`, `BR-001`, `BR-004`, `BR-010`, `BR-011`, `BR-034`, `BR-035`, `BR-041`, `OD-41`.

---

## 7.5. API-STU-PLAN-001 — Tạo StudyPlan preview bằng AI

**POST** `/api/v1/student/study-plans/generate`

### Request

```json
{
  "goal": "Cải thiện kiến thức cấu trúc dữ liệu",
  "availableHoursPerWeek": 7.5,
  "targetDeadline": "2026-11-30T16:59:59.000Z"
}
```

Backend phải validate lại toàn bộ request, không dựa vào việc UI đã gọi API-STU-CONTEXT-001 trước đó.

### Minimum data

Nếu thiếu AssessmentResult hoặc danh sách Topic hợp lệ rỗng:

- không gọi AI;
- không tạo `AIRequestLog`;
- trả `422 INSUFFICIENT_DATA`.

### Success — 200

```json
{
  "planPreviewRef": "preview_opaque_ref",
  "expiresAt": "2026-10-21T06:00:00.000Z",
  "preview": {
    "planTitle": "Kế hoạch củng cố 4 tuần",
    "goal": "Cải thiện kiến thức cấu trúc dữ liệu",
    "availableMinutesPerWeek": 450,
    "targetDeadline": "2026-11-30T16:59:59.000Z",
    "tasks": [
      {
        "previewTaskId": "pt_1",
        "topic": { "id": "topic_2", "name": "Cây và đồ thị" },
        "title": "Ôn traversal",
        "goal": "Hiểu BFS/DFS",
        "expectedMinutes": 90,
        "dueDate": "2026-10-28T16:59:59.000Z",
        "priority": "HIGH",
        "reason": "Chủ đề cần ưu tiên"
      }
    ]
  }
}
```

### Server-owned preview

Backend context phải giữ bản AI output đã validate. Client được chỉnh **chỉ**:

- `planTitle`;
- StudyTask `title`;
- `expectedMinutes`;
- `dueDate`;
- `priority`.

`topicId`, task goal và dữ liệu nguồn không được client thay đổi.

### AI output validation

Sau backend validation, `preview.tasks` phải chứa **ít nhất một StudyTask hợp lệ**.

Nếu AI output có `tasks = []`, thiếu toàn bộ task, hoặc tất cả task bị loại vì không hợp lệ:

- xem output là incomplete;
- trả `502 AI_INCOMPLETE_DATA`;
- không tạo `planPreviewRef`;
- không thay đổi dữ liệu nghiệp vụ.

### Traceability

`UC-STU-005`, `FR-STU-005`, `BR-001`, `BR-004`, `BR-005`, `BR-021`, `BR-035`, `BR-037`, `DATA-REQ-005/006/007/013`.

---

## 7.6. API-STU-PLAN-002 — Áp dụng StudyPlan preview

**POST** `/api/v1/student/study-plans/apply`

### Request

```json
{
  "planPreviewRef": "preview_opaque_ref",
  "planTitle": "Kế hoạch củng cố 4 tuần - đã chỉnh",
  "taskEdits": [
    {
      "previewTaskId": "pt_1",
      "title": "Ôn traversal cây/đồ thị",
      "expectedMinutes": 75,
      "dueDate": "2026-10-29T16:59:59.000Z",
      "priority": "HIGH"
    }
  ]
}
```

### Request DTO contract

- `planPreviewRef`: **required**, opaque string, không rỗng;
- `planTitle`: optional; nếu omit thì giữ `planTitle` trong preview; nếu gửi thì trim và không được rỗng;
- `taskEdits`: optional; omit hoặc `[]` nghĩa là giữ nguyên toàn bộ editable field của task preview;
- mỗi `taskEdits[]` bắt buộc có `previewTaskId` và ít nhất một field cần chỉnh trong `title`, `expectedMinutes`, `dueDate`, `priority`;
- field bị omit trong một `taskEdits[]` giữ giá trị từ preview;
- `previewTaskId` phải tồn tại trong context và **không được lặp** trong cùng request;
- request không được thêm/xóa task, đổi `topicId`, đổi task goal hoặc gửi field ngoài whitelist làm nguồn chuẩn.

### Apply-time validation

Backend phải:

1. resolve đúng `planPreviewRef` của Student hiện tại;
2. nếu context đã `CONSUMED`, so sánh normalized mutation payload với `requestFingerprint` của lần Apply thành công: fingerprint tương đương thì replay; fingerprint khác thì trả `409 CONTEXT_ALREADY_CONSUMED`; trong mọi trường hợp **không mutation lần hai**;
3. lấy `applyTime = now`;
4. revalidate toàn bộ preview + edits trước database mutation;
5. bảo đảm `targetDeadline > applyTime`;
6. bảo đảm mọi task `applyTime <= dueDate <= targetDeadline`;
7. bảo đảm Topic/priority/expectedMinutes/title hợp lệ;
8. bảo đảm client không sửa field ngoài whitelist;
9. chỉ sau validation mới bắt đầu transaction.

### Transaction + idempotency

Trong một transaction/logical atomic operation:

1. archive current plan `ACTIVE/COMPLETED` nếu có;
2. tạo StudyPlan mới `ACTIVE`;
3. tạo các StudyTask `TODO`;
4. lưu `requestFingerprint`, replay identity/result và chuyển `planPreviewRef` sang `CONSUMED`;
5. commit.

Nếu lỗi: rollback toàn bộ và không consume context.

### Initial success — 201

```json
{
  "replayed": false,
  "plan": {
    "id": "plan_2",
    "title": "Kế hoạch củng cố 4 tuần - đã chỉnh",
    "goal": "Cải thiện kiến thức cấu trúc dữ liệu",
    "availableMinutesPerWeek": 450,
    "startDate": "2026-10-21T05:05:00.000Z",
    "endDate": "2026-11-30T16:59:59.000Z",
    "status": "ACTIVE",
    "createdAt": "2026-10-21T05:05:00.000Z"
  },
  "tasks": [
    {
      "id": "task_1",
      "topic": { "id": "topic_2", "name": "Cây và đồ thị" },
      "title": "Ôn traversal cây/đồ thị",
      "goal": "Hiểu BFS/DFS",
      "expectedMinutes": 75,
      "dueDate": "2026-10-29T16:59:59.000Z",
      "priority": "HIGH",
      "status": "TODO",
      "completedAt": null
    }
  ]
}
```

### Replay success — 200

Retry cùng `planPreviewRef` đã thành công trả lại cùng `plan.id`/logical result, với:

```json
{
  "replayed": true,
  "plan": {
    "id": "plan_2",
    "title": "Kế hoạch củng cố 4 tuần - đã chỉnh",
    "goal": "Cải thiện kiến thức cấu trúc dữ liệu",
    "availableMinutesPerWeek": 450,
    "startDate": "2026-10-21T05:05:00.000Z",
    "endDate": "2026-11-30T16:59:59.000Z",
    "status": "ACTIVE",
    "createdAt": "2026-10-21T05:05:00.000Z"
  },
  "tasks": [
    {
      "id": "task_1",
      "topic": { "id": "topic_2", "name": "Cây và đồ thị" },
      "title": "Ôn traversal cây/đồ thị",
      "goal": "Hiểu BFS/DFS",
      "expectedMinutes": 75,
      "dueDate": "2026-10-29T16:59:59.000Z",
      "priority": "HIGH",
      "status": "TODO",
      "completedAt": null
    }
  ]
}
```

### Errors

- `409 CONTEXT_INVALID_OR_EXPIRED`;
- `409 CONTEXT_ALREADY_CONSUMED` khi cùng reference đã được dùng thành công với mutation payload khác;
- `400 VALIDATION_ERROR`;
- `409 STALE_PREVIEW` khi preview không còn hợp lệ tại apply time;
- `500 DATABASE_FAILURE`.

Student Reject preview không cần API: frontend chỉ bỏ context local; server context tự hết TTL.

### Traceability

`UC-STU-006`, `FR-STU-005`, `FR-STU-006`, `BR-005`, `BR-021`, `BR-024`, `BR-025`, `BR-037`, `DATA-REQ-005`, `DATA-REQ-006`, `DATA-REQ-013`, `DB-REQ-002`, `API-DD-002`.

---

## 7.7. API-STU-PLAN-003 — Xem StudyPlan hiện tại

**GET** `/api/v1/student/study-plans/current`

### Success — 200

Có plan:

```json
{
  "plan": {
    "id": "plan_2",
    "title": "Kế hoạch củng cố 4 tuần",
    "goal": "Cải thiện kiến thức",
    "availableMinutesPerWeek": 450,
    "startDate": "2026-10-21T05:05:00.000Z",
    "endDate": "2026-11-30T16:59:59.000Z",
    "status": "ACTIVE"
  },
  "tasks": [
    {
      "id": "task_1",
      "topic": { "id": "topic_2", "name": "Cây và đồ thị" },
      "title": "Ôn traversal cây/đồ thị",
      "goal": "Hiểu BFS/DFS",
      "expectedMinutes": 75,
      "dueDate": "2026-10-29T16:59:59.000Z",
      "priority": "HIGH",
      "status": "TODO",
      "completedAt": null
    }
  ]
}
```

Không có plan:

```json
{
  "plan": null,
  "tasks": []
}
```

Không dùng `404` chỉ vì Student chưa có current plan.

### Traceability

`UC-STU-005`, `UC-STU-006`, `FR-STU-005`, `FR-STU-006`, `BR-024`, `BR-025`.

---

## 7.8. API-STU-TASK-001 — Danh sách task của current plan

**GET** `/api/v1/student/study-tasks`

### Success — 200

```json
{
  "planId": "plan_2",
  "planStatus": "ACTIVE",
  "items": []
}
```

Nếu không có current plan:

```json
{
  "planId": null,
  "planStatus": null,
  "items": []
}
```

### Traceability

`UC-STU-007`, `FR-STU-007`, `BR-001`, `BR-024`, `BR-025`.

---

## 7.9. API-STU-TASK-002 — Đổi trạng thái task

**PATCH** `/api/v1/student/study-tasks/{taskId}/status`

### Request

```json
{
  "status": "COMPLETED"
}
```

Hoặc:

```json
{
  "status": "TODO"
}
```

### Rules

- task phải thuộc current plan của Student hiện tại;
- không cập nhật task của plan `ARCHIVED`;
- `COMPLETED` → backend đặt `completedAt = now`;
- `TODO` → backend đặt `completedAt = null`;
- nếu tất cả task completed: plan `ACTIVE -> COMPLETED`;
- nếu task được revert: plan `COMPLETED -> ACTIVE`.

### Transaction consistency

Việc cập nhật `StudyTask.status`, `StudyTask.completedAt` và thay đổi `StudyPlan.status` phát sinh từ cùng request phải được xử lý trong **một transaction**.

Nếu bất kỳ bước nào thất bại, backend rollback toàn bộ thay đổi để không tồn tại trạng thái như task đã `COMPLETED` nhưng StudyPlan chưa được cập nhật tương ứng.

### Success — 200

```json
{
  "task": {
    "id": "task_1",
    "status": "COMPLETED",
    "completedAt": "2026-10-21T05:20:00.000Z"
  },
  "planStatus": "ACTIVE",
  "progress": {
    "completedTasks": 3,
    "totalTasks": 5,
    "completionPercentage": 60.0,
    "actualProgress": 60.0,
    "expectedProgress": 60.0,
    "overdueTasks": 0,
    "slowProgress": false
  }
}
```

### Errors

- `403 FORBIDDEN_RESOURCE`;
- `404 RESOURCE_NOT_FOUND`;
- `409 TASK_NOT_IN_CURRENT_PLAN`;
- `400 VALIDATION_ERROR`;
- `500 DATABASE_FAILURE`.

### Traceability

`UC-STU-007`, `FR-STU-007`, `BR-001`, `BR-024`, `BR-025`, `DB-REQ-002`, `NFR-REL-002`.

---

## 7.10. API-STU-PROGRESS-001 — Theo dõi tiến độ

**GET** `/api/v1/student/progress`

### Success — 200

Có current plan:

```json
{
  "hasCurrentPlan": true,
  "planId": "plan_2",
  "metrics": {
    "completedTasks": 3,
    "totalTasks": 5,
    "completionPercentage": 60.0,
    "actualProgress": 60.0,
    "expectedProgress": 80.0,
    "overdueTasks": 1,
    "slowProgress": false
  }
}
```

Không có current plan:

```json
{
  "hasCurrentPlan": false,
  "planId": null,
  "metrics": null
}
```

### Traceability

`UC-STU-008`, `FR-STU-008`, `BR-009`, `BR-017`, `BR-025`, `BR-027`, `BR-036`, `OD-04`, `OD-35`, `OD-39`.

---

## 7.11. API-STU-ADJUST-001 — Tạo AI adjustment preview

**POST** `/api/v1/student/study-plan-adjustments/generate`

Không cần request body.

Backend tự lấy current plan, TODO tasks, metrics, goal và availability.

### Eligibility

Phải đồng thời:

1. có current StudyPlan;
2. `now <= endDate`;
3. có ít nhất một task `TODO`.

Nếu không thỏa, không gọi AI và không tạo AIRequestLog.

### Success — 200

```json
{
  "adjustmentRef": "adjustment_opaque_ref",
  "expiresAt": "2026-10-21T06:30:00.000Z",
  "preview": {
    "planId": "plan_2",
    "changes": [
      {
        "taskId": "task_1",
        "title": "Ôn traversal cây/đồ thị",
        "expectedMinutes": 60,
        "dueDate": "2026-10-30T16:59:59.000Z",
        "priority": "HIGH",
        "reason": "Điều chỉnh khối lượng theo tiến độ hiện tại"
      }
    ]
  }
}
```

AI chỉ được thay đổi `expectedMinutes`, `dueDate`, `priority` của task `TODO`.

### Business-ineligible errors — 422

- `NO_CURRENT_PLAN`;
- `PLAN_PAST_DEADLINE`;
- `NO_TODO_TASKS`.

Các code trên **không phải** `INSUFFICIENT_DATA`.

### Traceability

`UC-STU-009`, `FR-STU-009`, `BR-006`, `BR-028`, `BR-035`, `BR-036`, `OD-40`.

---

## 7.12. API-STU-ADJUST-002 — Chấp nhận AI adjustment

**POST** `/api/v1/student/study-plan-adjustments/apply`

### Request

```json
{
  "adjustmentRef": "adjustment_opaque_ref"
}
```

`adjustmentRef` là required opaque string. MVP áp dụng toàn bộ validated adjustment set khi Student Accept; không hỗ trợ partial accept để tránh mở rộng scope.

### Revalidation

Trước update backend phải:

- resolve reference thuộc Student hiện tại;
- nếu context đã `CONSUMED`, trả replay result theo API-DD-002 và không update lần hai;
- plan vẫn là current plan;
- plan chưa quá `endDate`;
- target task vẫn `TODO`;
- dueDate/priority/expectedMinutes vẫn hợp lệ.

Nếu stale, không update task nào.

### Transaction bắt buộc

Nếu adjustment gồm một hoặc nhiều task, backend **phải** áp dụng toàn bộ validated adjustment set trong một transaction:

1. revalidate toàn bộ target task;
2. update tất cả task hợp lệ;
3. lưu replay result và chuyển `adjustmentRef` sang `CONSUMED`;
4. commit.

Nếu bất kỳ update nào thất bại → rollback toàn bộ và không consume context.

### Success — 200

```json
{
  "replayed": false,
  "updatedTasks": [
    {
      "id": "task_1",
      "expectedMinutes": 60,
      "dueDate": "2026-10-30T16:59:59.000Z",
      "priority": "HIGH",
      "status": "TODO",
      "completedAt": null
    }
  ],
  "progress": {
    "completedTasks": 3,
    "totalTasks": 5,
    "completionPercentage": 60.0,
    "actualProgress": 60.0,
    "expectedProgress": 80.0,
    "overdueTasks": 0,
    "slowProgress": false
  }
}
```

Retry cùng `adjustmentRef` đã thành công trả cùng logical result với `replayed: true` và không update task lần hai.

### Errors

- `409 CONTEXT_INVALID_OR_EXPIRED`;
- `409 STALE_PREVIEW` nếu plan/task không còn thỏa điều kiện Apply;
- `500 DATABASE_FAILURE`.

Student Reject adjustment không cần API.

### Traceability

`UC-STU-009`, `FR-STU-009`, `BR-006`, `BR-028`, `BR-035`, `BR-036`, `OD-40`, `DB-REQ-002`, `API-DD-002`.

---

# 8. Teacher APIs

## 8.1. API-TEA-CLASS-001 — Danh sách Class được phân công

**GET** `/api/v1/teacher/classes`

### Success — 200

```json
{
  "items": [
    {
      "id": "class_1",
      "name": "SE-K46"
    }
  ]
}
```

Backend xác định Teacher từ token; không nhận `teacherId` từ client.

### Traceability

`UC-TEA-001`, `FR-TEA-001`, `BR-002`.

---

## 8.2. API-TEA-STUDENT-001 — Danh sách Student trong Class

**GET** `/api/v1/teacher/classes/{classId}/students`

### Success — 200

```json
{
  "class": {
    "id": "class_1",
    "name": "SE-K46"
  },
  "items": [
    {
      "student": {
        "id": "student_1",
        "fullName": "Nguyen Van A"
      },
      "averageScore": 62.3,
      "completionRate": 50.0,
      "overdueTaskCount": 2,
      "needsAttention": true
    }
  ]
}
```

Metric không đủ dữ liệu dùng `null`, không tự đổi thành `0` trừ count có rule cụ thể.

### Errors

- `403 FORBIDDEN_RESOURCE` nếu Class không thuộc Teacher;
- `404 RESOURCE_NOT_FOUND` nếu Class không tồn tại.

### Traceability

`UC-TEA-002`, `FR-TEA-002`, `BR-002`, `BR-018`, `BR-019`, `BR-026`, `BR-027`, `OD-35`.

---

## 8.3. API-TEA-STUDENT-002 — Chi tiết Student read-only

**GET** `/api/v1/teacher/classes/{classId}/students/{studentId}`

### Success — 200

```json
{
  "student": {
    "id": "student_1",
    "fullName": "Nguyen Van A"
  },
  "assessmentResults": [
    {
      "topic": { "id": "topic_1", "name": "Cấu trúc dữ liệu" },
      "score": 62.3,
      "classification": "NEEDS_REINFORCEMENT",
      "evaluatedAt": "2026-10-20T03:00:00.000Z"
    }
  ],
  "metrics": {
    "averageScore": 62.3,
    "completionRate": 50.0,
    "overdueTaskCount": 2,
    "actualProgress": 50.0,
    "expectedProgress": 75.0
  }
}
```

Không có endpoint Teacher để sửa goal/StudyPlan/StudyTask của Student.

### Traceability

`UC-TEA-002`, `FR-TEA-002`, `BR-019`, `BR-038`, `OD-05`, `OD-30`.

---

## 8.4. API-TEA-DASH-001 — Dashboard Class

**GET** `/api/v1/teacher/classes/{classId}/dashboard`

### Success — 200

```json
{
  "class": {
    "id": "class_1",
    "name": "SE-K46"
  },
  "studentCount": 30,
  "classAverageScore": 68.4,
  "topicAverageScores": [
    {
      "topic": { "id": "topic_1", "name": "Cấu trúc dữ liệu" },
      "averageScore": 58.7,
      "weakTopic": true
    }
  ],
  "classCompletionRate": 54.2,
  "overdueTaskCount": 18,
  "needsAttentionStudents": [
    {
      "studentId": "student_1",
      "fullName": "Nguyen Van A",
      "reasons": ["AVERAGE_SCORE_BELOW_60", "OVERDUE_TASKS_AT_LEAST_2"]
    }
  ],
  "progressWarnings": [
    {
      "studentId": "student_2",
      "fullName": "Tran Thi B",
      "actualProgress": 40.0,
      "expectedProgress": 70.0
    }
  ]
}
```

Mọi rule Weak Topic / Needs Attention / Progress Warning do backend tính trước AI.

### Traceability

`UC-TEA-003`, `FR-TEA-003`, `FR-TEA-004`, `BR-002`, `BR-004`, `BR-009`, `BR-017`, `BR-018`, `BR-026`, `OD-35`, `OD-36`.

---

## 8.5. API-TEA-ANALYSIS-001 — AI Class Analysis + Recommendation

**POST** `/api/v1/teacher/classes/{classId}/analysis`

Không cần request body.

### Minimum data

Class đủ dữ liệu nếu có ít nhất một:

- AssessmentResult hợp lệ của Student thuộc Class; hoặc
- Student thuộc Class có current StudyPlan chứa ít nhất một StudyTask.

Nếu không đủ:

- không gọi AI;
- không tạo `AIRequestLog`;
- trả `422 INSUFFICIENT_DATA`.

### Success — 200

```json
{
  "analysisRef": "analysis_opaque_ref",
  "expiresAt": "2026-10-21T07:00:00.000Z",
  "result": {
    "summary": "Lớp đang gặp khó khăn ở một số chủ đề nền tảng.",
    "weakTopics": [
      {
        "topicId": "topic_1",
        "topicName": "Cấu trúc dữ liệu",
        "reason": "Backend metric xác định averageScore < 60"
      }
    ],
    "progressIssues": [
      {
        "studentId": "student_2",
        "description": "Tiến độ hiện tại thấp hơn tiến độ kỳ vọng"
      }
    ],
    "attentionGroups": [
      {
        "title": "Nhóm cần củng cố",
        "studentIds": ["student_1", "student_2"],
        "description": "Nhóm Student có tín hiệu cần chú ý từ backend rules"
      }
    ],
    "recommendations": [
      {
        "title": "Ôn lại chủ đề nền tảng",
        "description": "Tổ chức buổi củng cố và bài thực hành ngắn"
      }
    ]
  }
}
```

### Orchestration rule

`UC-TEA-005` luôn bao gồm recommendation của `UC-TEA-006`; theo AI Contract v1.0, flow dùng đúng **một external AI attempt** trả cả analysis và recommendations. Attempt đó phải được log.

### Traceability

`UC-TEA-005`, `UC-TEA-006`, `FR-TEA-004/005/006`, `BR-002`, `BR-004`, `BR-007`, `BR-009`, `BR-010`, `BR-011`, `BR-018`, `BR-026`, `BR-035`, `OD-33`.

---

## 8.6. API-TEA-REPORT-001 — Lưu ClassAnalysisReport

**POST** `/api/v1/teacher/classes/{classId}/analysis-reports`

### Request

```json
{
  "analysisRef": "analysis_opaque_ref"
}
```

Client **không gửi lại** `inputSnapshot` hoặc `analysisResult` làm nguồn lưu.

Backend:

1. recheck Teacher-Class;
2. resolve `analysisRef`;
3. nếu context đã `CONSUMED`, trả replay result theo API-DD-002 và không tạo report lần hai;
4. xác nhận reference thuộc đúng Teacher/Class;
5. lấy snapshot/result từ backend-owned context;
6. tạo ClassAnalysisReport và ghi replay identity/result;
7. chỉ sau khi persist thành công mới chuyển context sang `CONSUMED`.

### Initial success — 201

Header:

```http
Location: /api/v1/teacher/classes/class_1/analysis-reports/report_1
```

```json
{
  "replayed": false,
  "id": "report_1",
  "classId": "class_1",
  "createdAt": "2026-10-21T06:10:00.000Z"
}
```

### Replay success — 200

```json
{
  "replayed": true,
  "id": "report_1",
  "classId": "class_1",
  "createdAt": "2026-10-21T06:10:00.000Z"
}
```

### Errors

- `403 FORBIDDEN_RESOURCE`;
- `409 CONTEXT_INVALID_OR_EXPIRED`;
- `500 DATABASE_FAILURE`.

### Traceability

`UC-TEA-007`, `FR-TEA-007`, `BR-002`, `BR-030`, `BR-031`, `BR-044`, `OD-44`, `DATA-REQ-015`, `API-DD-002`.

---

## 8.7. API-TEA-HISTORY-001 — Danh sách report history

**GET** `/api/v1/teacher/classes/{classId}/analysis-reports?page=1&limit=20`

### Success — 200

```json
{
  "items": [
    {
      "id": "report_1",
      "classId": "class_1",
      "createdAt": "2026-10-21T06:10:00.000Z",
      "summary": "Lớp đang gặp khó khăn ở một số chủ đề nền tảng."
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

Sort mặc định: `createdAt DESC`.

Không gọi AI, không recompute live metrics, không tạo AIRequestLog.

### Traceability

`UC-TEA-008`, `FR-TEA-008`, `BR-045`, `OD-45`.

---

## 8.8. API-TEA-HISTORY-002 — Chi tiết report history

**GET** `/api/v1/teacher/classes/{classId}/analysis-reports/{reportId}`

### Success — 200

```json
{
  "id": "report_1",
  "classId": "class_1",
  "inputSnapshot": {
    "classId": "class_1",
    "studentCount": 30,
    "classAverageScore": 68.4,
    "topicAverageScores": [
      {
        "topic": { "id": "topic_1", "name": "Cấu trúc dữ liệu" },
        "averageScore": 58.7,
        "weakTopic": true
      }
    ],
    "classCompletionRate": 54.2,
    "overdueTaskCount": 18,
    "needsAttentionStudents": [],
    "progressWarnings": []
  },
  "analysisResult": {
    "summary": "Lớp đang gặp khó khăn ở một số chủ đề nền tảng.",
    "weakTopics": [],
    "progressIssues": [],
    "attentionGroups": [],
    "recommendations": []
  },
  "createdAt": "2026-10-21T06:10:00.000Z"
}
```

`inputSnapshot` phải theo contract `TeacherAnalysisInputSnapshot`; `analysisResult` phải theo `TeacherAnalysisResult`. Dữ liệu phải đến từ record đã lưu, không thay bằng Class live.

### Traceability

`UC-TEA-008`, `FR-TEA-008`, `BR-045`, `OD-45`.

---

# 9. Administrator APIs

## 9.1. API-ADM-DASH-001 — Dashboard hệ thống

**GET** `/api/v1/admin/dashboard`

### Success — 200

```json
{
  "totalUsers": 120,
  "usersByRole": {
    "STUDENT": 100,
    "TEACHER": 15,
    "ADMINISTRATOR": 5
  },
  "totalFeedback": 180,
  "totalAIRequests": 240,
  "failedAIRequests": 18
}
```

Metric là all-time trong MVP, không có date filter riêng.

### Traceability

`UC-ADM-001`, `FR-ADM-001`, `BR-009`, `BR-029`, `OD-37`.

---

## 9.2. API-ADM-USER-001 — Danh sách/tìm user

**GET** `/api/v1/admin/users?q=nguyen&page=1&limit=20`

### Query

- `q` optional: tìm theo fullName hoặc normalized email;
- `page`, `limit` theo quy ước pagination.

### Success — 200

```json
{
  "items": [
    {
      "id": "user_1",
      "fullName": "Nguyen Van A",
      "email": "student@example.com",
      "role": "STUDENT",
      "status": "ACTIVE"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

Không trả passwordHash.

### Traceability

`UC-ADM-002`, `FR-ADM-002`, `BR-012`, `BR-020`, `BR-039`.

---

## 9.3. API-ADM-USER-002 — Active/Disable user

**PATCH** `/api/v1/admin/users/{userId}/status`

### Request

```json
{
  "status": "DISABLED"
}
```

Hoặc `ACTIVE`.

### Rules

- chỉ Administrator ACTIVE;
- Admin không được disable chính mình;
- không có reason/history workflow trong MVP.

### Success — 200

```json
{
  "id": "user_1",
  "status": "DISABLED"
}
```

### Errors

- `409 SELF_DISABLE_NOT_ALLOWED`;
- `404 RESOURCE_NOT_FOUND`;
- `400 VALIDATION_ERROR`.

User vừa bị disable phải bị từ chối ở protected request tiếp theo kể cả token cũ còn tồn tại.

### Traceability

`UC-ADM-002`, `FR-ADM-002`, `BR-020`, `BR-032`, `BR-040`, `OD-06`, `OD-32`.

---

## 9.4. API-ADM-FEEDBACK-001 — Xem/lọc feedback

**GET** `/api/v1/admin/feedback`

### Query

```text
fromDate   optional ISO 8601
 toDate    optional ISO 8601
rating     optional integer 1..5
tag        optional FeedbackTag
page       default 1
limit      default 20
```

`fromDate` và `toDate` là inclusive boundaries. Nếu có cả hai, `fromDate <= toDate`.

### Example

```http
GET /api/v1/admin/feedback?fromDate=2026-10-01T00:00:00.000Z&toDate=2026-10-21T23:59:59.999Z&rating=2&tag=UI_UX&page=1&limit=20
```

### Success — 200

```json
{
  "items": [
    {
      "id": "feedback_1",
      "sender": {
        "id": "user_1",
        "fullName": "Nguyen Van A",
        "role": "STUDENT"
      },
      "tag": "UI_UX",
      "rating": 2,
      "content": "Khó tìm nút điều chỉnh kế hoạch.",
      "createdAt": "2026-10-20T07:00:00.000Z"
    }
  ],
  "tagStatistics": {
    "AI_PERFORMANCE": 0,
    "STUDY_PLAN": 0,
    "UI_UX": 1,
    "LEARNING_ANALYTICS": 0,
    "OTHER": 0
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

`tagStatistics` trong endpoint này tính trên **toàn bộ dataset thỏa filter**, không chỉ trang hiện tại.

### Traceability

`UC-ADM-003`, `FR-ADM-003`, `BR-013`, `BR-014`, `BR-015`, `BR-031`.

---

## 9.5. API-ADM-ANALYSIS-001 — Phân tích feedback bằng AI

**POST** `/api/v1/admin/feedback/analysis`

Frontend gửi filter, không gửi danh sách feedbackIds tự chọn làm nguồn chuẩn.

### Request

```json
{
  "filter": {
    "fromDate": "2026-10-01T00:00:00.000Z",
    "toDate": "2026-10-21T23:59:59.999Z",
    "rating": null,
    "tag": null
  }
}
```

`filter` có thể `{}` để phân tích toàn bộ feedback hiện có.

### Backend flow bắt buộc

1. validate filter;
2. query đúng Feedback dataset;
3. tạo authoritative `feedbackIds`;
4. nếu dataset rỗng → `422 INSUFFICIENT_DATA`, không gọi AI;
5. tính `totalFeedback` + `tagStatistics`;
6. **AI Stage 1** tạo candidate issueGroups;
7. validate mọi feedbackId thuộc input;
8. deduplicate trong group;
9. deduplicate giữa group theo thứ tự AI trả về;
10. loại group rỗng;
11. backend tự tính `count`;
12. nếu còn `[]` thì vẫn success stage 1;
13. **AI Stage 2** tạo `summary`, `priorityAreas`, `recommendations`;
14. validate stage 2;
15. tạo backend-owned analysis context và `analysisRef`.

Nếu Stage 1 fail/invalid: không chạy Stage 2.

### HTTP orchestration timeout

Endpoint này chạy hai external AI attempts tuần tự trong một frontend request. Per-attempt timeout vẫn là `60 giây`, nhưng HTTP client/proxy/backend route timeout phải theo API-DD-003; khuyến nghị tối thiểu `130 giây` cho flow này.

### Success — 200

```json
{
  "analysisRef": "analysis_opaque_ref",
  "expiresAt": "2026-10-21T07:30:00.000Z",
  "dataset": {
    "filter": {
      "fromDate": "2026-10-01T00:00:00.000Z",
      "toDate": "2026-10-21T23:59:59.999Z",
      "rating": null,
      "tag": null
    },
    "totalFeedback": 16,
    "tagStatistics": {
      "AI_PERFORMANCE": 4,
      "STUDY_PLAN": 6,
      "UI_UX": 3,
      "LEARNING_ANALYTICS": 2,
      "OTHER": 1
    }
  },
  "issueGroups": [
    {
      "title": "Khó tìm chức năng",
      "summary": "Một số feedback phản ánh khó tìm các thao tác chính.",
      "feedbackIds": ["feedback_1", "feedback_7"],
      "count": 2
    }
  ],
  "summary": "Các vấn đề nổi bật tập trung ở Study Plan và UI/UX.",
  "priorityAreas": ["Luồng tạo và điều chỉnh kế hoạch", "Khả năng tìm thấy CTA chính"],
  "recommendations": [
    {
      "title": "Làm rõ CTA chính",
      "description": "Tăng độ nổi bật cho thao tác tạo và điều chỉnh kế hoạch."
    }
  ]
}
```

`issueGroups = []` là response thành công nếu dataset ban đầu không rỗng và Stage 1 output hợp lệ sau validation/deduplicate.

### AI logging

- successful full flow → tối thiểu 2 external attempts và 2 AIRequestLog;
- Stage 1 external failure → có Stage 1 failed log, không có Stage 2 attempt;
- dataset rỗng/filter invalid → không có AIRequestLog.

### Traceability

`UC-ADM-004`, `UC-ADM-005`, `FR-ADM-004/005`, `BR-004`, `BR-008`, `BR-009`, `BR-010`, `BR-011`, `BR-013/014/015`, `BR-035`, `BR-042`, `BR-043`, `OD-34`, `OD-42`, `OD-43`, `AI-REQ-024`.

---

## 9.6. API-ADM-ANALYSIS-002 — Lưu FeedbackAnalysis

**POST** `/api/v1/admin/feedback/analyses`

### Request

```json
{
  "analysisRef": "analysis_opaque_ref"
}
```

Backend resolve context và lưu theo `FeedbackAnalysisInputSnapshot` + `FeedbackAnalysisResult`:

- `inputSnapshot`: filter, feedbackIds, totalFeedback, tagStatistics;
- `analysisResult`: issueGroups, summary, priorityAreas, recommendations.

Client không gửi snapshot/result làm nguồn chuẩn.

Nếu context đã `CONSUMED`, backend trả replay result theo API-DD-002 và không tạo `FeedbackAnalysis` lần hai.

### Initial success — 201

Header:

```http
Location: /api/v1/admin/feedback/analyses/feedback_analysis_1
```

```json
{
  "replayed": false,
  "id": "feedback_analysis_1",
  "createdAt": "2026-10-21T06:40:00.000Z"
}
```

### Replay success — 200

```json
{
  "replayed": true,
  "id": "feedback_analysis_1",
  "createdAt": "2026-10-21T06:40:00.000Z"
}
```

### Errors

- `409 CONTEXT_INVALID_OR_EXPIRED`;
- `500 DATABASE_FAILURE`.

### Traceability

`UC-ADM-006`, `FR-ADM-006`, `BR-030`, `BR-031`, `BR-044`, `OD-44`, `DATA-REQ-015`, `API-DD-002`.

---

## 9.7. API-ADM-HISTORY-001 — Danh sách FeedbackAnalysis history

**GET** `/api/v1/admin/feedback/analyses?page=1&limit=20`

### Success — 200

```json
{
  "items": [
    {
      "id": "feedback_analysis_1",
      "createdAt": "2026-10-21T06:40:00.000Z",
      "totalFeedback": 16,
      "filter": {
        "fromDate": "2026-10-01T00:00:00.000Z",
        "toDate": "2026-10-21T23:59:59.999Z",
        "rating": null,
        "tag": null
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

Sort: `createdAt DESC`.

Không gọi AI, không tạo AIRequestLog, không recompute snapshot.

### Traceability

`UC-ADM-007`, `FR-ADM-007`, `BR-046`, `OD-46`.

---

## 9.8. API-ADM-HISTORY-002 — Chi tiết FeedbackAnalysis history

**GET** `/api/v1/admin/feedback/analyses/{analysisId}`

### Success — 200

```json
{
  "id": "feedback_analysis_1",
  "inputSnapshot": {
    "filter": {
      "fromDate": "2026-10-01T00:00:00.000Z",
      "toDate": "2026-10-21T23:59:59.999Z",
      "rating": null,
      "tag": null
    },
    "feedbackIds": ["feedback_1", "feedback_2"],
    "totalFeedback": 2,
    "tagStatistics": {
      "AI_PERFORMANCE": 0,
      "STUDY_PLAN": 1,
      "UI_UX": 1,
      "LEARNING_ANALYTICS": 0,
      "OTHER": 0
    }
  },
  "analysisResult": {
    "issueGroups": [],
    "summary": "Các vấn đề nổi bật tập trung ở Study Plan và UI/UX.",
    "priorityAreas": ["Luồng tạo và điều chỉnh kế hoạch"],
    "recommendations": []
  },
  "createdAt": "2026-10-21T06:40:00.000Z"
}
```

`inputSnapshot` phải theo `FeedbackAnalysisInputSnapshot`; `analysisResult` phải theo `FeedbackAnalysisResult`. Dữ liệu Feedback live thay đổi không được làm response history cũ thay đổi.

### Traceability

`UC-ADM-007`, `FR-ADM-007`, `BR-046`, `OD-46`.

---

# 10. Feedback API dùng chung

## 10.1. API-FB-001 — Gửi feedback

**POST** `/api/v1/feedback`  
**Role:** Student, Teacher

### Request

```json
{
  "tag": "UI_UX",
  "rating": 3,
  "content": "Tôi muốn nút điều chỉnh kế hoạch dễ thấy hơn."
}
```

### Validation

- tag bắt buộc và thuộc FeedbackTag;
- rating là integer `1..5`;
- content trim không rỗng;
- `userId` lấy từ token, không nhận từ body.

### Success — 201

```json
{
  "id": "feedback_opaque_id",
  "tag": "UI_UX",
  "rating": 3,
  "content": "Tôi muốn nút điều chỉnh kế hoạch dễ thấy hơn.",
  "createdAt": "2026-10-21T06:50:00.000Z"
}
```

Không có API edit/delete feedback trong MVP.

### Traceability

`UC-FB-001`, `FR-FB-001`, `BR-013`, `BR-014`, `BR-031`, `DATA-REQ-004`.

---

# 11. HTTP status và error code

## Common error inheritance

Các error chung trong section này mặc nhiên áp dụng cho mọi endpoint khi điều kiện tương ứng xảy ra, kể cả khi endpoint không lặp lại error đó trong subsection riêng.

Phần `### Errors` của từng endpoint chỉ liệt kê các error **domain-specific hoặc đặc biệt đáng chú ý** của endpoint đó. Protected endpoint luôn có thể trả authentication/account-status/authorization error phù hợp theo contract chung.

| HTTP | Code | Ý nghĩa |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Input client sai format/range/enum |
| 401 | `AUTH_REQUIRED` | Thiếu/invalid/expired token |
| 401 | `INVALID_CREDENTIALS` | Sai credential khi login |
| 403 | `ACCOUNT_DISABLED` | Tài khoản DISABLED |
| 403 | `FORBIDDEN_RESOURCE` | Role/ownership/resource relation không hợp lệ |
| 404 | `RESOURCE_NOT_FOUND` | Resource ID hợp lệ về format nhưng không tồn tại |
| 409 | `CONTEXT_INVALID_OR_EXPIRED` | Preview/analysis context hết hạn hoặc không hợp lệ |
| 409 | `CONTEXT_ALREADY_CONSUMED` | Reference đã được dùng thành công với mutation payload khác |
| 409 | `STALE_PREVIEW` | Preview/adjustment từng hợp lệ nhưng không còn hợp lệ tại Apply |
| 409 | `SELF_DISABLE_NOT_ALLOWED` | Admin disable chính mình |
| 409 | `TASK_NOT_IN_CURRENT_PLAN` | Student cố sửa task không thuộc current plan |
| 422 | `INSUFFICIENT_DATA` | Thiếu minimum data trước AI call |
| 422 | `AI_INPUT_TOO_LARGE` | Authoritative AI input vượt validated capacity budget khi capacity profile hợp lệ; dừng trước dispatch |
| 422 | `NO_CURRENT_PLAN` | Adjustment business ineligible |
| 422 | `PLAN_PAST_DEADLINE` | Adjustment business ineligible |
| 422 | `NO_TODO_TASKS` | Adjustment business ineligible |
| 500 | `DATABASE_FAILURE` | Database failure; rollback nếu có transaction |
| 502 | `AI_CONNECTION_FAILURE` | Không kết nối AI runtime |
| 502 | `AI_RUNTIME_FAILURE` | Runtime/provider/integration technical failure hoặc capacity-profile configuration mismatch |
| 502 | `AI_EMPTY_RESPONSE` | AI trả response rỗng |
| 502 | `AI_INVALID_STRUCTURE` | AI output parse/schema invalid |
| 502 | `AI_INCOMPLETE_DATA` | AI thiếu field bắt buộc |
| 504 | `AI_TIMEOUT` | AI vượt timeout 60 giây |

## 11.1. `INSUFFICIENT_DATA` không phải AI failure

Ví dụ:

```json
{
  "code": "INSUFFICIENT_DATA",
  "message": "Chưa đủ dữ liệu để phân tích.",
  "details": {
    "missing": ["ASSESSMENT_RESULT"]
  }
}
```

Không tạo AIRequestLog vì external call chưa bắt đầu.

## 11.2. Business ineligible không được gộp vào `INSUFFICIENT_DATA`

Ví dụ adjustment khi không có current plan:

```json
{
  "code": "NO_CURRENT_PLAN",
  "message": "Bạn cần tạo kế hoạch học tập trước khi yêu cầu điều chỉnh.",
  "details": null
}
```

Cũng không tạo AIRequestLog.

## 11.3. AI error

Ví dụ timeout:

```json
{
  "code": "AI_TIMEOUT",
  "message": "AI tạm thời chưa phản hồi. Vui lòng thử lại.",
  "details": null
}
```

Nếu external attempt đã bắt đầu, phải có failed `AIRequestLog`.

---

## 11.4. `AI_INPUT_TOO_LARGE` — capacity overflow trước dispatch

Chỉ trả khi:

1. input đã qua validation/minimum-data/business eligibility;
2. capacity profile active đã resolve/bind hợp lệ;
3. toàn bộ authoritative input của attempt không nằm trong validated input budget.

Response chuẩn:

```json
{
  "code": "AI_INPUT_TOO_LARGE",
  "message": "Dữ liệu hiện vượt khả năng xử lý của AI cho yêu cầu này. Hãy thu hẹp phạm vi dữ liệu khi có thể và thử lại.",
  "details": {
    "reason": "AI_CONTEXT_CAPACITY"
  }
}
```

HTTP `422`. Không external dispatch, không `AIRequestLog`, không truncate/sampling/hidden chunking/pre-summarize. Không expose token count/context-window nội bộ.

Admin Stage 1 success nhưng Stage 2 bị reject bởi capacity preflight: trả `422 AI_INPUT_TOO_LARGE`, giữ đúng một SUCCESS log của Stage 1, không Stage 2 attempt/log và không tạo `analysisRef`.

## 11.5. `AI_RUNTIME_FAILURE` — technical/provider/integration failure

HTTP `502`. Public message chuẩn:

```json
{
  "code": "AI_RUNTIME_FAILURE",
  "message": "AI tạm thời chưa thể xử lý yêu cầu. Vui lòng thử lại sau.",
  "details": null
}
```

Áp dụng cho:

- capacity profile missing/malformed/binding mismatch trước dispatch — không `AIRequestLog`, server diagnostic `AI_CAPACITY_PROFILE_MISMATCH`;
- Runtime `400/422` sau khi Backend đã build/validate request — FAILED log, internal `AI_RUNTIME_PROTOCOL_FAILURE`;
- Runtime `401/403` — FAILED log, internal `AI_RUNTIME_AUTH_FAILURE`;
- Runtime `INFERENCE_FAILED` — FAILED log, internal `AI_RUNTIME_INFERENCE_FAILURE`;
- unclassified technical `5xx` không thuộc unavailable — FAILED log, internal `AI_RUNTIME_TECHNICAL_FAILURE`.

Không map các path này sang `AI_INVALID_STRUCTURE` khi chưa có output để validate, và không dùng `AI_CONNECTION_FAILURE` như catch-all.

---

# 12. Validation matrix quan trọng

| Dữ liệu | Rule |
|---|---|
| Email | trim + lowercase trước lookup; unique trên normalized value |
| AssessmentResult.score | `0 <= score <= 100` |
| Feedback.rating | integer `1..5` |
| Feedback.tag | một giá trị trong FeedbackTag |
| Feedback.content | bắt buộc, trim không rỗng |
| goal tạo plan | trim không rỗng |
| availableHoursPerWeek | `> 0` |
| availableMinutesPerWeek | `> 0` sau normalize |
| targetDeadline | phải sau `now` khi generate/validate; phải sau `applyTime` khi Apply |
| expectedMinutes | `> 0` |
| task priority | `LOW/MEDIUM/HIGH` |
| StudyTask.dueDate | nằm trong `[StudyPlan.startDate, StudyPlan.endDate]` |
| AI plan topicId | phải thuộc Topic list backend đã cung cấp và tồn tại DB |
| Task status | `TODO/COMPLETED` |
| completedAt | non-null khi COMPLETED; null khi TODO |
| Teacher classId | Class phải thuộc Teacher hiện tại |
| Teacher studentId | Student phải thuộc Class đang được truy cập |
| Admin status update | chỉ `ACTIVE/DISABLED`; không disable self |
| Admin feedback date filter | `fromDate <= toDate` |
| AI output | parse được, đủ field, đúng type/enum/ID reference |
| AI StudyPlan preview | sau validation phải còn ít nhất 1 StudyTask hợp lệ; nếu không → `AI_INCOMPLETE_DATA`, không tạo `planPreviewRef` |
| planPreviewRef / adjustmentRef / analysisRef | opaque, bound đúng user/resource; cùng ref + cùng fingerprint replay; cùng ref + payload khác sau consume → `CONTEXT_ALREADY_CONSUMED`; concurrent use phải atomic-claim |
| StudyPlan Apply `taskEdits` | `previewTaskId` tồn tại, unique trong request; mỗi edit chỉ dùng whitelist; omitted field giữ preview value |

---

# 13. AIRequestLog semantics

Không expose API đọc AIRequestLog trong MVP vì baseline không có Use Case actor-facing để xem log chi tiết. Admin dashboard chỉ dùng aggregate count.

Mỗi external attempt tạo log tối thiểu:

```text
userId
feature
status
errorCode
duration
createdAt
```

## 13.1. Có log

- AI success;
- connection failure;
- timeout;
- empty response;
- invalid structured output;
- incomplete output;
- failure khác sau khi external call đã bắt đầu.

## 13.2. Không log

- validation request thất bại trước AI call;
- `INSUFFICIENT_DATA`;
- adjustment business ineligible;
- authorization fail;
- history list/detail;
- Reject preview/adjustment;
- frontend chỉ mở màn hình.

---

# 14. Transaction và consistency

## 14.1. StudyPlan Apply

Bắt buộc transaction cho:

```text
archive old current plan (nếu có)
+ create new StudyPlan
+ create StudyTasks
```

Thất bại ở bất kỳ bước nào → rollback toàn bộ.

## 14.2. Adjustment Apply

Nếu adjustment gồm một hoặc nhiều task, backend **bắt buộc** áp dụng toàn bộ validated adjustment set trong một transaction. Contract MVP xem Accept là chấp nhận toàn bộ set; nếu một update thất bại thì rollback toàn bộ, không để trạng thái nửa cũ/nửa mới.

## 14.3. StudyTask status update

Cập nhật `StudyTask.status/completedAt` và `StudyPlan.status` phát sinh từ cùng request phải nằm trong một transaction. Thất bại ở bất kỳ bước nào → rollback toàn bộ.

## 14.4. Save analysis/report

Save chỉ persist backend-owned snapshot/result đã validate. Client không thể thay data nguồn bằng cách sửa request body.

## 14.5. Reference consumption và idempotent replay

Các mutation dựa trên temporary context (`StudyPlan Apply`, `Adjustment Apply`, `Teacher Save`, `Admin Save`) phải tuân API-DD-002:

- success lần đầu → context `CONSUMED` và lưu replay result/resource identity;
- mutation có editable payload phải lưu normalized `requestFingerprint`;
- retry cùng reference + cùng fingerprint → trả same logical result, không chạy mutation lại;
- retry cùng reference + fingerprint khác → `409 CONTEXT_ALREADY_CONSUMED`;
- concurrent request trên cùng reference phải được atomic-claim/serialize để không thể commit mutation hai lần;
- failed validation/failed transaction → không consume context;
- test integration phải bao gồm double-click, lost-response retry, concurrent request và same-reference/different-payload.

---

# 15. Quy tắc history

Teacher history và Admin history:

- read-only;
- list/detail record đã lưu;
- không edit;
- không delete;
- không compare;
- không rerun AI;
- không restore dữ liệu;
- không recompute live để thay snapshot;
- không tạo AIRequestLog chỉ vì xem history.

---

# 16. Mapping Screen → API chính

| Screen | API chính |
|---|---|
| SCR-COM-001 Đăng nhập | API-COM-AUTH-001 |
| SCR-COM-002 Hồ sơ | API-COM-PROFILE-001 |
| SCR-FB-001 Gửi phản hồi | API-FB-001 |
| SCR-STU-001 Tổng quan | API-STU-DASH-001 |
| SCR-STU-002 Kết quả | API-STU-RESULT-001 |
| SCR-STU-003 Mục tiêu | API-STU-CONTEXT-001 |
| SCR-STU-004 Phân tích AI | API-STU-ANALYSIS-001 |
| SCR-STU-005 Kế hoạch | API-STU-PLAN-001/002/003 |
| SCR-STU-006 Nhiệm vụ | API-STU-TASK-001/002 |
| SCR-STU-007 Tiến độ | API-STU-PROGRESS-001 |
| SCR-STU-008 Điều chỉnh AI | API-STU-ADJUST-001/002 |
| SCR-TEA-001 Danh sách lớp | API-TEA-CLASS-001 |
| SCR-TEA-002 Tổng quan lớp | API-TEA-DASH-001 |
| SCR-TEA-003 Danh sách sinh viên | API-TEA-STUDENT-001 |
| SCR-TEA-004 Chi tiết sinh viên | API-TEA-STUDENT-002 |
| SCR-TEA-005 Phân tích lớp AI | API-TEA-ANALYSIS-001 + API-TEA-REPORT-001 |
| SCR-TEA-006 Lịch sử | API-TEA-HISTORY-001/002 |
| SCR-ADM-001 Tổng quan | API-ADM-DASH-001 |
| SCR-ADM-002 Người dùng | API-ADM-USER-001/002 |
| SCR-ADM-003 Phản hồi | API-ADM-FEEDBACK-001 |
| SCR-ADM-004 Phân tích AI | API-ADM-ANALYSIS-001/002 |
| SCR-ADM-005 Lịch sử | API-ADM-HISTORY-001/002 |

---

# 17. Traceability API → Use Case / Requirement

| API ID | UC | FR / Cross-cutting |
|---|---|---|
| API-COM-AUTH-001 | UC-COM-001 | FR-COM-001, FR-COM-003 |
| API-COM-AUTH-002 | UC-COM-002 | FR-COM-002 |
| API-COM-PROFILE-001 | UC-COM-004 | FR-COM-003/004 |
| API-STU-DASH-001 | UC-STU-001 | FR-STU-001 |
| API-STU-RESULT-001 | UC-STU-002 | FR-STU-002 |
| API-STU-CONTEXT-001 | UC-STU-003 | FR-STU-003 |
| API-STU-ANALYSIS-001 | UC-STU-004 | FR-STU-004, FR-COM-005/006 |
| API-STU-PLAN-001 | UC-STU-005 | FR-STU-005, FR-COM-005/006 |
| API-STU-PLAN-002 | UC-STU-006 | FR-STU-005/006, BR-021/024/025/037, DATA-REQ-005/006/013, DB-REQ-002 |
| API-STU-PLAN-003 | UC-STU-005/006 | FR-STU-005/006 |
| API-STU-TASK-001/002 | UC-STU-007 | FR-STU-007 |
| API-STU-PROGRESS-001 | UC-STU-008 | FR-STU-008 |
| API-STU-ADJUST-001/002 | UC-STU-009 | FR-STU-009, FR-COM-005/006 |
| API-TEA-CLASS-001 | UC-TEA-001 | FR-TEA-001 |
| API-TEA-STUDENT-001/002 | UC-TEA-002 | FR-TEA-002 |
| API-TEA-DASH-001 | UC-TEA-003 | FR-TEA-003 + FR-TEA-004 internal |
| API-TEA-ANALYSIS-001 | UC-TEA-005/006 | FR-TEA-004/005/006, FR-COM-005/006 |
| API-TEA-REPORT-001 | UC-TEA-007 | FR-TEA-007 |
| API-TEA-HISTORY-001/002 | UC-TEA-008 | FR-TEA-008 |
| API-ADM-DASH-001 | UC-ADM-001 | FR-ADM-001 |
| API-ADM-USER-001/002 | UC-ADM-002 | FR-ADM-002 |
| API-ADM-FEEDBACK-001 | UC-ADM-003 | FR-ADM-003 |
| API-ADM-ANALYSIS-001 | UC-ADM-004/005 | FR-ADM-004/005, FR-COM-005/006 |
| API-ADM-ANALYSIS-002 | UC-ADM-006 | FR-ADM-006 |
| API-ADM-HISTORY-001/002 | UC-ADM-007 | FR-ADM-007 |
| API-FB-001 | UC-FB-001 | FR-FB-001 |

Tổng 27 Use Case baseline vẫn giữ nguyên. Một Use Case có thể cần nhiều endpoint; một endpoint orchestration có thể phục vụ quan hệ include đã baseline hóa.

---

# 18. Ngoài phạm vi API MVP

Không tạo API cho:

- đăng ký tài khoản công khai;
- reset password;
- phân quyền tùy biến;
- chỉnh sửa hồ sơ phức tạp;
- CRUD Course/Topic qua UI;
- Student sửa AssessmentResult;
- Teacher sửa Student StudyPlan/StudyTask/goal;
- chatbot/RAG/PDF Q&A;
- edit/delete Feedback;
- Admin reply feedback;
- ticket/support workflow;
- edit/delete/compare/rerun AI history;
- export report;
- AIRequestLog detail UI;
- infrastructure monitoring;
- trend/history AssessmentResult ngoài baseline.

Nếu cần các chức năng trên, phải đánh giá scope/change control trước khi bổ sung endpoint.

---

# 19. Gợi ý tổ chức NestJS module

Đây là hướng triển khai, không thay đổi API contract:

```text
AuthModule
UsersModule
StudentModule
  - StudentDashboardService
  - StudyPlanService
  - StudyTaskService
  - StudentAiService
TeacherModule
  - TeacherClassService
  - ClassAnalyticsService
  - ClassAnalysisService
AdminModule
  - AdminDashboardService
  - AdminUserService
  - FeedbackAnalysisService
FeedbackModule
AiModule
  - AiGateway
  - AiRequestLogService
ContextModule
  - TemporaryContextService
```

Business logic không đặt trong controller. Controller chỉ nhận DTO, gọi service và map HTTP response.

---

# 20. Checklist kiểm thử contract

## Authentication / Authorization

- login normalize email;
- invalid credentials không leak account existence;
- DISABLED không login/protected API;
- Student không gọi Teacher/Admin API;
- Teacher không truy cập Class ngoài quyền;
- Teacher không mở Student/report ngoài Class;
- Admin không disable chính mình.

## Student

- no AssessmentResult → STU analysis/generate trả `INSUFFICIENT_DATA`, không AI log;
- goal thiếu ở STU analysis vẫn được chạy nếu có AssessmentResult;
- invalid goal/time/deadline ở generate → validation error, không AI log;
- plan preview chỉ edit whitelist;
- stale preview Apply không archive plan cũ;
- `taskEdits` duplicate/unknown `previewTaskId` bị từ chối;
- retry cùng `planPreviewRef` sau success trả cùng plan, không tạo plan mới;
- cùng `planPreviewRef` nhưng normalized mutation payload khác sau success → `409 CONTEXT_ALREADY_CONSUMED`, không mutation;
- hai request concurrent dùng cùng `planPreviewRef` không được cùng commit; chỉ một request được atomic-claim context, request còn lại replay/conflict theo fingerprint;
- transaction failure không để plan/task một phần;
- task status ↔ completedAt nhất quán;
- plan status ACTIVE/COMPLETED cập nhật đúng;
- adjustment business ineligible phân biệt với `INSUFFICIENT_DATA`;
- adjustment không sửa completed task/topic;
- adjustment nhiều task là atomic; một update fail phải rollback toàn bộ;
- retry cùng `adjustmentRef` sau success không update lần hai;
- concurrent request dùng cùng `adjustmentRef` không được update adjustment set hai lần.

## Teacher

- dashboard metrics do backend tính;
- Weak Topic/Needs Attention/Progress Warning dùng raw value trước rounding;
- class thiếu minimum data → `INSUFFICIENT_DATA`, không AI log;
- analysis output không tự tạo metric;
- Save chỉ dùng analysisRef;
- retry Teacher Save cùng `analysisRef` trả cùng report, không tạo report trùng;
- history detail đúng `TeacherAnalysisInputSnapshot`/`TeacherAnalysisResult` và không AI call/recompute.

## Administrator

- dashboard count semantics đúng all-time;
- feedback filter đúng time/rating/tag;
- tagStatistics tính trên filtered dataset;
- empty feedback dataset → `INSUFFICIENT_DATA`, không Stage 1 log;
- Stage 1 invalid → không Stage 2;
- feedbackId ngoài input → invalid AI output;
- cross-group dedup deterministic;
- issueGroups `[]` vẫn chạy Stage 2;
- successful full flow có 2 external AI logs;
- Save chỉ dùng analysisRef;
- retry Admin Save cùng `analysisRef` trả cùng analysis, không tạo record trùng;
- history detail đúng `FeedbackAnalysisInputSnapshot`/`FeedbackAnalysisResult`;
- history snapshot không đổi khi Feedback live thay đổi;
- HTTP chain của two-stage analysis không timeout trước orchestration hợp lệ.

---

# 21. Tự kiểm tra phạm vi và consistency

API Specification v1.5 Baseline Final này giữ các boundary sau:

- không tạo Use Case mới;
- không thêm actor mới;
- không thêm CRUD ngoài phạm vi;
- không biến history thành live recompute;
- không cho client làm nguồn chuẩn của AI snapshot khi Save;
- không cho AI tự tính metric/count chính xác;
- không gộp business ineligible vào `INSUFFICIENT_DATA`;
- không tạo AIRequestLog cho request bị chặn trước external inference;
- giữ Admin feedback AI là two-stage inference;
- giữ Teacher Class Analysis là một frontend orchestration request và dùng đúng một external AI attempt theo AI Contract v1.0;
- giữ Human-in-the-loop cho StudyPlan và adjustment.

Các quyết định transport mới của API layer gồm `/api/v1`, Bearer token, pagination convention, opaque temporary context references, TTL 60 phút, `OPEN → CONSUMED` + requestFingerprint/atomic-claim idempotent replay, reusable history snapshot schemas, synchronous AI orchestration timeout policy và các technical error code bổ sung. Các quyết định này không thay đổi mục tiêu nghiệp vụ của 27 Use Case baseline.

---

# 22. Revision History

| Version | Date | Nội dung |
|---|---|---|
| 1.0 Draft | 21/10/2026 | Khởi tạo API Specification từ frozen baseline R2; định nghĩa 32 endpoint, contract auth/error, Student preview/apply, Teacher analysis/save/history, Admin two-stage analysis/save/history và traceability |
| 1.1 Draft | 21/10/2026 | Review hardening: bổ sung API-DD-002 về context consume/idempotent replay; bắt buộc transaction cho Adjustment Apply; khóa DTO Apply; định nghĩa Teacher/Admin history snapshot schemas; làm rõ `priorityAreas`, `completionPercentage`; thêm Location header và API-DD-003 cho synchronous AI orchestration timeout |
| 1.2 Draft | 22/10/2026 | Pre-freeze hardening: bắt buộc StudyPlan preview còn ít nhất 1 task hợp lệ; bổ sung transaction cho StudyTask status + StudyPlan state; siết API-DD-002 bằng requestFingerprint/atomic claim/concurrent semantics; thêm CONTEXT_ALREADY_CONSUMED; bỏ Location của Feedback; tăng traceability Apply và chuẩn hóa common error inheritance |
| 1.3 Draft | 22/10/2026 | Final pre-freeze consistency cleanup: đồng bộ ví dụ current StudyPlan và Adjustment Apply với invariant thực tế; bỏ Location header của StudyPlan Apply; làm rõ requestFingerprint chỉ bắt buộc cho mutation có editable payload; sửa self-version reference; bổ sung test case same-reference/different-payload và concurrent request |
| 1.4 Draft | 22/10/2026 | Final documentation cleanup: bổ sung traceability cục bộ cho current StudyPlan endpoint; đồng bộ Teacher Student-detail example với averageScore/latest AssessmentResult semantics; chốt FeedbackAnalysisFilter optional + nullable và normalize null như omit; sửa typo AIRequestLog duration; cập nhật self-version reference |
| 1.4 Baseline | 22/10/2026 | Phát hành chính thức sau Cross-Document Audit PASS; giữ nguyên 32 endpoint và business behavior của v1.4 Draft; đóng trạng thái API design baseline, không thay đổi upstream requirements |
| 1.5 Baseline Final | 26/10/2026 | Thực hiện CR-002: thêm public `422 AI_INPUT_TOO_LARGE` và `502 AI_RUNTIME_FAILURE`; capacity-profile/pre-dispatch semantics; Teacher one-attempt theo AI Contract v1.0; Admin Stage2 capacity-fail logging; đồng bộ baseline R3 |

---

# 23. Kết luận

Tài liệu này cung cấp API contract đủ để tiếp tục các artifact/hoạt động sau:

- OpenAPI/Swagger schema;
- DTO/Controller/Service design trong NestJS;
- Sequence Diagram;
- AI Contract;
- Frontend data-access layer;
- API Test Case / Integration Test;
- System Design chi tiết cho temporary context storage và AI gateway.

Cross-document audit trước phát hành đã **PASS** với SRS v1.6, Business Rules v1.4 Rev.1, Use Case Diagram v1.4 Rev.1, Use Case Specification v1.2 Rev.1, Activity Diagram v1.3 và UI Sitemap v1.1. Tài liệu này được phát hành làm **API Specification v1.5 Baseline Final**. Các contract transaction/idempotency vẫn phải được xác nhận bằng API integration test khi implementation tồn tại; trạng thái baseline của design artifact không được hiểu là implementation đã được kiểm thử. Mọi thay đổi sau baseline làm thay đổi observable business behavior hoặc API contract phải đi qua version/change control phù hợp.
