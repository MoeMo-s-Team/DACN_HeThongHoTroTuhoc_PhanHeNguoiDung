# DATABASE DESIGN SPECIFICATION
## Hệ thống hỗ trợ tự học ứng dụng AI

**Phiên bản:** 1.0 Baseline Final  
**Ngày:** 24/10/2026  
**Trạng thái:** Baseline Final — Approved Downstream Database Design Artifact  
**Phạm vi:** Web Application MVP — Student, Teacher, Administrator  
**Database:** PostgreSQL  
**ORM:** Prisma ORM  
**Baseline nguồn:** `DACN-REQ-UC-BL-2026-10-21-R2`  
**API Baseline:** `API_Specification_v1.4_baseline_final.md`  
**Architecture Baseline:** `System_Architecture_and_Technology_Stack_v1.0_baseline.md`  
**Authentication ADR:** `ADR_AUTH_001_Authentication_Architecture_Decision_v1.0_accepted.md`
**Release basis:** Passed final cross-document audit against SRS / Business Rules / UCS / API / Architecture / ADR on 24/10/2026; no Critical/Important mismatch remains.

---

# 1. Mục đích tài liệu

Tài liệu này chuyển các yêu cầu dữ liệu, business rule, API contract và quyết định kiến trúc hiện hành thành thiết kế cơ sở dữ liệu đủ rõ để:

- tạo `prisma/schema.prisma`;
- tạo Prisma migration;
- triển khai repository/data-access layer trong NestJS;
- xây seed data phục vụ phát triển và demo;
- viết integration test cho constraint, transaction và concurrency;
- kiểm tra traceability từ requirement đến bảng/cột/index/constraint;
- làm cơ sở cho implementation mà không tự tạo thêm observable business behavior ngoài baseline hiện hành.

Tài liệu này chốt cả hai mức:

1. **Logical Database Design** — entity, quan hệ và ranh giới dữ liệu;
2. **Physical Database Design** — kiểu dữ liệu PostgreSQL, PK/FK, constraint, index, JSONB, transaction và mapping Prisma.

Tài liệu không thay thế SRS, Business Rules, Use Case Specification, API Specification, Architecture hoặc ADR.

---

# 2. Nguồn authority

## 2.1. Tài liệu nguồn

| Mức | Tài liệu | Vai trò |
|---|---|---|
| 1 | `SRS_v1.5_baseline_final.md` | Requirement, Data Requirements, DB Requirements, NFR, error behavior |
| 2 | `Business_Rules_v1.3_baseline_rev1.md` | Data integrity, validation, state transition, calculation, authorization |
| 3 | `Use_Case_Specification_v1.1_baseline_rev1.md` | Flow, pre/post-condition, mutation behavior |
| 4 | `Activity_Diagram_3_AI_Main_Flows_v1.2_baseline_final.md` | Transaction/AI-flow boundary cho 3 luồng chính |
| 5 | `API_Specification_v1.4_baseline_final.md` | API DTO, temporary context, idempotency, history contract |
| 6 | `System_Architecture_and_Technology_Stack_v1.0_baseline.md` | Prisma, PostgreSQL, JSONB, transaction, context storage, raw SQL policy |
| ADR | `ADR_AUTH_001_Authentication_Architecture_Decision_v1.0_accepted.md` | Password hash, JWT/auth boundary |
| Governance | `Document_Governance_and_Traceability_Index_v1.1.md` + Freeze Record v1.1 | Authority/change control của baseline R2 |

## 2.2. Thứ tự xử lý xung đột

1. Requirement/business behavior → SRS.
2. Rule/validation/state/data integrity → Business Rules.
3. Flow → Use Case Specification / Activity Diagram.
4. Frontend–Backend contract → API Specification.
5. Technical data-access/storage decision → Architecture / accepted ADR.
6. Database Design chỉ cụ thể hóa cách lưu và bảo vệ dữ liệu; không được tự tạo chức năng mới.

---

# 3. Phạm vi thiết kế

## 3.1. Business tables

Thiết kế vật lý gồm 12 bảng nghiệp vụ:

1. `users`
2. `classes`
3. `class_members`
4. `courses`
5. `topics`
6. `assessment_results`
7. `study_plans`
8. `study_tasks`
9. `class_analysis_reports`
10. `feedback`
11. `feedback_analyses`
12. `ai_request_logs`

## 3.2. Technical table

Bổ sung đúng 1 bảng kỹ thuật theo Architecture/API:

13. `temporary_contexts`

`temporary_contexts` không phải business entity và không tạo Use Case mới.

## 3.3. Không tạo bảng riêng

MVP **không tạo**:

- `learning_progress`;
- bảng nối `feedback_analysis_feedback`;
- bảng `weak_topics`;
- bảng `attention_groups`;
- bảng `recommendations`;
- bảng refresh token;
- bảng server session;
- bảng token blacklist;
- bảng notification;
- bảng audit lịch sử Disable User;
- bảng trend/history riêng cho AssessmentResult ngoài chính `assessment_results`.

Lý do:

- Learning progress được tính từ current StudyPlan + StudyTask;
- FeedbackAnalysis giữ `feedbackIds` trong snapshot JSONB;
- AI history giữ snapshot/result bằng JSONB;
- authentication MVP không có refresh token/server-side session;
- các chức năng trên không thuộc MVP hiện hành.

---

# 4. Quyết định thiết kế database

## DB-DD-001 — Identifier strategy

**Quyết định:** dùng UUID cho primary key của mọi entity có ID riêng.

- Prisma field: `String @id @default(uuid()) @db.Uuid`;
- API tiếp tục xem ID là opaque string;
- frontend không phụ thuộc format UUID;
- `ClassMember` dùng composite primary key `(classId, studentId)` vì đây là bảng quan hệ thuần.

**Lý do chọn UUID:**

- phù hợp PostgreSQL;
- Prisma hỗ trợ trực tiếp;
- không để client suy luận số lượng record từ ID tăng dần;
- đủ đơn giản cho MVP;
- không cần thêm ID generator riêng.

## DB-DD-002 — Naming convention

- Prisma model: `PascalCase`, số ít.
- Prisma field: `camelCase`.
- PostgreSQL table: `snake_case`, số nhiều hoặc tên miền tự nhiên.
- PostgreSQL column: `snake_case`.
- PK: `id`.
- FK: `<resource>_id`.
- index/constraint được đặt tên rõ nghĩa để dễ debug migration.

## DB-DD-003 — Timestamp

- mọi timestamp lưu bằng PostgreSQL `timestamptz(3)`;
- backend xử lý UTC;
- API gửi ISO 8601;
- frontend chuyển sang local time khi hiển thị.

Không lưu chuỗi local time làm nguồn chuẩn.

## DB-DD-004 — Numeric score và precision

`AssessmentResult.score` dùng PostgreSQL `NUMERIC`/`DECIMAL` **không khóa scale 2 chữ số** ở mức Database Design.

Lý do:

- baseline chỉ chốt miền giá trị `0..100`, không chốt số chữ số thập phân tối đa;
- threshold/rule phải đánh giá trên giá trị gốc trước khi làm tròn;
- `NUMERIC(5,2)` có thể làm tròn dữ liệu có hơn 2 chữ số thập phân khi persist, từ đó làm thay đổi kết quả ở biên threshold;
- kiểu decimal chính xác tránh sai số binary floating-point mà không tự tạo thêm quy tắc rounding nghiệp vụ.

Prisma dùng field `Decimal` ở logical/client schema. **Physical PostgreSQL end-state có authority cao hơn đối với cột này:** migration phải để `assessment_results.score` ở dạng `numeric` không typmod/không khóa scale nghiệp vụ. Nếu Prisma version được pin sinh default decimal precision/scale, generated migration phải được review và chỉnh bằng targeted migration SQL để không làm tròn score trước khi backend áp rule.

Đây là **authoritative physical exception** của Prisma candidate: không được suy luận rằng `score Decimal` trong PSL cho phép migration tương lai tự đưa precision/scale mặc định trở lại. Migration history đã version-control + Database Design này là nguồn chuẩn cho physical type; mọi migration tiếp theo chạm vào `score` phải kiểm tra rằng end-state vẫn là unbounded `numeric`.

Ví dụ invariant cần giữ: `59.999 < 60` và `79.999 < 80` sau round-trip database. Rounding chỉ phục vụ hiển thị UI, không phải storage/business-rule normalization.

## DB-DD-005 — JSONB boundary

Dùng `JSONB` cho dữ liệu snapshot/result có cấu trúc nhưng không cần query relational thường xuyên:

- `ClassAnalysisReport.inputSnapshot`;
- `ClassAnalysisReport.analysisResult`;
- `FeedbackAnalysis.inputSnapshot`;
- `FeedbackAnalysis.analysisResult`;
- `TemporaryContext.payload`;
- `TemporaryContext.replayResult`.

Không đưa các field thường xuyên filter/join/constraint như `status`, `role`, `tag`, `dueDate`, `studentId` vào JSONB chỉ để giảm số cột.

## DB-DD-006 — Current StudyPlan uniqueness

Định nghĩa current StudyPlan:

```text
status IN ('ACTIVE', 'COMPLETED')
```

Database phải bảo đảm **mỗi Student tối đa một current StudyPlan** bằng partial unique index trên `student_id`.

Đây là lớp bảo vệ cuối cùng bên cạnh transaction/service validation.

## DB-DD-007 — Temporary Context

`temporary_contexts` là technical storage trong PostgreSQL, dùng cho:

- `planPreviewRef`;
- `adjustmentRef`;
- Teacher `analysisRef`;
- Admin `analysisRef`.

Context có trạng thái:

```text
OPEN
CONSUMED
```

Context phải hỗ trợ:

- TTL 60 phút khi OPEN;
- binding theo owner/resource;
- request fingerprint khi mutation có editable payload;
- replay result;
- atomic consume;
- retention sau consume;
- concurrent request safety.

## DB-DD-008 — Delete policy

MVP không có business flow hard-delete cho các entity chính.

Do đó:

- ưu tiên FK `RESTRICT/NO ACTION`;
- user được Disable thay vì delete;
- history/report/log không tự cascade-delete;
- cleanup chủ động chỉ áp dụng cho `temporary_contexts` sau `retentionUntil`.

## DB-DD-009 — Constraint placement

Invariant được chia thành ba nhóm:

### Nhóm A — Database có thể bảo vệ trực tiếp

Ví dụ:

- unique normalized email;
- score 0–100;
- rating 1–5;
- expectedMinutes > 0;
- completedAt phù hợp task status;
- một current plan/student;
- enum status/role/tag;
- FK tồn tại.

### Nhóm B — Backend + transaction phải bảo vệ

Ví dụ:

- Teacher phải có role TEACHER;
- ClassMember.student phải có role STUDENT;
- Feedback.user phải là Student hoặc Teacher;
- StudyTask.dueDate nằm trong khoảng ngày của StudyPlan;
- StudyTask.topic thuộc Course chính mà backend đã cung cấp;
- Admin không disable chính mình;
- Student ownership/Teacher-Class authorization.

Các rule này liên quan nhiều bảng hoặc auth context nên không ép thành trigger phức tạp trong MVP.

### Nhóm C — Snapshot/AI validation

AI structured output phải được backend validate **trước** khi persist vào business entity hoặc history JSONB.

---

# 5. Logical ERD

```mermaid
erDiagram
    USER ||--o{ CLASS : teaches
    USER ||--o{ CLASS_MEMBER : joins_as_student
    CLASS ||--o{ CLASS_MEMBER : contains

    COURSE ||--o{ TOPIC : contains
    USER ||--o{ ASSESSMENT_RESULT : has
    TOPIC ||--o{ ASSESSMENT_RESULT : evaluates

    USER ||--o{ STUDY_PLAN : owns
    STUDY_PLAN ||--o{ STUDY_TASK : contains
    TOPIC ||--o{ STUDY_TASK : references

    CLASS ||--o{ CLASS_ANALYSIS_REPORT : stores

    USER ||--o{ FEEDBACK : submits

    USER ||--o{ AI_REQUEST_LOG : triggers

    USER ||--o{ TEMPORARY_CONTEXT : owns

    USER {
        uuid id PK
        text fullName
        text email UK
        text passwordHash
        Role role
        UserStatus status
        timestamptz createdAt
    }

    CLASS {
        uuid id PK
        text name
        uuid teacherId FK
    }

    CLASS_MEMBER {
        uuid classId PK,FK
        uuid studentId PK,FK
    }

    COURSE {
        uuid id PK
        text name
        text description
    }

    TOPIC {
        uuid id PK
        uuid courseId FK
        text name
    }

    ASSESSMENT_RESULT {
        uuid id PK
        uuid studentId FK
        uuid topicId FK
        numeric score
        timestamptz evaluatedAt
    }

    STUDY_PLAN {
        uuid id PK
        uuid studentId FK
        text title
        text goal
        int availableMinutesPerWeek
        timestamptz startDate
        timestamptz endDate
        StudyPlanStatus status
        timestamptz createdAt
    }

    STUDY_TASK {
        uuid id PK
        uuid studyPlanId FK
        uuid topicId FK
        text title
        text goal
        int expectedMinutes
        timestamptz dueDate
        Priority priority
        StudyTaskStatus status
        timestamptz completedAt
    }

    CLASS_ANALYSIS_REPORT {
        uuid id PK
        uuid classId FK
        jsonb inputSnapshot
        jsonb analysisResult
        timestamptz createdAt
    }

    FEEDBACK {
        uuid id PK
        uuid userId FK
        FeedbackTag tag
        int rating
        text content
        timestamptz createdAt
    }

    FEEDBACK_ANALYSIS {
        uuid id PK
        jsonb inputSnapshot
        jsonb analysisResult
        timestamptz createdAt
    }

    AI_REQUEST_LOG {
        uuid id PK
        uuid userId FK
        text feature
        AIRequestStatus status
        text errorCode
        int durationMs
        timestamptz createdAt
    }

    TEMPORARY_CONTEXT {
        uuid id PK
        uuid ownerUserId FK
        text opaqueRef UK
        ContextType contextType
        ContextStatus status
        text resourceKey
        jsonb payload
        text requestFingerprint
        jsonb replayResult
        timestamptz expiresAt
        timestamptz retentionUntil
        timestamptz consumedAt
        int version
        timestamptz createdAt
        timestamptz updatedAt
    }
```

**Lưu ý:** `FeedbackAnalysis` không có FK đến `Feedback`. Quan hệ với tập feedback được đóng băng bằng `feedbackIds` trong `inputSnapshot`.

---

# 6. Enum vật lý

## 6.1. Role

```text
STUDENT
TEACHER
ADMINISTRATOR
```

## 6.2. UserStatus

```text
ACTIVE
DISABLED
```

## 6.3. StudyPlanStatus

```text
ACTIVE
COMPLETED
ARCHIVED
```

Không tạo `EXPIRED`.

## 6.4. StudyTaskStatus

```text
TODO
COMPLETED
```

## 6.5. Priority

```text
LOW
MEDIUM
HIGH
```

## 6.6. FeedbackTag

```text
AI_PERFORMANCE
STUDY_PLAN
UI_UX
LEARNING_ANALYTICS
OTHER
```

## 6.7. AIRequestStatus

Database Design chốt technical enum tối thiểu:

```text
SUCCESS
FAILED
```

`failedAIRequests` được tính từ `status = FAILED`.

`errorCode` giữ dạng nullable text để không khóa database vào danh sách lỗi AI có thể thay đổi ở gateway.

## 6.8. ContextType

```text
STUDY_PLAN_PREVIEW
STUDY_PLAN_ADJUSTMENT
TEACHER_CLASS_ANALYSIS
ADMIN_FEEDBACK_ANALYSIS
```

## 6.9. ContextStatus

```text
OPEN
CONSUMED
```

---

# 7. Physical Table Specification

## 7.1. `users`

| Cột | PostgreSQL | Null | Key/Default | Ghi chú |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK | UUID |
| `full_name` | `text` | No |  | Họ tên |
| `email` | `text` | No | UNIQUE | Đã trim + lowercase |
| `password_hash` | `text` | No |  | Argon2id encoded hash |
| `role` | `Role` | No |  | STUDENT/TEACHER/ADMINISTRATOR |
| `status` | `UserStatus` | No | `ACTIVE` | ACTIVE/DISABLED |
| `created_at` | `timestamptz(3)` | No | now | UTC |

### Constraint

```sql
CHECK (email = lower(btrim(email)))
```

Unique index trên `email` bảo đảm uniqueness sau normalization vì database từ chối email không normalize.

### Index

- `UNIQUE(email)`
- `INDEX(role)`
- `INDEX(status)`

### Security

- không expose `password_hash`;
- không lưu plain password;
- không cần refresh-token/session table.

---

## 7.2. `classes`

| Cột | PostgreSQL | Null | Key/Default | Ghi chú |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK |  |
| `name` | `text` | No |  |  |
| `teacher_id` | `uuid` | No | FK → users.id | Teacher phụ trách |

### FK

```text
teacher_id -> users.id ON DELETE RESTRICT
```

### Rule không dùng DB CHECK

Backend phải kiểm tra `users.role = TEACHER`.

### Index

- `INDEX(teacher_id)`

Không thêm `course_id` trong MVP.

---

## 7.3. `class_members`

| Cột | PostgreSQL | Null | Key | Ghi chú |
|---|---|---:|---|---|
| `class_id` | `uuid` | No | PK, FK | Class |
| `student_id` | `uuid` | No | PK, FK | Student |

### Primary key

```text
PRIMARY KEY (class_id, student_id)
```

### FK

```text
class_id   -> classes.id ON DELETE RESTRICT
student_id -> users.id   ON DELETE RESTRICT
```

### Rule service-level

`student_id` phải trỏ tới User có role `STUDENT`.

### Index

Composite PK hỗ trợ query member theo class.

Bổ sung:

```text
INDEX(student_id)
```

để hỗ trợ tìm các Class của một Student nếu cần ở query nội bộ/test.

---

## 7.4. `courses`

| Cột | PostgreSQL | Null | Key | Ghi chú |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK |  |
| `name` | `text` | No |  | Seed data |
| `description` | `text` | Yes |  |  |

MVP dùng một Course chính bằng seed data.

**Không** tạo DB constraint “chỉ được tồn tại đúng một row Course”, vì requirement chỉ chốt luồng demo sử dụng một Course chính, không yêu cầu database cấm record khác.

---

## 7.5. `topics`

| Cột | PostgreSQL | Null | Key | Ghi chú |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK |  |
| `course_id` | `uuid` | No | FK | Course |
| `name` | `text` | No |  | Seed data |

### FK

```text
course_id -> courses.id ON DELETE RESTRICT
```

### Index

- `INDEX(course_id)`

Không tự thêm unique `(course_id, name)` vì baseline chưa yêu cầu Topic name unique.

---

## 7.6. `assessment_results`

| Cột | PostgreSQL | Null | Key | Ghi chú |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK |  |
| `student_id` | `uuid` | No | FK | User Student |
| `topic_id` | `uuid` | No | FK | Topic |
| `score` | `numeric` | No |  | 0..100; không ép scale 2 chữ số |
| `evaluated_at` | `timestamptz(3)` | No |  | Dùng xác định latest |

### Constraint

```sql
CHECK (score >= 0 AND score <= 100)
```

### FK

```text
student_id -> users.id  ON DELETE RESTRICT
topic_id   -> topics.id ON DELETE RESTRICT
```

### Rule service-level

- `student_id` phải là role STUDENT.
- AssessmentResult dùng trong demo phải thuộc Topic của Course chính.

### Index bắt buộc

```text
INDEX(student_id, topic_id, evaluated_at DESC)
```

Mục tiêu: lấy latest AssessmentResult cho mỗi Student–Topic.

### Không unique Student–Topic

Không đặt unique `(student_id, topic_id)` vì lịch sử AssessmentResult có thể tồn tại.

---

## 7.7. `study_plans`

| Cột | PostgreSQL | Null | Key/Default | Ghi chú |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK |  |
| `student_id` | `uuid` | No | FK | Owner |
| `title` | `text` | No |  |  |
| `goal` | `text` | No |  | Student goal |
| `available_minutes_per_week` | `integer` | No |  | > 0 |
| `start_date` | `timestamptz(3)` | No |  | Apply time |
| `end_date` | `timestamptz(3)` | No |  | Target deadline |
| `status` | `StudyPlanStatus` | No | `ACTIVE` |  |
| `created_at` | `timestamptz(3)` | No | now |  |

### Constraint

```sql
CHECK (char_length(btrim(title)) > 0)
CHECK (available_minutes_per_week > 0)
CHECK (char_length(btrim(goal)) > 0)
CHECK (end_date > start_date)
```

### FK

```text
student_id -> users.id ON DELETE RESTRICT
```

### Partial unique invariant

```sql
CREATE UNIQUE INDEX uq_study_plans_one_current_per_student
ON study_plans(student_id)
WHERE status IN ('ACTIVE', 'COMPLETED');
```

### Index

- partial unique index ở trên;
- `INDEX(student_id, status)`;
- `INDEX(student_id, created_at DESC)` nếu cần query lịch sử nội bộ.

### State

```text
ACTIVE -> COMPLETED            khi tất cả StudyTask đều COMPLETED
COMPLETED -> ACTIVE            khi undo ít nhất một StudyTask về TODO
ACTIVE/COMPLETED -> ARCHIVED   khi Student áp dụng plan mới
```

`ARCHIVED` là read-only trong MVP. Không có `EXPIRED`; plan đã quá `endDate` nhưng còn task `TODO` vẫn giữ `ACTIVE`.

---

## 7.8. `study_tasks`

| Cột | PostgreSQL | Null | Key/Default | Ghi chú |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK |  |
| `study_plan_id` | `uuid` | No | FK | Parent plan |
| `topic_id` | `uuid` | No | FK | Topic |
| `title` | `text` | No |  |  |
| `goal` | `text` | No |  |  |
| `expected_minutes` | `integer` | No |  | > 0 |
| `due_date` | `timestamptz(3)` | No |  |  |
| `priority` | `Priority` | No |  |  |
| `status` | `StudyTaskStatus` | No | `TODO` |  |
| `completed_at` | `timestamptz(3)` | Yes | null |  |

### Constraint

```sql
CHECK (char_length(btrim(title)) > 0)
CHECK (expected_minutes > 0)

CHECK (
  (status = 'TODO' AND completed_at IS NULL)
  OR
  (status = 'COMPLETED' AND completed_at IS NOT NULL)
)
```

### FK

```text
study_plan_id -> study_plans.id ON DELETE RESTRICT
topic_id      -> topics.id      ON DELETE RESTRICT
```

### Rule service-level

`StudyTask.goal` là field bắt buộc trong data model/AI preview, nhưng baseline hiện hành chưa chốt invariant riêng rằng giá trị này phải non-blank sau `trim`. Database Design vì vậy **không tự thêm** `CHECK` non-blank cho `StudyTask.goal`; backend chỉ validate theo AI/API contract hiện hành. Nếu upstream sau này khóa thêm rule cho task goal, thay đổi constraint phải đi qua revision/change control.

`due_date` phải thỏa:

```text
StudyPlan.startDate <= StudyTask.dueDate <= StudyPlan.endDate
```

Đây là cross-table invariant nên backend revalidate trong transaction thay vì trigger phức tạp.

`topic_id` phải nằm trong tập Topic hợp lệ backend đã cung cấp cho AI.

### Index

```text
INDEX(study_plan_id, status)
INDEX(study_plan_id, due_date)
INDEX(topic_id)
```

Query overdue/near-due chỉ xét task của current plan.

---

## 7.9. `class_analysis_reports`

| Cột | PostgreSQL | Null | Key/Default | Ghi chú |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK |  |
| `class_id` | `uuid` | No | FK |  |
| `input_snapshot` | `jsonb` | No |  | Authoritative analysis-time data |
| `analysis_result` | `jsonb` | No |  | Validated AI output |
| `created_at` | `timestamptz(3)` | No | now | History ordering |

### FK

```text
class_id -> classes.id ON DELETE RESTRICT
```

### Index

```text
INDEX(class_id, created_at DESC)
```

### Semantics

- read-only sau khi lưu;
- history không recompute live;
- không tách weak topic/attention/recommendation thành bảng con.

---

## 7.10. `feedback`

| Cột | PostgreSQL | Null | Key/Default | Ghi chú |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK |  |
| `user_id` | `uuid` | No | FK | Student/Teacher gửi |
| `tag` | `FeedbackTag` | No |  | User-selected |
| `rating` | `smallint` | No |  | 1..5 |
| `content` | `text` | No |  | Trim không rỗng |
| `created_at` | `timestamptz(3)` | No | now |  |

### Constraint

```sql
CHECK (rating BETWEEN 1 AND 5)
CHECK (char_length(btrim(content)) > 0)
```

### FK

```text
user_id -> users.id ON DELETE RESTRICT
```

### Rule service-level

User gửi feedback phải có role:

```text
STUDENT hoặc TEACHER
```

### Index

```text
INDEX(created_at DESC)
INDEX(tag, created_at DESC)
INDEX(rating, created_at DESC)
INDEX(user_id, created_at DESC)
```

Các index này hỗ trợ filter Admin theo thời gian/tag/rating.

---

## 7.11. `feedback_analyses`

| Cột | PostgreSQL | Null | Key/Default | Ghi chú |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK |  |
| `input_snapshot` | `jsonb` | No |  | Filter + feedbackIds + counts |
| `analysis_result` | `jsonb` | No |  | issueGroups + summary + recommendations |
| `created_at` | `timestamptz(3)` | No | now |  |

### Index

```text
INDEX(created_at DESC)
```

### Không có FK đến Feedback

`feedbackIds` nằm trong `input_snapshot` để history giữ nguyên snapshot kể cả khi dữ liệu live thay đổi.

MVP không edit/delete/compare/rerun record history.

---

## 7.12. `ai_request_logs`

| Cột | PostgreSQL | Null | Key/Default | Ghi chú |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK |  |
| `user_id` | `uuid` | No | FK | User kích hoạt external attempt |
| `feature` | `text` | No |  | Technical feature key |
| `status` | `AIRequestStatus` | No |  | SUCCESS/FAILED |
| `error_code` | `text` | Yes | null | Provider/app error key |
| `duration_ms` | `integer` | Yes | null | Thu thập được thì lưu ms |
| `created_at` | `timestamptz(3)` | No | now | Attempt time |

### Constraint

```sql
CHECK (duration_ms IS NULL OR duration_ms >= 0)
```

### FK

```text
user_id -> users.id ON DELETE RESTRICT
```

### Index

```text
INDEX(status)
INDEX(created_at DESC)
INDEX(feature, created_at DESC)
INDEX(user_id, created_at DESC)
```

### Log semantics

Tạo row khi external AI call **đã bắt đầu attempt**.

Không tạo row cho:

- authorization fail;
- validation fail trước AI;
- `INSUFFICIENT_DATA`;
- business ineligible trước AI;
- history read;
- Reject preview/adjustment.

Admin dashboard:

```text
totalAIRequests  = COUNT(ai_request_logs)
failedAIRequests = COUNT(*) WHERE status = 'FAILED'
```

Không purge tự động trong vòng đời phát triển/demo MVP.

---

## 7.13. `temporary_contexts`

| Cột | PostgreSQL | Null | Key/Default | Ghi chú |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK | Internal ID |
| `opaque_ref` | `text` | No | UNIQUE | Reference trả cho client |
| `context_type` | `ContextType` | No |  | 4 context types |
| `owner_user_id` | `uuid` | No | FK | User sở hữu context |
| `resource_key` | `text` | No |  | Bind resource/scope |
| `payload` | `jsonb` | No |  | Preview/snapshot/result |
| `status` | `ContextStatus` | No | `OPEN` | OPEN/CONSUMED |
| `request_fingerprint` | `text` | Yes | null | Mutation có editable payload |
| `replay_result` | `jsonb` | Yes | null | Logical success result/resource identity |
| `expires_at` | `timestamptz(3)` | No |  | OPEN TTL |
| `retention_until` | `timestamptz(3)` | No |  | Cleanup boundary |
| `consumed_at` | `timestamptz(3)` | Yes | null |  |
| `version` | `integer` | No | 0 | Optimistic concurrency nếu dùng |
| `created_at` | `timestamptz(3)` | No | now |  |
| `updated_at` | `timestamptz(3)` | No | Prisma `@updatedAt` | Prisma-managed application timestamp; không yêu cầu DB default `now()` |

### Reference strategy

`opaque_ref` phải được sinh bằng random token đủ khó đoán.

Khuyến nghị:

```text
32 random bytes -> base64url
```

Không dùng sequential ID làm client-facing reference.

### Resource binding theo `ContextType`

`resource_key` là giá trị kỹ thuật do backend tự tạo; client không được gửi hoặc quyết định giá trị này. Mục tiêu là khóa temporary context vào đúng resource/scope đã tạo ra context, phù hợp API-DD-002.

| `context_type` | `resource_key` đề xuất | Ý nghĩa binding |
|---|---|---|
| `STUDY_PLAN_PREVIEW` | `student:<ownerUserId>` | Preview chỉ dùng cho Student đã tạo preview đó |
| `STUDY_PLAN_ADJUSTMENT` | `study-plan:<studyPlanId>` | Adjustment chỉ áp dụng lên đúng current StudyPlan đã được phân tích |
| `TEACHER_CLASS_ANALYSIS` | `class:<classId>` | Analysis/Save chỉ thuộc đúng Class mà Teacher được phân công |
| `ADMIN_FEEDBACK_ANALYSIS` | `feedback-dataset:<datasetFingerprint>` | Bind đúng filtered dataset đã được backend snapshot; fingerprint được tạo từ canonical filter + authoritative `feedbackIds` |

`datasetFingerprint` ở đây là technical binding value, không thay `requestFingerprint` của mutation. Service vẫn phải revalidate `ownerUserId`, role hiện tại, `contextType`, `resourceKey`, TTL/status và payload schema trước khi mutation.

### Constraint

```sql
CHECK (
  (status = 'OPEN'
    AND consumed_at IS NULL
    AND replay_result IS NULL)
  OR
  (status = 'CONSUMED'
    AND consumed_at IS NOT NULL
    AND replay_result IS NOT NULL)
)

CHECK (
  retention_until >= expires_at
  AND (
    status <> 'CONSUMED'
    OR retention_until >= consumed_at + INTERVAL '10 minutes'
  )
)
```

### TTL

Khi tạo:

```text
expiresAt       = createdAt + 60 phút
retentionUntil  = expiresAt
status          = OPEN
```

Khi consume thành công:

```text
status          = CONSUMED
consumedAt      = now
retentionUntil  = max(expiresAt, consumedAt + 10 phút)
replayResult    = logical success result/resource identity
requestFingerprint = hash(normalized Apply payload)  # chỉ STUDY_PLAN_PREVIEW / StudyPlan Apply
```

Với `STUDY_PLAN_ADJUSTMENT`, `TEACHER_CLASS_ANALYSIS` và `ADMIN_FEEDBACK_ANALYSIS`, mutation Save/Apply chỉ nhận opaque reference nên `requestFingerprint` có thể tiếp tục `NULL`; replay identity dựa trên reference + owner/resource binding.

### Index

```text
UNIQUE(opaque_ref)
INDEX(owner_user_id, context_type, status)
INDEX(status, expires_at)
INDEX(retention_until)
```

### Cleanup

Chỉ physical-delete khi:

```text
now >= retentionUntil
```

Không dùng rule chung:

```sql
DELETE WHERE expires_at < now
```

vì có thể xóa replay mapping của context CONSUMED quá sớm.

---

# 8. Relationship & Cardinality Matrix

| From | Quan hệ | To | Cardinality | FK |
|---|---|---|---|---|
| User(Teacher) | phụ trách | Class | 1 → N | `classes.teacher_id` |
| Class | chứa | ClassMember | 1 → N | `class_members.class_id` |
| User(Student) | tham gia | ClassMember | 1 → N | `class_members.student_id` |
| Course | chứa | Topic | 1 → N | `topics.course_id` |
| User(Student) | có | AssessmentResult | 1 → N | `assessment_results.student_id` |
| Topic | được đánh giá bởi | AssessmentResult | 1 → N | `assessment_results.topic_id` |
| User(Student) | sở hữu | StudyPlan | 1 → N history | `study_plans.student_id` |
| StudyPlan | chứa | StudyTask | 1 → N | `study_tasks.study_plan_id` |
| Topic | tham chiếu bởi | StudyTask | 1 → N | `study_tasks.topic_id` |
| Class | có history | ClassAnalysisReport | 1 → N | `class_analysis_reports.class_id` |
| User(Student/Teacher) | gửi | Feedback | 1 → N | `feedback.user_id` |
| User | kích hoạt | AIRequestLog | 1 → N | `ai_request_logs.user_id` |
| User | sở hữu | TemporaryContext | 1 → N | `temporary_contexts.owner_user_id` |
| FeedbackAnalysis | snapshot tập | Feedback | logical only | không FK |

---

# 9. Index Strategy

## 9.1. Mục tiêu

Index chỉ được tạo cho query pattern rõ ràng của MVP:

- login/search email;
- Teacher → Class;
- Class → Student;
- latest AssessmentResult;
- current StudyPlan;
- task progress/due date;
- Teacher history;
- Admin feedback filter;
- Admin history;
- AI aggregate;
- temporary context lookup/cleanup.

## 9.2. Danh sách đề xuất

```text
users:
  UNIQUE(email)
  INDEX(role)
  INDEX(status)

classes:
  INDEX(teacher_id)

class_members:
  PK(class_id, student_id)
  INDEX(student_id)

topics:
  INDEX(course_id)

assessment_results:
  INDEX(student_id, topic_id, evaluated_at DESC)

study_plans:
  UNIQUE PARTIAL(student_id) WHERE status IN (ACTIVE, COMPLETED)
  INDEX(student_id, status)
  INDEX(student_id, created_at DESC)

study_tasks:
  INDEX(study_plan_id, status)
  INDEX(study_plan_id, due_date)
  INDEX(topic_id)

class_analysis_reports:
  INDEX(class_id, created_at DESC)

feedback:
  INDEX(created_at DESC)
  INDEX(tag, created_at DESC)
  INDEX(rating, created_at DESC)
  INDEX(user_id, created_at DESC)

feedback_analyses:
  INDEX(created_at DESC)

ai_request_logs:
  INDEX(status)
  INDEX(created_at DESC)
  INDEX(feature, created_at DESC)
  INDEX(user_id, created_at DESC)

temporary_contexts:
  UNIQUE(opaque_ref)
  INDEX(owner_user_id, context_type, status)
  INDEX(status, expires_at)
  INDEX(retention_until)
```

Không thêm GIN index vào JSONB ở MVP vì current API không filter sâu trực tiếp trên snapshot/result.

### 9.3. Admin user search

API Admin có `q` để tìm theo `fullName` hoặc normalized email. Với quy mô MVP/demo:

- exact normalized email lookup tiếp tục dùng `UNIQUE(email)` B-tree;
- substring/partial search trên `full_name` hoặc `email` có thể dùng query case-insensitive + sequential scan ở quy mô seed/demo;
- chưa thêm `pg_trgm`, GIN/GiST hoặc full-text index chỉ để tối ưu sớm.

Nếu dữ liệu thực tế tăng và đo đạc cho thấy endpoint tìm user chậm, index tìm kiếm chuyên dụng phải được bổ sung qua Database Design revision/migration thay vì tự thêm ad-hoc.

---

# 10. Transaction Boundaries

## 10.1. Apply StudyPlan

Bắt buộc revalidate trước mutation rằng validated preview còn **ít nhất một StudyTask hợp lệ**. Không được commit một StudyPlan mới có `0` task từ luồng Apply. Đây là service-level invariant theo API baseline; không cần trigger/database count constraint.

Sau validation, thực hiện một database transaction:

```text
BEGIN
  resolve + lock/claim TemporaryContext OPEN
  revalidate owner/context/payload/business state
  assert validated task set is not empty
  archive old current StudyPlan nếu có
  create new StudyPlan ACTIVE
  create all StudyTask TODO
  final context update trong MỘT SQL/ORM update statement:
    requestFingerprint = hash(normalized Apply payload)
    replayResult       = logical success result/resource identity
    status             = CONSUMED
    consumedAt         = now
    retentionUntil     = max(expiresAt, consumedAt + 10 phút)
COMMIT
```

Bất kỳ lỗi nào:

```text
ROLLBACK
```

Không được để:

- old plan đã ARCHIVED nhưng new plan chưa tạo;
- new plan có thiếu task;
- StudyPlan Apply commit nhưng thiếu `requestFingerprint`/`replayResult`;
- context đã CONSUMED nhưng business mutation rollback;
- business mutation commit nhưng context vẫn OPEN.

Business mutation + final context update phải thuộc **cùng atomic transaction**. Riêng final context update phải ghi `requestFingerprint`, `replayResult`, `status = CONSUMED`, `consumedAt` và `retentionUntil` trong **cùng một SQL/ORM update statement**. Không tách thành các update tuần tự khi context vẫn `OPEN`, vì `ck_temporary_contexts_status_replay` cấm `OPEN` có `replayResult` khác `NULL`.

## 10.2. Accept StudyPlan Adjustment

Một transaction:

```text
claim adjustment context
revalidate current plan + TODO tasks + dueDate
update toàn bộ adjustment set
consume context + replay result
commit
```

Nếu một task update fail → rollback toàn bộ set.

## 10.3. Toggle StudyTask status

Cùng transaction:

```text
update StudyTask.status
update StudyTask.completedAt

if all tasks are COMPLETED:
    StudyPlan ACTIVE -> COMPLETED

if an undo makes at least one task TODO and plan is COMPLETED:
    StudyPlan COMPLETED -> ACTIVE

commit task + plan state together
```

Không cho mutation task của StudyPlan `ARCHIVED`. Nếu cập nhật task hoặc plan state thất bại, rollback toàn bộ request.

## 10.4. Save Teacher Analysis

Cùng transaction:

```text
claim analysis context
revalidate Teacher -> Class authorization
insert ClassAnalysisReport from backend-owned payload
consume context + replay result
commit
```

Không lấy live Class data thay snapshot.

## 10.5. Save Admin FeedbackAnalysis

Cùng transaction:

```text
claim analysis context
revalidate Admin ACTIVE/role
insert FeedbackAnalysis from backend-owned payload
consume context + replay result
commit
```

Không lấy feedback live thay snapshot.

## 10.6. Không giữ transaction khi gọi AI

External AI/network call phải hoàn tất và output phải được validate trước transaction mutation/consume.

---

# 11. Concurrency & Idempotency

## 11.1. Same TemporaryContext

Hai request đồng thời không được cùng mutate một context `OPEN`.

Implementation có thể dùng:

- conditional atomic update;
- optimistic version;
- row lock;
- targeted raw SQL nếu Prisma primitive chưa đủ.

Yêu cầu cuối cùng:

```text
chỉ một request được quyền mutation
```

## 11.2. Replay identity theo loại mutation

TemporaryContext có hai cơ chế replay identity, đúng API-DD-002:

### StudyPlan Apply — mutation có editable payload

StudyPlan Apply là mutation hiện tại có editable payload. Backend phải tạo `requestFingerprint` từ normalized mutation payload của lần thành công đầu tiên.

Sau khi context đã `CONSUMED`:

```text
same reference + same normalized fingerprint
    -> trả replayResult
    -> không mutation lần hai

same reference + different normalized fingerprint
    -> CONTEXT_ALREADY_CONSUMED
    -> không mutation
```

### Adjustment Apply / Teacher Save / Admin Save — opaque-reference-only

Ba mutation này không có editable payload bổ sung. Replay identity dựa trên:

```text
opaque reference
+ owner/user binding
+ resource binding
```

Retry cùng reference hợp lệ sau thành công phải trả `replayResult` cũ và không mutation lần hai. `requestFingerprint` không bắt buộc cho các context này.

## 11.3. Concurrent access trên cùng reference

Dù dùng loại replay identity nào, cùng một context `OPEN` phải được atomic-claim/serialize để chỉ một request có thể commit mutation. Request concurrent còn lại sau commit phải đi theo replay/conflict semantics tương ứng; nếu request đầu rollback thì context vẫn `OPEN` nếu chưa hết hạn.

## 11.4. Hai planPreviewRef khác nhau cho cùng Student

Partial unique current-plan index là database safety net.

Nếu hai transaction khác reference cố Apply đồng thời:

- tối đa một transaction được commit với current plan mới;
- transaction còn lại phải rollback/conflict;
- không được tồn tại hai plan `ACTIVE/COMPLETED` cho cùng Student.

---

# 12. Database Constraint Matrix

| Rule | DB Constraint | Backend | Test |
|---|---:|---:|---:|
| Email normalized | CHECK | ✓ | ✓ |
| Email unique | UNIQUE | ✓ | ✓ |
| User role/status enum | Enum | ✓ | ✓ |
| Teacher role cho Class.teacherId | – | ✓ | ✓ |
| Student role cho ClassMember.studentId | – | ✓ | ✓ |
| Assessment score 0–100 | CHECK | ✓ | ✓ |
| One current StudyPlan | Partial UNIQUE | ✓ | ✓ |
| StudyPlan title non-empty | CHECK | ✓ | ✓ |
| availableMinutesPerWeek > 0 | CHECK | ✓ | ✓ |
| StudyPlan goal non-empty | CHECK | ✓ | ✓ |
| endDate > startDate | CHECK | ✓ | ✓ |
| StudyTask title non-empty | CHECK | ✓ | ✓ |
| expectedMinutes > 0 | CHECK | ✓ | ✓ |
| completedAt ↔ task status | CHECK | ✓ | ✓ |
| dueDate inside plan range | cross-table | ✓ | ✓ |
| topicId exists | FK | ✓ | ✓ |
| topicId thuộc valid AI input set | – | ✓ | ✓ |
| feedback rating 1..5 | CHECK | ✓ | ✓ |
| feedback content non-empty | CHECK | ✓ | ✓ |
| feedback user role Student/Teacher | – | ✓ | ✓ |
| history snapshot immutable by API | – | ✓ | ✓ |
| AI log only after external attempt | – | ✓ | ✓ |
| TemporaryContext status/consumedAt/replayResult | CHECK | ✓ | ✓ |
| TemporaryContext replay atomic | transaction | ✓ | ✓ |
| TemporaryContext retention `>= expiresAt` và khi CONSUMED `>= consumedAt + 10m` | conditional CHECK + query | ✓ | ✓ |

---

# 13. Prisma Schema Candidate

Đây là schema candidate đủ gần implementation. Constraint/index mà Prisma version tại thời điểm bootstrap không biểu diễn trực tiếp phải được bổ sung bằng migration SQL có version-control.

### Authoritative physical exception cho `AssessmentResult.score`

Trong PSL bên dưới, `score` giữ kiểu `Decimal` để Prisma Client thao tác bằng decimal semantics. Tuy nhiên physical contract của tài liệu này là PostgreSQL `numeric` **không khóa precision/scale nghiệp vụ**. Vì exact Prisma version có thể sinh bounded decimal mặc định, migration SQL ở §14 là authoritative cho end-state của cột này.

Quy tắc implementation:

- không xóa `ALTER COLUMN score TYPE numeric` chỉ vì PSL vẫn ghi `Decimal`;
- review mọi generated migration chạm vào `assessment_results.score`;
- không chấp nhận migration tái đưa typmod/scale làm thay đổi round-trip `59.999`/`79.999`;
- migration history + integration test precision là bằng chứng physical schema, không chỉ nhìn PSL.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  STUDENT
  TEACHER
  ADMINISTRATOR
}

enum UserStatus {
  ACTIVE
  DISABLED
}

enum StudyPlanStatus {
  ACTIVE
  COMPLETED
  ARCHIVED
}

enum StudyTaskStatus {
  TODO
  COMPLETED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}

enum FeedbackTag {
  AI_PERFORMANCE
  STUDY_PLAN
  UI_UX
  LEARNING_ANALYTICS
  OTHER
}

enum AIRequestStatus {
  SUCCESS
  FAILED
}

enum ContextType {
  STUDY_PLAN_PREVIEW
  STUDY_PLAN_ADJUSTMENT
  TEACHER_CLASS_ANALYSIS
  ADMIN_FEEDBACK_ANALYSIS
}

enum ContextStatus {
  OPEN
  CONSUMED
}

model User {
  id           String       @id @default(uuid()) @db.Uuid
  fullName     String       @map("full_name")
  email        String       @unique
  passwordHash String       @map("password_hash")
  role         Role
  status       UserStatus   @default(ACTIVE)
  createdAt    DateTime     @default(now()) @map("created_at") @db.Timestamptz(3)

  taughtClasses     Class[]               @relation("TeacherClasses")
  classMemberships  ClassMember[]         @relation("StudentClassMemberships")
  assessmentResults AssessmentResult[]
  studyPlans        StudyPlan[]
  feedback          Feedback[]
  aiRequestLogs     AIRequestLog[]
  temporaryContexts TemporaryContext[]

  @@index([role])
  @@index([status])
  @@map("users")
}

model Class {
  id        String @id @default(uuid()) @db.Uuid
  name      String
  teacherId String @map("teacher_id") @db.Uuid

  teacher         User                  @relation("TeacherClasses", fields: [teacherId], references: [id], onDelete: Restrict)
  members         ClassMember[]
  analysisReports ClassAnalysisReport[]

  @@index([teacherId])
  @@map("classes")
}

model ClassMember {
  classId   String @map("class_id") @db.Uuid
  studentId String @map("student_id") @db.Uuid

  class   Class @relation(fields: [classId], references: [id], onDelete: Restrict)
  student User  @relation("StudentClassMemberships", fields: [studentId], references: [id], onDelete: Restrict)

  @@id([classId, studentId])
  @@index([studentId])
  @@map("class_members")
}

model Course {
  id          String  @id @default(uuid()) @db.Uuid
  name        String
  description String?

  topics Topic[]

  @@map("courses")
}

model Topic {
  id       String @id @default(uuid()) @db.Uuid
  courseId String @map("course_id") @db.Uuid
  name     String

  course            Course             @relation(fields: [courseId], references: [id], onDelete: Restrict)
  assessmentResults AssessmentResult[]
  studyTasks        StudyTask[]

  @@index([courseId])
  @@map("topics")
}

model AssessmentResult {
  id          String   @id @default(uuid()) @db.Uuid
  studentId   String   @map("student_id") @db.Uuid
  topicId     String   @map("topic_id") @db.Uuid
  score       Decimal  // Physical end-state: PostgreSQL numeric unbounded; xem §13/§14
  evaluatedAt DateTime @map("evaluated_at") @db.Timestamptz(3)

  student User  @relation(fields: [studentId], references: [id], onDelete: Restrict)
  topic   Topic @relation(fields: [topicId], references: [id], onDelete: Restrict)

  @@index([studentId, topicId, evaluatedAt(sort: Desc)])
  @@map("assessment_results")
}

model StudyPlan {
  id                      String          @id @default(uuid()) @db.Uuid
  studentId               String          @map("student_id") @db.Uuid
  title                   String
  goal                    String
  availableMinutesPerWeek Int             @map("available_minutes_per_week")
  startDate               DateTime        @map("start_date") @db.Timestamptz(3)
  endDate                 DateTime        @map("end_date") @db.Timestamptz(3)
  status                  StudyPlanStatus @default(ACTIVE)
  createdAt               DateTime        @default(now()) @map("created_at") @db.Timestamptz(3)

  student User        @relation(fields: [studentId], references: [id], onDelete: Restrict)
  tasks   StudyTask[]

  @@index([studentId, status])
  @@index([studentId, createdAt(sort: Desc)])
  @@map("study_plans")
}

model StudyTask {
  id              String          @id @default(uuid()) @db.Uuid
  studyPlanId     String          @map("study_plan_id") @db.Uuid
  topicId         String          @map("topic_id") @db.Uuid
  title           String
  goal            String
  expectedMinutes Int             @map("expected_minutes")
  dueDate         DateTime        @map("due_date") @db.Timestamptz(3)
  priority        Priority
  status          StudyTaskStatus @default(TODO)
  completedAt     DateTime?       @map("completed_at") @db.Timestamptz(3)

  studyPlan StudyPlan @relation(fields: [studyPlanId], references: [id], onDelete: Restrict)
  topic     Topic     @relation(fields: [topicId], references: [id], onDelete: Restrict)

  @@index([studyPlanId, status])
  @@index([studyPlanId, dueDate])
  @@index([topicId])
  @@map("study_tasks")
}

model ClassAnalysisReport {
  id             String   @id @default(uuid()) @db.Uuid
  classId        String   @map("class_id") @db.Uuid
  inputSnapshot  Json     @map("input_snapshot") @db.JsonB
  analysisResult Json     @map("analysis_result") @db.JsonB
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz(3)

  class Class @relation(fields: [classId], references: [id], onDelete: Restrict)

  @@index([classId, createdAt(sort: Desc)])
  @@map("class_analysis_reports")
}

model Feedback {
  id        String      @id @default(uuid()) @db.Uuid
  userId    String      @map("user_id") @db.Uuid
  tag       FeedbackTag
  rating    Int         @db.SmallInt
  content   String
  createdAt DateTime    @default(now()) @map("created_at") @db.Timestamptz(3)

  user User @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@index([createdAt(sort: Desc)])
  @@index([tag, createdAt(sort: Desc)])
  @@index([rating, createdAt(sort: Desc)])
  @@index([userId, createdAt(sort: Desc)])
  @@map("feedback")
}

model FeedbackAnalysis {
  id             String   @id @default(uuid()) @db.Uuid
  inputSnapshot  Json     @map("input_snapshot") @db.JsonB
  analysisResult Json     @map("analysis_result") @db.JsonB
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz(3)

  @@index([createdAt(sort: Desc)])
  @@map("feedback_analyses")
}

model AIRequestLog {
  id         String          @id @default(uuid()) @db.Uuid
  userId     String          @map("user_id") @db.Uuid
  feature    String
  status     AIRequestStatus
  errorCode  String?         @map("error_code")
  durationMs Int?            @map("duration_ms")
  createdAt  DateTime        @default(now()) @map("created_at") @db.Timestamptz(3)

  user User @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@index([status])
  @@index([createdAt(sort: Desc)])
  @@index([feature, createdAt(sort: Desc)])
  @@index([userId, createdAt(sort: Desc)])
  @@map("ai_request_logs")
}

model TemporaryContext {
  id                 String        @id @default(uuid()) @db.Uuid
  opaqueRef          String        @unique @map("opaque_ref")
  contextType        ContextType   @map("context_type")
  ownerUserId        String        @map("owner_user_id") @db.Uuid
  resourceKey        String        @map("resource_key")
  payload            Json          @db.JsonB
  status             ContextStatus @default(OPEN)
  requestFingerprint String?       @map("request_fingerprint")
  replayResult       Json?         @map("replay_result") @db.JsonB
  expiresAt          DateTime      @map("expires_at") @db.Timestamptz(3)
  retentionUntil     DateTime      @map("retention_until") @db.Timestamptz(3)
  consumedAt         DateTime?     @map("consumed_at") @db.Timestamptz(3)
  version            Int           @default(0)
  createdAt          DateTime      @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt          DateTime      @updatedAt @map("updated_at") @db.Timestamptz(3)

  owner User @relation(fields: [ownerUserId], references: [id], onDelete: Restrict)

  @@index([ownerUserId, contextType, status])
  @@index([status, expiresAt])
  @@index([retentionUntil])
  @@map("temporary_contexts")
}
```

---

# 14. Migration SQL bổ sung

Các constraint sau phải tồn tại ở PostgreSQL. Nếu Prisma schema/version tại thời điểm bootstrap không biểu diễn trực tiếp, thêm bằng migration SQL.

```sql
-- users
ALTER TABLE users
ADD CONSTRAINT ck_users_email_normalized
CHECK (email = lower(btrim(email)));

-- assessment_results
-- AUTHORITATIVE PHYSICAL EXCEPTION: giữ score là PostgreSQL numeric không typmod.
-- Không bỏ ALTER này nếu generated Prisma migration tạo bounded decimal mặc định.
ALTER TABLE assessment_results
ALTER COLUMN score TYPE numeric USING score::numeric;

ALTER TABLE assessment_results
ADD CONSTRAINT ck_assessment_results_score_range
CHECK (score >= 0 AND score <= 100);

-- study_plans
ALTER TABLE study_plans
ADD CONSTRAINT ck_study_plans_title_not_blank
CHECK (char_length(btrim(title)) > 0);

ALTER TABLE study_plans
ADD CONSTRAINT ck_study_plans_available_minutes_positive
CHECK (available_minutes_per_week > 0);

ALTER TABLE study_plans
ADD CONSTRAINT ck_study_plans_goal_not_blank
CHECK (char_length(btrim(goal)) > 0);

ALTER TABLE study_plans
ADD CONSTRAINT ck_study_plans_date_range
CHECK (end_date > start_date);

CREATE UNIQUE INDEX uq_study_plans_one_current_per_student
ON study_plans(student_id)
WHERE status IN ('ACTIVE', 'COMPLETED');

-- study_tasks
ALTER TABLE study_tasks
ADD CONSTRAINT ck_study_tasks_title_not_blank
CHECK (char_length(btrim(title)) > 0);

ALTER TABLE study_tasks
ADD CONSTRAINT ck_study_tasks_expected_minutes_positive
CHECK (expected_minutes > 0);

ALTER TABLE study_tasks
ADD CONSTRAINT ck_study_tasks_completed_at_status
CHECK (
  (status = 'TODO' AND completed_at IS NULL)
  OR
  (status = 'COMPLETED' AND completed_at IS NOT NULL)
);

-- feedback
ALTER TABLE feedback
ADD CONSTRAINT ck_feedback_rating_range
CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE feedback
ADD CONSTRAINT ck_feedback_content_not_blank
CHECK (char_length(btrim(content)) > 0);

-- ai_request_logs
ALTER TABLE ai_request_logs
ADD CONSTRAINT ck_ai_request_logs_duration_nonnegative
CHECK (duration_ms IS NULL OR duration_ms >= 0);

-- temporary_contexts
ALTER TABLE temporary_contexts
ADD CONSTRAINT ck_temporary_contexts_status_replay
CHECK (
  (status = 'OPEN'
    AND consumed_at IS NULL
    AND replay_result IS NULL)
  OR
  (status = 'CONSUMED'
    AND consumed_at IS NOT NULL
    AND replay_result IS NOT NULL)
);

ALTER TABLE temporary_contexts
ADD CONSTRAINT ck_temporary_contexts_retention
CHECK (
  retention_until >= expires_at
  AND (
    status <> 'CONSUMED'
    OR retention_until >= consumed_at + INTERVAL '10 minutes'
  )
);
```

---

# 15. Query Patterns quan trọng

## 15.1. Login

```text
normalize email
-> SELECT user WHERE email = normalizedEmail
-> verify Argon2id
-> check ACTIVE
```

Database unique email hỗ trợ lookup trực tiếp.

## 15.2. Latest AssessmentResult

Logical query:

```text
for each Student + Topic
ORDER BY evaluatedAt DESC
take first
```

Index:

```text
(student_id, topic_id, evaluated_at DESC)
```

## 15.3. Current StudyPlan

```text
WHERE student_id = ?
AND status IN ('ACTIVE', 'COMPLETED')
```

Partial unique index bảo đảm 0 hoặc 1 record.

## 15.4. Student progress

Không query `learning_progress`.

Tính từ:

```text
current StudyPlan
+ StudyTask
```

- totalTasks;
- completedTasks;
- actualProgress;
- overdueTaskCount;
- expectedProgress theo business logic.

## 15.5. Teacher class access

```text
classes.teacher_id = currentUser.id
```

Sau đó mới query ClassMember/Student data.

## 15.6. Teacher history

```text
WHERE class_id = ?
ORDER BY created_at DESC
```

Không recompute data live.

## 15.7. Admin feedback filter

Có thể filter:

```text
created_at range
tag
rating
```

Tag statistics phải tính trên dataset sau filter.

## 15.8. Admin dashboard

```text
COUNT(users)
GROUP BY users.role
COUNT(feedback)
COUNT(ai_request_logs)
COUNT(ai_request_logs WHERE status = FAILED)
```

Không cần bảng aggregate riêng cho MVP.

---

# 16. JSONB Contract Boundary

## 16.1. ClassAnalysisReport.inputSnapshot

Lưu đúng `TeacherAnalysisInputSnapshot` do backend tạo ở analysis-time, không dùng field alias khác với API contract. Ví dụ:

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
  "needsAttentionStudents": [],
  "progressWarnings": []
}
```

Shape persisted phải bám đúng API contract hiện hành để history list/detail không cần mapping lại field name.

## 16.2. ClassAnalysisReport.analysisResult

Lưu đúng `TeacherAnalysisResult` đã validate. Ví dụ:

```json
{
  "summary": "...",
  "weakTopics": [],
  "progressIssues": [],
  "attentionGroups": [],
  "recommendations": []
}
```

Chỉ lưu output đã validate.

## 16.3. FeedbackAnalysis.inputSnapshot

Persisted analysis chỉ tồn tại khi filtered dataset ban đầu không rỗng. Ví dụ hợp lệ:

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

Nếu filtered dataset rỗng, flow phải trả `INSUFFICIENT_DATA`, không gọi AI và không tạo `FeedbackAnalysis` để lưu.

## 16.4. FeedbackAnalysis.analysisResult

Tối thiểu:

```json
{
  "issueGroups": [],
  "summary": "...",
  "priorityAreas": [],
  "recommendations": []
}
```

`issueGroups = []` vẫn là kết quả hợp lệ khi dataset ban đầu không rỗng và flow AI hợp lệ.

## 16.5. TemporaryContext.payload

Payload phụ thuộc `contextType`.

Database Design không biến payload JSONB thành nguồn quyền lực mới; service phải validate context type + owner + resource + payload schema trước mutation.

---

# 17. Seed Data Strategy

## 17.1. Mục tiêu

Seed phải đủ để demo ba role và các edge case chính.

## 17.2. User seed

Tối thiểu:

- 2 Student;
- 1 Teacher;
- 1 Administrator;
- có thể thêm 1 User DISABLED để test auth.

Password seed phải được hash Argon2id; không lưu plain password trong database.

Plain demo credential nếu cần chỉ tồn tại trong tài liệu/dev seed input phù hợp, không log hash/password ở runtime.

## 17.3. Academic seed

- 1 Course chính;
- nhiều Topic;
- 1–2 Class;
- ClassMember;
- nhiều AssessmentResult, gồm:
  - score < 60;
  - score 60–79.x;
  - score >= 80;
  - nhiều record cùng Student–Topic để test latest result.

## 17.4. StudyPlan seed

Nên có:

- Student có current ACTIVE plan;
- task TODO;
- task COMPLETED;
- task overdue;
- task near-due;
- archived plan để kiểm tra current-plan semantics.

## 17.5. Feedback seed

Kết hợp:

- seed feedback;
- feedback thật gửi qua UI khi demo.

Có đủ các tag và rating để Admin filter/AI analysis có dữ liệu.

## 17.6. AI history seed

Có thể seed ClassAnalysisReport/FeedbackAnalysis để test history UI, nhưng demo chính nên lưu ít nhất một record qua flow thật để chứng minh end-to-end persistence.

---

# 18. Security & Privacy

## 18.1. Password

- chỉ lưu Argon2id encoded hash;
- không log password/hash;
- không trả hash qua API.

## 18.2. Authorization

Database FK không thay thế authorization.

Backend vẫn phải kiểm tra:

1. JWT hợp lệ;
2. User tồn tại;
3. User ACTIVE;
4. role hợp lệ;
5. ownership/resource relation.

## 18.3. Snapshot

Snapshot AI có thể chứa thông tin học tập của Student.

Do đó:

- chỉ truy cập qua backend;
- Teacher history bị giới hạn theo Class được phân công;
- Admin history theo quyền Administrator;
- không expose raw DB trực tiếp ra frontend.

## 18.4. TemporaryContext

- `opaqueRef` phải khó đoán;
- luôn bind `ownerUserId`;
- bind resource/scope;
- hết hạn phải bị từ chối kể cả row chưa cleanup vật lý;
- replay chỉ được trả cho đúng owner/resource.

---

# 19. Migration Policy

Mọi thay đổi schema đi theo luồng:

```text
Requirement/Architecture impact check
    ↓
Database Design revision nếu cần
    ↓
prisma/schema.prisma
    ↓
Prisma migration
    ↓
manual SQL trong migration nếu cần constraint/index đặc thù
    ↓
seed update
    ↓
integration tests
```

Không dùng `db push` để thay lịch sử migration chính thức khi implementation đã ổn định.

Migration đã apply không sửa ngược tùy tiện; thay đổi tiếp theo tạo migration mới.

---

# 20. Test Checklist cho Database

## 20.1. User

- email normalize;
- duplicate email khác hoa/thường bị từ chối;
- duplicate email có whitespace bị backend normalize rồi từ chối;
- password hash không được trả API;
- DISABLED user bị từ chối ở protected request.

## 20.2. AssessmentResult

- score = 0 hợp lệ;
- score = 100 hợp lệ;
- score < 0 fail;
- score > 100 fail;
- round-trip database giữ được score có hơn 2 chữ số thập phân, ví dụ `59.999` và `79.999`;
- storage không làm `59.999` thành `60.00` hoặc `79.999` thành `80.00` trước khi rule được đánh giá;
- nhiều result cùng Student–Topic được phép;
- query latest trả đúng evaluatedAt lớn nhất.

## 20.3. StudyPlan

- title blank fail;
- availableMinutes > 0;
- goal blank fail;
- endDate <= startDate fail;
- một Student có ACTIVE rồi tạo current plan thứ hai ngoài transaction phải bị DB chặn;
- Apply bị từ chối nếu validated preview có `0` StudyTask;
- apply đúng transaction archive old + create new + ít nhất 1 task;
- tất cả task COMPLETED làm plan `ACTIVE -> COMPLETED`;
- undo một task của current plan COMPLETED làm plan `COMPLETED -> ACTIVE`;
- plan quá `endDate` nhưng còn TODO vẫn ACTIVE;
- rollback không để half-state.

## 20.4. StudyTask

- title blank fail;
- expectedMinutes > 0;
- TODO + completedAt non-null fail;
- COMPLETED + completedAt null fail;
- dueDate ngoài plan range bị service từ chối;
- task của ARCHIVED plan không được mutation;
- toggle task + StudyPlan state atomic.

## 20.5. Feedback

- rating 1 và 5 hợp lệ;
- rating 0/6 fail;
- blank content fail;
- tag enum hợp lệ;
- filter theo createdAt/tag/rating đúng.

## 20.6. History

- report/analysis giữ snapshot cũ khi live data thay đổi;
- history read không gọi AI;
- Teacher không đọc report Class ngoài quyền;
- không có mutation API cho history.

## 20.7. AIRequestLog

- success external attempt tạo log;
- timeout tạo FAILED log;
- invalid output sau call tạo FAILED log;
- validation fail trước call không tạo log;
- INSUFFICIENT_DATA không tạo log;
- Một Admin two-stage analysis request thành công tạo **đúng 2 `AIRequestLog`**: một cho Stage 1 và một cho Stage 2; test phải fail nếu cùng request tạo thừa hoặc thiếu log.

## 20.8. TemporaryContext

- context resolve đúng `ownerUserId` + `contextType` + `resourceKey`;
- ref của user/resource khác bị từ chối;
- `resourceKey` luôn do backend derive, không lấy từ client;
- OPEN valid trước expiresAt;
- OPEN quá expiresAt bị từ chối;
- mutation success → `CONSUMED` + `consumedAt` + non-null `replayResult`;
- StudyPlan Apply success đồng thời lưu non-null `requestFingerprint` từ normalized Apply payload;
- database từ chối state `CONSUMED` nhưng `replayResult = null`;
- database từ chối state `OPEN` nếu `consumedAt` hoặc `replayResult` đã có giá trị;
- context `CONSUMED` có `retentionUntil >= consumedAt + 10 phút` và luôn `>= expiresAt`;
- rollback → context vẫn OPEN nếu chưa hết hạn;
- StudyPlan Apply: same ref + same normalized fingerprint → replay;
- StudyPlan Apply: same ref + different normalized fingerprint → conflict;
- Adjustment/Teacher Save/Admin Save: retry cùng ref + đúng owner/resource → replay mà không cần `requestFingerprint`;
- two concurrent same-ref requests không double mutation;
- cleanup không xóa trước retentionUntil.

---

# 21. Traceability Matrix

| Database area | Requirement / Rule chính |
|---|---|
| `users` | DATA-REQ-012, BR-039, BR-020, BR-032, ADR-AUTH-001 |
| `classes` / `class_members` | BR-002, BR-019, SRS Data 6.2/6.3 |
| `courses` / `topics` | BR-022, BR-033, DATA-REQ-013 |
| `assessment_results` | DATA-REQ-008/010/011, BR-016, BR-026, BR-034, OD-35 |
| `study_plans` | BR-005, BR-021, BR-024, BR-036, BR-037, DATA-REQ-005 |
| `study_tasks` | BR-005, BR-021, BR-025, BR-028, BR-037, DATA-REQ-005/006/013 |
| `class_analysis_reports` | BR-030, BR-044, BR-045, DATA-REQ-015 |
| `feedback` | BR-013, BR-014, BR-015, DATA-REQ-004 |
| `feedback_analyses` | BR-030, BR-042, BR-043, BR-044, BR-046, DATA-REQ-015 |
| `ai_request_logs` | FR-COM-006, AI-REQ-018/019, DATA-REQ-009, BR-029 |
| `temporary_contexts` | API-DD-002, DATA-REQ-015, BR-044, Architecture §15 |
| transaction boundaries | DB-REQ-002, BR-010, API §14, Architecture transaction rules |
| JSONB | DB-REQ-004, BR-030, Architecture §10.6 |
| UTC timestamps | DATA-REQ-003, DB-REQ-005, BR-031 |

---

# 22. Out of Scope

Database Design v1.0 không bổ sung:

- public registration;
- reset password;
- refresh token;
- token blacklist;
- server-side session store;
- permission tables;
- Course/Topic CRUD;
- content/LMS schema đầy đủ;
- learning progress history table;
- notification table;
- feedback reply/ticket;
- edit/delete Feedback;
- AI history edit/delete/compare/rerun;
- report export;
- infrastructure monitoring tables;
- vector database/RAG;
- chatbot history;
- prompt storage bắt buộc;
- audit trail production-grade;
- soft-delete framework toàn hệ thống.

Nếu cần các nội dung này, phải đánh giá requirement/change control trước.

---

# 23. Open Items

Tại thời điểm Baseline Final, không còn open item nào bắt buộc phải giải quyết trước khi bootstrap Prisma schema.

Các chi tiết sau có thể được chốt ở implementation mà không đổi business behavior, miễn tuân thủ tài liệu này:

- exact package version của Prisma/PostgreSQL;
- cơ chế atomic claim cụ thể: conditional update, optimistic version hoặc row lock;
- tên technical `feature` constants của AIRequestLog;
- exact canonicalization/hash implementation cho `datasetFingerprint` của Admin feedback context, miễn deterministic và backend-owned;
- cách generate `opaqueRef` trong code;
- seed UUID cụ thể.

Nếu một lựa chọn làm thay đổi API contract hoặc observable behavior, phải review lại thay vì tự coi là implementation detail.

---

# 24. Review Checklist

- [x] Có đủ entity tối thiểu theo SRS.
- [x] Không tạo LearningProgress table không cần thiết.
- [x] Không tạo FeedbackAnalysis–Feedback join table.
- [x] Giữ AI history bằng JSONB.
- [x] Giữ PostgreSQL là source of truth.
- [x] Chốt UUID physical identifier.
- [x] Chốt partial unique current StudyPlan.
- [x] Chốt email normalization + uniqueness.
- [x] Chốt score/rating/task constraints; score storage không khóa scale 2 chữ số làm thay đổi threshold; traceability bao gồm OD-35 và DATA-REQ-011.
- [x] Chốt StudyPlan/StudyTask title non-blank ở DB + backend.
- [x] Chốt StudyPlan `COMPLETED -> ACTIVE` khi undo task.
- [x] Không dùng DB constraint thay authorization.
- [x] Có index cho latest AssessmentResult.
- [x] Có index cho Teacher/Admin history.
- [x] Có index cho feedback filter.
- [x] Có AIRequestLog semantics.
- [x] Có TemporaryContext storage đúng API-DD-002; replay identity tách rõ editable-payload và opaque-ref-only mutation.
- [x] Có mapping `resourceKey` theo ContextType để bind đúng user/resource.
- [x] Có retentionUntil để không mất replay mapping; `CONSUMED` bắt buộc có non-null `replayResult`; `OPEN` không được chứa replay metadata.
- [x] Có transaction boundary cho Plan Apply và invariant validated task set không rỗng.
- [x] Có transaction boundary cho Adjustment Accept.
- [x] Có transaction boundary cho StudyTask + StudyPlan state.
- [x] Có transaction boundary cho deferred Save.
- [x] Không giữ DB transaction trong external AI call.
- [x] Có Prisma schema candidate.
- [x] JSONB example đồng bộ Teacher/Admin history contract của API v1.4.
- [x] Có migration SQL cho constraint/index đặc thù.
- [x] Có seed strategy.
- [x] Có database integration-test checklist.
- [x] Đã hoàn tất final cross-document audit với SRS / BR / UCS / API / Architecture / ADR; không còn Critical/Important mismatch.
- [x] Không tạo chức năng ngoài MVP.

---

# 25. Quyết định phát hành

**Kết quả:** APPROVED — phát hành `Database_Design_v1.0_baseline_final.md`.

Final cross-document audit đã đối chiếu tài liệu này với:

- `SRS_v1.5_baseline_final.md`;
- `Business_Rules_v1.3_baseline_rev1.md`;
- `Use_Case_Specification_v1.1_baseline_rev1.md`;
- `Activity_Diagram_3_AI_Main_Flows_v1.2_baseline_final.md`;
- `API_Specification_v1.4_baseline_final.md`;
- `System_Architecture_and_Technology_Stack_v1.0_baseline.md`;
- `ADR_AUTH_001_Authentication_Architecture_Decision_v1.0_accepted.md`.

Kết quả audit:

- không còn finding mức Critical hoặc Important;
- entity/field coverage, lifecycle, transaction, JSONB history, AIRequestLog semantics, TemporaryContext replay/retention và score precision đều phù hợp baseline nguồn;
- Prisma candidate và migration SQL giữ đúng ranh giới implementation đã chốt, bao gồm authoritative physical exception cho `AssessmentResult.score`;
- tài liệu đủ điều kiện làm downstream database baseline cho bootstrap schema/migration và implementation.

`Baseline Final` là trạng thái phát hành của artifact này. Việc đăng ký thêm vào Governance/implementation manifest và integrity hash của repository được thực hiện ở bước governance tương ứng; không thay đổi nội dung nghiệp vụ của tài liệu này.

---

# 26. Revision History

| Version | Date | Status | Nội dung |
|---|---|---|---|
| 1.0 Draft | 24/10/2026 | Draft for Review | Khởi tạo Database Design từ baseline R2 + API v1.4 + Architecture v1.0 + ADR-AUTH-001; chốt 12 business tables + TemporaryContext, UUID, PostgreSQL types, constraint/index, transaction, JSONB, Prisma candidate và migration rules. |
| 1.0 Draft Rev.1 | 24/10/2026 | Draft Rev.1 for Review | Review hardening: bổ sung `COMPLETED -> ACTIVE` khi undo StudyTask; đồng bộ JSONB Teacher/Admin history với API v1.4; định nghĩa resource binding cho TemporaryContext; thêm title CHECK; làm rõ Admin user search index strategy; mở rộng test và traceability cho Apply/StudyPlan/StudyTask. |
| 1.0 Draft Rev.2 | 24/10/2026 | Draft Rev.2 for Review | Pre-freeze hardening: bỏ khóa `NUMERIC(5,2)` để bảo toàn score precision; tách replay identity StudyPlan Apply khỏi opaque-ref-only mutations; bắt buộc `CONSUMED` có `replayResult`; bổ sung invariant Apply phải có ít nhất một StudyTask và test tương ứng. |
| 1.0 Draft Rev.3 | 24/10/2026 | Draft Rev.3 for Review | Final consistency cleanup: bổ sung OD-35/DATA-REQ-011 cho score precision; kiểm thử cả state `OPEN` không được chứa replay metadata; ghi rõ không tự siết non-blank constraint cho `StudyTask.goal` khi upstream chưa khóa rule này. |
| 1.0 Draft Rev.4 | 24/10/2026 | Draft Rev.4 for Review | Targeted pre-freeze hardening: đưa `requestFingerprint` của StudyPlan Apply vào cùng atomic transaction với business mutation/replay/consume; chốt `AssessmentResult.score` là authoritative physical exception dùng PostgreSQL unbounded `numeric`; thống nhất `TemporaryContext.updatedAt` là Prisma-managed; siết retention CHECK để `CONSUMED` giữ replay mapping ít nhất 10 phút sau consume. |
| 1.0 Draft Rev.5 | 24/10/2026 | Draft Rev.5 for Review | Final pre-audit cleanup: gộp toàn bộ metadata consume của StudyPlan Apply thành một final SQL/ORM update statement để phù hợp immediate CHECK của `TemporaryContext`; đổi integration-test expectation của Admin feedback two-stage flow thành đúng 2 `AIRequestLog` cho một request thành công. |
| 1.0 Baseline Final | 24/10/2026 | Baseline Final — Approved | Passed final cross-document audit; không còn Critical/Important mismatch; phát hành chính thức làm downstream Database Design baseline cho implementation. |

---

# 27. Kết luận

Thiết kế database MVP được chốt theo hướng:

```text
PostgreSQL
  ├── Relational tables cho business data cần query/constraint
  ├── JSONB cho AI snapshot/result
  ├── Partial unique index cho current StudyPlan
  ├── Constraint cho invariant đơn bảng
  ├── Backend transaction cho invariant nhiều bảng
  ├── AIRequestLog cho external attempt
  └── TemporaryContext cho preview/deferred Save/idempotent replay
```

Mô hình này giữ database đủ đơn giản để triển khai đồ án nhưng vẫn bảo vệ các invariant quan trọng đã được baseline hóa.
