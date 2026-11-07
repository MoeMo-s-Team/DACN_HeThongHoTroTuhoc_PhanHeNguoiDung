# BUSINESS RULES SPECIFICATION
## Hệ thống hỗ trợ tự học ứng dụng AI

**Phiên bản:** 1.4 Baseline Rev.1  
**Ngày:** 26/10/2026  
**Phạm vi:** MVP phục vụ đồ án chuyên ngành  
**Nguồn chuẩn hiện hành:** SRS v1.6 Baseline Final  
**Nguồn đối chiếu system boundary:** Use Case Diagram v1.4 Baseline Rev.1  
**Nguồn lịch sử:** Đặc tả phạm vi chức năng nền tảng v1.0 — Historical / Superseded

---

# 1. Mục đích tài liệu

Tài liệu này đặc tả chi tiết các **Business Rules (quy tắc nghiệp vụ)** chi phối hành vi của hệ thống hỗ trợ tự học ứng dụng AI.

Mục tiêu của tài liệu:

- làm rõ điều kiện áp dụng của từng quy tắc;
- xác định dữ liệu dùng để kiểm tra quy tắc;
- mô tả kết quả nghiệp vụ khi quy tắc thỏa hoặc bị vi phạm;
- thống nhất trách nhiệm giữa Frontend, NestJS Backend, PostgreSQL và AI Runtime;
- tạo cơ sở trực tiếp cho Use Case Specification, ERD, API Specification, UI, Test Case và AI contract;
- tránh đưa các ngưỡng và quyết định nghiệp vụ quan trọng vào code/prompt một cách rời rạc, khó kiểm soát.

Tài liệu **không thay thế SRS**. SRS mô tả hệ thống phải làm gì; Business Rules mô tả các điều kiện, giới hạn và logic mà hệ thống phải tuân thủ khi thực hiện các chức năng đó.

---

# 2. Phạm vi và nguyên tắc sử dụng

## 2.1. Đối tượng áp dụng

- **Student** – người học.
- **Teacher** – giáo viên phụ trách lớp.
- **Administrator** – quản trị viên.
- **System/Backend** – thành phần thực thi rule, kiểm tra quyền, tính toán và lưu dữ liệu.
- **AI Runtime** – thành phần hỗ trợ phân tích, tóm tắt và đề xuất; không phải actor có quyền thay đổi dữ liệu trực tiếp.

**Quy ước thuật ngữ AI:** `AI Service` và `AI Runtime` cùng chỉ thành phần AI bên ngoài NestJS. Trong Use Case, tên actor chuẩn là **AI Service**; trong mô tả kiến trúc/triển khai, tài liệu có thể dùng **AI Runtime** để nhấn mạnh endpoint/runtime thực thi model. Hai thuật ngữ này không đại diện cho hai hệ thống AI khác nhau.

## 2.2. Document authority và nguồn đối chiếu

Business Rules v1.4 Baseline Rev.1 sử dụng mô hình authority sau:

1. **SRS v1.6 Baseline Final** là **nguồn chuẩn nghiệp vụ/phần mềm cao nhất** cho Business Rules.
2. **Use Case Diagram v1.4 Baseline Rev.1** là **nguồn đối chiếu song song** về system boundary, actor interaction và quan hệ Use Case; Use Case Diagram không được dùng để ghi đè Business Rule đã được SRS chốt.
3. **Đặc tả phạm vi chức năng nền tảng v1.0 — Historical / Superseded** chỉ dùng để truy vết lịch sử/định hướng ban đầu.

Business Rules và Use Case Diagram là hai artifact dẫn xuất từ SRS, không hình thành vòng ưu tiên lẫn nhau. Khi tài liệu phạm vi lịch sử khác với SRS v1.6 Baseline Final, **SRS v1.6 Baseline Final được ưu tiên**. Ví dụ: tài liệu phạm vi ban đầu cho phép Feedback category là tùy chọn, trong khi SRS hiện hành đã chốt `Feedback.tag` là bắt buộc.

Các nguyên tắc còn lại:

- giữ nguyên mã `BR-001` đến `BR-044` và bổ sung `BR-045` đến `BR-046` theo CR-001, đã được đồng bộ trong SRS v1.6 Baseline Final;
- không tự tạo ngưỡng mới nếu SRS chưa quy định;
- khi rule liên quan số liệu chính xác, backend là nguồn tính toán chuẩn;
- khi rule liên quan AI, AI chỉ xử lý dữ liệu backend cung cấp và output phải qua backend validate;
- các quyết định `OD-01` đến `OD-46` là căn cứ chính thức để diễn giải Business Rules.

## 2.3. Các Resolved Decision bổ sung đã được đồng bộ vào SRS v1.6 Baseline Final

Các quyết định `OD-33` đến `OD-46` dưới đây đã được đồng bộ và chốt trong SRS v1.6 Baseline Final. Chúng loại bỏ các điểm mơ hồ được phát hiện trong quá trình review Business Rules/Use Case Specification và hiện được xem là nguồn nghiệp vụ chính thức.

### OD-33 – Minimum Data for Teacher AI Analysis

Class được xem là có dữ liệu tối thiểu để chạy AI Class Analysis nếu thỏa **ít nhất một** điều kiện:

1. có ít nhất một `AssessmentResult` hợp lệ của Student thuộc Class; hoặc
2. có ít nhất một Student thuộc Class có StudyPlan hiện tại chứa ít nhất một `StudyTask`.

Nếu cả hai điều kiện đều không thỏa, backend trả `INSUFFICIENT_DATA`, không gọi AI runtime và không ghi AI inference failure.

### OD-34 – Feedback Issue Group Uniqueness

Mỗi `feedbackId` chỉ được **tính vào tối đa một `issueGroup`** trong một lần phân tích.

Backend xử lý các `issueGroup` theo đúng thứ tự AI trả về:

1. trong từng `issueGroup`, backend deduplicate `feedbackIds` nội bộ trước;
2. group đầu tiên chứa một `feedbackId` hợp lệ được giữ ID đó;
3. nếu cùng `feedbackId` xuất hiện lại ở group sau, backend loại ID trùng khỏi group sau;
4. backend tính lại `count` từ danh sách `feedbackIds` sau deduplicate;
5. nếu một group không còn `feedbackId` nào sau deduplicate, backend loại group rỗng khỏi kết quả;
6. `feedbackId` không thuộc tập input vẫn làm structured output không hợp lệ và không được lưu như kết quả thành công.

Cách xử lý này cụ thể hóa yêu cầu backend phải loại ID trùng giữa các group và làm hành vi deterministic để có thể kiểm thử.

### OD-35 – Metric Precision and Rounding

Các threshold/rule phải được đánh giá trên **giá trị tính toán gốc trước khi làm tròn**. Việc làm tròn chỉ phục vụ hiển thị UI và không được dùng ngược lại để quyết định `Weak Topic`, `Needs Attention`, `Progress Warning` hoặc các rule số học khác.

Ví dụ: `averageScore = 59.8` vẫn thỏa điều kiện `averageScore < 60`.

Backend phải trả kết quả rule/status dựa trên giá trị gốc; **trạng thái/rule do backend trả về là nguồn chuẩn**. Cách làm tròn và số chữ số thập phân chỉ là quyết định trình bày của UI Specification và không được làm thay đổi kết quả rule.

### OD-36 – Teacher Class Overdue Task Metric

`overdueTaskCount` ở cấp Student và cấp Class được xác định như sau:

- `studentOverdueTaskCount` = số `StudyTask` có `status = TODO` và `dueDate < now` thuộc StudyPlan hiện tại của Student;
- Student không có StudyPlan hiện tại đóng góp `0` vào count này;
- field `overdueTaskCount` ở cấp Class (gọi rõ nghĩa là `classOverdueTaskCount` trong tài liệu này) = tổng `studentOverdueTaskCount` của tất cả Student thuộc Class.

Tên field/API vẫn bám SRS là `overdueTaskCount`; ký hiệu `classOverdueTaskCount` chỉ dùng trong Business Rules để phân biệt với metric cấp Student. Metric cấp Class là **số task quá hạn**, không phải số Student có task quá hạn.

### OD-37 – Admin Dashboard Metric Semantics

Trong MVP, các metric Admin Dashboard là số liệu **toàn thời gian**, không áp dụng date filter riêng trên dashboard:

- `totalUsers` = tổng số User đang lưu, bao gồm `ACTIVE` và `DISABLED`;
- `usersByRole` = tổng User theo role, bao gồm `ACTIVE` và `DISABLED`;
- `totalFeedback` = tổng số Feedback đang lưu;
- `totalAIRequests` = tổng số `AIRequestLog` tương ứng với các lần backend đã thực sự **attempt gọi external AI Service/AI Runtime**;
- `failedAIRequests` = số `AIRequestLog` có trạng thái thất bại.

`totalAIRequests` bao gồm các attempt dẫn đến:
- success;
- connection failure;
- timeout;
- empty response;
- invalid structured output;
- hoặc failure khác xảy ra sau khi backend đã bắt đầu external AI call.

Không tính vào `totalAIRequests`/`failedAIRequests` nếu request bị dừng trước external AI call, ví dụ:
- `INSUFFICIENT_DATA`;
- business ineligible;
- validation input thất bại trước khi gọi AI.

Như vậy `failedAIRequests` luôn là tập con của `totalAIRequests`.

### OD-38 – Email Normalization and Uniqueness

Trước khi lookup/lưu email tài khoản, backend phải:

1. loại bỏ khoảng trắng đầu/cuối (`trim`);
2. chuyển email về chữ thường (`lowercase`);
3. kiểm tra uniqueness trên giá trị đã normalize.

Ví dụ `Student@Demo.com` và `student@demo.com` được xem là cùng một email định danh tài khoản trong MVP.

### OD-39 – Student Completion Rate

Với Student có StudyPlan hiện tại:

`completionRate = completedTasks / totalTasks × 100 = actualProgress`.

Quy ước:

- chỉ tính các StudyTask thuộc StudyPlan hiện tại; không tổng hợp task từ plan `ARCHIVED`;
- Student chưa có StudyPlan hiện tại → `completionRate = null/N/A`;
- nếu StudyPlan hiện tại tồn tại nhưng `totalTasks = 0` → `completionRate = 0`, thống nhất với quy ước `actualProgress = 0` của OD-04;
- threshold như `completionRate < 50%` được đánh giá trên giá trị gốc trước khi làm tròn theo OD-35.

### OD-40 – AI StudyPlan Adjustment Eligibility

AI adjustment chỉ được gọi khi đồng thời thỏa:

1. có StudyPlan hiện tại;
2. `now <= StudyPlan.endDate`;
3. StudyPlan hiện tại có ít nhất một StudyTask `TODO`.

Nếu **không có StudyPlan hiện tại**, backend:
- không gọi AI;
- không tạo `AIRequestLog`;
- không trả AI inference failure;
- hướng Student tạo StudyPlan trước khi yêu cầu điều chỉnh.

Trường hợp này là **không đủ điều kiện nghiệp vụ để adjustment**, không phải `INSUFFICIENT_DATA`.

Nếu `now > StudyPlan.endDate`, backend không gọi AI và hướng Student tạo plan mới nếu muốn deadline mới. Đây cũng là **không đủ điều kiện nghiệp vụ để adjustment**, không phải `INSUFFICIENT_DATA`.

Nếu không còn StudyTask `TODO`, backend không gọi AI, không tạo AI inference request/log và thông báo kế hoạch không còn nhiệm vụ cần điều chỉnh. Trường hợp này cũng không được gộp thành AI inference failure.

### OD-41 – Optional Goal Context for Student Strength/Weakness Analysis

Đối với FR-STU-004:
- minimum-data bắt buộc là có ít nhất một AssessmentResult hợp lệ;
- `goal` là optional context, không phải eligibility condition;
- thiếu `goal` không trả `INSUFFICIENT_DATA`;
- FR-STU-005 vẫn yêu cầu goal/time/deadline hợp lệ.

### OD-42 – Admin Feedback AI Two-Stage Inference

Admin feedback AI trong MVP dùng hai external AI stages:
1. FR-ADM-004 tạo candidate issueGroups;
2. backend validate/deduplicate theo OD-34 và tự tính count;
3. FR-ADM-005 dùng issueGroups đã validate để tạo summary/priorityAreas/recommendations.

Mỗi external attempt thực tế phải tạo `AIRequestLog`.

### OD-43 – Empty IssueGroups Semantics

Nếu dataset feedback sau filter không rỗng nhưng sau validation/deduplicate không còn group:
- `issueGroups = []` là kết quả hợp lệ;
- không trả `INSUFFICIENT_DATA`;
- FR-ADM-005 vẫn tiếp tục stage 2.

### OD-44 – Backend-Controlled Analysis Context for Deferred Save

Khi Teacher/Admin Save report/analysis sau khi xem AI result:
- backend sở hữu analysis context;
- client chỉ giữ opaque analysis reference;
- Save resolve lại đúng snapshot/output đã validate;
- client không phải nguồn chuẩn của snapshot/result;
- backend không thay snapshot bằng dữ liệu live tại thời điểm Save.

### OD-45 – Teacher AI Analysis History Read Semantics

- Teacher chỉ list/detail `ClassAnalysisReport` của Class mình được phân công.
- History dùng `inputSnapshot` + `analysisResult` đã lưu.
- Read-only; không recompute bằng Class live; không gọi AI chỉ để xem history.

### OD-46 – Administrator Feedback Analysis History Read Semantics

- Administrator list/detail `FeedbackAnalysis` đã lưu.
- History dùng `inputSnapshot` + `analysisResult` đã lưu.
- Read-only; không thay snapshot bằng Feedback live; không gọi AI chỉ để xem history.

## 2.4. Phân loại rule sử dụng trong tài liệu

| Loại | Ý nghĩa |
|---|---|
| Authorization | Quyền truy cập tài nguyên theo role/quyền sở hữu |
| Validation | Điều kiện dữ liệu đầu vào phải thỏa |
| Calculation | Công thức hoặc cách xác định metric |
| State Transition | Điều kiện chuyển trạng thái entity |
| AI Governance | Giới hạn trách nhiệm và quyền của AI |
| Data Integrity | Bảo đảm dữ liệu nhất quán, hợp lệ |
| Scope Constraint | Giới hạn được chốt cho MVP |

---

# 3. Danh mục Business Rules

| ID | Tên rút gọn | Nhóm |
|---|---|---|
| BR-001 | Student chỉ truy cập dữ liệu của mình | Authorization |
| BR-002 | Teacher chỉ truy cập Class được phân công | Authorization |
| BR-003 | Admin không dùng AI để sửa dữ liệu Student/Teacher | AI Governance |
| BR-004 | AI không tự tạo số liệu thống kê | AI Governance |
| BR-005 | Student phải chấp nhận StudyPlan trước khi lưu | State Transition |
| BR-006 | Student phải chấp nhận AI adjustment trước khi áp dụng | State Transition |
| BR-007 | AI insight của Teacher chỉ mang tính hỗ trợ | AI Governance |
| BR-008 | AI insight của Admin chỉ là đề xuất | AI Governance |
| BR-009 | Backend tính các thống kê chính xác | Calculation |
| BR-010 | Lỗi AI không làm thay đổi trạng thái nghiệp vụ cũ | Data Integrity |
| BR-011 | AI Runtime không truy cập PostgreSQL trực tiếp | AI Governance |
| BR-012 | Backend kiểm tra quyền trước dữ liệu nhạy cảm | Authorization |
| BR-013 | Feedback đã lưu đi vào nguồn phân tích Admin | Data Integrity |
| BR-014 | Feedback bắt buộc một tag chính thức | Validation |
| BR-015 | Backend thống kê Feedback theo tag | Calculation |
| BR-016 | Phân loại score theo thang 0–100 | Calculation |
| BR-017 | Xác định Student chậm tiến độ | Calculation |
| BR-018 | Xác định Student Needs Attention | Calculation |
| BR-019 | Teacher chỉ xem Student thuộc Class của mình | Authorization |
| BR-020 | Admin quản lý ACTIVE/DISABLED | State Transition |
| BR-021 | Giới hạn trường Student được chỉnh ở preview | Validation |
| BR-022 | Course/Topic dùng seed data nội bộ | Scope Constraint |
| BR-023 | Ẩn menu không phải cơ chế phân quyền | Authorization |
| BR-024 | Một Student chỉ có một StudyPlan hiện tại | State Transition |
| BR-025 | Trạng thái và deadline của StudyTask | State Transition |
| BR-026 | Teacher metric dùng latest AssessmentResult | Calculation |
| BR-027 | Completion rate dùng StudyPlan hiện tại | Calculation |
| BR-028 | Giới hạn AI adjustment | AI Governance |
| BR-029 | Giới hạn Admin dashboard MVP | Scope Constraint |
| BR-030 | Report AI lưu snapshot bằng JSONB | Data Integrity |
| BR-031 | Chuẩn ngày giờ UTC/ISO 8601 | Data Integrity |
| BR-032 | Protected API từ chối user DISABLED | Authorization |
| BR-033 | MVP chỉ sử dụng một Course chính | Scope Constraint |
| BR-034 | Latest AssessmentResult dùng chung cho trạng thái hiện tại | Calculation |
| BR-035 | Không gọi AI khi thiếu dữ liệu tối thiểu | AI Governance |
| BR-036 | StudyPlan quá deadline nhưng còn TODO vẫn ACTIVE | State Transition |
| BR-037 | Contract Topic và nguồn goal khi AI tạo plan | AI Governance |
| BR-038 | Student detail của Teacher là read-only | Authorization |
| BR-039 | User.email phải unique | Data Integrity |
| BR-040 | Admin không được disable chính mình | Authorization |
| BR-041 | Goal là optional context cho Student strength/weakness analysis | AI Governance |
| BR-042 | Admin feedback AI dùng two-stage external inference | AI Governance |
| BR-043 | issueGroups rỗng trên dataset không rỗng vẫn là kết quả hợp lệ | AI Governance |
| BR-044 | Deferred Save dùng backend-controlled analysis context | Data Integrity |
| BR-045 | Teacher history chỉ đọc snapshot report của Class được phân công | Authorization / Data Integrity |
| BR-046 | Admin history chỉ đọc snapshot FeedbackAnalysis đã lưu | Data Integrity |

---

# 4. Business Rules chi tiết

## 4.1. Quyền truy cập và tài khoản

### BR-001 – Student chỉ được truy cập dữ liệu học tập của chính mình

**Loại:** Authorization  
**Đối tượng:** Student, Backend

**Phát biểu rule**  
Student chỉ được đọc hoặc cập nhật các tài nguyên học tập thuộc chính tài khoản đang đăng nhập.

**Dữ liệu chịu ảnh hưởng**

- AssessmentResult;
- StudyPlan;
- StudyTask;
- progress/metric cá nhân;
- dữ liệu dùng cho Student AI analysis và StudyPlan generation/adjustment.

**Cách kiểm tra**

1. Backend lấy `userId` từ phiên/token đã xác thực.
2. Backend không tin `studentId` do client tự khai báo nếu có thể suy ra từ phiên đăng nhập.
3. Khi truy vấn hoặc cập nhật tài nguyên, backend kiểm tra quan hệ sở hữu trước khi trả hoặc sửa dữ liệu.

**Kết quả khi vi phạm**

- từ chối request;
- không trả dữ liệu của Student khác;
- không thực hiện cập nhật.

**Truy vết:** FR-COM-003, FR-STU-002, FR-STU-006, FR-STU-007, DATA-REQ-002, NFR-SEC-003.

---

### BR-002 – Teacher chỉ được xem Class mình được phân công

**Loại:** Authorization  
**Đối tượng:** Teacher, Backend

**Phát biểu rule**  
Teacher chỉ được truy cập Class có `teacherId` tương ứng với Teacher đang đăng nhập.

**Cách kiểm tra**

1. Backend xác định Teacher từ phiên đăng nhập.
2. Trước khi trả Class dashboard, danh sách Student, AI class analysis hoặc lưu ClassAnalysisReport, backend kiểm tra Class thuộc Teacher đó.
3. Việc client biết hoặc đoán được `classId` không tạo quyền truy cập.

**Kết quả khi vi phạm**

- backend từ chối;
- không trả dữ liệu Class;
- không cho chạy/lưu phân tích trên Class ngoài quyền.

**Truy vết:** FR-COM-003, FR-TEA-001, FR-TEA-002, FR-TEA-007, NFR-SEC-004.

---

### BR-012 – Backend phải kiểm tra quyền trước khi truy vấn hoặc cập nhật dữ liệu nhạy cảm theo role

**Loại:** Authorization  
**Đối tượng:** Backend

**Phát biểu rule**  
Phân quyền bắt buộc được thực thi tại backend trước thao tác nghiệp vụ nhạy cảm.

**Nguyên tắc**

- frontend có thể ẩn/hiện chức năng để cải thiện trải nghiệm nhưng không quyết định quyền cuối cùng;
- backend phải xác thực user, role, trạng thái tài khoản và quyền đối với tài nguyên;
- quyền sở hữu hoặc quan hệ Teacher–Class phải được kiểm tra trước khi trả dữ liệu.

**Kết quả khi vi phạm**

- request bị từ chối;
- không trả dữ liệu tài nguyên;
- không thực hiện thay đổi database.

**Truy vết:** FR-COM-003, DATA-REQ-002, NFR-SEC-002, NFR-SEC-003, NFR-SEC-004.

---

### BR-019 – Teacher chỉ được xem chi tiết Student thuộc Class mình được phân công

**Loại:** Authorization  
**Đối tượng:** Teacher, Backend

**Phát biểu rule**  
Teacher chỉ được mở Student detail nếu tồn tại quan hệ `Teacher -> Class -> ClassMember -> Student` hợp lệ.

**Dữ liệu được phép xem trong MVP**

- score mới nhất theo Topic;
- `averageScore`;
- `completionRate`;
- `overdueTaskCount`;
- `actualProgress`;
- `expectedProgress`.

**Dữ liệu/hành động không được phép**

- Student ngoài Class được phân công;
- sửa StudyPlan;
- sửa StudyTask;
- sửa mục tiêu học tập.

**Truy vết:** FR-TEA-002, OD-05, OD-30.

---

### BR-020 – Administrator được quản lý trạng thái ACTIVE/DISABLED

**Loại:** State Transition / Authorization  
**Đối tượng:** Administrator, Backend, User

**Phát biểu rule**  
Administrator được chuyển trạng thái tài khoản giữa `ACTIVE` và `DISABLED` trong phạm vi MVP.

**Chuyển trạng thái hợp lệ**

| Trạng thái hiện tại | Hành động Admin | Trạng thái mới |
|---|---|---|
| ACTIVE | Disable | DISABLED |
| DISABLED | Activate | ACTIVE |

**Hệ quả nghiệp vụ**

- User `DISABLED` không được đăng nhập mới.
- User `DISABLED` không được sử dụng protected API kể cả còn giữ token/phiên cũ.
- MVP không yêu cầu reason/history cho thao tác disable.

**Giới hạn:** áp dụng cùng BR-040: Admin không được disable chính tài khoản đang đăng nhập.

**Truy vết:** FR-ADM-002, OD-06, ERR-002.

---

### BR-023 – Frontend không được xem việc ẩn menu là biện pháp phân quyền duy nhất

**Loại:** Authorization  
**Đối tượng:** Frontend, Backend

**Phát biểu rule**  
Ẩn menu hoặc route trên frontend chỉ là lớp giao diện; quyền thật phải được kiểm tra ở backend.

**Ví dụ hành vi bắt buộc**

- Student nhập trực tiếp URL Teacher/Admin vẫn không lấy được dữ liệu.
- Teacher gửi request trực tiếp tới Admin API vẫn bị từ chối.
- Việc sửa client-side state không tạo thêm quyền.

**Truy vết:** FR-COM-001, FR-COM-003, NFR-SEC-002.

---

### BR-032 – Protected API phải từ chối tài khoản DISABLED kể cả khi còn token/phiên cũ

**Loại:** Authorization  
**Đối tượng:** Backend, User

**Phát biểu rule**  
Mỗi protected request phải bảo đảm tài khoản hiện tại vẫn ở trạng thái `ACTIVE`.

**Luồng kiểm tra**

1. xác thực token/phiên;
2. xác định User;
3. kiểm tra `User.status`;
4. chỉ tiếp tục nghiệp vụ nếu status là `ACTIVE`.

**Khi status = DISABLED**

- backend từ chối protected request;
- frontend xóa trạng thái đăng nhập và chuyển về màn hình đăng nhập khi nhận lỗi phù hợp.

**Truy vết:** FR-COM-002, FR-ADM-002, NFR-SEC-009, ERR-002, OD-23.

---

### BR-039 – User.email phải unique trong hệ thống

**Loại:** Data Integrity  
**Đối tượng:** Backend, Database

**Phát biểu rule**  
Một email chỉ được định danh cho một tài khoản User trong hệ thống.

**Cách thực thi**

Theo OD-38:

- backend `trim` email;
- backend chuyển email về lowercase trước lookup/lưu;
- backend validate uniqueness trên email đã normalize;
- database phải có ràng buộc ngăn email normalized bị trùng;
- thao tác gây trùng email phải bị từ chối;
- login/lookup tài khoản phải áp dụng cùng quy tắc normalization để tránh khác biệt giữa lúc tạo và lúc đăng nhập.

**Truy vết:** DATA-REQ-012, OD-31, OD-38.

---

### BR-040 – Administrator không được disable chính tài khoản đang đăng nhập

**Loại:** Authorization  
**Đối tượng:** Administrator, Backend

**Phát biểu rule**  
Admin đang đăng nhập không được thực hiện chuyển chính tài khoản của mình từ `ACTIVE` sang `DISABLED`.

**Cách kiểm tra**

- backend so sánh target user với userId của Admin hiện tại;
- nếu trùng và hành động là Disable thì từ chối thao tác.

**Phạm vi MVP**

- không có workflow phê duyệt;
- không có cơ chế Admin khác xác nhận thay;
- không mở rộng thành module quản trị tài khoản nâng cao.

**Truy vết:** FR-ADM-002, OD-32.

---

## 4.2. Student – kết quả học tập, kế hoạch và tiến độ

### BR-005 – StudyPlan do AI tạo chỉ được lưu/áp dụng sau khi Student chấp nhận

**Loại:** State Transition / AI Governance  
**Đối tượng:** Student, Backend, AI Runtime

**Phát biểu rule**  
Output AI ở bước tạo StudyPlan chỉ là bản preview cho đến khi Student xác nhận áp dụng.

**Trước khi xác nhận**

- chưa tạo StudyPlan nghiệp vụ mới;
- chưa tạo StudyTask trong database;
- Student có thể chỉnh các trường được BR-021 cho phép.

**Khi Student chấp nhận**

Backend phải coi preview là dữ liệu có thể đã cũ và **revalidate tại chính thời điểm Apply trước bất kỳ database mutation nào**:

1. lấy `applyTime = now`;
2. kiểm tra lại quyền Student và toàn bộ dữ liệu plan;
3. `targetDeadline`/`StudyPlan.endDate` phải **lớn hơn `applyTime`**;
4. `StudyPlan.startDate` dự kiến được xác định bằng `applyTime`;
5. mọi StudyTask phải tiếp tục thỏa `applyTime <= dueDate <= targetDeadline`;
6. `expectedMinutes`, `priority`, `topicId`, title và các trường bắt buộc khác phải tiếp tục hợp lệ;
7. chỉ sau khi toàn bộ validation thành công, backend mới archive StudyPlan hiện tại nếu có;
8. tạo StudyPlan mới `ACTIVE`;
9. tạo StudyTask `TODO` trong cùng transaction.

Nếu validation tại thời điểm Apply thất bại:

- không archive StudyPlan hiện tại;
- không tạo StudyPlan mới;
- không tạo StudyTask mới;
- trạng thái nghiệp vụ trước đó phải được giữ nguyên;
- backend trả validation/business error phù hợp để Student chỉnh lại hoặc tạo preview mới.

**Khi Student từ chối**

- không tạo StudyPlan mới;
- không tạo StudyTask mới.

**Truy vết:** FR-STU-005, FR-STU-006, AI-REQ-011, DATA-REQ-006.

---

### BR-006 – Điều chỉnh StudyPlan do AI đề xuất chỉ được áp dụng sau khi Student chấp nhận

**Loại:** State Transition / AI Governance  
**Đối tượng:** Student, Backend, AI Runtime

**Phát biểu rule**  
AI adjustment không được tự thay đổi StudyTask. Các thay đổi chỉ có hiệu lực sau xác nhận của Student.

**Luồng bắt buộc**

1. backend chuẩn bị dữ liệu và gọi AI;
2. AI trả đề xuất có cấu trúc;
3. backend validate;
4. Student xem đề xuất;
5. Student chấp nhận hoặc từ chối;
6. chỉ khi chấp nhận backend mới cập nhật các task hợp lệ.

**Khi từ chối hoặc AI lỗi**

- StudyPlan/StudyTask giữ nguyên trạng thái trước đó.

**Truy vết:** FR-STU-009, AI-REQ-012.

---

### BR-016 – AssessmentResult sử dụng thang điểm 0–100 và được phân loại theo ngưỡng cố định

**Loại:** Validation / Calculation  
**Đối tượng:** Backend, Student, Teacher

**Validation score**

- `0 <= score <= 100`;
- score ngoài khoảng phải bị từ chối.

**Bảng phân loại**

| Điều kiện | Trạng thái |
|---|---|
| `score >= 80` | Tốt |
| `60 <= score < 80` | Cần củng cố |
| `score < 60` | Cần ưu tiên |

**Liên hệ Teacher**

- Topic có `averageScore < 60` được xem là `Weak Topic`.

**Truy vết:** FR-STU-002, DATA-REQ-008, OD-01, OD-14.

---

### BR-017 – Student được xem là chậm tiến độ theo chênh lệch 20 điểm phần trăm

**Loại:** Calculation  
**Đối tượng:** Backend, Student, Teacher

**Công thức**

`actualProgress = completedTasks / totalTasks × 100`

`expectedProgress = tasksDueByNow / totalTasks × 100`

Trong đó `tasksDueByNow` là số task có `dueDate <= now`.

Nếu `totalTasks = 0`:

- `actualProgress = 0`;
- `expectedProgress = 0`.

**Điều kiện cảnh báo**

`actualProgress < expectedProgress - 20`

`20` là **20 điểm phần trăm**, không phải 20% của `expectedProgress`. Threshold được đánh giá trên giá trị gốc trước khi làm tròn theo OD-35.

**Hệ quả**

- Student dashboard có thể hiển thị cảnh báo chậm tiến độ;
- hệ thống có thể gợi ý Student chạy AI adjustment nếu plan chưa quá `endDate`;
- Teacher flow sử dụng cùng rule này để tạo `Progress Warning` trong xử lý nội bộ của `FR-TEA-004`, phục vụ `UC-TEA-003` và `UC-TEA-005`.

**Truy vết:** FR-STU-001, FR-STU-008, FR-STU-009, FR-TEA-004, UC-STU-001, UC-STU-008, UC-STU-009, UC-TEA-003, UC-TEA-005, OD-02, OD-04, OD-35.

---

### BR-021 – Giới hạn trường Student được chỉnh trước khi áp dụng StudyPlan

**Loại:** Validation  
**Đối tượng:** Student, Backend

**Student được chỉnh ở preview**

- `StudyPlan.title`;
- `StudyTask.title`;
- `StudyTask.expectedMinutes`;
- `StudyTask.dueDate`;
- `StudyTask.priority`.

**Student không được chỉnh qua luồng này**

- score;
- AssessmentResult;
- kết quả phân tích AI;
- dữ liệu nguồn dùng để phân tích;
- `StudyPlan.goal` theo cách ghi đè mục tiêu đã nhập.

**Backend phải validate lại**

- title không rỗng;
- `expectedMinutes > 0`;
- `priority` thuộc `LOW`, `MEDIUM`, `HIGH`;
- `dueDate` hợp lệ và không vượt `targetDeadline`/`StudyPlan.endDate`;
- `topicId` vẫn hợp lệ;
- tại thời điểm Apply, toàn bộ preview phải được revalidate theo BR-005 với `applyTime = now`; việc preview từng hợp lệ trước đó không bảo đảm vẫn hợp lệ khi lưu.

**Truy vết:** FR-STU-005, FR-STU-006, OD-12.

---

### BR-024 – Mỗi Student chỉ có tối đa một StudyPlan hiện tại

**Loại:** State Transition / Data Integrity  
**Đối tượng:** Student, Backend, Database

**Định nghĩa StudyPlan hiện tại**

Plan có status `ACTIVE` hoặc `COMPLETED`.

**Rule**

- mỗi Student có tối đa một plan hiện tại;
- khi áp dụng plan mới, plan hiện tại cũ phải chuyển `ARCHIVED`;
- tạo plan mới và archive plan cũ phải nằm trong luồng cập nhật nhất quán;
- StudyPlan `ARCHIVED` là read-only trong MVP.

**Bảng chuyển trạng thái chính**

| Sự kiện | Trạng thái trước | Trạng thái sau |
|---|---|---|
| Student chấp nhận plan mới | Không có plan hiện tại | ACTIVE |
| Student chấp nhận plan mới | ACTIVE/COMPLETED | Plan cũ → ARCHIVED; plan mới → ACTIVE |
| Tất cả task hoàn thành | ACTIVE | COMPLETED |
| Undo một task của plan hiện tại | COMPLETED | ACTIVE |

**Truy vết:** FR-STU-006, FR-STU-007, OD-16.

---

### BR-025 – StudyTask chỉ dùng TODO/COMPLETED và được xác định near-due/overdue theo dueDate

**Loại:** State Transition / Calculation  
**Đối tượng:** Student, Backend

**Status hợp lệ**

- `TODO`;
- `COMPLETED`.

**Priority hợp lệ**

- `LOW`;
- `MEDIUM`;
- `HIGH`.

**Rule thời gian**

- overdue: `status = TODO` và `dueDate < now`;
- near due: `status = TODO` và `now < dueDate <= now + 48 giờ`;
- `dueDate` phải nằm trong khoảng `StudyPlan.startDate <= dueDate <= StudyPlan.endDate`.

**Boundary `dueDate = now`**

Tại đúng thời điểm `dueDate = now`:

- task không còn là near due vì near due yêu cầu `dueDate > now`;
- task chưa được xem là overdue vì overdue yêu cầu `dueDate < now`;
- task đã được tính vào `tasksDueByNow`, do đó đã ảnh hưởng `expectedProgress`.

Task trở thành overdue ngay khi `dueDate < now`.

**Rule completedAt**

- khi chuyển `TODO -> COMPLETED`, đặt `completedAt = now`;
- khi undo `COMPLETED -> TODO`, đặt `completedAt = null`.

**Truy vết:** FR-STU-001, FR-STU-007, FR-STU-008, DATA-REQ-006, OD-17.

---

### BR-027 – Completion rate chỉ dựa trên StudyPlan hiện tại

**Loại:** Calculation  
**Đối tượng:** Backend, Student, Teacher

**Rule**

- `completionRate = completedTasks / totalTasks × 100 = actualProgress` trên StudyPlan hiện tại theo OD-39;
- completion rate không tổng hợp task từ plan đã `ARCHIVED`;
- Student chưa có StudyPlan hiện tại thì completion rate trả `null`/N/A, không trả `0%`;
- nếu Student có StudyPlan hiện tại nhưng `totalTasks = 0`, completion rate bằng `0` theo cùng quy ước `actualProgress`;
- `overdueTaskCount` có thể bằng `0` khi Student không có task hiện tại theo quy ước SRS.

**Mục đích**  
Phân biệt rõ “chưa có kế hoạch để tính” với “có kế hoạch nhưng chưa hoàn thành gì”.

**Truy vết:** FR-STU-008, FR-TEA-002, FR-TEA-003, DATA-REQ-011, OD-04, OD-18, OD-39.

---

### BR-034 – Student và Teacher dùng AssessmentResult mới nhất theo Student–Topic

**Loại:** Calculation / Data Integrity  
**Đối tượng:** Backend, Student, Teacher, AI input preparation

**Rule**

Với mỗi cặp `Student–Topic`, bản ghi hiện tại là AssessmentResult có `evaluatedAt` mới nhất.

**Áp dụng cho**

- Student dashboard/result;
- Student AI analysis;
- AI StudyPlan generation;
- Teacher `averageScore`;
- `topicAverageScores`;
- `classAverageScore`;
- Teacher AI class analysis.

**Không áp dụng trong MVP**

- phân tích trend/history theo thời gian; đây là P2.

**Truy vết:** FR-STU-002, FR-STU-004, FR-STU-005, FR-TEA-002, FR-TEA-003, DATA-REQ-010, OD-25.

---

### BR-036 – StudyPlan quá endDate nhưng còn TODO vẫn giữ ACTIVE

**Loại:** State Transition  
**Đối tượng:** Student, Backend

**Rule**

Nếu `now > StudyPlan.endDate` và vẫn còn ít nhất một StudyTask `TODO`:

- StudyPlan vẫn giữ status `ACTIVE`;
- không tạo status `EXPIRED` trong MVP;
- các task `TODO` có dueDate đã qua tiếp tục được tính overdue;
- AI adjustment không được gọi cho plan đã quá endDate;
- nếu Student muốn deadline mới, Student phải tạo StudyPlan mới;
- khi plan mới được áp dụng, plan cũ chuyển `ARCHIVED` theo BR-024.

**Truy vết:** FR-STU-008, FR-STU-009, OD-27.

---

### BR-037 – AI tạo StudyPlan chỉ tham chiếu Topic hợp lệ và StudyPlan.goal lấy từ Student

**Loại:** AI Governance / Validation  
**Đối tượng:** Backend, AI Runtime, Student

**Contract Topic**

- backend gửi danh sách Topic hợp lệ dạng `{ id, name }`;
- AI phải trả `topicId` cho từng StudyTask;
- AI không được tự tạo Topic mới;
- backend từ chối task có `topicId` không tồn tại hoặc không thuộc danh sách đã cung cấp.

**Nguồn dữ liệu plan**

- AI sinh `planTitle` và dữ liệu StudyTask;
- `StudyPlan.goal` lấy trực tiếp từ mục tiêu Student đã nhập;
- kết quả FR-STU-004 có thể dùng bổ sung nhưng không phải dependency bắt buộc của FR-STU-005.

**Validation mục tiêu và khả năng học trước khi gọi AI**

- mục tiêu học tập sau `trim` không được rỗng;
- `availableHoursPerWeek > 0`;
- backend chuẩn hóa `availableMinutesPerWeek = availableHoursPerWeek × 60`;
- `targetDeadline` phải lớn hơn thời điểm backend xử lý request;
- các giá trị trên phải hợp lệ trước khi được dùng làm input cho AI tạo StudyPlan;
- nếu dữ liệu do client gửi không hợp lệ, backend trả validation error; trường hợp này **không phải** `INSUFFICIENT_DATA` và không gọi AI;
- validation trước khi gọi AI **không thay thế** validation lúc Apply: nếu Student giữ preview đến khi `targetDeadline <= applyTime`, backend phải từ chối Apply theo BR-005 để không tạo `StudyPlan.startDate >= StudyPlan.endDate`.

**Truy vết:** FR-STU-003, FR-STU-005, FR-STU-006, DATA-REQ-005, DATA-REQ-006, DATA-REQ-013, OD-28, OD-29.

---

### BR-041 – Goal là optional context cho Student Strength/Weakness Analysis

**Loại:** AI Governance / Validation  
**Đối tượng:** Student, Backend, AI Runtime

**Phát biểu rule**  
Đối với FR-STU-004, Student có ít nhất một AssessmentResult hợp lệ thì đủ minimum-data để chạy AI Strength/Weakness Analysis. `goal` là context bổ sung nếu có, không phải eligibility condition.

**Cách thực thi**
- backend kiểm tra AssessmentResult trước inference;
- nếu không có AssessmentResult → `INSUFFICIENT_DATA`, không gọi AI;
- nếu có AssessmentResult nhưng chưa có `goal` → vẫn được gọi AI;
- thiếu `goal` không được ghi nhận như validation failure hay business-ineligible của FR-STU-004;
- rule này không áp dụng cho FR-STU-005: tạo StudyPlan vẫn cần goal/time/deadline hợp lệ.

**Truy vết:** FR-STU-004, AI-REQ-023, BR-035, OD-41.

---

## 4.3. Teacher – metric và AI Teaching Insight

### BR-007 – ClassAnalysisReport và recommendation của AI chỉ là hỗ trợ Teacher

**Loại:** AI Governance  
**Đối tượng:** Teacher, AI Runtime, Backend

**Phát biểu rule**  
AI giải thích dữ liệu và đề xuất phương án hỗ trợ; Teacher là người quyết định có sử dụng đề xuất hay không.

**AI không được**

- tự thay đổi dữ liệu Student;
- tự giao nhiệm vụ;
- tự thay đổi StudyPlan/StudyTask;
- kết luận chắc chắn về năng lực, thái độ, động cơ hoặc ý thức của Student.

**Teacher có thể**

- xem analysis;
- xem recommendation;
- lưu ClassAnalysisReport hợp lệ.

**Truy vết:** FR-TEA-005, FR-TEA-006, FR-TEA-007, AI-REQ-013.

---

### BR-018 – Student được đánh dấu Needs Attention theo rule cố định

**Loại:** Calculation  
**Đối tượng:** Backend, Teacher

**Điều kiện**

Student được đánh dấu `Needs Attention` nếu thỏa **ít nhất một** điều kiện có dữ liệu:

- `averageScore < 60`; hoặc
- `completionRate < 50%`; hoặc
- `overdueTaskCount >= 2`.

**Rule dữ liệu thiếu**

- metric `null`/N/A không được tự chuyển thành `0` để kích hoạt rule;
- Student chưa có plan không bị xem là completion rate `0%`;
- các threshold `< 60`, `< 50%` và `>= 2` được đánh giá trên giá trị tính toán gốc; việc làm tròn chỉ dùng để hiển thị theo OD-35.

**Hệ quả**

- Student xuất hiện trong danh sách/nhóm cần Teacher chú ý;
- thông tin này có thể được đưa vào input AI class analysis.

**Truy vết:** FR-TEA-004, UC-TEA-003, UC-TEA-005, OD-03, OD-35.

---

### BR-026 – Teacher metric dùng latest AssessmentResult và không coi dữ liệu thiếu là 0

**Loại:** Calculation  
**Đối tượng:** Backend, Teacher

**Nguồn AssessmentResult**

- với mỗi cặp Student–Topic chỉ dùng AssessmentResult có `evaluatedAt` mới nhất;
- Student thiếu score ở Topic nào thì không tự gán score `0` cho Topic đó;
- Topic không có AssessmentResult nào không tự động được đánh dấu `Weak Topic`;
- metric trung bình/tỷ lệ không đủ dữ liệu trả `null`/N/A.

**Công thức metric**

1. `averageScore` của một Student = trung bình các score mới nhất theo Topic mà Student đó thực sự có dữ liệu. Nếu Student không có AssessmentResult nào thì `averageScore = null/N/A`.
2. `topicAverageScore(topic)` = trung bình score mới nhất của từng Student trong Class có AssessmentResult cho Topic đó. Student không có score ở Topic đó không tham gia mẫu tính.
3. `classAverageScore` = trung bình của **tất cả score mới nhất theo từng cặp Student–Topic đang có dữ liệu** trong Class. Không tính bằng cách gán `0` cho dữ liệu thiếu.
4. `classCompletionRate = tổng completedTasks / tổng tasks × 100` trên StudyPlan hiện tại của các Student có plan. Student chưa có StudyPlan hiện tại không bị tính thành `0%` và không tham gia mẫu số.
5. `studentOverdueTaskCount` = số task `TODO` có `dueDate < now` thuộc StudyPlan hiện tại của Student; Student không có plan hiện tại có count bằng `0`.
6. field `overdueTaskCount` ở cấp Class = tổng `studentOverdueTaskCount` của tất cả Student thuộc Class theo OD-36. Trong tài liệu này có thể gọi rõ nghĩa là `classOverdueTaskCount`, nhưng không tạo field/API mới ngoài SRS.

Nếu không có dữ liệu phù hợp để tính một metric trung bình/tỷ lệ, backend trả `null`/N/A. Các threshold được đánh giá trên giá trị gốc trước khi làm tròn theo OD-35.

**Weak Topic**

- một Topic chỉ được xem xét Weak Topic khi có `topicAverageScore` hợp lệ;
- `topicAverageScore < 60` → `Weak Topic`;
- Topic không có dữ liệu → không tự động Weak Topic.

**Truy vết:** FR-TEA-002, FR-TEA-003, FR-TEA-004, FR-TEA-005, UC-TEA-002, UC-TEA-003, UC-TEA-005, DATA-REQ-010, DATA-REQ-011, OD-18, OD-35, OD-36.

---

### BR-038 – Trang Student detail của Teacher là read-only

**Loại:** Authorization / Scope Constraint  
**Đối tượng:** Teacher, Backend, UI

**Rule**

Trang chi tiết Student dành cho Teacher chỉ có mục tiêu quan sát dữ liệu cần thiết cho việc hỗ trợ học tập.

**Được phép**

- đọc score mới nhất theo Topic;
- đọc các metric tiến độ đã quy định.

**Không được phép**

- sửa StudyPlan;
- sửa StudyTask;
- sửa mục tiêu học tập;
- thay đổi score/AssessmentResult.

**Truy vết:** FR-TEA-002, OD-30.

---

### BR-045 – Teacher chỉ được xem lịch sử phân tích của Class được phân công và phải đọc snapshot đã lưu

**Mục đích:** Bảo đảm chức năng history không mở rộng quyền Teacher và không biến dữ liệu lịch sử thành dữ liệu live.

**Rule:**
- Teacher chỉ list/detail `ClassAnalysisReport` nếu report thuộc Class hiện đang được phân công cho Teacher;
- backend kiểm tra Teacher–Class ở cả list và detail;
- dữ liệu chi tiết lấy từ `inputSnapshot` và `analysisResult` đã lưu trong report;
- không recompute metric từ Class/Student hiện tại để thay nội dung snapshot;
- history là read-only trong MVP;
- list/detail history không gọi AI và không tạo `AIRequestLog`.

**Nếu vi phạm:**
- Class/report ngoài quyền → từ chối theo authorization;
- report không tồn tại → trả not-found/error phù hợp mà không tiết lộ dữ liệu ngoài quyền.

**Truy vết:** `FR-TEA-008`, `UC-TEA-008`, `OD-45`, đồng thời kế thừa `BR-002`, `BR-012`, `BR-030`, `BR-031`.

## 4.4. Administrator và Feedback

### BR-003 – Administrator không dùng AI để thay đổi trực tiếp dữ liệu Student hoặc Teacher

**Loại:** AI Governance  
**Đối tượng:** Administrator, AI Runtime, Backend

**Rule**

AI System Intelligence chỉ phân tích feedback và dữ liệu hệ thống để cung cấp insight cho Admin.

**AI/Admin flow này không được**

- sửa AssessmentResult;
- sửa StudyPlan/StudyTask;
- sửa dữ liệu Class/Teacher assignment;
- tự động thay đổi hành vi hệ thống dựa trên recommendation.

**Hành động cuối cùng**  
Admin xem xét và quyết định khu vực cần ưu tiên; các thay đổi sản phẩm nếu có nằm ngoài luồng AI analysis này.

**Truy vết:** AI-REQ-014, FR-ADM-004, FR-ADM-005.

---

### BR-008 – Kết quả AI cho Administrator chỉ là đề xuất cải thiện

**Loại:** AI Governance  
**Đối tượng:** Administrator, AI Runtime

**Rule**

`summary`, `priorityAreas` và `recommendations` không tự tạo thay đổi trong hệ thống.

**Admin là người quyết định**

- có sử dụng insight hay không;
- khu vực nào cần ưu tiên;
- hành động cải thiện tiếp theo.

**Truy vết:** FR-ADM-005, AI-REQ-014.

---

### BR-013 – Feedback đã lưu phải đi vào nguồn dữ liệu phân tích của Administrator

**Loại:** Data Integrity  
**Đối tượng:** Student, Teacher, Administrator, Backend

**Rule**

Feedback hợp lệ sau khi lưu phải có thể xuất hiện trong phạm vi Admin xem, lọc, thống kê và chọn để phân tích.

**Điều kiện Feedback hợp lệ**

- user là Student hoặc Teacher đã đăng nhập;
- có đúng một tag hợp lệ;
- rating từ 1–5;
- content không rỗng sau trim;
- `userId` lấy từ phiên đăng nhập.

**Hệ quả**

- Admin list/filter có thể truy vấn feedback mới;
- feedback có thể nằm trong `feedbackIds` của một lần FeedbackAnalysis nếu thuộc filter được chọn.

**Truy vết:** FR-FB-001, FR-ADM-003, FR-ADM-004.

---

### BR-014 – Feedback bắt buộc có đúng một tag cấp cao do người dùng chọn

**Loại:** Validation / Data Integrity  
**Đối tượng:** Student, Teacher, Backend, AI Runtime

**Tag hợp lệ**

| Nhãn UI | Giá trị lưu |
|---|---|
| AI hỗ trợ | `AI_PERFORMANCE` |
| Kế hoạch học tập | `STUDY_PLAN` |
| Giao diện & trải nghiệm | `UI_UX` |
| Kết quả & tiến độ học tập | `LEARNING_ANALYTICS` |
| Khác | `OTHER` |

**Rule**

- mỗi feedback có đúng một tag;
- tag là bắt buộc;
- backend validate enum;
- tag đã lưu là phân loại cấp cao chính thức;
- AI không được tự thay đổi tag.

**Vai trò AI**  
AI chỉ nhóm vấn đề chi tiết từ content, không thay thế tag chính thức.

**Truy vết:** FR-FB-001, FR-ADM-004, DATA-REQ-004, OD-13.

---

### BR-015 – Backend phải đếm số lượng Feedback theo tag

**Loại:** Calculation / Validation  
**Đối tượng:** Backend, Administrator, AI Runtime

**Rule thống kê**

- `totalFeedback` do backend tính từ tập feedback thực tế sau filter;
- `tagStatistics` do backend đếm từ tag đã lưu;
- backend không tin số lượng do AI tự mô tả;
- trong issue grouping, `count` của mỗi group phải được backend tính từ số `feedbackIds` hợp lệ sau validation.

**Validation issueGroups**

- mọi `feedbackId` phải thuộc tập input;
- một feedback chỉ được **tính vào tối đa một issue group**;
- backend xử lý group theo thứ tự AI trả về;
- duplicate `feedbackId` ở group sau bị loại khỏi group sau, không làm hỏng toàn bộ output;
- backend tính lại `count` sau deduplicate;
- group rỗng sau deduplicate bị loại khỏi kết quả;
- `feedbackId` không thuộc tập input vẫn làm structured output không hợp lệ và không được lưu như kết quả thành công.

**Lưu ý đồng bộ baseline**

Cách xử lý trên cụ thể hóa hành vi “loại bỏ ID trùng giữa các group” trong SRS hiện hành và bổ sung thứ tự xử lý deterministic để backend/test case có cùng một cách hiểu.

**Truy vết:** FR-ADM-004, UC-ADM-004, OD-13, OD-34.

---

### BR-029 – Admin dashboard MVP không yêu cầu active user tracking hoặc infrastructure monitoring chi tiết

**Loại:** Scope Constraint  
**Đối tượng:** Administrator, Backend

**Metric bắt buộc**

- `totalUsers`;
- `usersByRole`;
- `totalFeedback`;
- `totalAIRequests`;
- `failedAIRequests`.

**Ngoài phạm vi**

- DAU/MAU/active user tracking;
- CPU/GPU metrics;
- request-per-minute;
- monitoring hạ tầng chi tiết.

**Semantics chính thức trong v1.2 Baseline**

Theo OD-37:

- dashboard dùng metric toàn thời gian, không có date filter riêng trong MVP;
- `totalUsers` và `usersByRole` tính cả `ACTIVE` và `DISABLED`;
- `totalFeedback` là tổng Feedback đang lưu;
- `totalAIRequests` là tổng `AIRequestLog` của các lần backend đã thực sự attempt gọi external AI Service/AI Runtime, bao gồm success và các failure sau khi external call đã bắt đầu;
- `failedAIRequests` là số log có trạng thái thất bại;
- `INSUFFICIENT_DATA` không tạo inference request nên không tham gia hai metric AI request.

Các semantics này đã được đồng bộ vào SRS v1.6 Baseline Final và tiếp tục là nguồn chuẩn của BR-029.

**Truy vết:** FR-ADM-001, UC-ADM-001, OD-20, OD-37.

---

### BR-030 – ClassAnalysisReport và FeedbackAnalysis lưu input snapshot và output AI đã validate bằng JSONB

**Loại:** Data Integrity / Scope Constraint  
**Đối tượng:** Backend, Database

**ClassAnalysisReport**

- `inputSnapshot JSONB` lưu metric/rule tại thời điểm phân tích;
- `analysisResult JSONB` lưu output AI đã validate.

**FeedbackAnalysis**

- `inputSnapshot JSONB` tối thiểu gồm filter, `feedbackIds`, `totalFeedback`, `tagStatistics`;
- `analysisResult JSONB` tối thiểu gồm `issueGroups`, `summary`, `priorityAreas`, `recommendations`.

**Scope rule**

- MVP không tạo bảng con riêng chỉ để lưu WeakTopic, AttentionGroup, Recommendation hoặc quan hệ Feedback–FeedbackAnalysis.

**Truy vết:** FR-TEA-007, FR-ADM-006, DB-REQ-004, OD-21.

---

### BR-042 – Admin feedback AI dùng two-stage external inference

**Loại:** AI Governance / Processing  
**Đối tượng:** Administrator, Backend, AI Runtime

**Phát biểu rule**  
Trong MVP, Admin feedback analysis được xử lý qua hai external AI stages tách biệt.

**Stage 1 – FR-ADM-004**
- backend chuẩn bị feedback/tag;
- AI trả candidate issueGroups;
- backend validate schema/feedbackIds;
- backend deduplicate theo OD-34 và tự tính lại `count`.

**Stage 2 – FR-ADM-005**
- chỉ sử dụng feedback/tagStatistics/issueGroups đã qua backend validation;
- AI trả `summary`, `priorityAreas`, `recommendations`;
- backend validate output trước khi hiển thị/lưu.

**Logging**
- mỗi external attempt thực tế tạo một `AIRequestLog`;
- nếu dataset rỗng và dừng trước stage 1 thì không có stage 1 log và không chạy stage 2;
- nếu stage 1 đã attempt nhưng fail thì log stage 1 theo AI-REQ-018 và không chạy stage 2.

**Truy vết:** FR-ADM-004, FR-ADM-005, AI-REQ-018, AI-REQ-024, OD-42.

---

### BR-043 – issueGroups rỗng trên dataset không rỗng vẫn là kết quả hợp lệ

**Loại:** AI Governance / Data Integrity  
**Đối tượng:** Administrator, Backend, AI Runtime

**Phát biểu rule**  
Nếu dataset feedback sau filter không rỗng, stage 1 chạy thành công và output hợp lệ, nhưng sau validation/deduplicate không còn issue group nào, backend giữ `issueGroups = []`.

**Hệ quả**
- không trả `INSUFFICIENT_DATA`;
- FR-ADM-004 được xem là thành công;
- FR-ADM-005 vẫn chạy stage 2 với feedback/tagStatistics và danh sách issueGroups rỗng;
- UI có thể hiển thị trạng thái “chưa phát hiện nhóm vấn đề nổi bật” hoặc tương đương.

`INSUFFICIENT_DATA` chỉ áp dụng khi dataset feedback sau filter rỗng trước external AI call.

**Truy vết:** FR-ADM-004, FR-ADM-005, BR-035, OD-34, OD-43.

---

### BR-044 – Deferred Save phải dùng backend-controlled analysis context

**Loại:** Data Integrity / Security  
**Đối tượng:** Backend, Database, Teacher, Administrator

**Phát biểu rule**  
Khi ClassAnalysisReport hoặc FeedbackAnalysis được Save sau bước xem kết quả AI, backend phải lấy dữ liệu lưu từ analysis context do backend kiểm soát.

**Cách thực thi**
- sau AI analysis thành công, backend duy trì `inputSnapshot` + `analysisResult` đã validate và resource identity trong analysis context;
- client chỉ giữ opaque analysis reference;
- khi Save, backend resolve reference, kiểm tra quyền/trạng thái rồi mới persist;
- backend không nhận snapshot/result client gửi lại làm nguồn chuẩn;
- backend không query dữ liệu live để thay thế snapshot của lần phân tích.

**Phạm vi thiết kế**
- tên field API, storage mechanism và TTL được chốt ở API/System Design;
- analysis context không bắt buộc là entity nghiệp vụ/database table mới.

**Truy vết:** FR-TEA-007, FR-ADM-006, DATA-REQ-015, OD-44.

---

### BR-046 – Administrator xem lịch sử FeedbackAnalysis dưới dạng read-only snapshot đã lưu

**Mục đích:** Giữ nguyên ý nghĩa của một lần phân tích feedback đã được lưu khi dữ liệu Feedback tiếp tục thay đổi.

**Rule:**
- chỉ Administrator `ACTIVE` được list/detail `FeedbackAnalysis`;
- dữ liệu hiển thị lấy từ `inputSnapshot` và `analysisResult` đã lưu;
- không truy vấn Feedback live để thay `feedbackIds`, `totalFeedback`, `tagStatistics`, `issueGroups` hoặc output đã lưu;
- history là read-only trong MVP;
- list/detail history không gọi AI và không tạo `AIRequestLog`.

**Truy vết:** `FR-ADM-007`, `UC-ADM-007`, `OD-46`, đồng thời kế thừa `BR-012`, `BR-030`, `BR-031`.

## 4.5. AI Governance và xử lý lỗi

### BR-004 – AI không được tự tạo số liệu thống kê

**Loại:** AI Governance  
**Đối tượng:** AI Runtime, Backend

**Rule**

AI chỉ được diễn giải các số liệu backend cung cấp; không được tự suy đoán hoặc tự tạo:

- score;
- số Student;
- tỷ lệ hoàn thành;
- số task overdue;
- total feedback;
- tag count;
- các metric có thể tính chính xác từ database.

**Hệ quả triển khai**

- backend tính metric trước khi gọi AI;
- dữ liệu số quan trọng phải được truyền rõ trong input;
- output AI không được xem là nguồn chuẩn cho số liệu đếm/tỷ lệ.

**Truy vết:** AI-REQ-002, AI-REQ-008, FR-STU-004, FR-TEA-005, FR-ADM-004.

---

### BR-009 – Tỷ lệ, số lượng, tiến độ và thống kê chính xác phải do backend tính

**Loại:** Calculation  
**Đối tượng:** Backend

**Backend chịu trách nhiệm tính**

- `actualProgress`;
- `expectedProgress`;
- completion rate;
- average score;
- class average;
- topic average;
- overdue count;
- feedback count;
- tag statistics;
- issue group count từ `feedbackIds` hợp lệ.

**Nguyên tắc**  
Business logic có thể tính chính xác không được chuyển vào prompt AI để AI suy đoán.

**Truy vết:** CON-09, AI-REQ-002, NFR-MNT-002.

---

### BR-010 – Nếu AI lỗi, trạng thái nghiệp vụ trước đó phải được giữ nguyên

**Loại:** Data Integrity / AI Governance  
**Đối tượng:** Backend, AI Runtime, User

**Các lỗi tối thiểu**

- connection failure;
- timeout;
- Colab runtime unavailable;
- empty response;
- invalid JSON/structure;
- thiếu field bắt buộc;
- schema validation fail.

**Rule xử lý**

- không lưu output lỗi như kết quả hợp lệ;
- không làm mất StudyPlan/StudyTask/report đã tồn tại;
- không tự áp dụng recommendation;
- ghi AIRequestLog nếu đã có inference request;
- cho phép retry khi phù hợp.

**Truy vết:** FR-COM-005, AI-REQ-015, AI-REQ-016, ERR-006 đến ERR-010.

---

### BR-011 – AI Runtime không được truy cập PostgreSQL trực tiếp

**Loại:** AI Governance / Data Integrity  
**Đối tượng:** AI Runtime, Backend

**Rule kiến trúc nghiệp vụ**

`Frontend -> NestJS -> PostgreSQL`

`NestJS -> AI Runtime`

AI Runtime chỉ nhận dữ liệu cần thiết từ NestJS và trả kết quả phân tích. AI không có quyền:

- query trực tiếp PostgreSQL;
- insert/update/delete dữ liệu nghiệp vụ;
- tự áp dụng output của chính nó.

**Truy vết:** CON-08, AI-REQ-003, AI-REQ-004.

---

### BR-028 – AI adjustment chỉ được thay đổi phạm vi task TODO đã chốt

**Loại:** AI Governance / Validation  
**Đối tượng:** AI Runtime, Backend, Student

**AI được đề xuất**

- `expectedMinutes`;
- `dueDate`;
- `priority`.

**Chỉ áp dụng cho**

- StudyTask có status `TODO`;
- plan chưa quá `endDate`.

**AI không được đề xuất trong MVP**

- thêm task;
- xóa task;
- đổi Topic;
- sửa task `COMPLETED`;
- sửa score/AssessmentResult;
- tự cập nhật database.

**Backend phải validate**

- `expectedMinutes > 0`;
- `priority` hợp lệ;
- `StudyPlan.startDate <= dueDate <= StudyPlan.endDate`;
- task thuộc StudyPlan hiện tại của Student.

**Truy vết:** FR-STU-009, UC-STU-009, DATA-REQ-006, OD-19.

---

### BR-035 – Backend phải kiểm tra dữ liệu tối thiểu và eligibility trước khi gọi AI

**Loại:** AI Governance / Validation  
**Đối tượng:** Backend, AI Runtime, UI

**Rule chung**  
Backend phải kiểm tra dữ liệu tối thiểu và điều kiện nghiệp vụ trước inference. Cần phân biệt **`INSUFFICIENT_DATA`** với trường hợp **không đủ điều kiện nghiệp vụ để gọi AI**. Cả hai đều xảy ra trước inference nên không phải AI inference failure.

#### A. Trường hợp `INSUFFICIENT_DATA`

**Student analysis**

- không có AssessmentResult → `INSUFFICIENT_DATA`, không gọi AI.

**StudyPlan generation**

- không có AssessmentResult hoặc danh sách Topic hợp lệ rỗng → `INSUFFICIENT_DATA`.

**Teacher class analysis – quy tắc chính thức**

Theo OD-33, Class đủ dữ liệu để gọi AI nếu có ít nhất một trong hai:

1. có ít nhất một AssessmentResult hợp lệ của Student thuộc Class; hoặc
2. có ít nhất một Student thuộc Class có StudyPlan hiện tại chứa ít nhất một StudyTask.

Nếu không thỏa cả hai điều kiện → `INSUFFICIENT_DATA`, không gọi AI. Quy tắc này đã được đồng bộ vào SRS v1.4 để làm rõ điều kiện dữ liệu tối thiểu cho Teacher Class Analysis.

**Admin feedback analysis**

- tập feedback sau filter rỗng → `INSUFFICIENT_DATA`.

**Hệ quả của `INSUFFICIENT_DATA`**

- không gửi request đến AI Runtime;
- không tạo `AIRequestLog` thất bại vì chưa có inference request;
- UI hiển thị thông báo “Chưa đủ dữ liệu để phân tích” hoặc thông báo tương đương, phù hợp từng chức năng.

#### B. Trường hợp không đủ điều kiện nghiệp vụ để gọi AI adjustment

Theo OD-40:

- nếu **không có StudyPlan hiện tại** → không gọi AI adjustment; hướng Student tạo StudyPlan trước; không trả `INSUFFICIENT_DATA` và không ghi AI inference failure;
- nếu `now > StudyPlan.endDate` → không gọi AI adjustment; hướng Student tạo plan mới nếu muốn deadline mới; **không trả `INSUFFICIENT_DATA` chỉ vì plan quá hạn**;
- nếu StudyPlan hiện tại không còn StudyTask `TODO` → không gọi AI adjustment; thông báo kế hoạch không còn nhiệm vụ cần điều chỉnh;
- các trường hợp này đều xảy ra trước external AI call nên không tạo `AIRequestLog`.

**Truy vết:** AI-REQ-023, FR-STU-004, FR-STU-005, FR-STU-009, FR-TEA-005, FR-ADM-004, UC-STU-004, UC-STU-005, UC-STU-009, UC-TEA-005, UC-ADM-004, ERR-011, OD-26, OD-33, OD-40.

---

### CR-002 / XAI-001 — Capacity preflight không được làm sai authoritative dataset

**Loại:** AI Governance / Reliability / Validation  
**Đối tượng:** Backend, AI Runtime, UI

Sau khi input đã qua validation, minimum-data và business eligibility, Backend phải kiểm tra khả năng chứa **toàn bộ authoritative input** bằng capacity profile đã benchmark và bind đúng deployment.

- không silently truncate/sampling/pagination-subset/pre-summarize/chunk input chỉ để vừa context;
- không tự tăng số external attempts ngoài orchestration đã baseline hóa;
- profile hợp lệ nhưng input vượt budget → `422 AI_INPUT_TOO_LARGE`, dừng trước dispatch, không `AIRequestLog`;
- profile missing/malformed/binding mismatch → `502 AI_RUNTIME_FAILURE`, dừng trước dispatch, không `AIRequestLog`;
- Admin Stage 1 success + Stage 2 vượt budget → giữ đúng Stage 1 SUCCESS log, không Stage 2 attempt/log, không `analysisRef`.

Capacity profile phải version/bind tối thiểu với contract, model, tokenizer và prompt version theo task. Model/tokenizer/prompt thay đổi không được dùng lại profile cũ nếu chưa benchmark lại.

**Truy vết:** CR-002, XAI-001, AI-REQ-015/018/020..024, NFR-PERF-004/005.

### CR-002 / XAI-002 — Phân loại runtime/provider/integration failure

**Loại:** AI Governance / Error Handling / Logging  
**Đối tượng:** Backend, AI Runtime, UI

`AI_RUNTIME_FAILURE` là public error cho technical/provider failure không thuộc connection/timeout/empty/invalid-output semantics:

- protocol rejection `400/422` sau khi Backend đã build/validate request;
- Runtime auth/config `401/403`;
- Runtime `INFERENCE_FAILED`;
- unclassified technical `5xx` không phải unavailable;
- capacity-profile configuration mismatch trước dispatch.

Nếu attempt đã dispatch thì terminal path phải tạo `AIRequestLog.status=FAILED` với internal diagnostic thích hợp. Nếu failure được phát hiện trước dispatch thì không tạo `AIRequestLog`.

Không map các failure trên thành `AI_INVALID_STRUCTURE` nếu chưa nhận một AI output để validate, và không dùng `AI_CONNECTION_FAILURE` như catch-all.

**Truy vết:** CR-002, XAI-002, AI-REQ-015..019, NFR-LOG-001..004.

## 4.6. Dữ liệu và phạm vi MVP

### BR-022 – Course và Topic của MVP sử dụng seed data nội bộ

**Loại:** Scope Constraint  
**Đối tượng:** Backend, Database

**Rule**

- Course/Topic được dự án quản lý dưới dạng seed data;
- không tích hợp LMS hoặc API nội dung bên ngoài trong MVP;
- Topic dùng trong StudyTask phải tham chiếu dữ liệu seed hợp lệ.

**Truy vết:** AS-01, DATA-REQ-013, OD-11.

---

### BR-031 – Backend/database dùng UTC; API trao đổi thời gian theo ISO 8601

**Loại:** Data Integrity  
**Đối tượng:** Frontend, Backend, Database

**Rule**

- mọi timestamp lưu ở backend/database sử dụng UTC;
- API truyền thời gian theo ISO 8601;
- frontend chịu trách nhiệm chuyển sang local time khi hiển thị.

**Áp dụng cho**

- `createdAt`;
- `evaluatedAt`;
- `startDate`;
- `endDate`;
- `dueDate`;
- `completedAt`;
- thời điểm AIRequestLog;
- thời điểm tạo report/feedback.

**Truy vết:** DATA-REQ-003, DB-REQ-005, OD-22.

---

### BR-033 – MVP sử dụng một Course chính cho toàn bộ luồng demo

**Loại:** Scope Constraint  
**Đối tượng:** Student, Teacher, Backend, Database

**Rule**

- toàn bộ Topic và AssessmentResult dùng trong ba luồng demo thuộc một Course chính;
- không có chức năng chọn/chuyển Course;
- Class không cần `courseId` chỉ để phục vụ MVP;
- business logic không được giả định có nhiều Course đang hoạt động trong luồng demo hiện tại.

**Truy vết:** AS-08, OD-24.

---

# 5. Decision Tables quan trọng

## 5.1. Phân loại kết quả học tập

| Score | Trạng thái Student | Có thể làm Weak Topic nếu là averageScore? |
|---:|---|---|
| `80 <= score <= 100` | Tốt | Không |
| `60 <= score < 80` | Cần củng cố | Không |
| `0 <= score < 60` | Cần ưu tiên | Có, nếu `averageScore < 60` |

---

## 5.2. Xác định Student Needs Attention

| averageScore | completionRate | overdueTaskCount | Kết quả |
|---|---|---:|---|
| `< 60` | bất kỳ | bất kỳ | Needs Attention |
| N/A hoặc `>= 60` | `< 50%` | bất kỳ | Needs Attention |
| N/A hoặc `>= 60` | N/A hoặc `>= 50%` | `>= 2` | Needs Attention |
| N/A/`>= 60` | N/A/`>= 50%` | `< 2` | Không bị đánh dấu bởi rule này |

Lưu ý: N/A không được đổi thành `0` để ép rule kích hoạt.

---

## 5.3. Cảnh báo tiến độ Student

| Điều kiện | Kết quả |
|---|---|
| `actualProgress < expectedProgress - 20` | Chậm tiến độ / Progress Warning |
| `actualProgress >= expectedProgress - 20` | Không cảnh báo chậm theo rule này |
| Plan đã quá `endDate` | Không gọi AI adjustment; Student tạo plan mới nếu cần deadline mới |

---

## 5.4. Vòng đời StudyPlan

| Tình huống | Trạng thái plan |
|---|---|
| Student vừa chấp nhận plan hợp lệ | ACTIVE |
| Tất cả StudyTask hoàn thành | COMPLETED |
| Undo một task của plan hiện tại COMPLETED | ACTIVE |
| Student áp dụng plan mới | Plan cũ → ARCHIVED; plan mới → ACTIVE |
| `endDate` đã qua nhưng còn TODO | Giữ ACTIVE |
| ARCHIVED | Read-only |

---

## 5.5. Vòng đời StudyTask

| Hành động | Trước | Sau | completedAt |
|---|---|---|---|
| Mark complete | TODO | COMPLETED | `now` |
| Undo | COMPLETED | TODO | `null` |

Phân loại theo deadline:

- overdue = `TODO` và `dueDate < now`;
- near due = `TODO` và `now < dueDate <= now + 48h`;
- tại `dueDate = now`, task không thuộc hai nhóm trên nhưng đã được tính vào `tasksDueByNow` cho `expectedProgress`.

---

## 5.6. Quyết định có gọi AI hay không

| Tính năng | Dữ liệu tối thiểu thiếu | Hành vi |
|---|---|---|
| Student analysis | Không có AssessmentResult | Không gọi AI; `INSUFFICIENT_DATA` |
| Generate StudyPlan | Không có AssessmentResult hoặc Topic list rỗng | Không gọi AI; `INSUFFICIENT_DATA` |
| Teacher class analysis | Không có AssessmentResult hợp lệ **và** không có Student nào có current StudyPlan chứa ít nhất một StudyTask | Không gọi AI; `INSUFFICIENT_DATA` *(OD-33)* |
| Admin feedback analysis | Tập feedback sau filter rỗng | Không gọi AI; `INSUFFICIENT_DATA` |
| StudyPlan adjustment | Không có StudyPlan hiện tại | Không gọi AI; hướng Student tạo StudyPlan trước; không gộp thành `INSUFFICIENT_DATA` *(OD-40)* |
| StudyPlan adjustment | Plan đã quá `endDate` | Không gọi AI adjustment; hướng Student tạo plan mới; không gộp thành `INSUFFICIENT_DATA` *(OD-40)* |
| StudyPlan adjustment | Không còn StudyTask `TODO` | Không gọi AI; thông báo không còn nhiệm vụ cần điều chỉnh *(OD-40)* |

---

# 6. Ma trận trách nhiệm Backend – AI – User

| Nghiệp vụ | Backend | AI | User |
|---|:---:|:---:|:---:|
| Xác thực/phân quyền | ✓ | – | Cung cấp thông tin đăng nhập |
| Query database | ✓ | – | – |
| Tính score/tỷ lệ/số lượng | ✓ | – | – |
| Kiểm tra threshold/rule | ✓ | – | – |
| Phân tích/giải thích dữ liệu | Chuẩn bị input + validate output | ✓ (AI Service/Runtime) | Xem kết quả |
| Tạo StudyPlan đề xuất | Validate contract | ✓ | Chấp nhận/từ chối |
| Lưu StudyPlan/StudyTask | ✓ | – | Xác nhận |
| Điều chỉnh StudyTask | Validate + cập nhật sau xác nhận | Đề xuất | Chấp nhận/từ chối |
| Class analysis | Tổng hợp metric + rule | Phân tích | Teacher quyết định sử dụng |
| Feedback statistics | ✓ | – | Admin xem |
| Feedback issue grouping | Validate IDs + tính count | Nhóm vấn đề | Admin xem |
| Thay đổi trực tiếp database | ✓ khi nghiệp vụ cho phép | Không | Thông qua hành động UI hợp lệ |

---

# 7. Ma trận truy vết

## 7.1. BR → Resolved Decision / Proposed Decision

| Business Rule | Decision liên quan |
|---|---|
| BR-016 | OD-01, OD-14 |
| BR-017 | OD-02, OD-04, OD-35 |
| BR-018 | OD-03, OD-35 |
| BR-019 | OD-05, OD-30 |
| BR-020 | OD-06 |
| BR-021 | OD-12 |
| BR-022 | OD-11 |
| BR-024 | OD-16 |
| BR-025 | OD-17 |
| BR-026 | OD-18, OD-35, OD-36 |
| BR-027 | OD-04, OD-18, OD-35, OD-39 |
| BR-028 | OD-19, OD-40 |
| BR-029 | OD-20, OD-37 |
| BR-030 | OD-21 |
| BR-031 | OD-22 |
| BR-032 | OD-23 |
| BR-033 | OD-24 |
| BR-034 | OD-25 |
| BR-035 | OD-26, OD-33, OD-40 |
| BR-036 | OD-27 |
| BR-037 | OD-28, OD-29 |
| BR-038 | OD-30 |
| BR-039 | OD-31, OD-38 |
| BR-040 | OD-32 |
| BR-041 | OD-41 |
| BR-042 | OD-42 |
| BR-043 | OD-34, OD-43 |
| BR-044 | OD-21, OD-44 |
| BR-045 | OD-45 |
| BR-046 | OD-46 |
| BR-015 | OD-13, OD-34 |

Các `OD-33` đến `OD-46` đã được đồng bộ và chốt trong SRS v1.6 Baseline Final.

## 7.2. BR → FR → Use Case ưu tiên

| Business Rule | Functional Requirement chính | Use Case liên quan |
|---|---|---|
| BR-001 | FR-COM-003, FR-STU-002/006/007 | UC-STU-002/006/007 |
| BR-002 | FR-TEA-001/002/007/008 | UC-TEA-001/002/007/008 |
| BR-005 | FR-STU-005/006 | UC-STU-005/006 |
| BR-006 | FR-STU-009 | UC-STU-009 |
| BR-007 | FR-TEA-005/006/007 | UC-TEA-005/006/007 |
| BR-008 | FR-ADM-004/005/006 | UC-ADM-004/005/006 |
| BR-013, BR-014 | FR-FB-001, FR-ADM-003/004 | UC-FB-001, UC-ADM-003/004 |
| BR-015 | FR-ADM-004 | UC-ADM-004 |
| BR-016 | FR-STU-002, FR-TEA-004 | UC-STU-002, UC-TEA-003/005 |
| BR-017 | FR-STU-001/008/009, FR-TEA-004 | UC-STU-001/008/009, UC-TEA-003/005 |
| BR-018 | FR-TEA-004 | UC-TEA-003/005 |
| BR-019, BR-038 | FR-TEA-002 | UC-TEA-002 |
| BR-020, BR-032, BR-040 | FR-ADM-002, FR-COM-001/002 | UC-ADM-002, UC-COM-001/002 |
| BR-021, BR-024, BR-025, BR-027, BR-034, BR-036 | FR-STU-005/006/007/008/009 | UC-STU-005/006/007/008/009 |
| BR-037 | FR-STU-003/005 | UC-STU-003/005 |
| BR-026 | FR-TEA-002/003/004/005 | UC-TEA-002/003/005 |
| BR-028 | FR-STU-009 | UC-STU-009 |
| BR-029 | FR-ADM-001 | UC-ADM-001 |
| BR-030 | FR-TEA-007/008, FR-ADM-006/007 | UC-TEA-007/008, UC-ADM-006/007 |
| BR-035 | FR-STU-004/005/009, FR-TEA-005, FR-ADM-004 | UC-STU-004/005/009, UC-TEA-005, UC-ADM-004 |
| BR-041 | FR-STU-004 | UC-STU-004 |
| BR-042 | FR-ADM-004/005 | UC-ADM-004/005 |
| BR-043 | FR-ADM-004/005 | UC-ADM-004/005 |
| BR-044 | FR-TEA-007, FR-ADM-006 | UC-TEA-007, UC-ADM-006 |
| BR-045 | FR-TEA-008 | UC-TEA-008 |
| BR-046 | FR-ADM-007 | UC-ADM-007 |

Các BR xuyên suốt như BR-003, BR-004, BR-009, BR-010, BR-011, BR-012, BR-023, BR-031, BR-033 và BR-039 tiếp tục được truy vết qua nhóm FR/AI-REQ/DATA-REQ tương ứng thay vì tạo Use Case độc lập.

---

# 8. Quy tắc kiểm thử Business Rules

Mỗi Business Rule khi chuyển thành Test Case nên có tối thiểu:

1. **Positive case** – dữ liệu hợp lệ, rule được thỏa.
2. **Negative case** – thử vi phạm rule.
3. **Boundary case** – kiểm tra đúng tại ngưỡng nếu rule có số liệu.
4. **Permission case** – nếu rule liên quan role/ownership.
5. **Persistence case** – kiểm tra database chỉ thay đổi khi điều kiện cho phép.
6. **AI failure/invalid output case** – nếu rule liên quan AI.

Các boundary quan trọng cần test chính xác:

| Rule | Boundary cần test |
|---|---|
| BR-005 | Preview hợp lệ lúc tạo nhưng `targetDeadline <= applyTime`; task `dueDate < applyTime`; validation fail phải không archive plan cũ và không tạo plan/task mới |
| BR-016 | `59`, `59.9`, `60`, `79`, `79.9`, `80`, `0`, `100`, ngoài 0–100 |
| BR-017 | chênh lệch đúng `20`, vừa lớn hơn `20` điểm phần trăm và giá trị thập phân trước/sau rounding |
| BR-018 | `averageScore = 60`, `59.8`, `completionRate = 50%`, `49.8%`, `overdueTaskCount = 2` |
| BR-026 | Student/Class không có plan; class overdue count bằng tổng Student overdue count; dữ liệu score thiếu không thành 0 |
| BR-027 | không có plan → N/A; có plan 0 task → 0; tỷ lệ `49.9%`, `50%`; completionRate bằng actualProgress |
| BR-029 | Dashboard tính cả ACTIVE/DISABLED; toàn thời gian; success/connection failure/timeout đều làm tăng `totalAIRequests` nếu external call đã được attempt; `INSUFFICIENT_DATA`/business ineligible/validation trước AI không làm tăng count |
| BR-015 | feedbackId hợp lệ, feedbackId ngoài input, duplicate trong cùng issueGroup, duplicate giữa hai issueGroup, group rỗng sau deduplicate |
| BR-025 | `dueDate < now`, `dueDate = now`, `dueDate = now + 48h`, `dueDate > now + 48h` |
| BR-031 | UTC storage và local display |
| BR-035 | Student/Admin dữ liệu rỗng; Teacher không có score nhưng có/không có current StudyPlan + StudyTask theo OD-33; adjustment khi không có current plan, plan quá hạn, hoặc không còn task TODO theo OD-40 |
| BR-037 | goal rỗng/sau trim; `availableHoursPerWeek <= 0`; `targetDeadline <= now`; chuẩn hóa giờ → phút |
| BR-039 | email đã tồn tại; khác hoa/thường; có khoảng trắng đầu/cuối |
| BR-040 | target user chính là Admin đang đăng nhập |
| BR-041 | có AssessmentResult + không goal vẫn gọi FR-STU-004; không AssessmentResult → `INSUFFICIENT_DATA` |
| BR-042 | stage 1 success → backend validate → stage 2; mỗi external attempt có log; stage 1 fail thì không chạy stage 2 |
| BR-043 | dataset không rỗng + issueGroups `[]` sau dedup vẫn chạy stage 2; dataset rỗng mới `INSUFFICIENT_DATA` |
| BR-044 | client sửa snapshot/result trước Save không làm thay đổi dữ liệu lưu; reference sai/hết hiệu lực bị từ chối; Save không dùng live data thay snapshot |
| BR-045 | Teacher list/detail report đúng/sai Class; report snapshot khác dữ liệu live; history không tạo AIRequestLog |
| BR-046 | Admin list/detail FeedbackAnalysis; feedback live thay đổi không làm history đổi; history không tạo AIRequestLog |

---

# 9. Những nội dung không được đưa thành Business Rule mới ở MVP

Các nội dung sau chưa cần tạo rule nghiệp vụ mới nếu chưa có thay đổi SRS:

- model AI cụ thể;
- prompt wording cụ thể;
- API route/path cụ thể;
- UI layout, màu sắc, biểu đồ;
- notification/email;
- active user tracking;
- trend/history analytics ngoài việc list/detail hai loại analysis đã lưu;
- thêm status `EXPIRED` cho StudyPlan;
- AI tự thêm/xóa StudyTask khi adjustment;
- AI tự đổi Feedback tag;
- Teacher chỉnh StudyPlan của Student;
- Admin reply feedback hoặc ticket workflow.

Nếu các nội dung ngoài phạm vi này được đưa vào scope ở phiên bản sau, SRS/Resolved Decision phải được cập nhật trước, sau đó mới bổ sung Business Rules tương ứng. Các OD-33 đến OD-46 trong tài liệu này hiện đã là quyết định chính thức theo SRS v1.6 Baseline Final.

---

# 10. Kết luận

Business Rules của MVP xoay quanh bốn nguyên tắc cốt lõi:

1. **Quyền truy cập được kiểm soát ở backend** theo role và quyền sở hữu tài nguyên.
2. **Số liệu chính xác do backend tính**, AI không phải nguồn chuẩn cho score, count, tỷ lệ hay progress.
3. **AI chỉ hỗ trợ phân tích và đề xuất**, mọi thay đổi quan trọng cần con người xác nhận.
4. **Trạng thái dữ liệu phải nhất quán**, kể cả khi AI lỗi, user bị disable, plan thay đổi hoặc dữ liệu không đủ để phân tích.

Các quy tắc `BR-001` đến `BR-046` bám SRS v1.6 Baseline Final. Phiên bản **1.3 Baseline** kế thừa v1.2 Baseline và bổ sung `BR-045/046` theo `OD-45/46` để kiểm soát quyền và snapshot semantics của hai chức năng lịch sử phân tích AI.

Business Rules v1.4 Baseline đã đồng bộ các quyết định OD-41 đến OD-46 vào SRS v1.6 Baseline Final; không còn proposed decision mở trong phạm vi các rule này.

---

# 11. Lịch sử phiên bản

| Phiên bản | Ngày | Nội dung |
|---|---|---|
| 1.0 Detailed Baseline | 20/10/2026 | Khởi tạo Business Rules chi tiết từ SRS v1.4 |
| 1.1 Draft | 20/10/2026 | Bổ sung document authority; chi tiết Teacher metric; làm rõ dueDate boundary; mở rộng traceability; bổ sung proposed decisions cho minimum Teacher AI data, duplicate feedback issue group và metric rounding |
| 1.1 Draft – Revision 2 | 20/10/2026 | Sửa duplicate feedback theo hướng deterministic deduplicate; bổ sung class overdue metric, Admin dashboard semantics, email normalization, validation mục tiêu/khả năng học và các boundary test tương ứng |
| 1.1 Draft – Revision 3 | 20/10/2026 | Tách INSUFFICIENT_DATA khỏi adjustment ineligible; bổ sung completionRate và AI adjustment eligibility; sửa score/rounding boundary; deduplicate nội bộ issue group; chuẩn hóa AI Service/AI Runtime |
| 1.1 Draft – Revision 4 | 20/10/2026 | Revalidate StudyPlan tại thời điểm Apply; bổ sung trường hợp không có current StudyPlan cho AI adjustment; định nghĩa totalAIRequests theo external AI call attempt; cập nhật decision table và boundary test |
| 1.1 Baseline | 21/10/2026 | Phát hành baseline sau khi SRS v1.4 được chốt; chuyển OD-33 đến OD-40 thành quyết định chính thức; cập nhật document authority và trạng thái tài liệu, không thay đổi logic BR-001 đến BR-040 |
| 1.2 Baseline | 21/10/2026 | Đồng bộ SRS v1.4 Baseline; bổ sung OD-41 đến OD-44 và BR-041 đến BR-044 cho optional goal STU-004, Admin two-stage AI, empty issueGroups semantics và backend-controlled deferred Save |
| 1.2 Baseline Rev.1 | 21/10/2026 | Governance/traceability cleanup: cập nhật UCD source lên v1.3 Baseline Rev.1; xác định SRS là authority cao nhất; Scope v1.0 chuyển Historical/Superseded; không thay đổi BR-001..BR-044 |
| 1.3 Baseline Rev.1 | 21/10/2026 | Thực hiện CR-001: thêm OD-45/46, BR-045/046; trace FR/UC history; history read-only snapshot-based, không AI call |
| 1.4 Baseline Rev.1 | 26/10/2026 | Thực hiện CR-002: bổ sung cross-cutting capacity preflight/no-truncation và runtime technical failure semantics; đồng bộ `AI_INPUT_TOO_LARGE`, `AI_RUNTIME_FAILURE`, pre/post-dispatch AIRequestLog behavior với SRS v1.6 và API v1.5 |
