# UI Sitemap v1.1

**Dự án:** Hệ thống hỗ trợ tự học ứng dụng AI  
**Phiên bản:** 1.1  
**Ngày:** 21/10/2026  
**Trạng thái:** Frozen Baseline — Downstream UI Design Artifact  
**Loại tài liệu:** Downstream UI Design Artifact  
**Phạm vi:** Web Application MVP — Student, Teacher, Administrator  

---

# 1. Mục đích tài liệu

Tài liệu này định nghĩa cấu trúc điều hướng cấp màn hình của hệ thống hỗ trợ tự học ứng dụng AI.

Mục tiêu chính:

- xác định các màn hình cần có trong MVP;
- xác định quan hệ cha–con và đường điều hướng giữa các màn hình;
- gán `Screen ID` nhất quán cho các artifact UI tiếp theo;
- đề xuất route frontend bằng tiếng Việt không dấu;
- truy vết màn hình về Use Case hiện hành;
- phân biệt màn hình độc lập với action, dialog, loading state và AI processing state;
- làm đầu vào cho Wireframe, Screen Specification, Frontend Routing và Test Case UI.

Tài liệu này không mô tả chi tiết bố cục pixel-level, component-level, API contract hoặc database schema.

---

# 2. Nguồn authority và quy tắc truy vết

UI Sitemap được phát triển từ bộ Requirements / Use Case đã freeze:

| Tài liệu | Phiên bản / trạng thái | Vai trò đối với UI Sitemap |
|---|---|---|
| `SRS_v1.5_baseline_final.md` | Frozen Baseline | Nguồn chuẩn cao nhất về requirement và phạm vi MVP |
| `Business_Rules_v1.3_baseline_rev1.md` | Frozen Baseline | Rule, validation, state, AI governance và data integrity |
| `Use_Case_Diagram_he_thong_ho_tro_tu_hoc_AI_v1.4_baseline_rev1.md` | Frozen Baseline | Actor, system boundary, 27 Use Case và include/extend |
| `Use_Case_Specification_v1.1_baseline_rev1.md` | Frozen Baseline | Luồng chi tiết, I/O, exception và acceptance behavior |
| `Document_Governance_and_Traceability_Index_v1.1.md` | Frozen Baseline | Authority model và traceability |
| `Requirements_UseCase_Baseline_Freeze_Record_v1.1.md` | Frozen Baseline | Freeze policy và change control |

Nguyên tắc:

1. UI Sitemap là artifact downstream và không được tự tạo business rule mới.
2. Một Use Case không bắt buộc tương ứng một màn hình.
3. Một màn hình có thể phục vụ nhiều Use Case có cùng mục tiêu UI.
4. Action như Logout, Apply, Save hoặc Confirm không tự động trở thành màn hình riêng.
5. Loading, empty, AI error, confirmation và preview là UI state nếu không tạo ra một khu vực điều hướng độc lập.
6. Phân quyền thật sự phải được kiểm tra ở backend; ẩn menu hoặc route ở frontend không thay thế authorization.
7. Hai màn hình lịch sử phân tích AI đã được chính thức hóa qua CR-001, `FR-TEA-008/UC-TEA-008` và `FR-ADM-007/UC-ADM-007`.

---

# 3. Quyết định thiết kế sitemap

## 3.1. Kiểu tổ chức

Sitemap sử dụng mô hình **Hybrid theo vai trò + Common dùng chung**:

- chức năng nghiệp vụ của Student đặt dưới `/sinh-vien`;
- chức năng nghiệp vụ của Teacher đặt dưới `/giao-vien`;
- chức năng nghiệp vụ của Administrator đặt dưới `/quan-tri`;
- chức năng thật sự dùng chung đặt ở route chung;
- Feedback gửi bởi Student/Teacher dùng một route chung.

## 3.2. Quy ước route

- Route dùng tiếng Việt không dấu.
- Dùng kebab-case khi route có nhiều từ.
- Dynamic parameter giữ tên kỹ thuật rõ nghĩa như `[classId]`, `[studentId]`.
- Route chỉ là đề xuất frontend; thay đổi route không làm thay đổi business behavior.
- Route con phải phản ánh context nghiệp vụ rõ ràng.

Ví dụ:

```text
/sinh-vien/ke-hoach-hoc-tap
/giao-vien/lop-hoc/[classId]/phan-tich-ai
/quan-tri/phan-hoi/lich-su-phan-tich
```

## 3.3. Quy ước Screen ID

| Prefix | Phạm vi |
|---|---|
| `SCR-COM-xxx` | Common |
| `SCR-FB-xxx` | Feedback dùng chung |
| `SCR-STU-xxx` | Student |
| `SCR-TEA-xxx` | Teacher |
| `SCR-ADM-xxx` | Administrator |

Screen ID độc lập với Use Case ID. Vì vậy `SCR-COM-002` có thể trace tới `UC-COM-004`.

---

# 4. Tổng quan số lượng màn hình

| Nhóm | Số màn hình |
|---|---:|
| Common | 2 |
| Feedback dùng chung | 1 |
| Student | 8 |
| Teacher | 6 |
| Administrator | 5 |
| **Tổng cộng** | **22** |

Trong 22 màn hình:

- toàn bộ 22 màn hình được truy vết về baseline hiện hành;
- hai màn hình lịch sử AI được chính thức hóa theo CR-001.

---

# 5. Sitemap tổng thể

```text
ROOT
│
├── /dang-nhap
│   └── SCR-COM-001 — Đăng nhập
│
├── /tai-khoan
│   └── /ho-so
│       └── SCR-COM-002 — Hồ sơ cá nhân
│
├── /phan-hoi
│   └── /gui
│       └── SCR-FB-001 — Gửi phản hồi
│
├── /sinh-vien
│   ├── /tong-quan
│   │   └── SCR-STU-001 — Tổng quan học tập
│   │
│   ├── /ket-qua-hoc-tap
│   │   └── SCR-STU-002 — Kết quả học tập
│   │
│   ├── /muc-tieu-hoc-tap
│   │   └── SCR-STU-003 — Mục tiêu & khả năng học
│   │
│   ├── /phan-tich-ai
│   │   └── SCR-STU-004 — Phân tích học tập bằng AI
│   │
│   ├── /ke-hoach-hoc-tap
│   │   ├── SCR-STU-005 — Kế hoạch học tập
│   │   └── /dieu-chinh
│   │       └── SCR-STU-008 — Điều chỉnh kế hoạch bằng AI
│   │
│   ├── /nhiem-vu
│   │   └── SCR-STU-006 — Nhiệm vụ học tập
│   │
│   └── /tien-do
│       └── SCR-STU-007 — Tiến độ học tập
│
├── /giao-vien
│   └── /lop-hoc
│       ├── SCR-TEA-001 — Danh sách lớp
│       │
│       └── /[classId]
│           ├── /tong-quan
│           │   └── SCR-TEA-002 — Tổng quan lớp
│           │
│           ├── /sinh-vien
│           │   ├── SCR-TEA-003 — Danh sách sinh viên
│           │   └── /[studentId]
│           │       └── SCR-TEA-004 — Chi tiết sinh viên
│           │
│           ├── /phan-tich-ai
│           │   └── SCR-TEA-005 — Phân tích lớp bằng AI
│           │
│           └── /lich-su-phan-tich
│               └── SCR-TEA-006 — Lịch sử phân tích AI
│
└── /quan-tri
    ├── /tong-quan
    │   └── SCR-ADM-001 — Tổng quan hệ thống
    │
    ├── /nguoi-dung
    │   └── SCR-ADM-002 — Quản lý người dùng
    │
    └── /phan-hoi
        ├── SCR-ADM-003 — Danh sách phản hồi
        ├── /phan-tich-ai
        │   └── SCR-ADM-004 — Phân tích phản hồi bằng AI
        └── /lich-su-phan-tich
            └── SCR-ADM-005 — Lịch sử phân tích AI
```

---

# 6. Common Screens

| Screen ID | Tên màn hình | Route | Actor | Use Case | Mục đích |
|---|---|---|---|---|---|
| `SCR-COM-001` | Đăng nhập | `/dang-nhap` | Student, Teacher, Administrator | `UC-COM-001` | Xác thực user và chuyển đến landing page theo role |
| `SCR-COM-002` | Hồ sơ cá nhân | `/tai-khoan/ho-so` | Student, Teacher, Administrator | `UC-COM-004` | Hiển thị `fullName`, `email`, `role`, `status` ở chế độ read-only |

## 6.1. Đăng xuất

`UC-COM-002 — Đăng xuất` không tạo Screen ID.

Đăng xuất là action trong khu vực tài khoản:

```text
[Hồ sơ]
[Đăng xuất]
```

Sau khi đăng xuất thành công:

```text
Current screen
     ↓
Đăng xuất
     ↓
/dang-nhap
```

---

# 7. Feedback dùng chung

| Screen ID | Tên màn hình | Route | Actor | Use Case | Mục đích |
|---|---|---|---|---|---|
| `SCR-FB-001` | Gửi phản hồi | `/phan-hoi/gui` | Student, Teacher | `UC-FB-001` | Gửi feedback thật để Administrator xem, thống kê và phân tích |

Dữ liệu tối thiểu:

- một tag hợp lệ;
- rating từ 1–5;
- content không rỗng sau trim.

Các tag hiện hành:

- `AI_PERFORMANCE`;
- `STUDY_PLAN`;
- `UI_UX`;
- `LEARNING_ANALYTICS`;
- `OTHER`.

Không thuộc phạm vi màn hình:

- sửa feedback;
- xóa feedback;
- Admin reply;
- ticket/support workflow;
- trạng thái Open/Resolved.

---

# 8. Student Sitemap

## 8.1. Screen Inventory

| Screen ID | Tên màn hình | Route | Use Case | Mục đích |
|---|---|---|---|---|
| `SCR-STU-001` | Tổng quan học tập | `/sinh-vien/tong-quan` | `UC-STU-001` | Hiển thị nhanh score, current plan, progress, near-due/overdue task và warning |
| `SCR-STU-002` | Kết quả học tập | `/sinh-vien/ket-qua-hoc-tap` | `UC-STU-002` | Xem kết quả mới nhất theo Topic và trạng thái đánh giá |
| `SCR-STU-003` | Mục tiêu & khả năng học | `/sinh-vien/muc-tieu-hoc-tap` | `UC-STU-003` | Nhập goal, thời lượng học khả dụng và deadline |
| `SCR-STU-004` | Phân tích học tập bằng AI | `/sinh-vien/phan-tich-ai` | `UC-STU-004` | Xem strengths, areasToImprove, priorityTopics và reasons |
| `SCR-STU-005` | Kế hoạch học tập | `/sinh-vien/ke-hoach-hoc-tap` | `UC-STU-005`, `UC-STU-006` | Generate plan, preview, chỉnh field được phép, Apply/Reject và xem current plan |
| `SCR-STU-006` | Nhiệm vụ học tập | `/sinh-vien/nhiem-vu` | `UC-STU-007` | Xem task current plan và chuyển TODO ↔ COMPLETED |
| `SCR-STU-007` | Tiến độ học tập | `/sinh-vien/tien-do` | `UC-STU-008` | Xem completed/total, actualProgress, expectedProgress, overdue và warning |
| `SCR-STU-008` | Điều chỉnh kế hoạch bằng AI | `/sinh-vien/ke-hoach-hoc-tap/dieu-chinh` | `UC-STU-009` | Xem adjustment preview và Accept/Reject |

## 8.2. Navigation Student

```text
TỔNG QUAN
  Tổng quan

HỌC TẬP
  Kết quả học tập
  Mục tiêu học tập
  Phân tích AI
  Kế hoạch học tập
  Nhiệm vụ
  Tiến độ

HỖ TRỢ
  Gửi phản hồi

TÀI KHOẢN
  Hồ sơ
  Đăng xuất
```

`SCR-STU-008` không xuất hiện trực tiếp trên sidebar. Màn hình được mở từ:

- CTA `Điều chỉnh bằng AI` trong Kế hoạch học tập;
- cảnh báo chậm tiến độ trong màn hình Tiến độ.

## 8.3. Luồng Student chính

```text
SCR-STU-001
Tổng quan
   │
   ├──→ SCR-STU-002 Kết quả
   │        └──→ SCR-STU-004 Phân tích AI
   │
   ├──→ SCR-STU-003 Mục tiêu
   │        └──→ SCR-STU-005 Kế hoạch học tập
   │
   ├──→ SCR-STU-006 Nhiệm vụ
   │
   └──→ SCR-STU-007 Tiến độ
              └──→ SCR-STU-008 Điều chỉnh AI
```

## 8.4. State quan trọng của `SCR-STU-005`

Không tách route cho Generate / Preview / Apply.

```text
Không có plan
    ↓
[Tạo kế hoạch bằng AI]
    ↓
AI processing
    ↓
Plan Preview
    ├── Chỉnh field được phép
    ├── Reject → không lưu
    └── Apply
          ↓
      UC-STU-006
          ↓
     Current StudyPlan
```

Field Student được phép chỉnh ở preview:

- `StudyPlan.title`;
- `StudyTask.title`;
- `expectedMinutes`;
- `dueDate`;
- `priority`.

Không được dùng flow này để sửa:

- score;
- AssessmentResult;
- Topic nguồn;
- goal nguồn bằng AI;
- dữ liệu Student khác.

## 8.5. State quan trọng của `SCR-STU-008`

```text
Current Plan
    ↓
Kiểm tra eligibility
    ↓
AI Adjustment Preview
    ├── Reject → giữ nguyên
    └── Accept → update TODO task hợp lệ
```

AI adjustment chỉ được đề xuất thay đổi:

- `expectedMinutes`;
- `dueDate`;
- `priority`;

và chỉ trên StudyTask `TODO`.

Không thêm/xóa task, không đổi Topic và không sửa task `COMPLETED`.

---

# 9. Teacher Sitemap

## 9.1. Screen Inventory

| Screen ID | Tên màn hình | Route | Use Case | Mục đích |
|---|---|---|---|---|
| `SCR-TEA-001` | Danh sách lớp | `/giao-vien/lop-hoc` | `UC-TEA-001` | Hiển thị Class được phân công và cho Teacher chọn Class |
| `SCR-TEA-002` | Tổng quan lớp | `/giao-vien/lop-hoc/[classId]/tong-quan` | `UC-TEA-003` + `FR-TEA-004` internal | Hiển thị metric lớp, Weak Topics, Needs Attention và Progress Warning |
| `SCR-TEA-003` | Danh sách sinh viên | `/giao-vien/lop-hoc/[classId]/sinh-vien` | `UC-TEA-002` | Hiển thị Student thuộc Class và metric read-only |
| `SCR-TEA-004` | Chi tiết sinh viên | `/giao-vien/lop-hoc/[classId]/sinh-vien/[studentId]` | `UC-TEA-002` | Xem latest score và progress của Student ở chế độ read-only |
| `SCR-TEA-005` | Phân tích lớp bằng AI | `/giao-vien/lop-hoc/[classId]/phan-tich-ai` | `UC-TEA-005`, `UC-TEA-006`, `UC-TEA-007` | Chạy AI analysis, xem recommendations và tùy chọn Save |
| `SCR-TEA-006` | Lịch sử phân tích AI | `/giao-vien/lop-hoc/[classId]/lich-su-phan-tich` | `UC-TEA-008` | Xem danh sách và chi tiết read-only của các ClassAnalysisReport đã lưu |

## 9.2. Landing page Teacher

Teacher không có dashboard tổng quát riêng trong frozen baseline.

Sau login:

```text
/dang-nhap
    ↓
/giao-vien/lop-hoc
    ↓
chọn Class
    ↓
/giao-vien/lop-hoc/[classId]/tong-quan
```

## 9.3. Class Context Navigation

```text
← Các lớp

<Class Name>

  Tổng quan
  Sinh viên
  Phân tích AI
  Lịch sử phân tích
```

Backend luôn kiểm tra Teacher–Class. Biết hoặc thay `classId` trên URL không tạo quyền truy cập.

## 9.4. `SCR-TEA-002 — Tổng quan lớp`

Màn hình hiển thị:

- `studentCount`;
- `classAverageScore`;
- `topicAverageScores`;
- `classCompletionRate`;
- `overdueTaskCount`;
- Weak Topics;
- Needs Attention;
- Progress Warning.

`FR-TEA-004` là xử lý nội bộ backend, không tạo `SCR-TEA-004` hay Use Case riêng.

## 9.5. `SCR-TEA-004 — Chi tiết sinh viên`

Chế độ **read-only**.

Teacher không được:

- sửa score;
- sửa AssessmentResult;
- sửa goal;
- sửa StudyPlan;
- sửa StudyTask.

## 9.6. `SCR-TEA-005 — Phân tích lớp bằng AI`

Một route phục vụ toàn bộ flow:

```text
Chưa phân tích
    ↓
[Phân tích lớp bằng AI]
    ↓
AI processing
    ↓
Analysis Result
    ├── Summary
    ├── Weak Topics
    ├── Progress Issues
    ├── Attention Groups
    └── Recommendations
    ↓
[Lưu]
```

`UC-TEA-006` không có màn hình riêng vì là included Use Case của `UC-TEA-005`.

`UC-TEA-007` không có màn hình riêng vì là Save action sau analysis thành công.

## 9.7. `SCR-TEA-006 — Lịch sử phân tích AI`

**Trạng thái requirement:** Baseline theo CR-001.

Mục tiêu tối thiểu:

- liệt kê `ClassAnalysisReport` đã lưu của Class hiện tại;
- hiển thị thời điểm tạo;
- hiển thị một summary ngắn nếu dữ liệu đã lưu có sẵn;
- mở chi tiết report ở chế độ read-only;
- dữ liệu chi tiết lấy từ `inputSnapshot` và `analysisResult` đã lưu;
- không recompute bằng dữ liệu Class live;
- không chạy lại AI khi chỉ xem lịch sử.

Chi tiết có thể mở bằng drawer/modal/expandable panel trong cùng Screen ID để không phát sinh thêm màn hình.

Không thuộc phạm vi extension này:

- edit report;
- delete report;
- compare reports;
- rerun AI;
- restore data từ report.

## 9.8. Navigation Teacher

```text
GIẢNG DẠY
  Lớp học

HỖ TRỢ
  Gửi phản hồi

TÀI KHOẢN
  Hồ sơ
  Đăng xuất
```

Sau khi chọn lớp dùng Class Context Navigation ở mục 9.3.

---

# 10. Administrator Sitemap

## 10.1. Screen Inventory

| Screen ID | Tên màn hình | Route | Use Case | Mục đích |
|---|---|---|---|---|
| `SCR-ADM-001` | Tổng quan hệ thống | `/quan-tri/tong-quan` | `UC-ADM-001` | Hiển thị các metric quản trị MVP |
| `SCR-ADM-002` | Quản lý người dùng | `/quan-tri/nguoi-dung` | `UC-ADM-002` | Xem/tìm kiếm user và Active/Disable user khác |
| `SCR-ADM-003` | Danh sách phản hồi | `/quan-tri/phan-hoi` | `UC-ADM-003` | Xem và lọc feedback |
| `SCR-ADM-004` | Phân tích phản hồi bằng AI | `/quan-tri/phan-hoi/phan-tich-ai` | `UC-ADM-004`, `UC-ADM-005`, `UC-ADM-006` | Phân tích feedback, xem issue groups, summary, priorityAreas, recommendations và Save |
| `SCR-ADM-005` | Lịch sử phân tích AI | `/quan-tri/phan-hoi/lich-su-phan-tich` | `UC-ADM-007` | Xem danh sách và chi tiết read-only của FeedbackAnalysis đã lưu |

## 10.2. Landing page Administrator

```text
/dang-nhap
    ↓
/quan-tri/tong-quan
```

`SCR-ADM-001` chỉ cần các metric MVP:

- `totalUsers`;
- `usersByRole`;
- `totalFeedback`;
- `totalAIRequests`;
- `failedAIRequests`.

Không mở rộng thành infrastructure monitoring hoặc analytics platform.

## 10.3. `SCR-ADM-002 — Quản lý người dùng`

Màn hình hỗ trợ:

- danh sách user;
- tìm kiếm theo tên/email;
- xem role;
- xem status;
- Activate user khác;
- Disable user khác.

Admin không được disable chính tài khoản đang đăng nhập.

Không cần User Detail page trong MVP.

## 10.4. `SCR-ADM-003 — Danh sách phản hồi`

Filter MVP:

- thời gian;
- rating;
- tag.

Màn hình hiển thị:

- sender;
- role;
- official tag;
- rating;
- content;
- createdAt.

CTA:

```text
[Phân tích tập phản hồi này bằng AI]
```

Dataset được phân tích là tập feedback tương ứng filter hiện tại hoặc toàn bộ dữ liệu theo lựa chọn hợp lệ của Admin.

## 10.5. `SCR-ADM-004 — Phân tích phản hồi bằng AI`

UI sử dụng một màn hình duy nhất cho two-stage AI flow.

Backend behavior:

```text
Feedback Dataset
      ↓
External AI Stage 1
Issue Grouping
      ↓
Backend validate + deduplicate + calculate count
      ↓
External AI Stage 2
Summary + PriorityAreas + Recommendations
```

UI behavior:

```text
Dataset Summary
      ↓
[Bắt đầu phân tích]
      ↓
AI Processing
      ↓
Issue Groups
      +
Summary
      +
Priority Areas
      +
Recommendations
      ↓
[Lưu]
```

Không tạo route riêng cho Stage 1 và Stage 2.

Nguồn dữ liệu cần phân biệt:

| Dữ liệu | Nguồn chuẩn |
|---|---|
| totalFeedback | Backend |
| tagStatistics | Backend |
| official tag | Feedback đã lưu |
| issueGroups | AI candidate + Backend validation/deduplicate/count |
| summary | AI + Backend validation |
| priorityAreas | AI + Backend validation |
| recommendations | AI + Backend validation |

### Trường hợp `issueGroups = []`

Nếu dataset không rỗng nhưng grouping hợp lệ cho kết quả `issueGroups = []`:

- vẫn là kết quả thành công;
- không hiển thị `INSUFFICIENT_DATA`;
- Stage 2 vẫn tiếp tục;
- UI có thể hiển thị “Chưa phát hiện nhóm vấn đề nổi bật”.

### Dataset rỗng

Nếu tập feedback sau filter rỗng:

- trả `INSUFFICIENT_DATA`;
- không gọi AI;
- không tạo AIRequestLog cho request bị chặn trước inference.

## 10.6. `SCR-ADM-005 — Lịch sử phân tích AI`

**Trạng thái requirement:** Baseline theo CR-001.

Mục tiêu tối thiểu:

- liệt kê các `FeedbackAnalysis` đã lưu;
- hiển thị thời điểm tạo;
- hiển thị số feedback trong snapshot nếu dữ liệu đã lưu hỗ trợ;
- hiển thị filter snapshot;
- mở chi tiết read-only;
- chi tiết lấy từ `inputSnapshot` và `analysisResult` đã lưu;
- không thay snapshot bằng feedback hiện tại;
- không chạy lại AI khi chỉ xem lịch sử.

Chi tiết có thể hiển thị trong drawer/modal/expandable panel của cùng Screen ID.

Không thuộc phạm vi extension:

- edit analysis;
- delete analysis;
- compare analyses;
- rerun analysis;
- tự áp dụng recommendation vào hệ thống.

## 10.7. Navigation Administrator

```text
QUẢN TRỊ
  Tổng quan
  Người dùng
  Phản hồi
    ├── Danh sách phản hồi
    ├── Phân tích AI
    └── Lịch sử phân tích

TÀI KHOẢN
  Hồ sơ
  Đăng xuất
```

`Phân tích AI` có thể được mở từ CTA trong `SCR-ADM-003`; không bắt buộc phải là item sidebar cấp cao.

---

# 11. Role Landing Routes

| Role | Route sau đăng nhập |
|---|---|
| Student | `/sinh-vien/tong-quan` |
| Teacher | `/giao-vien/lop-hoc` |
| Administrator | `/quan-tri/tong-quan` |

Quy tắc:

- unauthenticated user truy cập protected route → chuyển về `/dang-nhap`;
- authenticated user truy cập route ngoài role → frontend có thể chặn điều hướng, nhưng backend vẫn phải thực hiện authorization;
- tài khoản `DISABLED` không được tiếp tục dùng protected API.

---

# 12. Màn hình và hành động không tách riêng

Các hành vi sau **không có Screen ID riêng**:

| Hành vi | Lý do |
|---|---|
| Logout | Action trong account menu |
| Student Apply Plan | Extension action của plan preview |
| Student Reject Plan | State/action trong `SCR-STU-005` |
| Student Accept/Reject Adjustment | State/action trong `SCR-STU-008` |
| Teacher AI Recommendation | Included trong `SCR-TEA-005` |
| Teacher Save Analysis | Action trong `SCR-TEA-005` |
| Admin Stage 1 AI | Internal flow của `SCR-ADM-004` |
| Admin Stage 2 AI | Internal flow của `SCR-ADM-004` |
| Admin Save Analysis | Action trong `SCR-ADM-004` |
| Activate/Disable confirmation | Dialog state trong `SCR-ADM-002` |

---

# 13. Cross-cutting UI States

Các state sau không tạo Screen ID mới trừ khi artifact UI sau này có lý do rõ ràng.

## 13.1. Loading

Áp dụng khi:

- tải dữ liệu;
- gọi AI;
- Apply/Save;
- thay đổi trạng thái task;
- filter data.

## 13.2. Empty State

Ví dụ:

- Teacher chưa được phân công Class;
- Student chưa có current StudyPlan;
- Admin filter không có Feedback;
- danh sách lịch sử chưa có record.

## 13.3. `INSUFFICIENT_DATA`

UI phải phân biệt với lỗi AI.

Ví dụ:

- Student analysis không có AssessmentResult;
- Teacher class analysis không đạt minimum data;
- Admin dataset feedback rỗng.

Nếu request bị chặn trước external inference thì không tạo AIRequestLog.

## 13.4. Business Ineligible

Không gộp thành `INSUFFICIENT_DATA`.

Đặc biệt với Student adjustment:

- không có current plan;
- plan quá `endDate`;
- không còn StudyTask `TODO`.

Các trường hợp này không gọi AI.

## 13.5. AI Error

Bao gồm:

- AI unavailable;
- timeout;
- empty output;
- invalid structured output;
- incomplete output.

Khi AI lỗi:

- dữ liệu nghiệp vụ hiện tại phải được giữ nguyên;
- output lỗi không được coi là kết quả thành công;
- nếu external call đã thực sự bắt đầu thì logging tuân theo AIRequestLog rule.

## 13.6. Confirmation

Confirmation nên dùng cho thao tác có mutation đáng kể:

- Student Apply Plan;
- Student Accept Adjustment;
- Admin Disable User;
- Teacher Save Analysis nếu UX cần;
- Admin Save Analysis nếu UX cần.

Confirmation là dialog/component, không phải màn hình riêng.

---

# 14. Screen ↔ Use Case Traceability

| Screen ID | Use Case / Requirement liên quan | Trạng thái |
|---|---|---|
| `SCR-COM-001` | `UC-COM-001` | Baseline |
| `SCR-COM-002` | `UC-COM-004` | Baseline |
| `SCR-FB-001` | `UC-FB-001` | Baseline |
| `SCR-STU-001` | `UC-STU-001` | Baseline |
| `SCR-STU-002` | `UC-STU-002` | Baseline |
| `SCR-STU-003` | `UC-STU-003` | Baseline |
| `SCR-STU-004` | `UC-STU-004` | Baseline |
| `SCR-STU-005` | `UC-STU-005`, `UC-STU-006` | Baseline |
| `SCR-STU-006` | `UC-STU-007` | Baseline |
| `SCR-STU-007` | `UC-STU-008` | Baseline |
| `SCR-STU-008` | `UC-STU-009` | Baseline |
| `SCR-TEA-001` | `UC-TEA-001` | Baseline |
| `SCR-TEA-002` | `UC-TEA-003`, `FR-TEA-004` internal | Baseline |
| `SCR-TEA-003` | `UC-TEA-002` | Baseline |
| `SCR-TEA-004` | `UC-TEA-002` | Baseline |
| `SCR-TEA-005` | `UC-TEA-005`, `UC-TEA-006`, `UC-TEA-007` | Baseline |
| `SCR-TEA-006` | `UC-TEA-008` | Baseline |
| `SCR-ADM-001` | `UC-ADM-001` | Baseline |
| `SCR-ADM-002` | `UC-ADM-002` | Baseline |
| `SCR-ADM-003` | `UC-ADM-003` | Baseline |
| `SCR-ADM-004` | `UC-ADM-004`, `UC-ADM-005`, `UC-ADM-006` | Baseline |
| `SCR-ADM-005` | `UC-ADM-007` | Baseline |

Cross-cutting Use Cases/requirements có thể ảnh hưởng nhiều màn hình:

- `UC-COM-002 — Đăng xuất`;
- backend authorization;
- AI error handling;
- AIRequestLog;
- account `ACTIVE/DISABLED`.

---

# 15. CR-001 đã được baseline hóa

Hai chức năng lịch sử đã được chính thức hóa trong Requirements / Use Case Baseline mới:

- `FR-TEA-008 / UC-TEA-008` → `SCR-TEA-006`;
- `FR-ADM-007 / UC-ADM-007` → `SCR-ADM-005`.

Cả hai giữ phạm vi list + detail read-only, dùng snapshot đã lưu, không edit/delete/compare/rerun và không gọi AI khi xem lịch sử.

# 16. Out of Scope của UI Sitemap v1.0

Không bổ sung màn hình cho:

- chatbot AI tổng quát;
- RAG / hỏi đáp PDF;
- forum;
- realtime chat;
- gamification;
- badge;
- hệ thống thi trực tuyến đầy đủ;
- video learning;
- calendar phức tạp;
- email notification;
- AI exam generator;
- course recommendation;
- full content management;
- support ticket;
- Admin reply feedback;
- AI tự quyết định thay user;
- quản trị permission tùy biến;
- reset password phức tạp;
- session management nâng cao;
- report comparison;
- analysis comparison.

---

# 17. Handoff sang Wireframe / Screen Specification

Artifact tiếp theo có thể sử dụng trực tiếp các Screen ID trong tài liệu này.

Mỗi Screen Specification nên tối thiểu chứa:

- Screen ID;
- route;
- actor;
- mục tiêu;
- entry point;
- thành phần UI chính;
- dữ liệu hiển thị;
- action;
- validation;
- loading/empty/error state;
- authorization constraint;
- Use Case / FR / BR traceability.

Thứ tự phát triển wireframe khuyến nghị:

1. Common;
2. Student;
3. Teacher;
4. Administrator;
5. Feedback;
6. AI states và error states dùng chung.

---

# 18. Review Checklist

- [x] Sử dụng mô hình Hybrid theo role + Common.
- [x] Route dùng tiếng Việt không dấu.
- [x] Có Screen ID cho toàn bộ màn hình độc lập.
- [x] Không ép 1 Use Case = 1 Screen.
- [x] Logout không tạo màn hình riêng.
- [x] Student Apply Plan không tạo màn hình riêng.
- [x] Teacher recommendation không tạo màn hình riêng.
- [x] Teacher Save Analysis không tạo màn hình riêng.
- [x] Admin AI Stage 1/Stage 2 không bị tách thành hai màn hình.
- [x] Admin Save Analysis không tạo màn hình riêng.
- [x] Teacher Student Detail giữ read-only.
- [x] Student adjustment độc lập với Progress screen.
- [x] Admin `issueGroups = []` được phân biệt với `INSUFFICIENT_DATA`.
- [x] Feedback tag chính thức không do AI thay đổi.
- [x] AI error/loading/empty state không tạo Screen ID không cần thiết.
- [x] Tổng số màn hình: 22.
- [x] Hai màn hình lịch sử AI đã trace chính thức tới UC-TEA-008 và UC-ADM-007 theo CR-001.
- [x] Không âm thầm ghi đè frozen baseline.

---

# 19. Lịch sử phiên bản

| Phiên bản | Ngày | Trạng thái | Nội dung |
|---|---|---|---|
| 1.0 | 21/10/2026 | Draft / Pending Change Control | Khởi tạo UI Sitemap theo mô hình Hybrid; 22 màn hình; 2 history screen chờ change control |
| 1.1 | 21/10/2026 | Frozen Baseline | Đồng bộ CR-001 và baseline 27 Use Case; history screen trace chính thức tới UC-TEA-008/UC-ADM-007 |

---

# 20. Kết luận

UI Sitemap v1.0 xác định cấu trúc UI gồm **22 màn hình** cho MVP:

- Common: 2;
- Feedback: 1;
- Student: 8;
- Teacher: 6;
- Administrator: 5.

Cấu trúc được tổ chức theo mô hình Hybrid, giữ ranh giới role rõ ràng nhưng tái sử dụng các màn hình Common/Feedback dùng chung.

Hai màn hình lịch sử AI đã được baseline hóa qua CR-001 và được triển khai theo semantics read-only snapshot, không phát sinh AI call khi list/detail.
