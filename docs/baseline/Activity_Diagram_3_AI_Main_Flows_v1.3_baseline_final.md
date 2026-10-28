# ACTIVITY DIAGRAM SPECIFICATION
## Hệ thống hỗ trợ tự học ứng dụng AI — 3 luồng AI chính

**Phiên bản:** 1.3  
**Ngày:** 26/10/2026  
**Trạng thái:** Frozen Baseline — Downstream Design Artifact  
**Phạm vi:** 3 luồng AI chính của MVP — Student, Teacher, Administrator

**Freeze date:** 26/10/2026  
**Freeze policy:** Không chỉnh sửa trực tiếp artifact v1.3 sau khi phiên bản này được freeze. Mọi thay đổi tiếp theo phải phát hành version/revision mới; thay đổi observable business behavior phải tuân thủ change control của Requirements / Use Case Baseline.

---

# 1. Mục đích tài liệu

Tài liệu này chuyển các Use Case AI chính đã được baseline hóa thành **Activity Diagram** để mô tả thứ tự hoạt động, điểm ra quyết định, trách nhiệm giữa các thành phần và cách xử lý các nhánh nghiệp vụ/lỗi quan trọng.

Ba luồng được mô hình hóa:

1. **Student — AI Learning Companion**
2. **Teacher — AI Teaching Insight**
3. **Administrator — AI System Intelligence**

Tài liệu này **không tạo requirement, Business Rule hoặc Use Case mới**. Mọi hành vi phải truy vết về bộ Requirements / Use Case Baseline đã freeze.

---

# 2. Nguồn chuẩn và authority

Tài liệu sử dụng các nguồn hiện hành sau:

| Mức | Tài liệu | Vai trò |
|---|---|---|
| 1 | `SRS_v1.6_baseline_final.md` | Nguồn chuẩn cao nhất về requirement, dữ liệu bắt buộc, AI behavior, state transition và acceptance behavior |
| 2A | `Business_Rules_v1.4_baseline_rev1.md` | Threshold, validation, eligibility, calculation, AI governance, data integrity |
| 2B | `Use_Case_Diagram_he_thong_ho_tro_tu_hoc_AI_v1.4_baseline_rev1.md` | Actor, system boundary, danh mục UC, include/extend |
| 3 | `Use_Case_Specification_v1.2_baseline_rev1.md` | Main flow, alternate/exception flow, I/O và acceptance criteria theo UC |
| Change Control | `Change_Request_CR-002_AI_Input_Capacity_and_Runtime_Failure_Semantics_v1.0_approved.md` | Capacity/runtime public semantics của R3 |
| AI Technical | `AI_Contract_v1.0_baseline_final.md` | Chốt Teacher one-attempt, Admin two-stage, schema/runtime boundary |
| Governance | `Document_Governance_and_Traceability_Index_v1.2.md` + `Requirements_UseCase_Baseline_Freeze_Record_v1.2.md` | Authority, traceability và change control |

`Dac_ta_pham_vi_chuc_nang_v1.0_historical.md` chỉ là tài liệu lịch sử, không dùng để ghi đè baseline hiện hành.

---

# 3. Phạm vi mô hình hóa

## 3.1. Student

Activity Diagram Student kết nối các Use Case phục vụ luồng AI end-to-end:

- `UC-STU-004` — Phân tích điểm mạnh và điểm yếu bằng AI — **tùy chọn trong luồng tổng thể**;
- `UC-STU-005` — Tạo kế hoạch học tập cá nhân hóa bằng AI;
- `UC-STU-006` — Lưu và áp dụng kế hoạch;
- `UC-STU-007` — Quản lý nhiệm vụ học tập;
- `UC-STU-008` — Theo dõi tiến độ;
- `UC-STU-009` — Đề xuất điều chỉnh kế hoạch bằng AI.

Lưu ý: `UC-STU-004` **không phải dependency bắt buộc** của `UC-STU-005`. `goal` là optional context đối với `UC-STU-004`, nhưng `UC-STU-005` vẫn yêu cầu goal/time/deadline hợp lệ.

## 3.2. Teacher

Activity Diagram Teacher mô hình hóa:

- `UC-TEA-005` — Phân tích tình hình lớp bằng AI;
- `UC-TEA-006` — Đề xuất phương án hỗ trợ bằng AI — được `UC-TEA-005` include;
- `UC-TEA-007` — Lưu báo cáo phân tích — mở rộng khi Teacher chọn lưu;
- xử lý nội bộ `FR-TEA-004` — Backend phát hiện dữ liệu đáng chú ý.

AI Contract v1.0 khóa `UC-TEA-005 + UC-TEA-006` thành **một external AI attempt** trả cả analysis và recommendations. Mỗi external attempt thực tế vẫn phải có `AIRequestLog`.

## 3.3. Administrator

Activity Diagram Administrator mô hình hóa:

- `UC-ADM-004` — Phân tích và nhóm vấn đề từ feedback bằng AI — **external AI Stage 1**;
- `UC-ADM-005` — Tóm tắt vấn đề và đề xuất cải thiện bằng AI — **external AI Stage 2**;
- `UC-ADM-006` — Lưu kết quả phân tích — mở rộng khi Administrator chọn lưu.

Theo baseline, Admin feedback analysis **bắt buộc dùng two-stage external inference** với bước backend validation/deduplication nằm giữa hai stage.

---

## 3.4. Hai Use Case history bổ sung theo CR-001

- `UC-TEA-008 — Xem lịch sử phân tích AI của lớp`;
- `UC-ADM-007 — Xem lịch sử phân tích feedback`.

Hai Use Case này **không tạo thêm AI main flow** vì chỉ đọc record đã lưu, không gọi AI, không recompute live và không thay đổi dữ liệu nghiệp vụ. Vì vậy ba Activity Diagram AI chính hiện tại được giữ nguyên về logic; phiên bản 1.2 chỉ cập nhật traceability/source baseline.

# 4. Quy ước Activity Diagram

## 4.1. Swimlane

Các diagram dùng 5 swimlane:

| Swimlane | Trách nhiệm |
|---|---|
| Student / Teacher / Administrator | Hành động và quyết định của người dùng |
| Frontend | Hiển thị UI, nhận input, gửi request, hiển thị response |
| NestJS Backend | Authorization, validation, business rules, calculation, AI orchestration, persistence orchestration |
| AI Service | Phân tích/sinh đề xuất dựa trên dữ liệu Backend cung cấp |
| PostgreSQL | Đọc/lưu dữ liệu nghiệp vụ |

Swimlane **không làm thay đổi system boundary của Use Case Diagram**. Next.js, NestJS và PostgreSQL vẫn là thành phần bên trong hệ thống; AI Service là supporting actor bên ngoài.

## 4.2. Quy ước xử lý AI

Áp dụng cho mọi luồng AI:

- request dừng trước external AI call do validation, `INSUFFICIENT_DATA` hoặc business ineligible → **không tạo `AIRequestLog`**;
- khi backend đã thực sự attempt external AI call → attempt đó phải có `AIRequestLog`;
- AI output phải qua backend validation trước khi được xem là kết quả hợp lệ;
- AI không truy cập PostgreSQL trực tiếp;
- AI không tự tạo metric/count chính xác mà backend có thể tính;
- AI failure/invalid output không được làm thay đổi trạng thái nghiệp vụ cũ.

## 4.3. Human-in-the-loop

Các thay đổi quan trọng không được tự áp dụng:

- Student quyết định Apply/Reject StudyPlan;
- Student quyết định Accept/Reject adjustment;
- Teacher quyết định sử dụng insight và Save/Không Save;
- Administrator quyết định ưu tiên cải thiện và Save/Không Save.

---

## 4.1. CR-002 — Capacity preflight trước mọi external attempt

Ngay trước mỗi activity chuyển từ NestJS Backend sang AI Service, Backend phải thực hiện capacity preflight trên **toàn bộ authoritative payload** bằng capacity profile đã benchmark/bind.

```text
validated business input
  ↓
resolve/bind capacityProfile
  ↓
estimate full serialized input budget
  ├─ profile mismatch → 502 AI_RUNTIME_FAILURE; no dispatch; no AIRequestLog
  ├─ input too large → 422 AI_INPUT_TOO_LARGE; no dispatch; no AIRequestLog
  └─ pass → bắt đầu external attempt
```

Không truncate/sample/chunk/pre-summarize payload để né preflight. Với Admin, Stage 1 và Stage 2 chạy preflight độc lập; Stage 1 success nhưng Stage 2 fail capacity giữ đúng một SUCCESS log của Stage 1 và không tạo `analysisRef`.

---

# 5. Activity Diagram — Student AI Learning Companion

## 5.1. Mục tiêu

Biểu diễn luồng từ dữ liệu học tập của Student đến AI insight, AI StudyPlan, áp dụng StudyPlan, cập nhật tiến độ và AI adjustment.

Các boundary quan trọng:

- `UC-STU-004`: thiếu AssessmentResult → `INSUFFICIENT_DATA`; thiếu `goal` **không** gây `INSUFFICIENT_DATA`;
- `UC-STU-005`: goal/time/deadline invalid là validation error, không phải `INSUFFICIENT_DATA`;
- `UC-STU-006`: phải revalidate toàn bộ preview tại `applyTime` trước mọi database mutation;
- Apply phải dùng transaction để không để lại plan/task tạo dở;
- `UC-STU-009`: không có current plan, plan quá `endDate` hoặc không còn task `TODO` là **business ineligible**, không phải `INSUFFICIENT_DATA`;
- `UC-STU-009` độc lập với `UC-STU-008`; Student có thể yêu cầu adjustment trực tiếp khi đã có current StudyPlan hợp lệ, Backend tự tính/lấy progress metric cần thiết;
- AI adjustment chỉ được sửa `expectedMinutes`, `dueDate`, `priority` của task `TODO`.

## 5.2. PlantUML

```plantuml
@startuml
title Activity Diagram — Student AI Learning Companion v1.1
skinparam shadowing false
skinparam activity {
  BackgroundColor white
  BorderColor black
  DiamondBackgroundColor white
  DiamondBorderColor black
}
skinparam ArrowColor black

start

|Student|
:Đăng nhập và mở luồng học tập;

|Frontend|
:Gửi request theo hành động Student;

|NestJS Backend|
:Xác thực phiên/token;\nkiểm tra ACTIVE + role + ownership;

if (Có yêu cầu AI phân tích điểm mạnh/yếu?) then (Có)
  :Lấy AssessmentResult mới nhất theo Topic\nvà progress hiện tại nếu có;
  if (Có ít nhất một AssessmentResult hợp lệ?) then (Không)
    :Trả INSUFFICIENT_DATA;\nkhông gọi AI;\nkhông tạo AIRequestLog;
    |Frontend|
    :Hiển thị hướng dẫn cần dữ liệu đánh giá;
  else (Có)
    |NestJS Backend|
    :Chuẩn hóa dữ liệu;\ngoal chỉ là optional context;
    :Capacity preflight theo CR-002;
    nếu fail thì trả AI_INPUT_TOO_LARGE/AI_RUNTIME_FAILURE trước dispatch;
    |AI Service|
    :External attempt phân tích strengths /\nareasToImprove / priorityTopics / reasons;
    |NestJS Backend|
    :Ghi/hoàn thiện AIRequestLog cho attempt;
    if (External AI attempt thành công?) then (Không)
      :Giữ nguyên dữ liệu nghiệp vụ;
      |Frontend|
      :Hiển thị lỗi AI;
    else (Có)
      |NestJS Backend|
      :Validate structured output;\nAI không là nguồn score/statistics;
      if (Output hợp lệ?) then (Không)
        :Từ chối output;\nkhông coi là kết quả thành công;
        |Frontend|
        :Hiển thị lỗi output;
      else (Có)
        |Frontend|
        :Hiển thị kết quả phân tích;
      endif
    endif
  endif
endif

|Student|
:Nhập/chọn goal,\navailableHoursPerWeek,\ntargetDeadline;

|Frontend|
:Giữ draft luồng hiện tại;\ngửi dữ liệu khi yêu cầu tạo kế hoạch;

|NestJS Backend|
:Validate lại goal/time/deadline;\nchuẩn hóa availableMinutesPerWeek;

if (Input goal/time/deadline hợp lệ?) then (Không)
  :Trả validation error;\nkhông gọi AI;\nkhông gộp thành INSUFFICIENT_DATA;
  |Frontend|
  :Yêu cầu Student sửa dữ liệu;
  stop
else (Có)
endif

|PostgreSQL|
:Đọc latest AssessmentResult theo Topic;\nđọc danh sách Topic hợp lệ của Course chính;

|NestJS Backend|
if (Có AssessmentResult và Topic hợp lệ?) then (Không)
  :Trả INSUFFICIENT_DATA;\nkhông gọi AI;\nkhông tạo AIRequestLog;
  |Frontend|
  :Hiển thị trạng thái chưa đủ dữ liệu;
  stop
else (Có)
  :Chuẩn hóa input generation;
endif

:Capacity preflight theo CR-002;
nếu fail thì dừng trước dispatch, không AIRequestLog;

|AI Service|
:External attempt tạo planTitle + StudyTask[];

|NestJS Backend|
:Ghi/hoàn thiện AIRequestLog cho attempt;
if (External AI attempt thành công?) then (Không)
  :Không tạo StudyPlan/StudyTask;\ngiữ nguyên dữ liệu;
  |Frontend|
  :Hiển thị lỗi AI;
  stop
else (Có)
  |NestJS Backend|
  :Validate schema, topicId, priority,\nexpectedMinutes, dueDate,\nsố lượng task;
endif

if (Structured plan output hợp lệ?) then (Không)
  :Từ chối output;\nkhông tạo StudyPlan/StudyTask;
  |Frontend|
  :Hiển thị lỗi output;
  stop
else (Có)
  |Frontend|
  :Hiển thị StudyPlan preview;
endif

|Student|
:Chỉnh các field được phép nếu cần:\nplan title, task title,\nexpectedMinutes, dueDate, priority;
:Chọn Áp dụng hoặc Từ chối;

if (Student chọn Áp dụng?) then (Không)
  |NestJS Backend|
  :Không tạo StudyPlan/StudyTask mới;
  stop
else (Có)
  |Frontend|
  :Gửi lệnh Apply;
  |NestJS Backend|
  :Lấy applyTime = now;\nkiểm tra lại quyền;\nrevalidate toàn bộ preview;
endif

if (Preview còn hợp lệ tại applyTime?) then (Không)
  :Từ chối Apply;\nkhông archive plan cũ;\nkhông tạo plan/task mới;
  |Frontend|
  :Yêu cầu chỉnh preview hoặc tạo preview mới;
  stop
else (Có)
  |NestJS Backend|
  :Bắt đầu transaction;
endif

|PostgreSQL|
:Archive current StudyPlan ACTIVE/COMPLETED nếu có;
:Tạo StudyPlan mới ACTIVE;
:Tạo StudyTask mới với status TODO;

|NestJS Backend|
if (Transaction thành công?) then (Không)
  |PostgreSQL|
  :Rollback toàn bộ;
  |NestJS Backend|
  :Giữ nguyên trạng thái nghiệp vụ trước Apply;
  |Frontend|
  :Hiển thị lỗi lưu kế hoạch;
  stop
else (Có)
  |NestJS Backend|
  :Commit transaction;
endif

|Frontend|
:Cập nhật dashboard / danh sách nhiệm vụ;

|Student|
if (Student muốn quản lý task/xem tiến độ trước?) then (Có)
  :Thực hiện nhiệm vụ;\nđánh dấu TODO <-> COMPLETED;
  |NestJS Backend|
  :Kiểm tra ownership/current plan;\ncập nhật task và completedAt;
  |PostgreSQL|
  :Lưu trạng thái StudyTask;\ncập nhật StudyPlan ACTIVE/COMPLETED khi cần;
  |NestJS Backend|
  :Tính completedTasks, totalTasks,\nactualProgress, expectedProgress,\noverdue tasks;
  :Đánh giá slow-progress bằng giá trị gốc;
  |Frontend|
  :Hiển thị progress / warning;
  |Student|
else (Không)
  note right
    UC-STU-009 độc lập với UC-STU-008.
    Student có thể yêu cầu adjustment trực tiếp
    khi đã có current StudyPlan hợp lệ.
  end note
endif

|Student|
if (Student yêu cầu AI adjustment?) then (Không)
  stop
else (Có)
endif

|NestJS Backend|
:Lấy current StudyPlan + task TODO;\nkiểm tra eligibility adjustment;

if (Có current StudyPlan?) then (Không)
  :Business ineligible;\nkhông gọi AI;\nkhông tạo AIRequestLog;
  |Frontend|
  :Hướng Student tạo StudyPlan trước;
  stop
else (Có)
endif

|NestJS Backend|
if (now <= StudyPlan.endDate?) then (Không)
  :Business ineligible;\nkhông gọi AI;\nkhông tạo AIRequestLog;
  |Frontend|
  :Hướng Student tạo plan mới nếu cần deadline mới;
  stop
else (Có)
endif

|NestJS Backend|
if (Còn ít nhất một StudyTask TODO?) then (Không)
  :Business ineligible;\nkhông gọi AI;\nkhông tạo AIRequestLog;
  |Frontend|
  :Thông báo không còn nhiệm vụ cần điều chỉnh;
  stop
else (Có)
  :Tính/lấy progress metric hiện tại;\nchuẩn bị current plan, TODO tasks,\ngoal, availableMinutesPerWeek;
endif

|AI Service|
:External attempt đề xuất adjustment chỉ cho\nexpectedMinutes, dueDate, priority\ncủa task TODO;

|NestJS Backend|
:Ghi/hoàn thiện AIRequestLog cho attempt;
if (External AI attempt thành công?) then (Không)
  :Không cập nhật task;\ngiữ nguyên plan;
  |Frontend|
  :Hiển thị lỗi AI;
  stop
else (Có)
  |NestJS Backend|
  :Validate task ownership/status,\nexpectedMinutes, priority, dueDate;
endif

if (Structured adjustment output hợp lệ?) then (Không)
  :Từ chối output;\nkhông cập nhật task;
  |Frontend|
  :Hiển thị lỗi output;
  stop
else (Có)
  |Frontend|
  :Hiển thị adjustment preview;
endif

|Student|
:Chọn Chấp nhận hoặc Từ chối;

if (Student chấp nhận adjustment?) then (Không)
  |NestJS Backend|
  :Giữ nguyên StudyPlan/StudyTask;
  stop
else (Có)
  |NestJS Backend|
  :Chỉ cập nhật các StudyTask TODO hợp lệ;
  |PostgreSQL|
  :Lưu expectedMinutes / dueDate / priority mới;
  |NestJS Backend|
  :Tính lại progress nếu cần;
  |Frontend|
  :Hiển thị task/progress mới;
  stop
endif

@enduml

```

## 5.3. Các nhánh cần kiểm thử từ diagram

| Nhánh | Kết quả |
|---|---|
| Không có AssessmentResult khi chạy UC-STU-004 | `INSUFFICIENT_DATA`, không gọi AI, không log |
| Thiếu goal khi chạy UC-STU-004 nhưng có AssessmentResult | Vẫn được gọi AI |
| Goal/time/deadline invalid khi tạo plan | Validation error, không gọi AI |
| Thiếu AssessmentResult hoặc Topic khi tạo plan | `INSUFFICIENT_DATA`, không gọi AI |
| AI generation lỗi/invalid | Không tạo StudyPlan/StudyTask |
| Student Reject preview | Không gọi UC-STU-006, không lưu |
| Preview stale tại Apply | Không archive plan cũ, không tạo plan/task mới |
| Transaction lỗi | Rollback toàn bộ |
| Không có current plan khi adjustment | Business ineligible, không gọi AI |
| Plan quá endDate khi adjustment | Business ineligible, không gọi AI |
| Không còn TODO | Business ineligible, không gọi AI |
| Student Reject adjustment | Không cập nhật task |
| Student Accept adjustment | Chỉ cập nhật field cho phép của task TODO |

## 5.4. Traceability

**Use Case:** `UC-STU-004`, `UC-STU-005`, `UC-STU-006`, `UC-STU-007`, `UC-STU-008`, `UC-STU-009`  
**FR:** `FR-STU-004..009`, `FR-COM-005`, `FR-COM-006`  
**BR chính:** `BR-001`, `BR-004`, `BR-005`, `BR-006`, `BR-009`, `BR-010`, `BR-011`, `BR-017`, `BR-021`, `BR-024`, `BR-025`, `BR-027`, `BR-028`, `BR-034`, `BR-035`, `BR-036`, `BR-037`, `BR-041`  
**OD chính:** `OD-40`, `OD-41`

---

# 6. Activity Diagram — Teacher AI Teaching Insight

## 6.1. Mục tiêu

Biểu diễn luồng Teacher chọn Class, Backend tổng hợp metric/rule, AI phân tích + recommendation, Teacher xem kết quả và tùy chọn lưu report.

Các boundary quan trọng:

- Backend phải kiểm tra Teacher–Class trước khi trả/phân tích dữ liệu;
- `FR-TEA-004` là xử lý nội bộ, không tạo `UC-TEA-004`;
- minimum data theo `OD-33`: Class đủ dữ liệu nếu có ít nhất một `AssessmentResult` hợp lệ **hoặc** có ít nhất một Student có current StudyPlan chứa ít nhất một `StudyTask`;
- không đủ dữ liệu → `INSUFFICIENT_DATA`, không gọi AI, không log;
- `UC-TEA-005` luôn bao gồm recommendation của `UC-TEA-006`;
- Teacher analysis + recommendation dùng đúng 1 external attempt theo AI Contract v1.0;
- mỗi external attempt thực tế phải được log;
- Save dùng backend-owned analysis context/reference, không tin snapshot/result client gửi lại và không recompute dữ liệu live để thay snapshot analysis-time.

## 6.2. PlantUML

```plantuml
@startuml
title Activity Diagram — Teacher AI Teaching Insight v1.1
skinparam shadowing false
skinparam activity {
  BackgroundColor white
  BorderColor black
  DiamondBackgroundColor white
  DiamondBorderColor black
}
skinparam ArrowColor black

start

|Teacher|
:Chọn Class và yêu cầu\nPhân tích lớp bằng AI;

|Frontend|
:Gửi classId và yêu cầu phân tích;

|NestJS Backend|
:Xác thực phiên/token;\nkiểm tra ACTIVE + role;
:Kiểm tra quan hệ Teacher-Class;

if (Teacher có quyền với Class?) then (Không)
  :Từ chối trước khi truy vấn/phân tích;
  |Frontend|
  :Hiển thị Forbidden;
  stop
else (Có)
endif

|PostgreSQL|
:Đọc Class, ClassMember,\nlatest AssessmentResult,\ncurrent StudyPlan/StudyTask cần thiết;

|NestJS Backend|
:Tổng hợp studentCount,\nclassAverageScore,\ntopicAverageScores,\nclassCompletionRate,\noverdueTaskCount;
:Áp dụng FR-TEA-004:\nWeak Topics,\nNeeds Attention,\nProgress Warning;

if (Đủ minimum data theo OD-33?) then (Không)
  :Trả INSUFFICIENT_DATA;\nkhông gọi AI;\nkhông tạo AIRequestLog;
  |Frontend|
  :Hiển thị chưa đủ dữ liệu Class;
  stop
else (Có)
  |NestJS Backend|
  :Tạo inputSnapshot;\nchuẩn hóa payload;
endif

:Capacity preflight theo CR-002;
nếu fail thì dừng trước dispatch, không AIRequestLog;

|AI Service|
:Thực hiện hành vi AI Class Analysis\n+ recommendation theo AI Contract;\nUC-TEA-006 được include;\nđúng 1 external attempt theo AI Contract v1.0;
:Trả structured analysis\n+ recommendations;

|NestJS Backend|
:Ghi/hoàn thiện AIRequestLog cho từng\nexternal attempt thực tế;

if (External AI behavior hoàn tất thành công?) then (Không)
  :Không lưu report;\ngiữ nguyên dữ liệu Class/Student;
  |Frontend|
  :Hiển thị lỗi AI;
  stop
else (Có)
  |NestJS Backend|
  :Validate schema, IDs và bảo đảm\nmetric/count đến từ backend;
endif

if (Structured output hợp lệ?) then (Không)
  :Từ chối output;\nkhông tạo analysis context có thể Save;
  |Frontend|
  :Hiển thị lỗi output;
  stop
else (Có)
  |NestJS Backend|
  :Tạo backend-owned analysis context\n(inputSnapshot + validated result);
  :Tạo opaque analysis reference;
endif

|Frontend|
:Hiển thị summary, weakTopics,\nprogressIssues, attentionGroups,\nrecommendations;

|Teacher|
:Quyết định sử dụng insight;\nchọn Lưu hoặc Không lưu;

if (Teacher chọn Lưu?) then (Không)
  stop
else (Có)
  |Frontend|
  :Gửi analysis reference;
endif

|NestJS Backend|
:Kiểm tra lại Teacher-Class;\nkiểm tra quyền dùng analysis context;
:Resolve classId + inputSnapshot\n+ analysisResult từ backend-owned context;

if (Analysis reference/context hợp lệ?) then (Không)
  :Không lưu report;
  |Frontend|
  :Yêu cầu Teacher chạy lại phân tích nếu cần;
  stop
else (Có)
  |NestJS Backend|
  :Không tin snapshot/result từ client;\nkhông thay snapshot bằng dữ liệu live;
endif

|PostgreSQL|
:Lưu ClassAnalysisReport:\nclassId,\ninputSnapshot JSONB,\nanalysisResult JSONB,\ncreatedAt UTC;

|NestJS Backend|
if (Lưu database thành công?) then (Không)
  :Không để report ở trạng thái một phần;
  |Frontend|
  :Hiển thị lỗi lưu;
  stop
else (Có)
  |Frontend|
  :Xác nhận lưu thành công;
  stop
endif

@enduml

```

## 6.3. Các nhánh cần kiểm thử từ diagram

| Nhánh | Kết quả |
|---|---|
| Teacher truy cập Class ngoài quyền | Từ chối trước truy vấn/phân tích |
| Class không đủ minimum data | `INSUFFICIENT_DATA`, không gọi AI, không log |
| AI failure/invalid output | Không lưu report, dữ liệu Student/Class giữ nguyên |
| AI thành công | Tạo backend-owned analysis context + opaque reference |
| Teacher không Save | Không tạo ClassAnalysisReport |
| Analysis reference invalid | Không lưu report |
| Client sửa snapshot/result trong payload Save | Không ảnh hưởng nguồn chuẩn backend |
| Dữ liệu Class live thay đổi sau analysis | Report vẫn lưu đúng snapshot analysis-time |
| Database failure khi Save | Không tạo report một phần |

## 6.4. Traceability

**Use Case:** `UC-TEA-005`, `UC-TEA-006`, `UC-TEA-007`  
**FR:** `FR-TEA-004`, `FR-TEA-005`, `FR-TEA-006`, `FR-TEA-007`, `FR-COM-005`, `FR-COM-006`  
**BR chính:** `BR-002`, `BR-004`, `BR-007`, `BR-009`, `BR-010`, `BR-011`, `BR-017`, `BR-018`, `BR-026`, `BR-030`, `BR-031`, `BR-035`, `BR-044`  
**OD chính:** `OD-33`, `OD-44`

---

# 7. Activity Diagram — Administrator AI System Intelligence

## 7.1. Mục tiêu

Biểu diễn luồng Administrator chọn dataset feedback, Backend thống kê dữ liệu chính xác, AI Stage 1 tạo candidate issue groups, Backend validate/deduplicate/count, AI Stage 2 tạo summary/recommendation và Administrator tùy chọn lưu kết quả.

Các boundary quan trọng:

- Feedback tag là dữ liệu chính thức do user chọn; AI không được thay tag;
- dataset feedback rỗng → `INSUFFICIENT_DATA`, không gọi Stage 1, không log;
- Stage 1 và Stage 2 là **hai external AI attempts tách biệt**;
- Backend validate mọi `feedbackId`, deduplicate trong group và giữa group theo thứ tự AI trả về, tự tính `count`;
- nếu dataset không rỗng nhưng sau validation/deduplicate không còn group → `issueGroups = []` là kết quả hợp lệ;
- `issueGroups = []` **không chặn Stage 2**;
- nếu Stage 1 fail/invalid → không chạy Stage 2;
- analysis context để Save chỉ được tạo sau Stage 2 hợp lệ;
- Save dùng backend-owned analysis context/reference, không dùng snapshot/output client làm nguồn chuẩn.

## 7.2. PlantUML

```plantuml
@startuml
title Activity Diagram — Administrator AI System Intelligence v1.1
skinparam shadowing false
skinparam activity {
  BackgroundColor white
  BorderColor black
  DiamondBackgroundColor white
  DiamondBorderColor black
}
skinparam ArrowColor black

start

|Administrator|
:Chọn toàn bộ feedback hoặc filter;\nyêu cầu phân tích và đề xuất;

|Frontend|
:Gửi filter/yêu cầu phân tích;

|NestJS Backend|
:Xác thực phiên/token;\nkiểm tra ACTIVE + role;
:Validate filter;

if (Filter hợp lệ?) then (Không)
  :Trả validation error;\nkhông gọi AI;\nkhông tạo AIRequestLog;
  |Frontend|
  :Hiển thị lỗi filter;
  stop
else (Có)
endif

|PostgreSQL|
:Truy vấn đúng tập Feedback\nvà official tag đã lưu;

|NestJS Backend|
:Tạo feedbackIds;\nkiểm tra dataset;

if (Dataset có ít nhất một Feedback?) then (Không)
  :Trả INSUFFICIENT_DATA;\nkhông gọi AI Stage 1;\nkhông tạo AIRequestLog;
  |Frontend|
  :Hiển thị chưa đủ feedback;
  stop
else (Có)
  |NestJS Backend|
  :Tính totalFeedback\nvà tagStatistics bằng backend;
endif

:Capacity preflight Stage 1 theo CR-002;
nếu fail thì dừng trước dispatch, không AIRequestLog;

|AI Service|
:STAGE 1 — UC-ADM-004\nExternal attempt tạo candidate issueGroups\n(title, summary, feedbackIds);

|NestJS Backend|
:Ghi/hoàn thiện AIRequestLog cho Stage 1;

if (External AI Stage 1 thành công?) then (Không)
  :Không chạy Stage 2;
  |Frontend|
  :Hiển thị lỗi AI Stage 1;
  stop
else (Có)
  |NestJS Backend|
  :Validate structured schema Stage 1;\nvalidate mọi feedbackId thuộc input;
endif

if (Stage 1 output hợp lệ?) then (Không)
  :Từ chối output;\nkhông chạy Stage 2;
  |Frontend|
  :Hiển thị lỗi output Stage 1;
  stop
else (Có)
  |NestJS Backend|
  :Deduplicate feedbackIds trong từng group;
  :Deduplicate giữa các group\n-theo thứ tự AI trả về;
  :Loại group rỗng;\ntự tính lại count;
endif

if (Còn issueGroup sau validation/deduplicate?) then (Không)
  :Đặt issueGroups = [];\nđây vẫn là kết quả hợp lệ;
else (Có)
  :Giữ issueGroups đã validate;
endif

|NestJS Backend|
:Chuẩn bị input Stage 2:\nfeedback/tag + tagStatistics\n+ validated issueGroups;

:Capacity preflight Stage 2 theo CR-002;
nếu fail thì chỉ giữ Stage 1 SUCCESS log,
không Stage 2 log/analysisRef;

|AI Service|
:STAGE 2 — UC-ADM-005\nExternal attempt tạo summary,\npriorityAreas,\nrecommendations;

|NestJS Backend|
:Ghi/hoàn thiện AIRequestLog cho Stage 2;

if (External AI Stage 2 thành công?) then (Không)
  :Không tạo analysis context có thể Save;\nkhông tự áp dụng recommendation;
  |Frontend|
  :Hiển thị lỗi AI Stage 2;
  stop
else (Có)
  |NestJS Backend|
  :Validate structured output Stage 2;
endif

if (Stage 2 output hợp lệ?) then (Không)
  :Từ chối output;\nkhông tạo analysis context có thể Save;
  |Frontend|
  :Hiển thị lỗi output Stage 2;
  stop
else (Có)
  |NestJS Backend|
  :Tạo backend-owned analysis context từ\ninputSnapshot + issueGroups đã validate\n+ validated Stage 2 result;
  :Tạo opaque analysis reference;
endif

|Frontend|
:Hiển thị tagStatistics, issueGroups,\nsummary, priorityAreas,\nrecommendations;

|Administrator|
:Đánh giá insight;\nchọn Lưu hoặc Không lưu;

if (Administrator chọn Lưu?) then (Không)
  stop
else (Có)
  |Frontend|
  :Gửi analysis reference;
endif

|NestJS Backend|
:Kiểm tra quyền Administrator;\nresolve backend-owned context;
:Lấy inputSnapshot:\nfilter, feedbackIds,\ntotalFeedback, tagStatistics;
:Lấy analysisResult:\nissueGroups, summary,\npriorityAreas, recommendations;

if (Analysis reference/context hợp lệ?) then (Không)
  :Không lưu FeedbackAnalysis;
  |Frontend|
  :Yêu cầu chạy lại phân tích nếu cần;
  stop
else (Có)
  |NestJS Backend|
  :Không dùng snapshot/output client làm nguồn chuẩn;\nkhông thay snapshot bằng feedback live;
endif

|PostgreSQL|
:Lưu FeedbackAnalysis:\ninputSnapshot JSONB,\nanalysisResult JSONB,\ncreatedAt UTC;

|NestJS Backend|
if (Lưu database thành công?) then (Không)
  :Không để record một phần;
  |Frontend|
  :Hiển thị lỗi lưu;
  stop
else (Có)
  |Frontend|
  :Xác nhận lưu thành công;
  stop
endif

@enduml

```

## 7.3. Các nhánh cần kiểm thử từ diagram

| Nhánh | Kết quả |
|---|---|
| Filter invalid | Validation error trước AI, không log |
| Dataset feedback rỗng | `INSUFFICIENT_DATA`, không gọi Stage 1 |
| Stage 1 AI failure/invalid output | Log Stage 1 failed, không chạy Stage 2 |
| feedbackId ngoài input | Structured output invalid |
| feedbackId trùng giữa group | Giữ group hợp lệ đầu tiên, loại ở group sau, tính lại count |
| `issueGroups = []` sau validation | Vẫn chạy Stage 2 |
| Stage 2 AI failure/invalid output | Log Stage 2 failed, không tạo context Save |
| Stage 2 thành công | Tạo backend-owned analysis context + reference |
| Admin không Save | Không tạo FeedbackAnalysis |
| Analysis reference invalid | Không lưu |
| Client sửa snapshot/result | Không thay đổi nguồn chuẩn backend |
| Feedback live thay đổi sau analysis | Snapshot đã phân tích không bị thay khi Save |

## 7.4. Traceability

**Use Case:** `UC-ADM-004`, `UC-ADM-005`, `UC-ADM-006`  
**FR:** `FR-ADM-004`, `FR-ADM-005`, `FR-ADM-006`, `FR-COM-005`, `FR-COM-006`  
**BR chính:** `BR-003`, `BR-004`, `BR-008`, `BR-009`, `BR-010`, `BR-011`, `BR-013`, `BR-014`, `BR-015`, `BR-030`, `BR-031`, `BR-035`, `BR-042`, `BR-043`, `BR-044`  
**OD chính:** `OD-34`, `OD-42`, `OD-43`, `OD-44`

---

# 8. Traceability Matrix tổng hợp

| Activity Diagram | Use Case | Requirement / Rule trọng tâm |
|---|---|---|
| Student AI Learning Companion | UC-STU-004 | FR-STU-004, BR-034, BR-035, BR-041, OD-41 |
| Student AI Learning Companion | UC-STU-005 | FR-STU-005, BR-021, BR-035, BR-037 |
| Student AI Learning Companion | UC-STU-006 | FR-STU-006, BR-005, BR-024, BR-025 |
| Student AI Learning Companion | UC-STU-007/008 | FR-STU-007/008, BR-017, BR-025, BR-027, BR-036 |
| Student AI Learning Companion | UC-STU-009 | FR-STU-009, BR-006, BR-028, BR-035, BR-036, OD-40 |
| Teacher AI Teaching Insight | UC-TEA-005 | FR-TEA-004/005, BR-017, BR-018, BR-026, BR-035, OD-33 |
| Teacher AI Teaching Insight | UC-TEA-006 | FR-TEA-006, BR-007 |
| Teacher AI Teaching Insight | UC-TEA-007 | FR-TEA-007, BR-030, BR-044, OD-44 |
| Admin AI System Intelligence | UC-ADM-004 | FR-ADM-004, BR-015, BR-035, BR-042, BR-043, OD-34/42/43 |
| Admin AI System Intelligence | UC-ADM-005 | FR-ADM-005, BR-008, BR-042, BR-043, OD-42/43 |
| Admin AI System Intelligence | UC-ADM-006 | FR-ADM-006, BR-030, BR-044, OD-44 |

Cross-cutting:

- `FR-COM-003` — authorization;
- `FR-COM-005` — AI error handling;
- `FR-COM-006` / `AI-REQ-018` — AI request logging;
- `BR-004` / `BR-009` — AI không tự tạo số liệu chính xác;
- `BR-010` / `BR-011` — failure safety và AI không truy cập PostgreSQL trực tiếp.

---

# 9. Những quyết định cố ý không khóa trong Activity Diagram

Các chi tiết sau **không được tự quyết định tại artifact này**:

1. route REST API cụ thể;
2. DTO/request/response field naming ngoài các field nghiệp vụ đã baseline;
3. cơ chế lưu backend-owned analysis context;
4. TTL của analysis reference;
5. cache/session/storage implementation;
6. model AI cụ thể;
7. cách prompt;
8. retry policy chi tiết ngoài no-auto-retry decision đã khóa ở AI Contract;
9. module/class/service naming trong NestJS.

Các nội dung này thuộc **System Design / API Specification / AI Contract** nếu không làm thay đổi observable business behavior.

---

# 10. Review Checklist

- [x] Không tạo Use Case mới.
- [x] Không tạo `UC-TEA-004`.
- [x] Giữ `UC-STU-004` không bắt buộc trước `UC-STU-005`.
- [x] Giữ `goal` optional cho UC-STU-004.
- [x] Giữ goal/time/deadline bắt buộc và phải validate cho UC-STU-005.
- [x] Giữ preview + Apply/Reject trong UC-STU-005 và Apply persistence trong UC-STU-006.
- [x] Apply revalidate tại `applyTime` trước database mutation.
- [x] Plan/task persistence sử dụng transaction.
- [x] UC-STU-009 độc lập với UC-STU-008.
- [x] Business ineligible của adjustment không bị gộp thành `INSUFFICIENT_DATA`.
- [x] AI adjustment không thêm/xóa task, đổi Topic hoặc sửa task COMPLETED.
- [x] Teacher flow chứa FR-TEA-004 như internal processing.
- [x] Teacher UC-TEA-005 include UC-TEA-006.
- [x] Teacher `UC-TEA-005 + UC-TEA-006` dùng đúng **1 external AI attempt** theo AI Contract v1.0.
- [x] Admin dùng two-stage external AI inference.
- [x] Backend deduplicate feedbackIds và tự tính count.
- [x] `issueGroups = []` hợp lệ vẫn chạy Stage 2.
- [x] Save Teacher/Admin dùng backend-owned analysis reference/context.
- [x] Không tin snapshot/result client gửi lại làm nguồn chuẩn.
- [x] Không thay snapshot analysis-time bằng dữ liệu live tại Save.
- [x] Chỉ tạo AIRequestLog khi external AI attempt thực sự xảy ra.
- [x] AI failure không làm thay đổi dữ liệu nghiệp vụ cũ.
- [x] AI không truy cập PostgreSQL trực tiếp.
- [x] Mọi AI output được Backend validate trước decision `output hợp lệ?`.
- [x] Admin Stage 1 dừng ngay nếu schema/feedbackId invalid; không đi tiếp deduplicate/Stage 2.
- [x] Student adjustment có đường khởi tạo độc lập, không bắt buộc chạy UC-STU-008 trước.

---

# 11. Hướng sử dụng cho artifact tiếp theo

Activity Diagram này có thể dùng trực tiếp làm nguồn cho:

- **Sequence Diagram**: chuyển mỗi swimlane interaction thành message giữa UI → Backend → Database/AI;
- **API Specification**: xác định request boundary, validation branch, status/error semantics;
- **AI Contract**: cung cấp input/output schema, model endpoint/runtime contract và technical validation cho Teacher/Admin orchestration đã khóa;
- **Test Case Specification**: chuyển mỗi decision/alternate/exception branch thành positive, negative, boundary, permission và persistence test.

---

# 12. Lịch sử phiên bản

| Phiên bản | Ngày | Nội dung |
|---|---|---|
| 1.0 | 21/10/2026 | Khởi tạo Activity Diagram cho 3 luồng AI chính từ frozen Requirements / Use Case Baseline |
| 1.1 | 21/10/2026 | Sửa thứ tự AI validation/decision, sửa control flow Admin Stage 1, thể hiện UC-STU-009 độc lập với UC-STU-008 |
| 1.2 Baseline Final | 21/10/2026 | Đồng bộ CR-001/history baseline và freeze downstream; giữ 3 AI main flows, không tạo AI flow mới cho history |
| 1.3 Baseline Final | 26/10/2026 | CR-002: capacity preflight/no-truncation cho mọi AI attempt; Teacher khóa 1 external attempt theo AI Contract; Admin Stage2 capacity-fail logging semantics; đồng bộ R3 |
