# WIREFRAME / SCREEN SPECIFICATION
## Hệ thống hỗ trợ tự học ứng dụng AI

**Phiên bản:** 1.1 Baseline Final  
**Ngày:** 26/10/2026  
**Trạng thái:** Official Baseline — Downstream UI Design Artifact  
**Phạm vi:** Web Application MVP — Student, Teacher, Administrator  
**Số màn hình độc lập:** 22  
**Nguồn Screen ID:** `UI_Sitemap_v1.1_baseline.md`

---

# 1. Mục đích tài liệu

Tài liệu này chuyển UI Sitemap đã baseline hóa thành đặc tả giao diện ở mức **low-fidelity wireframe + screen behavior** để làm đầu vào trực tiếp cho:

- thiết kế Figma chi tiết;
- triển khai Next.js frontend;
- thiết kế component/state;
- frontend routing;
- API mapping ở bước tiếp theo;
- UI test case và demo script.

Tài liệu **không tạo requirement hoặc business behavior mới**. Mọi hành vi có tác động nghiệp vụ phải truy vết về SRS / Use Case / Business Rules hiện hành. Các quyết định chỉ liên quan bố cục, cách nhóm thông tin hoặc cách trình bày được đánh dấu là **UI decision**.

---

# 2. Nguồn authority

Thứ tự sử dụng khi có xung đột:

1. `SRS_v1.6_baseline_final.md` — requirement authority.
2. `Use_Case_Diagram_he_thong_ho_tro_tu_hoc_AI_v1.4_baseline_rev1.md` — actor, system boundary, 27 Use Case.
3. `Business_Rules_v1.4_baseline_rev1.md` — validation, threshold, state, authorization, AI governance.
4. `Use_Case_Specification_v1.2_baseline_rev1.md` — main/alternate/exception flow, I/O, acceptance behavior.
5. `UI_Sitemap_v1.1_baseline.md` — 22 Screen ID, route, navigation và Screen ↔ Use Case mapping.
6. `Activity_Diagram_3_AI_Main_Flows_v1.3_baseline_final.md` — thứ tự và boundary của 3 luồng AI chính.
7. `Change_Request_CR-002_AI_Input_Capacity_and_Runtime_Failure_Semantics_v1.0_approved.md` — authority cho `AI_INPUT_TOO_LARGE` / `AI_RUNTIME_FAILURE`.
8. `Document_Governance_and_Traceability_Index_v1.2.md` + `Requirements_UseCase_Baseline_Freeze_Record_v1.2.md` — authority, freeze và change control R3.

Mọi thay đổi làm thay đổi observable business behavior phải đi qua change control; tài liệu này chỉ cụ thể hóa UI cho baseline hiện hành.

---

# 3. Phạm vi và nguyên tắc wireframe

## 3.1. Phạm vi

Tài liệu đặc tả đúng 22 màn hình:

| Nhóm | Số màn hình |
|---|---:|
| Common | 2 |
| Feedback dùng chung | 1 |
| Student | 8 |
| Teacher | 6 |
| Administrator | 5 |
| **Tổng** | **22** |

Không tạo Screen ID riêng cho Logout, Apply/Reject Plan, Accept/Reject Adjustment, Teacher Recommendation, Teacher/Admin Save, Admin AI Stage 1/2 hoặc confirmation dialog.

## 3.2. Mức độ fidelity

**UI decision:** wireframe trong tài liệu là low-fidelity, ưu tiên cấu trúc thông tin và hành vi hơn hình thức thẩm mỹ. Ký hiệu:

- `[Button]` — nút hành động;
- `[Input........]` — ô nhập;
- `[Select v]` — dropdown/select;
- `( )` / `(●)` — lựa chọn đơn;
- `[ ]` — checkbox hoặc trạng thái;
- `┌────┐` — card/panel/table;
- `Drawer/Modal` — state phủ trên màn hình, không phải Screen ID mới.

## 3.3. Layout shell

**UI decision — Desktop-first cho wireframe MVP:** không biến thành requirement responsive mới. Mục tiêu là dễ demo trên laptop/desktop.

### Auth shell

```text
┌──────────────────────────────────────────────────────────────┐
│                         APP / LOGO                           │
│                                                              │
│                   ┌──────────────────┐                       │
│                   │   Main content   │                       │
│                   └──────────────────┘                       │
└──────────────────────────────────────────────────────────────┘
```

### Protected app shell

```text
┌──────────────┬───────────────────────────────────────────────┐
│ Sidebar      │ Top bar: context / account                   │
│              ├───────────────────────────────────────────────┤
│ Role menu    │                                               │
│              │ Page title + actions                          │
│              │                                               │
│              │ Main content                                  │
│              │                                               │
└──────────────┴───────────────────────────────────────────────┘
```

Teacher trong context một Class có thêm class context navigation: `Tổng quan | Sinh viên | Phân tích AI | Lịch sử phân tích`.

---

# 4. Quy ước UI dùng chung

| State | Cách thể hiện | Quy tắc |
|---|---|---|
| Initial loading | Skeleton/spinner trong vùng nội dung | Không tạo Screen ID mới |
| Action loading | Disable action gây duplicate + loading label | Dùng cho AI, Apply, Save, task update, filter |
| Empty | Illustration/text ngắn + CTA phù hợp nếu có | Không biến dữ liệu thiếu thành số 0 nếu rule không cho phép |
| `INSUFFICIENT_DATA` | Informational state riêng, không dùng thông báo “AI lỗi” | Request dừng trước inference, không AIRequestLog |
| Business ineligible | Thông báo điều kiện chưa thỏa + hướng xử lý | Không gộp với `INSUFFICIENT_DATA` |
| Validation error | Lỗi cạnh field + summary khi cần | Backend vẫn là nguồn validation cuối |
| AI error | Error panel + `[Thử lại]` khi phù hợp | Giữ nguyên dữ liệu nghiệp vụ cũ |
| `AI_INPUT_TOO_LARGE` | Informational/actionable error; giải thích dữ liệu vượt khả năng xử lý hiện tại và hướng thu hẹp phạm vi khi có thể | Pre-dispatch; không `AIRequestLog`; không hiển thị như provider inference failure |
| `AI_RUNTIME_FAILURE` | Error panel: `AI tạm thời chưa thể xử lý yêu cầu. Vui lòng thử lại sau.` + `[Thử lại]` khi an toàn | Không leak protocol/auth/model/config detail; logging phụ thuộc failure xảy ra trước hay sau dispatch |
| Forbidden | Không hiển thị dữ liệu nhạy cảm; chuyển về context hợp lệ hoặc error page | Frontend guard không thay backend authorization |
| Disabled account | Xóa trạng thái đăng nhập cục bộ và về `/dang-nhap` khi protected API trả lỗi phù hợp | Áp dụng toàn hệ thống |
| Confirmation | Dialog xác nhận cho mutation đáng kể | Không tạo Screen ID mới |
| Success feedback | Toast/inline confirmation | Không thay đổi route nếu không cần |

## 4.1. Confirmation tối thiểu

- Student Apply Plan.
- Student Accept Adjustment.
- Administrator Disable User.
- Teacher Save Analysis và Administrator Save Analysis **không bắt buộc confirmation dialog** trong MVP vì đây là thao tác lưu snapshot/report không phá hủy dữ liệu hiện có; nút Save phải có loading state và success/error feedback rõ ràng.

## 4.2. Quy tắc hiển thị dữ liệu số

- Threshold nghiệp vụ được backend đánh giá trên giá trị gốc; UI chỉ làm tròn để hiển thị.
- Không tự suy ra trạng thái rule từ số đã làm tròn nếu backend đã trả trạng thái.
- `null/N/A` phải được phân biệt với `0`.

## 4.3. Quy tắc ngày giờ

- Backend/database lưu timestamp theo UTC và API truyền thời gian theo ISO 8601.
- Frontend phải chuyển timestamp sang **local time của thiết bị/trình duyệt** trước khi hiển thị.
- Các màn hình có `createdAt`, `evaluatedAt`, `startDate`, `endDate`, `dueDate`, `completedAt` hoặc thời điểm report/feedback phải dùng cùng quy tắc này.
- Khi gửi date/time về backend, frontend không tự thay đổi semantics của mốc thời gian; backend vẫn là nguồn validation cuối.

## 4.4. Phân biệt dữ liệu hệ thống và kết quả AI

Mọi màn hình AI phải tách rõ hai vùng thông tin:

1. **Dữ liệu / thống kê hệ thống** — score, count, progress, tag statistics và metric do backend/database tính.
2. **Phân tích / đề xuất từ AI** — summary, strengths, recommendations, issue groups hoặc nội dung AI sinh.

Quy ước UI:

- không trình bày AI output như số liệu hệ thống đã được xác nhận;
- AI không được ghi đè metric/count chính xác do backend cung cấp;
- dùng heading/label rõ như `Dữ liệu hệ thống`, `Phân tích từ AI`, `Đề xuất từ AI`;
- các hành động Apply/Accept làm thay đổi dữ liệu phải thể hiện rõ user đang xác nhận đề xuất AI.

## 4.5. Quy tắc Retry và action loading

- Khi action đang xử lý, disable đúng action có nguy cơ gửi lặp và hiển thị loading label/spinner.
- AI error/provider unavailable/timeout/`AI_RUNTIME_FAILURE` có thể hiển thị `[Thử lại]` nếu request có thể chạy lại an toàn. `AI_INPUT_TOO_LARGE` ưu tiên hướng user thu hẹp phạm vi khi UI có filter; không khuyến khích retry y nguyên payload.
- `INSUFFICIENT_DATA`, validation error và business ineligible **không** hiển thị Retry như lỗi provider; UI phải hướng user sửa dữ liệu hoặc điều kiện trước.
- Retry không được làm mất dữ liệu nghiệp vụ đã tồn tại.

---

# 5. Navigation chung

## 5.1. Role landing route

| Role | Landing route |
|---|---|
| Student | `/sinh-vien/tong-quan` |
| Teacher | `/giao-vien/lop-hoc` |
| Administrator | `/quan-tri/tong-quan` |

## 5.2. Account actions

Account menu dùng chung:

```text
[Avatar / Tên]
  ├─ Hồ sơ
  └─ Đăng xuất
```

`Đăng xuất` là action, sau thành công chuyển về `/dang-nhap`.

---

# 6. Screen Specifications

## SCR-COM-001 — Đăng nhập

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/dang-nhap` |
| **Actor** | Student, Teacher, Administrator |
| **Use Case** | `UC-COM-001` |
| **Mục tiêu** | Xác thực tài khoản và chuyển user đến landing route đúng role. |
| **Entry point** | User chưa đăng nhập hoặc bị đưa về login do phiên không hợp lệ/đã logout. |

### Wireframe

```text
┌──────────────────────────────────────────────────────────────┐
│                 HỆ THỐNG HỖ TRỢ TỰ HỌC AI                  │
│                                                              │
│                 ┌────────────────────────┐                   │
│                 │ ĐĂNG NHẬP              │                   │
│                 │ Email                  │                   │
│                 │ [....................] │                   │
│                 │ Mật khẩu               │                   │
│                 │ [....................] │                   │
│                 │ [      Đăng nhập     ] │                   │
│                 │                        │                   │
│                 │ <inline error area>    │                   │
│                 └────────────────────────┘                   │
└──────────────────────────────────────────────────────────────┘
```

### Thành phần UI chính

- Form đăng nhập.
- Field email.
- Field mật khẩu.
- Nút `Đăng nhập`.
- Vùng lỗi inline.

**UI decision:** MVP wireframe chốt cách nhập credential bằng `email + password` để frontend có contract hiển thị cụ thể. Đây là quyết định triển khai UI, không thay đổi requirement xác thực/authorization của baseline.

### Dữ liệu hiển thị

- Không hiển thị dữ liệu nghiệp vụ trước khi đăng nhập.
- Sau login thành công nhận user cơ bản + role để điều hướng.

### Action và điều hướng

- `[Đăng nhập]` → gửi request xác thực.
- Thành công → Student `/sinh-vien/tong-quan`; Teacher `/giao-vien/lop-hoc`; Administrator `/quan-tri/tong-quan`.

### Validation / business constraint

- Email được trim/lowercase ở backend theo BR-039.
- Credential sai → từ chối, không tạo phiên.
- Tài khoản `DISABLED` → từ chối đăng nhập.

### State bắt buộc

- Default.
- Submitting/loading.
- Invalid credentials.
- Disabled account.
- Server/database error.

### Authorization

- Màn hình public.
- Sau login, quyền theo role vẫn phải được backend kiểm tra ở protected API.

### Traceability

`FR-COM-001`; `BR-023`, `BR-039`; `ERR-001`, `ERR-002`.

---

## SCR-COM-002 — Hồ sơ cá nhân

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/tai-khoan/ho-so` |
| **Actor** | Student, Teacher, Administrator |
| **Use Case** | `UC-COM-004` |
| **Mục tiêu** | Hiển thị thông tin tài khoản cơ bản của user hiện tại ở chế độ read-only. |
| **Entry point** | Account menu → `Hồ sơ`. |

### Wireframe

```text
┌──────────────┬───────────────────────────────────────────────┐
│ Sidebar      │ HỒ SƠ CÁ NHÂN                                │
│              │                                               │
│              │ ┌───────────────────────────────────────────┐ │
│              │ │ Họ tên     Nguyễn Văn A                  │ │
│              │ │ Email      student@example.com           │ │
│              │ │ Vai trò    Student                       │ │
│              │ │ Trạng thái ACTIVE                        │ │
│              │ └───────────────────────────────────────────┘ │
└──────────────┴───────────────────────────────────────────────┘
```

### Thành phần UI chính

- Read-only profile card.
- Account menu có `Đăng xuất`.

### Dữ liệu hiển thị

- `fullName`.
- `email`.
- `role`.
- `status`.

### Action và điều hướng

- Không có edit profile trong MVP.
- `Đăng xuất` ở account menu → `/dang-nhap` sau khi kết thúc phiên.

### Validation / business constraint

- Không có field editable.
- Không nhận `userId` tùy ý từ client để xem hồ sơ người khác.

### State bắt buộc

- Loading.
- Success.
- Session invalid / account disabled → về login.
- Generic error.

### Authorization

Backend lấy user từ phiên/token hiện tại và chỉ trả hồ sơ của chính user.

### Traceability

`FR-COM-003`, `FR-COM-004`; `BR-012`, `BR-023`, `BR-032`.

---

## SCR-FB-001 — Gửi phản hồi

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/phan-hoi/gui` |
| **Actor** | Student, Teacher |
| **Use Case** | `UC-FB-001` |
| **Mục tiêu** | Cho Student/Teacher gửi feedback thật vào nguồn dữ liệu Admin có thể xem và phân tích. |
| **Entry point** | Sidebar mục `Gửi phản hồi` của Student hoặc Teacher. |

### Wireframe

```text
┌──────────────┬───────────────────────────────────────────────┐
│ Sidebar      │ GỬI PHẢN HỒI                                 │
│              │                                               │
│              │ Tag *                                         │
│              │ [ AI hỗ trợ                             v ]   │
│              │                                               │
│              │ Rating *   ( )1 ( )2 ( )3 ( )4 ( )5          │
│              │                                               │
│              │ Nội dung *                                    │
│              │ [..........................................]  │
│              │ [..........................................]  │
│              │                                               │
│              │                         [ Gửi phản hồi ]       │
└──────────────┴───────────────────────────────────────────────┘
```

### Thành phần UI chính

- Select tag bắt buộc.
- Rating 1–5.
- Textarea content.
- Submit button.
- Inline validation/success message.

### Dữ liệu hiển thị

Tag hiển thị và giá trị lưu:

| Nhãn UI | Giá trị lưu |
|---|---|
| AI hỗ trợ | `AI_PERFORMANCE` |
| Kế hoạch học tập | `STUDY_PLAN` |
| Giao diện & trải nghiệm | `UI_UX` |
| Kết quả & tiến độ học tập | `LEARNING_ANALYTICS` |
| Khác | `OTHER` |

### Action và điều hướng

- `[Gửi phản hồi]` → validate → save.
- Thành công: reset toàn bộ field về trạng thái mặc định và hiển thị success confirmation; không tự điều hướng sang màn hình khác.
- Không có edit/delete/reply/ticket flow.

### Validation / business constraint

- Đúng 1 tag hợp lệ.
- Rating là số nguyên 1–5.
- Content không rỗng sau trim.
- `userId` lấy từ phiên, không lấy từ field client.

### State bắt buộc

- Default.
- Field validation error.
- Submit loading.
- Submit success.
- Database/server error.

### Authorization

Chỉ Student/Teacher `ACTIVE`. Administrator không dùng màn hình gửi feedback.

### Traceability

`FR-FB-001`; `BR-013`, `BR-014`, `BR-031`; `DATA-REQ-004`.

---

## SCR-STU-001 — Tổng quan học tập

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/sinh-vien/tong-quan` |
| **Actor** | Student |
| **Use Case** | `UC-STU-001` |
| **Mục tiêu** | Cho Student nhìn nhanh trạng thái học tập hiện tại từ metric backend tính. |
| **Entry point** | Landing route sau login của Student hoặc sidebar `Tổng quan`. |

### Wireframe

```text
┌──────────────┬──────────────────────────────────────────────────┐
│ Sidebar      │ TỔNG QUAN HỌC TẬP                               │
│              │                                                  │
│              │ [ Tiến độ: 60% ] [ Hoàn thành: 6/10 ]           │
│              │ [ Quá hạn: 2   ] [ Kế hoạch: ACTIVE ]           │
│              │                                                  │
│              │ ┌─ Cảnh báo chậm tiến độ ─────────────────────┐ │
│              │ │ actualProgress thấp hơn expectedProgress... │ │
│              │ │ [ Xem tiến độ ] [ Điều chỉnh bằng AI ]      │ │
│              │ └──────────────────────────────────────────────┘ │
│              │                                                  │
│              │ Kết quả theo chủ đề                              │
│              │ Topic        Score      Trạng thái                │
│              │ ...                                             │
│              │                                                  │
│              │ Nhiệm vụ gần hạn / quá hạn                       │
│              │ ...                                             │
└──────────────┴──────────────────────────────────────────────────┘
```

### Thành phần UI chính

- Metric cards progress/task.
- Current StudyPlan summary.
- Warning panel khi chậm tiến độ.
- Latest score by Topic.
- Near-due / overdue task list.
- CTA sang Kết quả, Nhiệm vụ, Tiến độ; adjustment CTA khi phù hợp.

### Dữ liệu hiển thị

- Score theo Topic.
- Current StudyPlan nếu có.
- `completedTasks`, `totalTasks`.
- `actualProgress`, `expectedProgress`.
- near-due tasks (TODO, > now và trong 48h).
- overdue tasks (TODO, dueDate < now).
- slow-progress warning do backend xác định.

### Action và điều hướng

- `Xem kết quả` → `SCR-STU-002`.
- `Xem nhiệm vụ` → `SCR-STU-006`.
- `Xem tiến độ` → `SCR-STU-007`.
- `Điều chỉnh bằng AI` → `SCR-STU-008` khi có entry point phù hợp.

### Validation / business constraint

- Không gọi AI để tải dashboard.
- Không tự tính lại business status từ số UI đã làm tròn.
- Plan quá endDate nhưng còn TODO vẫn có thể `ACTIVE`; không tự hiển thị trạng thái `EXPIRED` không tồn tại.

### State bắt buộc

- Loading.
- Có AssessmentResult nhưng chưa có current plan: plan-dependent metric hiển thị N/A/null phù hợp.
- Không có dữ liệu điểm: empty section, không tự gán score 0.
- Warning chậm tiến độ nếu backend trả trạng thái phù hợp.
- Error tải dashboard.

### Authorization

Chỉ dữ liệu của Student hiện tại; backend không tin studentId tùy ý từ client.

### Traceability

`FR-STU-001`; `BR-001`, `BR-009`, `BR-017`, `BR-025`, `BR-027`, `BR-034`, `BR-036`.

---

## SCR-STU-002 — Kết quả học tập

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/sinh-vien/ket-qua-hoc-tap` |
| **Actor** | Student |
| **Use Case** | `UC-STU-002` |
| **Mục tiêu** | Hiển thị AssessmentResult mới nhất của từng Topic và trạng thái đánh giá. |
| **Entry point** | Sidebar `Kết quả học tập` hoặc CTA từ Tổng quan. |

### Wireframe

```text
┌──────────────┬──────────────────────────────────────────────────┐
│ Sidebar      │ KẾT QUẢ HỌC TẬP                                 │
│              │                                                  │
│              │ Topic              Score   Đánh giá   Cập nhật   │
│              │ ------------------------------------------------ │
│              │ Cấu trúc dữ liệu     82    Tốt        ...        │
│              │ API                  71    Cần củng cố ...        │
│              │ Testing              55    Cần ưu tiên ...        │
│              │                                                  │
│              │                     [ Phân tích bằng AI ]         │
└──────────────┴──────────────────────────────────────────────────┘
```

### Thành phần UI chính

- Table/list latest result by Topic.
- Status badge.
- CTA `Phân tích bằng AI`.

### Dữ liệu hiển thị

- Topic.
- Score 0–100.
- `evaluatedAt`.
- Status: `Tốt`, `Cần củng cố`, `Cần ưu tiên`.

### Action và điều hướng

- `[Phân tích bằng AI]` → `SCR-STU-004`.
- Không có lịch sử/trend bắt buộc trong MVP.

### Validation / business constraint

- Score source từ backend.
- `>=80` Tốt; `60<=score<80` Cần củng cố; `<60` Cần ưu tiên.
- Mỗi Topic hiển thị bản ghi mới nhất theo `evaluatedAt`.

### State bắt buộc

- Loading.
- Empty: chưa có AssessmentResult.
- Success list.
- Error tải dữ liệu.

### Authorization

Student chỉ xem AssessmentResult của chính mình.

### Traceability

`FR-STU-002`; `BR-001`, `BR-016`, `BR-034`; `DATA-REQ-008`, `DATA-REQ-010`.

---

## SCR-STU-003 — Mục tiêu & khả năng học

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/sinh-vien/muc-tieu-hoc-tap` |
| **Actor** | Student |
| **Use Case** | `UC-STU-003` |
| **Mục tiêu** | Thu thập goal, thời lượng học khả dụng và deadline để dùng cho các luồng AI Student. |
| **Entry point** | Sidebar `Mục tiêu học tập`, CTA từ Tổng quan, hoặc trước khi tạo plan. |

### Wireframe

```text
┌──────────────┬──────────────────────────────────────────────────┐
│ Sidebar      │ MỤC TIÊU & KHẢ NĂNG HỌC                          │
│              │                                                  │
│              │ Mục tiêu học tập *                               │
│              │ [............................................]   │
│              │                                                  │
│              │ Số giờ có thể học / tuần *                       │
│              │ [ 8 ] giờ                                        │
│              │                                                  │
│              │ Deadline mục tiêu *                              │
│              │ [ yyyy-mm-dd ]                                   │
│              │                                                  │
│              │                    [ Xác nhận & tiếp tục ]             │
└──────────────┴──────────────────────────────────────────────────┘
```

### Thành phần UI chính

- Goal textarea/input.
- Numeric input `availableHoursPerWeek`.
- Date/date-time input `targetDeadline`.
- CTA `Xác nhận & tiếp tục`; bước này validate dữ liệu đầu vào và giữ bộ dữ liệu đã validate như trạng thái tạm trong luồng, không tạo entity nghiệp vụ mới.

### Dữ liệu hiển thị

- `goal`.
- `availableHoursPerWeek` ở UI.
- Backend chuẩn hóa thành `availableMinutesPerWeek`.
- `targetDeadline`.

### Action và điều hướng

- `[Xác nhận & tiếp tục]` → backend validate/normalize.
- Thành công → UI giữ bộ dữ liệu đã validate như trạng thái tạm để chuyển tiếp sang `SCR-STU-005`; cơ chế state management cụ thể thuộc implementation.
- `SCR-STU-005` gửi lại goal/time/deadline trong request cần thiết; bước này không tạo bản ghi goal riêng trong database.

### Validation / business constraint

- Goal sau trim không rỗng.
- `availableHoursPerWeek > 0`.
- `targetDeadline > now` tại thời điểm backend xử lý.
- Validation lỗi không phải `INSUFFICIENT_DATA` và không gọi AI.

### State bắt buộc

- Default.
- Inline validation.
- Submit loading.
- Validated/success.
- Generic error.

### Authorization

Chỉ Student hiện tại. Backend validate lại dữ liệu ở mỗi request AI/Apply có sử dụng dữ liệu này.

### Traceability

`FR-STU-003`; `BR-037`; `DATA-REQ-005`.

### Ghi chú thiết kế

Không tạo màn hình hoặc entity “LearningPreference” riêng trong MVP.

---

## SCR-STU-004 — Phân tích học tập bằng AI

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/sinh-vien/phan-tich-ai` |
| **Actor** | Student |
| **Use Case** | `UC-STU-004` |
| **Mục tiêu** | Hiển thị AI strengths/areasToImprove/priorityTopics/reasons dựa trên dữ liệu Student hợp lệ. |
| **Entry point** | Sidebar `Phân tích AI`, CTA từ Kết quả học tập hoặc luồng Student. |

### Wireframe

```text
┌──────────────┬──────────────────────────────────────────────────┐
│ Sidebar      │ PHÂN TÍCH HỌC TẬP BẰNG AI                       │
│              │                                                  │
│              │ Dữ liệu dùng để phân tích                        │
│              │ - Kết quả hiện tại theo Topic                    │
│              │ - Goal (nếu có)                                  │
│              │ - Progress (nếu có)                              │
│              │                                                  │
│              │ [ Phân tích bằng AI ]                            │
│              │                                                  │
│              │ ┌ Strengths ───────────────────────────────────┐ │
│              │ ├ Areas to improve ────────────────────────────┤ │
│              │ ├ Priority topics ─────────────────────────────┤ │
│              │ └ Reasons ─────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────────┘
```

### Thành phần UI chính

- Data-context summary.
- CTA AI.
- Result cards: strengths, areasToImprove, priorityTopics, reasons.
- Retry/error panel.

### Dữ liệu hiển thị

Input context do backend chuẩn bị:
- latest AssessmentResult per Topic;
- goal nếu có;
- progress nếu có.
Output:
- strengths;
- areasToImprove;
- priorityTopics;
- reasons.

### Action và điều hướng

- `[Phân tích bằng AI]` → AI processing → result.
- `UC-STU-004` không phải dependency bắt buộc của plan generation; màn hình này không yêu cầu CTA riêng sang `SCR-STU-005`.

### Validation / business constraint

- Minimum data bắt buộc: ít nhất một AssessmentResult hợp lệ.
- `goal` là optional context; thiếu goal không được hiển thị `INSUFFICIENT_DATA` nếu có AssessmentResult.
- AI output phải qua backend structured validation.

### State bắt buộc

- Initial/ready.
- AI processing.
- `INSUFFICIENT_DATA`: chưa có AssessmentResult; hướng Student cần dữ liệu đánh giá.
- AI unavailable/timeout.
- Invalid/empty structured output.
- Success result.

### Authorization

Chỉ dữ liệu của Student hiện tại. AI không truy cập DB trực tiếp; UI không coi AI là nguồn score/statistics.

### Traceability

`FR-STU-004`; `BR-001`, `BR-004`, `BR-009`, `BR-010`, `BR-011`, `BR-034`, `BR-035`, `BR-041`; `OD-41`.

---

## SCR-STU-005 — Kế hoạch học tập

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/sinh-vien/ke-hoach-hoc-tap` |
| **Actor** | Student |
| **Use Case** | `UC-STU-005`, `UC-STU-006` |
| **Mục tiêu** | Tạo StudyPlan bằng AI, hiển thị preview, cho chỉnh field được phép và Apply/Reject; đồng thời hiển thị current plan khi đã áp dụng. |
| **Entry point** | Sidebar `Kế hoạch học tập`; từ Mục tiêu & khả năng học; hoặc CTA sau các bước Student phù hợp. |

### Wireframe

```text
┌──────────────┬──────────────────────────────────────────────────────────┐
│ Sidebar      │ KẾ HOẠCH HỌC TẬP                                       │
│              │                                                          │
│              │ [Context: Goal | giờ/tuần | deadline]                    │
│              │ [ Tạo kế hoạch bằng AI ]                                 │
│              │                                                          │
│              │ ===== Khi có PREVIEW =====                                │
│              │ Tên kế hoạch [.................................]          │
│              │                                                          │
│              │ Task | Topic(read-only) | Phút | Due date | Priority     │
│              │ [..] | Topic A          | [60] | [date]   | [HIGH v]    │
│              │ [..] | Topic B          | [45] | [date]   | [MED v]     │
│              │                                                          │
│              │ [ Từ chối ]                         [ Áp dụng kế hoạch ] │
│              │                                                          │
│              │ ===== Khi có CURRENT PLAN =====                           │
│              │ Plan title | thời gian | status | progress               │
│              │ [ Xem nhiệm vụ ] [ Xem tiến độ ] [ Điều chỉnh bằng AI ] │
└──────────────┴──────────────────────────────────────────────────────────┘
```

### Thành phần UI chính

- Context summary goal/time/deadline.
- Generate CTA.
- Preview editor.
- Task table.
- Reject/Apply actions.
- Current plan summary + navigation CTA.
- Confirmation dialog khi Apply.

### Dữ liệu hiển thị

AI generation output:
- `planTitle`.
- StudyTask[] với `topicId`, title, expectedMinutes, dueDate, priority.
Preview field Student được chỉnh:
- StudyPlan title;
- StudyTask title;
- expectedMinutes;
- dueDate;
- priority.
Topic nguồn không editable.

### Action và điều hướng

- `[Tạo kế hoạch bằng AI]` → processing → Preview.
- `[Từ chối]` → bỏ preview, không tạo plan/task.
- `[Áp dụng kế hoạch]` → confirmation → backend revalidate tại `applyTime` → transaction.
- Apply thành công → current plan state.
- `Xem nhiệm vụ` → SCR-STU-006.
- `Xem tiến độ` → SCR-STU-007.
- `Điều chỉnh bằng AI` → SCR-STU-008.

### Validation / business constraint

Generate:
- goal không rỗng; available time >0; targetDeadline tương lai.
- cần AssessmentResult + Topic hợp lệ; thiếu minimum data → `INSUFFICIENT_DATA`.
Preview:
- chỉ field được BR-021 cho phép mới editable.
Apply:
- revalidate toàn bộ preview tại `applyTime` trước mutation;
- `endDate > applyTime`;
- mỗi dueDate trong khoảng hợp lệ;
- topic/priority/expectedMinutes/title hợp lệ;
- transaction: archive current plan nếu có + tạo plan ACTIVE + task TODO.
- Không tin preview cũ là vẫn hợp lệ chỉ vì đã generate thành công.

### State bắt buộc

- No current plan / ready to generate.
- AI processing.
- Validation error trước AI.
- `INSUFFICIENT_DATA` trước AI.
- AI error / invalid output.
- Preview.
- Apply confirmation.
- Apply validation stale preview → giữ plan cũ, yêu cầu chỉnh/tạo preview mới.
- Apply database failure → rollback.
- Current plan.

### Authorization

Student chỉ thao tác plan của mình. AI không tự lưu plan; Student phải xác nhận Apply.

### Traceability

`FR-STU-005`, `FR-STU-006`; `BR-001`, `BR-005`, `BR-009`, `BR-010`, `BR-021`, `BR-024`, `BR-025`, `BR-035`, `BR-037`.

### Ghi chú thiết kế

Không tách route Generate/Preview/Apply. Preview là UI state của cùng Screen ID.

---

## SCR-STU-006 — Nhiệm vụ học tập

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/sinh-vien/nhiem-vu` |
| **Actor** | Student |
| **Use Case** | `UC-STU-007` |
| **Mục tiêu** | Cho Student xem task của current StudyPlan và chuyển trạng thái TODO ↔ COMPLETED. |
| **Entry point** | Sidebar `Nhiệm vụ` hoặc CTA từ Dashboard/Current Plan. |

### Wireframe

```text
┌──────────────┬──────────────────────────────────────────────────────┐
│ Sidebar      │ NHIỆM VỤ HỌC TẬP                                     │
│              │ Current Plan: ...                                    │
│              │                                                      │
│              │ Status | Task | Topic | Phút | Due date | Priority   │
│              │ [ ] TODO  Ôn API...       60     22/10    HIGH       │
│              │ [x] DONE  Bài DB...       45     20/10    MEDIUM     │
│              │                                                      │
│              │ Click trạng thái để đánh dấu hoàn thành/mở lại       │
└──────────────┴──────────────────────────────────────────────────────┘
```

### Thành phần UI chính

- Current plan header.
- Task list/table.
- Status control TODO/COMPLETED.
- Due-date/priority indicators.
- Link sang progress.

### Dữ liệu hiển thị

- Task title.
- Topic.
- expectedMinutes.
- dueDate.
- priority.
- status TODO/COMPLETED.
- completedAt khi backend cung cấp/UX cần.

### Action và điều hướng

- TODO → COMPLETED.
- COMPLETED → TODO theo phạm vi đã baseline hóa.
- Thành công cập nhật row và các progress-related values phù hợp.
- `Xem tiến độ` → SCR-STU-007.

### Validation / business constraint

- Chỉ task thuộc current plan của Student.
- Backend kiểm tra ownership/current plan.
- Không edit title/topic/time/deadline trực tiếp từ màn hình task nếu baseline không quy định.

### State bắt buộc

- Loading list.
- Empty: chưa có current plan hoặc plan không có task.
- Updating row.
- Update success.
- Update error → rollback UI optimistic state nếu có.

### Authorization

Chỉ task thuộc Student hiện tại; backend kiểm tra quyền trước update.

### Traceability

`FR-STU-007`; `BR-001`, `BR-024`, `BR-025`, `BR-036`.

---

## SCR-STU-007 — Tiến độ học tập

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/sinh-vien/tien-do` |
| **Actor** | Student |
| **Use Case** | `UC-STU-008` |
| **Mục tiêu** | Hiển thị tiến độ current StudyPlan và cảnh báo chậm tiến độ do backend tính. |
| **Entry point** | Sidebar `Tiến độ`, Dashboard hoặc Current Plan. |

### Wireframe

```text
┌──────────────┬──────────────────────────────────────────────────┐
│ Sidebar      │ TIẾN ĐỘ HỌC TẬP                                 │
│              │                                                  │
│              │ Hoàn thành  [ 6 / 10 ]                           │
│              │ Actual       [██████----] 60%                    │
│              │ Expected     [████████--] 80%                    │
│              │ Overdue      [ 2 tasks ]                         │
│              │                                                  │
│              │ ┌─ CẢNH BÁO CHẬM TIẾN ĐỘ ─────────────────────┐ │
│              │ │ actualProgress < expectedProgress - 20      │ │
│              │ │ [ Điều chỉnh bằng AI ]                      │ │
│              │ └──────────────────────────────────────────────┘ │
│              │                                                  │
│              │ Task progress detail ...                        │
└──────────────┴──────────────────────────────────────────────────┘
```

### Thành phần UI chính

- completed/total summary.
- actual vs expected progress visualization.
- overdue count/list.
- Slow-progress warning.
- CTA adjustment.

### Dữ liệu hiển thị

- completedTasks.
- totalTasks.
- actualProgress.
- expectedProgress.
- overdue tasks/count.
- backend slow-progress status.

### Action và điều hướng

- `[Điều chỉnh bằng AI]` → SCR-STU-008.
- UC-STU-009 không phụ thuộc việc phải mở màn hình progress trước; CTA ở đây chỉ là một entry point.

### Validation / business constraint

- Threshold slow-progress đánh giá trên giá trị gốc.
- Không tự suy ra từ phần trăm UI đã làm tròn.
- Nếu chưa có current plan, hiển thị N/A/empty phù hợp.

### State bắt buộc

- Loading.
- No current plan empty state + CTA tạo plan.
- Normal progress.
- Slow-progress warning.
- Error tải metric.

### Authorization

Chỉ metric của Student hiện tại; backend là nguồn tính toán.

### Traceability

`FR-STU-008`; `BR-001`, `BR-009`, `BR-017`, `BR-025`, `BR-027`, `BR-036`.

---

## SCR-STU-008 — Điều chỉnh kế hoạch bằng AI

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/sinh-vien/ke-hoach-hoc-tap/dieu-chinh` |
| **Actor** | Student |
| **Use Case** | `UC-STU-009` |
| **Mục tiêu** | Cho Student yêu cầu AI đề xuất thay đổi có giới hạn cho task TODO và quyết định Accept/Reject. |
| **Entry point** | CTA từ Current Plan hoặc warning trong Progress. |

### Wireframe

```text
┌──────────────┬────────────────────────────────────────────────────────┐
│ Sidebar      │ ĐIỀU CHỈNH KẾ HOẠCH BẰNG AI                         │
│              │ Current Plan: ...                                      │
│              │ [ Yêu cầu AI đề xuất điều chỉnh ]                      │
│              │                                                        │
│              │ ===== Adjustment Preview =====                          │
│              │ Task | Field | Hiện tại | Đề xuất                      │
│              │ A    | dueDate | 22/10 | 24/10                         │
│              │ A    | priority| MED   | HIGH                          │
│              │ B    | minutes | 60    | 45                            │
│              │                                                        │
│              │ [ Từ chối ]                         [ Chấp nhận ]       │
└──────────────┴────────────────────────────────────────────────────────┘
```

### Thành phần UI chính

- Current plan summary.
- AI adjustment CTA.
- Before/after preview table.
- Reject/Accept.
- Confirmation dialog khi Accept.

### Dữ liệu hiển thị

AI chỉ được đề xuất thay đổi trên task `TODO`:
- expectedMinutes;
- dueDate;
- priority.
Không thêm/xóa task, không đổi Topic, không sửa task COMPLETED.

### Action và điều hướng

- `[Yêu cầu AI...]` → eligibility check → AI processing → preview.
- `[Từ chối]` → giữ nguyên plan/task.
- `[Chấp nhận]` → confirmation → backend cập nhật field hợp lệ của task TODO → refresh plan/progress.

### Validation / business constraint

Eligibility phải đồng thời:
1. có current StudyPlan;
2. `now <= StudyPlan.endDate`;
3. còn ít nhất một StudyTask TODO.
Thiếu một điều kiện → Business Ineligible, không gọi AI, không AIRequestLog.
Structured output phải validate ownership/status/task fields trước khi hiển thị/áp dụng.

### State bắt buộc

- Ready.
- Business ineligible: no current plan → CTA tạo plan.
- Business ineligible: plan quá endDate → hướng tạo plan mới.
- Business ineligible: không còn TODO → thông báo không cần điều chỉnh.
- AI processing.
- AI failure/invalid output.
- Adjustment preview.
- Accept confirmation.
- Apply success/error.

### Authorization

Chỉ current plan/task của Student hiện tại. AI không tự cập nhật task; Student phải Accept.

### Traceability

`FR-STU-009`; `BR-001`, `BR-006`, `BR-010`, `BR-028`, `BR-035`, `BR-036`; `OD-40`.

---

## SCR-TEA-001 — Danh sách lớp

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/giao-vien/lop-hoc` |
| **Actor** | Teacher |
| **Use Case** | `UC-TEA-001` |
| **Mục tiêu** | Hiển thị các Class Teacher được phân công và cho chọn Class làm context. |
| **Entry point** | Landing route sau login của Teacher hoặc sidebar `Lớp học`. |

### Wireframe

```text
┌──────────────┬──────────────────────────────────────────────────┐
│ Sidebar      │ LỚP HỌC CỦA TÔI                                 │
│              │                                                  │
│              │ ┌────────────────────┐ ┌────────────────────┐    │
│              │ │ Lớp SE-01          │ │ Lớp SE-02          │    │
│              │ │ [ Mở lớp ]         │ │ [ Mở lớp ]         │    │
│              │ └────────────────────┘ └────────────────────┘    │
└──────────────┴──────────────────────────────────────────────────┘
```

### Thành phần UI chính

- Class cards/list.
- CTA `Mở lớp`.

### Dữ liệu hiển thị

- Danh sách Class được phân công.
- Metadata Class chỉ hiển thị những field API/baseline cung cấp; tối thiểu cần tên/định danh dễ hiểu để chọn.

### Action và điều hướng

- Chọn Class → `/giao-vien/lop-hoc/[classId]/tong-quan` (SCR-TEA-002).

### Validation / business constraint

- Không cho client tự mở Class ngoài quyền chỉ vì biết classId.

### State bắt buộc

- Loading.
- Empty: Teacher chưa được phân công Class.
- Success list.
- Error.

### Authorization

Backend chỉ trả Class có quan hệ Teacher–Class hợp lệ.

### Traceability

`FR-TEA-001`; `BR-002`, `BR-012`, `BR-023`.

---

## SCR-TEA-002 — Tổng quan lớp

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/giao-vien/lop-hoc/[classId]/tong-quan` |
| **Actor** | Teacher |
| **Use Case** | `UC-TEA-003` + `FR-TEA-004` internal |
| **Mục tiêu** | Hiển thị metric lớp và tín hiệu đáng chú ý do backend tính/rule, không cần gọi AI. |
| **Entry point** | Teacher chọn Class hoặc tab `Tổng quan` trong Class Context Navigation. |

### Wireframe

```text
┌──────────────┬────────────────────────────────────────────────────────┐
│ Sidebar      │ ← Các lớp   <Class Name>                              │
│              │ [Tổng quan] [Sinh viên] [Phân tích AI] [Lịch sử]      │
│              │                                                        │
│              │ [Students] [Avg score] [Completion] [Overdue tasks]   │
│              │                                                        │
│              │ Topic averages / Weak Topics                           │
│              │ ----------------------------------------------------- │
│              │                                                        │
│              │ Needs Attention Students                               │
│              │ ...                                                    │
│              │                                                        │
│              │ Progress Warnings                                      │
│              │ ...                                                    │
│              │                                      [ Phân tích AI ] │
└──────────────┴────────────────────────────────────────────────────────┘
```

### Thành phần UI chính

- Class context header/navigation.
- Metric cards.
- Topic average table/chart.
- Weak Topic section.
- Needs Attention list.
- Progress Warning list.
- CTA AI analysis.

### Dữ liệu hiển thị

- `studentCount`.
- `classAverageScore`.
- `topicAverageScores`.
- `classCompletionRate`.
- `overdueTaskCount` (số task quá hạn cấp Class).
- Weak Topics.
- Needs Attention Students.
- Progress Warning Students.

### Action và điều hướng

- Click Student → SCR-TEA-004.
- `[Phân tích AI]` → SCR-TEA-005.
- Tabs → Students / AI / History.

### Validation / business constraint

Backend rule:
- Weak Topic khi topicAverageScore hợp lệ và <60.
- Needs Attention nếu Student thỏa ít nhất một rule đã baseline hóa.
- Progress Warning khi Student có current plan và actualProgress < expectedProgress - 20.
- Metric thiếu dữ liệu dùng null/N/A phù hợp; không biến thành 0 tùy ý.

### State bắt buộc

- Loading.
- Class có dữ liệu bình thường.
- Một số metric N/A.
- Empty lists cho Weak/Attention/Warning khi không có mục nào.
- Forbidden Class.
- Error.

### Authorization

Backend kiểm tra Teacher–Class trước khi trả metric. Biết classId không tạo quyền.

### Traceability

`FR-TEA-003`, `FR-TEA-004`; `BR-002`, `BR-004`, `BR-009`, `BR-017`, `BR-018`, `BR-026`, `BR-027`, `BR-034`; `OD-35`, `OD-36`.

---

## SCR-TEA-003 — Danh sách sinh viên

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/giao-vien/lop-hoc/[classId]/sinh-vien` |
| **Actor** | Teacher |
| **Use Case** | `UC-TEA-002` |
| **Mục tiêu** | Cho Teacher xem Student thuộc Class và các metric read-only cần thiết. |
| **Entry point** | Tab `Sinh viên` trong Class Context Navigation. |

### Wireframe

```text
┌──────────────┬────────────────────────────────────────────────────────┐
│ Sidebar      │ ← Các lớp   <Class Name>                              │
│              │ [Tổng quan] [Sinh viên] [Phân tích AI] [Lịch sử]      │
│              │                                                        │
│              │ Student        Avg score   Completion  Overdue   View │
│              │ ----------------------------------------------------- │
│              │ Nguyễn A       72          60%         2         [>]  │
│              │ Trần B          N/A         N/A         0         [>]  │
└──────────────┴────────────────────────────────────────────────────────┘
```

### Thành phần UI chính

- Class context nav.
- Student table.
- Row CTA mở detail.

### Dữ liệu hiển thị

Per Student:
- name;
- averageScore;
- completionRate;
- overdueTaskCount.

### Action và điều hướng

- Row click/`Xem` → `/giao-vien/lop-hoc/[classId]/sinh-vien/[studentId]` (SCR-TEA-004).

### Validation / business constraint

- Dữ liệu thiếu average/completion → N/A/null, không tự biến thành 0.
- overdueTaskCount giữ semantics count đã chốt.

### State bắt buộc

- Loading.
- Empty Class members.
- Success list.
- Forbidden.
- Error.

### Authorization

Teacher chỉ xem Student thuộc Class mình được phân công.

### Traceability

`FR-TEA-002`; `BR-002`, `BR-019`, `BR-026`, `BR-027`, `BR-034`.

---

## SCR-TEA-004 — Chi tiết sinh viên

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/giao-vien/lop-hoc/[classId]/sinh-vien/[studentId]` |
| **Actor** | Teacher |
| **Use Case** | `UC-TEA-002` |
| **Mục tiêu** | Cho Teacher quan sát score/progress của một Student thuộc Class ở chế độ read-only. |
| **Entry point** | Từ một row trong SCR-TEA-003. |

### Wireframe

```text
┌──────────────┬────────────────────────────────────────────────────────┐
│ Sidebar      │ ← Danh sách sinh viên                                 │
│              │ STUDENT: Nguyễn Văn A                                  │
│              │                                                        │
│              │ [Average score] [Completion] [Overdue]                 │
│              │ [Actual progress] [Expected progress]                  │
│              │                                                        │
│              │ Latest score by Topic                                  │
│              │ Topic      Score     Status                             │
│              │ ...                                                    │
│              │                                                        │
│              │               Read-only — không có nút chỉnh sửa       │
└──────────────┴────────────────────────────────────────────────────────┘
```

### Thành phần UI chính

- Student identity header.
- Metric cards.
- Latest scores by Topic.
- Read-only indicator.

### Dữ liệu hiển thị

- latest score per Topic.
- averageScore.
- completionRate.
- overdueTaskCount.
- actualProgress.
- expectedProgress.

### Action và điều hướng

- Chỉ navigation back/context.
- Không có edit StudyPlan/StudyTask/goal/AssessmentResult.

### Validation / business constraint

Không có mutation. Dữ liệu thiếu hiển thị N/A theo rule.

### State bắt buộc

- Loading.
- Partial data/N/A.
- Success.
- Student not in Class / forbidden.
- Not found/error.

### Authorization

Backend kiểm tra Teacher → Class → ClassMember → Student ở mỗi detail request.

### Traceability

`FR-TEA-002`; `BR-002`, `BR-019`, `BR-026`, `BR-027`, `BR-034`, `BR-038`.

---

## SCR-TEA-005 — Phân tích lớp bằng AI

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/giao-vien/lop-hoc/[classId]/phan-tich-ai` |
| **Actor** | Teacher |
| **Use Case** | `UC-TEA-005`, `UC-TEA-006`, `UC-TEA-007` |
| **Mục tiêu** | Chạy Class Analysis, hiển thị recommendation và cho Teacher tùy chọn Save bằng backend-controlled analysis reference. |
| **Entry point** | Tab `Phân tích AI` hoặc CTA từ Class Dashboard. |

### Wireframe

```text
┌──────────────┬────────────────────────────────────────────────────────┐
│ Sidebar      │ ← Các lớp   <Class Name>                              │
│              │ [Tổng quan] [Sinh viên] [Phân tích AI] [Lịch sử]      │
│              │                                                        │
│              │ Data summary: students / avg / completion / warnings   │
│              │ [ Phân tích lớp bằng AI ]                              │
│              │                                                        │
│              │ ===== Analysis Result =====                             │
│              │ Summary                                                │
│              │ Weak Topics                                            │
│              │ Progress Issues                                        │
│              │ Attention Groups                                       │
│              │ Recommendations                                        │
│              │                                                        │
│              │                                  [ Lưu báo cáo ]       │
└──────────────┴────────────────────────────────────────────────────────┘
```

### Thành phần UI chính

- Class context nav.
- Backend metric/rule summary.
- Analyze CTA.
- Result sections: summary, weakTopics, progressIssues, attentionGroups, recommendations.
- Save action.
- AI/error/retry panels.

### Dữ liệu hiển thị

Input context backend tổng hợp:
- Class, Student count;
- latest AssessmentResult;
- current plan/task metrics;
- Weak Topics / Needs Attention / Progress Warning.
Output:
- summary;
- weakTopics;
- progressIssues;
- attentionGroups;
- recommendations;
- opaque analysis reference từ backend sau output hợp lệ.

### Action và điều hướng

- `[Phân tích lớp bằng AI]` → processing → result.
- Recommendation là included behavior, không có màn hình riêng.
- `[Lưu báo cáo]` → gửi analysis reference, không gửi snapshot/result client làm nguồn chuẩn.
- Save thành công → hiển thị success feedback và CTA `Xem lịch sử` → SCR-TEA-006.

### Validation / business constraint

- Teacher–Class phải hợp lệ trước query/analyze.
- Minimum data: Class có ít nhất một AssessmentResult hợp lệ hoặc ít nhất một Student có current StudyPlan chứa ít nhất một StudyTask.
- Không đủ → `INSUFFICIENT_DATA`, không AI call/log.
- AI output metric/count không được ghi đè giá trị backend.
- Save chỉ khi analysis reference/context còn hợp lệ.

### State bắt buộc

- Ready.
- `INSUFFICIENT_DATA`.
- AI processing.
- AI failure/invalid output.
- Valid analysis result.
- Save loading.
- Invalid/expired analysis reference → yêu cầu chạy lại analysis.
- Save DB error.
- Save success.

### Authorization

Teacher chỉ phân tích/lưu report của Class được phân công. AI insight chỉ hỗ trợ; không tự sửa dữ liệu Student/Class.

### Traceability

`FR-TEA-004`, `FR-TEA-005`, `FR-TEA-006`, `FR-TEA-007`; `BR-002`, `BR-004`, `BR-007`, `BR-009`, `BR-010`, `BR-011`, `BR-017`, `BR-018`, `BR-026`, `BR-030`, `BR-031`, `BR-035`, `BR-044`; `DATA-REQ-015`; `OD-33`, `OD-44`.

### Ghi chú thiết kế

AI Contract v1.0 khóa Teacher analysis + recommendation thành đúng một external AI attempt; UI vẫn hiển thị một processing flow ở cùng màn hình.

---

## SCR-TEA-006 — Lịch sử phân tích AI

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/giao-vien/lop-hoc/[classId]/lich-su-phan-tich` |
| **Actor** | Teacher |
| **Use Case** | `UC-TEA-008` |
| **Mục tiêu** | List và xem detail ClassAnalysisReport đã lưu của Class hiện tại, dùng đúng snapshot lịch sử. |
| **Entry point** | Tab `Lịch sử phân tích` trong Class Context Navigation hoặc CTA sau Save. |

### Wireframe

```text
┌──────────────┬────────────────────────────────────────────────────────┐
│ Sidebar      │ ← Các lớp   <Class Name>                              │
│              │ [Tổng quan] [Sinh viên] [Phân tích AI] [Lịch sử]      │
│              │                                                        │
│              │ Thời điểm             Summary ngắn            [Xem]   │
│              │ ----------------------------------------------------- │
│              │ 21/10 09:30            ...                    [>]     │
│              │ 20/10 15:10            ...                    [>]     │
│              │                                                        │
│              │ ┌──────── Drawer: Report detail ────────────────────┐ │
│              │ │ Snapshot tại analysis-time                        │ │
│              │ │ Analysis result / recommendations                 │ │
│              │ │ Read-only                                  [Đóng]│ │
│              │ └───────────────────────────────────────────────────┘ │
└──────────────┴────────────────────────────────────────────────────────┘
```

### Thành phần UI chính

- History list.
- createdAt.
- Summary ngắn nếu có trong stored result.
- Detail drawer/modal/expandable panel trong cùng Screen ID.
- Read-only label.

### Dữ liệu hiển thị

List: reportId, createdAt, metadata/summary tối thiểu.
Detail: stored `inputSnapshot`, stored `analysisResult`, createdAt.

### Action và điều hướng

- Chọn report → mở detail state trong cùng route/screen.
- Close detail → về list.
- Không edit/delete/compare/rerun AI.

### Validation / business constraint

- Detail phải đọc snapshot/result đã lưu, không recompute bằng Class live.
- Không gọi AI khi list/detail.
- Không tạo AIRequestLog chỉ vì xem history.

### State bắt buộc

- Loading list.
- Empty: chưa có report.
- Loading detail.
- Read-only detail.
- Report not found.
- Forbidden Class/report.

### Authorization

Teacher chỉ list/detail report thuộc Class mình đang được phân công; kiểm tra ở cả list và detail.

### Traceability

`FR-TEA-008`; `BR-002`, `BR-012`, `BR-030`, `BR-031`, `BR-045`; `OD-45`.

---

## SCR-ADM-001 — Tổng quan hệ thống

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/quan-tri/tong-quan` |
| **Actor** | Administrator |
| **Use Case** | `UC-ADM-001` |
| **Mục tiêu** | Hiển thị 5 metric quản trị MVP toàn thời gian do backend tính/truy vấn. |
| **Entry point** | Landing route sau login của Administrator hoặc sidebar `Tổng quan`. |

### Wireframe

```text
┌──────────────┬────────────────────────────────────────────────────────┐
│ Sidebar      │ TỔNG QUAN HỆ THỐNG                                    │
│              │                                                        │
│              │ [ Total Users ] [ Total Feedback ] [ AI Requests ]     │
│              │ [ Failed AI Requests ]                                 │
│              │                                                        │
│              │ Users by Role                                          │
│              │ Student      xxx                                       │
│              │ Teacher      xxx                                       │
│              │ Administrator xxx                                      │
└──────────────┴────────────────────────────────────────────────────────┘
```

### Thành phần UI chính

- Metric cards.
- Users-by-role breakdown.
- Không cần monitoring chart hạ tầng.

### Dữ liệu hiển thị

- `totalUsers`.
- `usersByRole`.
- `totalFeedback`.
- `totalAIRequests`.
- `failedAIRequests`.

### Action và điều hướng

- Navigation sang Users/Feedback.
- Không có date filter dashboard trong MVP.

### Validation / business constraint

- Metrics toàn thời gian.
- totalUsers/usersByRole gồm ACTIVE + DISABLED.
- totalAIRequests chỉ tính external attempts thực tế.
- failedAIRequests là subset của totalAIRequests.
- Không tính request bị chặn trước AI vì insufficient data/business ineligible/input validation.

### State bắt buộc

- Loading.
- Zero metrics hợp lệ.
- Success.
- Error.

### Authorization

Chỉ Administrator ACTIVE.

### Traceability

`FR-ADM-001`; `BR-009`, `BR-029`; `OD-37`; `AI-REQ-018`.

---

## SCR-ADM-002 — Quản lý người dùng

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/quan-tri/nguoi-dung` |
| **Actor** | Administrator |
| **Use Case** | `UC-ADM-002` |
| **Mục tiêu** | Cho Admin xem/tìm kiếm user và chuyển trạng thái user khác giữa ACTIVE/DISABLED. |
| **Entry point** | Sidebar `Người dùng`. |

### Wireframe

```text
┌──────────────┬────────────────────────────────────────────────────────┐
│ Sidebar      │ QUẢN LÝ NGƯỜI DÙNG                                   │
│              │ [ Tìm theo tên/email......................... ]       │
│              │                                                        │
│              │ Họ tên | Email | Role | Status | Action               │
│              │ ----------------------------------------------------- │
│              │ A      | ...   | STU  | ACTIVE | [Disable]            │
│              │ B      | ...   | TEA  | DISABLED| [Activate]          │
│              │ Admin hiện tại ...            | ACTIVE | [disabled]   │
│              │                                                        │
│              │ <Confirm Disable dialog when needed>                  │
└──────────────┴────────────────────────────────────────────────────────┘
```

### Thành phần UI chính

- Search input.
- User table.
- Role/status badge.
- Activate/Disable action.
- Confirmation dialog cho Disable.

### Dữ liệu hiển thị

- fullName.
- email.
- role.
- status ACTIVE/DISABLED.

### Action và điều hướng

- Search theo tên/email.
- `[Disable]` user khác → confirm → update.
- `[Activate]` → update.
- Không có User Detail page trong MVP.

### Validation / business constraint

- Admin không được Disable chính mình.
- Chỉ state transition ACTIVE ↔ DISABLED.
- Không có reason/history/reset password/custom permission trong MVP.

### State bắt buộc

- Loading list.
- Search no result.
- Updating status.
- Self-disable blocked.
- Update success.
- Update error.

### Authorization

Chỉ Administrator. Backend chặn self-disable và protected API của target user bị từ chối sau khi target chuyển DISABLED.

### Traceability

`FR-ADM-002`; `BR-020`, `BR-032`, `BR-040`; `ERR-002`, `ERR-003`.

---

## SCR-ADM-003 — Danh sách phản hồi

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/quan-tri/phan-hoi` |
| **Actor** | Administrator |
| **Use Case** | `UC-ADM-003` |
| **Mục tiêu** | Xem/lọc Feedback đã lưu và chọn dataset đưa sang AI analysis. |
| **Entry point** | Sidebar `Phản hồi` → danh sách. |

### Wireframe

```text
┌──────────────┬────────────────────────────────────────────────────────────┐
│ Sidebar      │ DANH SÁCH PHẢN HỒI                                      │
│              │ [Từ ngày] [Đến ngày] [Rating v] [Tag v]                  │
│              │ [ Áp dụng bộ lọc ] [ Xóa bộ lọc ]                        │
│              │                                                            │
│              │ Kết quả: 42 feedback                                      │
│              │ Sender | Role | Tag | Rating | Content | CreatedAt        │
│              │ --------------------------------------------------------- │
│              │ ...                                                        │
│              │                                                            │
│              │ [ Phân tích tập phản hồi này bằng AI ]                    │
└──────────────┴────────────────────────────────────────────────────────────┘
```

### Thành phần UI chính

- Filters: time, rating, tag.
- Feedback table/list.
- Dataset count/summary.
- CTA AI analysis.

### Dữ liệu hiển thị

Per feedback:
- sender;
- role;
- official tag;
- rating;
- content;
- createdAt.
Có thể hiển thị tag statistics nếu backend trả để hỗ trợ context.

### Action và điều hướng

- `[Áp dụng bộ lọc]` → validate filter → tải lại danh sách theo phạm vi đã chọn.
- `[Xóa bộ lọc]` → đưa filter về mặc định và tải lại toàn bộ feedback trong phạm vi MVP.
- `[Phân tích tập phản hồi này bằng AI]` → SCR-ADM-004 với filter/dataset context hiện tại.

### Validation / business constraint

- Filter phải hợp lệ trước query/AI.
- Official tag là dữ liệu user đã chọn; UI không cho AI sửa tag.
- Empty filter result chỉ là empty list, chưa tự động gọi AI.

### State bắt buộc

- Loading/filtering.
- Empty result.
- Invalid filter.
- Success list.
- Error.

### Authorization

Chỉ Administrator ACTIVE.

### Traceability

`FR-ADM-003`; `BR-013`, `BR-014`, `BR-015`.

---

## SCR-ADM-004 — Phân tích phản hồi bằng AI

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/quan-tri/phan-hoi/phan-tich-ai` |
| **Actor** | Administrator |
| **Use Case** | `UC-ADM-004`, `UC-ADM-005`, `UC-ADM-006` |
| **Mục tiêu** | Chạy two-stage feedback AI flow trên một màn hình, hiển thị issue groups + summary + priority areas + recommendations và cho Save. |
| **Entry point** | CTA từ SCR-ADM-003 hoặc navigation Phản hồi → Phân tích AI. |

### Wireframe

```text
┌──────────────┬────────────────────────────────────────────────────────────┐
│ Sidebar      │ PHÂN TÍCH PHẢN HỒI BẰNG AI                              │
│              │ Dataset: 42 feedback | Filter snapshot: ...              │
│              │ Tag statistics: AI 12 | Plan 10 | UI 8 | ...             │
│              │ [ Bắt đầu phân tích ]                                     │
│              │                                                            │
│              │ ===== Issue Groups =====                                   │
│              │ Group title | Count | Summary | Feedback refs             │
│              │ ...                                                        │
│              │                                                            │
│              │ ===== Summary =====                                        │
│              │ ...                                                        │
│              │ ===== Priority Areas =====                                 │
│              │ ...                                                        │
│              │ ===== Recommendations =====                                │
│              │ ...                                                        │
│              │                                         [ Lưu kết quả ]    │
└──────────────┴────────────────────────────────────────────────────────────┘
```

### Thành phần UI chính

- Dataset/filter snapshot summary.
- totalFeedback + tagStatistics (backend-owned).
- Analyze CTA.
- Unified processing state cho Stage 1 → backend validation/dedup → Stage 2.
- Issue Groups.
- Summary.
- Priority Areas.
- Recommendations.
- Save action.
- Error/retry panels.

### Dữ liệu hiển thị

Backend-owned exact data:
- feedbackIds;
- totalFeedback;
- tagStatistics;
- official tags.
Validated AI-derived display:
- issueGroups {title, summary, feedbackIds, count backend-calculated};
- summary;
- priorityAreas;
- recommendations;
- opaque analysis reference chỉ sau Stage 2 valid.

### Action và điều hướng

- `[Bắt đầu phân tích]` → Stage 1 → backend validation/dedup/count → Stage 2 → result.
- Không tạo route riêng cho Stage 1/2.
- `[Lưu kết quả]` → gửi analysis reference, backend resolve snapshot/result từ context của chính lần analysis.
- Save success → CTA `Xem lịch sử` → SCR-ADM-005.

### Validation / business constraint

- Filter/dataset phải hợp lệ.
- Dataset rỗng → `INSUFFICIENT_DATA`, không Stage 1, không log.
- Mọi feedbackId AI trả phải thuộc input.
- Mỗi feedbackId tối đa một issueGroup; backend deduplicate theo thứ tự AI trả và tính lại count.
- Dataset không rỗng nhưng `issueGroups=[]` sau validate/dedup vẫn là success và Stage 2 tiếp tục.
- AI không thay official tag/count/statistics.
- Save chỉ khi backend-controlled analysis reference/context hợp lệ.

### State bắt buộc

- Ready with dataset summary.
- Invalid filter.
- `INSUFFICIENT_DATA`: dataset rỗng.
- AI processing Stage 1/validation/Stage 2 (có thể hiển thị step indicator nhưng vẫn cùng screen).
- Stage 1 AI failure/invalid → dừng, không Stage 2.
- `issueGroups=[]` success state → message “Chưa phát hiện nhóm vấn đề nổi bật”, vẫn hiển thị Stage 2 result.
- Stage 2 AI failure/invalid.
- Valid result.
- Save loading.
- Invalid/expired analysis reference.
- Save DB error/success.

### Authorization

Chỉ Administrator ACTIVE. AI result là đề xuất, không tự thay đổi user/Student/Teacher/system data.

### Traceability

`FR-ADM-004`, `FR-ADM-005`, `FR-ADM-006`; `BR-003`, `BR-004`, `BR-008`, `BR-009`, `BR-010`, `BR-011`, `BR-013`, `BR-014`, `BR-015`, `BR-030`, `BR-031`, `BR-035`, `BR-042`, `BR-043`, `BR-044`; `DATA-REQ-015`; `OD-34`, `OD-42`, `OD-43`, `OD-44`.

### Ghi chú thiết kế

Hai external AI attempts là backend behavior; UI trình bày thành một flow liên tục trên một màn hình.

---

## SCR-ADM-005 — Lịch sử phân tích AI

| Thuộc tính | Nội dung |
|---|---|
| **Route** | `/quan-tri/phan-hoi/lich-su-phan-tich` |
| **Actor** | Administrator |
| **Use Case** | `UC-ADM-007` |
| **Mục tiêu** | List và xem detail FeedbackAnalysis đã lưu ở chế độ read-only, dùng snapshot/result lịch sử. |
| **Entry point** | Navigation Phản hồi → Lịch sử phân tích hoặc CTA sau Save. |

### Wireframe

```text
┌──────────────┬──────────────────────────────────────────────────────────┐
│ Sidebar      │ LỊCH SỬ PHÂN TÍCH PHẢN HỒI                            │
│              │                                                          │
│              │ CreatedAt | Total feedback | Filter snapshot | [Xem]    │
│              │ ------------------------------------------------------- │
│              │ ...                                                      │
│              │                                                          │
│              │ ┌──────── Drawer: Analysis detail ────────────────────┐ │
│              │ │ Input snapshot: filter / IDs / tag statistics       │ │
│              │ │ Issue groups                                        │ │
│              │ │ Summary / Priority Areas / Recommendations          │ │
│              │ │ Read-only                                    [Đóng]│ │
│              │ └─────────────────────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────────────────┘
```

### Thành phần UI chính

- History list.
- createdAt.
- totalFeedback snapshot.
- filter snapshot.
- Detail drawer/modal/expandable.
- Read-only label.

### Dữ liệu hiển thị

List: analysisId, createdAt, totalFeedback, filter snapshot nếu có.
Detail: stored inputSnapshot + analysisResult + createdAt.

### Action và điều hướng

- Chọn analysis → detail state trong cùng Screen ID.
- Không edit/delete/compare/rerun.
- Không tự áp dụng recommendation.

### Validation / business constraint

- Không thay snapshot bằng Feedback live hiện tại.
- Không gọi AI khi list/detail.
- Không tạo AIRequestLog chỉ vì xem history.

### State bắt buộc

- Loading list.
- Empty history.
- Loading detail.
- Read-only detail.
- Not found.
- Authorization/session error.

### Authorization

Chỉ Administrator ACTIVE.

### Traceability

`FR-ADM-007`; `BR-012`, `BR-030`, `BR-031`, `BR-032`, `BR-046`; `OD-46`.

---

# 7. Cross-cutting UI Requirement Traceability

Bảng này bổ sung traceability cho các requirement giao diện/NFR áp dụng trên nhiều màn hình; không thay thế traceability FR/BR/OD trong từng Screen Specification.

| Requirement | Áp dụng chính | Cách thể hiện trong tài liệu |
|---|---|---|
| `UI-REQ-001` | Toàn bộ protected screens | Role-specific sidebar, route và actor/authorization riêng |
| `UI-REQ-002` | SCR-COM-001 + Navigation | Login thành công điều hướng tới landing route theo role |
| `UI-REQ-003` | SCR-STU-004/005/008, SCR-TEA-005, SCR-ADM-004 | AI có ready/processing/success/failure state |
| `UI-REQ-004` | SCR-STU-005, SCR-STU-008 và AI error state | Apply/Accept/Reject/Retry là action rõ ràng |
| `UI-REQ-005` | Toàn bộ protected screens | Frontend không hiển thị dữ liệu trái role; backend authorization vẫn bắt buộc |
| `UI-REQ-006` | SCR-FB-001 | Tag dùng nhãn tiếng Việt dễ hiểu, enum chỉ là giá trị lưu/API |
| `UI-REQ-007` | Layout shell + toàn bộ screen | Wireframe desktop-first cho laptop/desktop demo |
| `UI-REQ-008` | Các màn hình AI có minimum-data rule | `INSUFFICIENT_DATA` là informational state, không hiển thị như AI/provider error |
| `UI-REQ-009` | SCR-TEA-006 | History list/detail read-only, giữ rõ Class context và dùng stored snapshot |
| `UI-REQ-010` | SCR-ADM-005 | History list/detail read-only, nhận biết filter/input snapshot tại analysis-time |
| `NFR-USA-001` | SCR-STU-001, SCR-TEA-002, SCR-ADM-001 + sidebar | Chức năng chính có đường đi rõ từ dashboard/navigation |
| `NFR-USA-002` | Toàn bộ screen có error state | Error message hướng user xử lý bằng ngôn ngữ dễ hiểu |
| `NFR-USA-003` | Các màn hình AI | Tách `Dữ liệu hệ thống` khỏi `Phân tích/Đề xuất từ AI` |
| `NFR-USA-004` | SCR-STU-005, SCR-STU-008 | Apply/Accept AI proposal có confirmation rõ ràng |
| `NFR-PERF-003` | Các màn hình AI | Hiển thị loading ngay khi AI request bắt đầu và giữ cho tới result/error |
| `NFR-COM-001` | Layout shell + toàn bộ web UI | Frontend phải dùng được trên trình duyệt desktop hiện đại phục vụ MVP/demo |
| `DATA-REQ-003` / `BR-031` | Mọi màn hình hiển thị timestamp/date-time | API ISO 8601; frontend chuyển sang local time khi hiển thị |

---

# 8. Screen ↔ Use Case Traceability Matrix

| Screen ID | Use Case / Requirement |
|---|---|
| SCR-COM-001 | UC-COM-001 |
| SCR-COM-002 | UC-COM-004 |
| SCR-FB-001 | UC-FB-001 |
| SCR-STU-001 | UC-STU-001 |
| SCR-STU-002 | UC-STU-002 |
| SCR-STU-003 | UC-STU-003 |
| SCR-STU-004 | UC-STU-004 |
| SCR-STU-005 | UC-STU-005, UC-STU-006 |
| SCR-STU-006 | UC-STU-007 |
| SCR-STU-007 | UC-STU-008 |
| SCR-STU-008 | UC-STU-009 |
| SCR-TEA-001 | UC-TEA-001 |
| SCR-TEA-002 | UC-TEA-003 + FR-TEA-004 internal |
| SCR-TEA-003 | UC-TEA-002 |
| SCR-TEA-004 | UC-TEA-002 |
| SCR-TEA-005 | UC-TEA-005, UC-TEA-006, UC-TEA-007 |
| SCR-TEA-006 | UC-TEA-008 |
| SCR-ADM-001 | UC-ADM-001 |
| SCR-ADM-002 | UC-ADM-002 |
| SCR-ADM-003 | UC-ADM-003 |
| SCR-ADM-004 | UC-ADM-004, UC-ADM-005, UC-ADM-006 |
| SCR-ADM-005 | UC-ADM-007 |

---

# 9. Component candidates cho frontend

Phần này là **UI implementation guidance**, không phải requirement mới.

### 9.1. Shared components

- `AppShell`
- `SidebarNav`
- `TopBar`
- `AccountMenu`
- `PageHeader`
- `MetricCard`
- `StatusBadge`
- `DataTable`
- `EmptyState`
- `ErrorState`
- `InlineFieldError`
- `LoadingSkeleton`
- `ConfirmDialog`
- `ReadOnlyDrawer`
- `AIProcessingPanel`
- `AIErrorPanel`
- `InsufficientDataPanel`

### 9.2. Student-specific candidates

- `TopicResultTable`
- `StudyGoalForm`
- `AIStudentAnalysisResult`
- `StudyPlanPreviewEditor`
- `StudyTaskList`
- `ProgressSummary`
- `AdjustmentPreviewTable`

### 9.3. Teacher-specific candidates

- `ClassCardList`
- `ClassContextNav`
- `ClassMetricSummary`
- `AttentionStudentTable`
- `ClassAIAnalysisResult`
- `ClassAnalysisHistoryList`

### 9.4. Administrator-specific candidates

- `AdminMetricSummary`
- `UserManagementTable`
- `FeedbackFilterBar`
- `FeedbackTable`
- `IssueGroupList`
- `FeedbackAnalysisResult`
- `FeedbackAnalysisHistoryList`

---

# 10. UI Test Checklist cấp màn hình

Mỗi Screen ID khi triển khai nên có tối thiểu các nhóm test sau nếu áp dụng:

1. route/role đúng;
2. loading state;
3. success state với dữ liệu hợp lệ;
4. empty state;
5. validation error;
6. forbidden/disabled account;
7. mutation success/failure;
8. AI processing/error/invalid output;
9. `INSUFFICIENT_DATA` tách biệt với AI error;
10. business ineligible tách biệt với `INSUFFICIENT_DATA`;
11. dữ liệu read-only thực sự không có mutation action;
12. navigation giữa các screen đúng Sitemap;
13. timestamp hiển thị theo local time khi nhận ISO 8601 từ API;
14. vùng `Dữ liệu hệ thống` và `Phân tích/Đề xuất từ AI` phân biệt rõ ở AI screen;
15. action loading disable duplicate submission;
16. Retry chỉ xuất hiện cho lỗi có thể chạy lại, không dùng cho validation/INSUFFICIENT_DATA/business ineligible.

Các case đặc biệt bắt buộc:

- Student Plan Preview stale tại Apply → không archive plan cũ, không tạo plan mới.
- Student adjustment không có current plan / quá endDate / hết TODO → không gọi AI.
- Teacher history → không recompute live, không gọi AI.
- Admin `issueGroups=[]` với dataset không rỗng → vẫn tiếp tục Stage 2.
- Admin history → không thay snapshot bằng feedback live.
- Admin self-disable → bị chặn.

---

# 11. Out of Scope của tài liệu này

Không thiết kế thêm:

- chatbot/RAG/PDF Q&A;
- forum/chat realtime;
- gamification;
- full LMS/content management;
- calendar phức tạp;
- email notification;
- Admin reply feedback/ticket;
- custom permission management;
- password reset nâng cao;
- report/analysis compare;
- rerun AI từ history;
- edit/delete history record;
- infrastructure monitoring dashboard;
- mobile-specific behavior chưa được requirement hóa.

---

# 12. Review Checklist

- [x] Đúng 22 Screen ID theo UI Sitemap v1.1.
- [x] Route giữ nguyên quy ước baseline.
- [x] Không tạo Screen ID cho action/dialog/loading/AI stage.
- [x] Có wireframe cho từng màn hình.
- [x] Có actor, mục tiêu, entry point, component, data, action, validation, state, authorization và traceability.
- [x] Student Apply/Adjustment giữ human-in-the-loop.
- [x] Teacher Student Detail là read-only.
- [x] Teacher/Admin history là read-only snapshot, không gọi AI.
- [x] Admin AI Stage 1/2 nằm cùng SCR-ADM-004.
- [x] `issueGroups=[]` được phân biệt với dataset rỗng.
- [x] `INSUFFICIENT_DATA`, business ineligible và AI error được phân biệt.
- [x] Feedback tag hiển thị đúng nhãn UI-REQ-006; enum chỉ dùng cho data/API.
- [x] Có quy tắc UTC/ISO 8601 → local time cho frontend.
- [x] Dữ liệu/thống kê hệ thống được phân biệt với phân tích/đề xuất AI.
- [x] Có cross-cutting traceability cho `UI-REQ`, `NFR-USA`, `NFR-PERF-003`, `NFR-COM-001`, `DATA-REQ-003`.
- [x] Các UX ambiguity chính đã được chốt thành behavior có thể test.
- [x] Không mở rộng chức năng ngoài baseline.

---

# 13. Handoff tiếp theo

Từ Baseline chính thức này, các artifact phù hợp tiếp theo là:

1. **UI Component Specification / Design System nhẹ** — chốt component, variant, form/control và token cơ bản.
2. **API Specification** — map từng screen/action sang endpoint, request/response/error code.
3. **Sequence Diagram** — ưu tiên 3 AI main flows và các mutation quan trọng.
4. **Frontend Implementation Backlog** — chia screen/component theo sprint/task.
5. **UI Test Case** — phát triển trực tiếp từ State + Validation + Authorization của từng Screen ID.

Không cần mở Change Request nếu các bước trên chỉ cụ thể hóa UI/implementation mà không thay observable business behavior.

---

# 14. Lịch sử phiên bản

| Phiên bản | Ngày | Trạng thái | Nội dung |
|---|---|---|---|
| 1.0 Draft | 21/10/2026 | Draft | Khởi tạo Wireframe / Screen Specification cho 22 Screen ID từ UI Sitemap v1.1 Baseline. |
| 1.0 Draft Rev.1 | 22/10/2026 | Draft for Review | Chuẩn hóa nhãn Feedback, global UI rules, local time, AI/system-data distinction, UI/NFR traceability và các UX ambiguity chính. |
| 1.0 Draft Rev.2 | 22/10/2026 | Draft for Review | Sửa các mismatch/refinement cuối: `expectedMinutes`, Student draft handoff, navigation STU-004, Teacher Save behavior và `NFR-COM-001`. |
| 1.0 Baseline | 22/10/2026 | Baseline | Hoàn tất traceability cleanup, bổ sung các BR/DATA-REQ còn thiếu; không thay đổi 22 Screen ID, route hoặc observable business behavior. |
| **1.0 Baseline Rev.1** | **22/10/2026** | **Baseline** | Đồng bộ wireframe `SCR-STU-006` với `FR-STU-007` bằng cách hiển thị `expectedMinutes`/`Phút`; không thay đổi behavior, route, Screen ID hoặc traceability nghiệp vụ. |
| **1.0 Baseline Final** | **22/10/2026** | **Official Baseline** | Phát hành bản tài liệu chính thức; căn chỉnh wireframe `SCR-STU-006` và cập nhật wording Handoff; không thay đổi requirement, behavior, route, Screen ID hoặc traceability. |
| **1.1 Baseline Final** | **26/10/2026** | **Official Baseline** | CR-002 UI sync: bổ sung state/message cho `AI_INPUT_TOO_LARGE` và `AI_RUNTIME_FAILURE`; không thay đổi Screen ID/route/use-case behavior. |
