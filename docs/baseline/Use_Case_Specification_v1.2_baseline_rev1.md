# USE CASE SPECIFICATION
## Hệ thống hỗ trợ tự học ứng dụng AI

**Phiên bản:** 1.2 Baseline Rev.1  
**Ngày:** 26/10/2026  
**Phạm vi:** MVP phục vụ đồ án chuyên ngành  
**Nguồn chuẩn hiện hành:** SRS v1.6 Baseline Final  
**Nguồn mô hình Use Case:** Use Case Diagram v1.4 Baseline Rev.1  
**Nguồn quy tắc nghiệp vụ:** Business Rules v1.4 Baseline Rev.1  
**Nguồn phạm vi nền:** Đặc tả phạm vi chức năng nền tảng v1.0 — Historical / Superseded

---

# 1. Mục đích tài liệu

Tài liệu này đặc tả chi tiết các Use Case đã được mô hình hóa cho **Hệ thống hỗ trợ tự học ứng dụng AI**. Mục tiêu là chuyển các yêu cầu trong SRS và Business Rules thành các luồng tương tác đủ rõ để tiếp tục phát triển:

- Activity Diagram;
- Sequence Diagram;
- API Specification;
- UI/Wireframe;
- Test Case và Test Data;
- backlog triển khai.

Tài liệu không mở rộng phạm vi chức năng ngoài SRS hiện hành. Những hành vi nội bộ như phân quyền, xử lý lỗi AI, ghi AIRequestLog và phát hiện dữ liệu đáng chú ý của Teacher được gắn vào các Use Case liên quan, không tự tạo thành mục tiêu người dùng mới.

---

# 2. Phạm vi và nguyên tắc đặc tả

## 2.1. Tổng số Use Case

Tài liệu đặc tả **27 Use Case**:

| Nhóm | Số lượng |
|---|---:|
| Common | 3 |
| Student | 9 |
| Teacher | 7 |
| Administrator | 7 |
| Feedback dùng chung Student/Teacher | 1 |
| **Tổng** | **27** |

`FR-TEA-004 – Backend phát hiện dữ liệu đáng chú ý` vẫn thuộc phạm vi hệ thống nhưng **không có Use Case Specification độc lập**. Hành vi này được mô tả trong `UC-TEA-003` và `UC-TEA-005`.

## 2.2. Thứ tự ưu tiên nguồn

Khi có khác biệt về chi tiết, tài liệu này sử dụng thứ tự:

1. **SRS v1.6 Baseline** – nguồn chuẩn nghiệp vụ hiện hành.
2. **Use Case Diagram v1.4 Baseline Rev.1** – nguồn chuẩn về actor, boundary và quan hệ `include/extend`.
3. **Business Rules v1.4 Baseline Rev.1** – nguồn chi tiết cho điều kiện, ngưỡng, validation, AI governance, data integrity và state transition.
4. **Đặc tả phạm vi chức năng nền tảng v1.0** – nguồn định hướng lịch sử.

## 2.3. Quy ước actor

- **Student**: người học, chỉ thao tác dữ liệu học tập của chính mình.
- **Teacher**: giáo viên, chỉ truy cập Class được phân công và Student thuộc các Class đó.
- **Administrator**: quản trị viên, quản lý người dùng cơ bản và phân tích feedback.
- **AI Service**: actor hỗ trợ bên ngoài hệ thống; nhận input do NestJS chuẩn hóa và trả structured output. AI Service không truy cập PostgreSQL trực tiếp.
- **Người dùng** trong Use Case Diagram là actor trừu tượng dùng để gom hành vi chung, không phải vai trò thứ tư.

## 2.4. Quy ước luồng

- **Precondition** chỉ mô tả điều kiện phải đúng trước khi actor có thể bắt đầu Use Case. Các điều kiện dữ liệu/eligibility mà backend cần kiểm tra sau khi actor đã gửi yêu cầu phải nằm trong Main Flow và rẽ sang Alternate/Exception Flow khi không thỏa.
- **Main Flow** bắt đầu từ hành động của actor, sau đó mới đến kiểm tra quyền, dữ liệu, xử lý backend, AI nếu có và phản hồi cho actor.
- **Alternate Flow** mô tả biến thể nghiệp vụ hợp lệ, ví dụ `INSUFFICIENT_DATA`, business ineligible, người dùng từ chối preview hoặc dữ liệu rỗng theo điều kiện nghiệp vụ.
- **Exception Flow** mô tả lỗi/vi phạm như thiếu quyền, input sai validation, lỗi database, AI timeout hoặc structured output không hợp lệ.
- Mọi protected Use Case phải kiểm tra user/role/status tại backend; việc frontend ẩn menu không phải cơ chế phân quyền.
- Mọi timestamp ở backend/database dùng UTC; API trao đổi theo ISO 8601.
- Các phép tính chính xác như score status, average, progress, count, ratio và statistics do backend tính, không giao cho AI suy đoán.
- Phần **Business Rules / ràng buộc** ưu tiên tham chiếu mã rule và chỉ diễn giải lại phần trực tiếp ảnh hưởng flow; không sao chép toàn bộ Business Rules Specification vào từng Use Case.

## 2.5. Quy ước truyền dữ liệu giữa các Use Case

### Student goal/availability draft

Trong MVP, `goal`, `availableMinutesPerWeek` và `targetDeadline` của `UC-STU-003` không cần entity tạm riêng. Dữ liệu này có thể tồn tại như trạng thái tạm của luồng trên client/UI và được gửi lại trong request của Use Case AI liên quan; Use Case Specification **không bắt buộc một cơ chế lưu draft cụ thể ở frontend**. Mỗi request sử dụng dữ liệu phải được backend validate lại; không giả định dữ liệu còn hợp lệ chỉ vì đã được kiểm tra ở request trước. Chi tiết transport/state management thuộc UI/API Specification.

### Analysis context dùng cho Save

Để bảo đảm dữ liệu lưu đúng là snapshot/output của lần AI analysis đã được backend kiểm soát, backend duy trì **analysis context thuộc quyền sở hữu của backend** sau một lần phân tích thành công. Client chỉ giữ một **backend-controlled analysis reference** dạng opaque cùng dữ liệu cần hiển thị. Khi Teacher/Admin chọn Save, client gửi analysis reference; backend dùng reference này để lấy lại `inputSnapshot`, `analysisResult` đã validate và định danh tài nguyên tương ứng từ context của chính lần phân tích đó, kiểm tra quyền rồi mới lưu report/analysis. Backend **không nhận lại snapshot/result từ client như nguồn chuẩn để lưu**, và cũng **không truy vấn dữ liệu live để thay thế snapshot đã dùng cho AI**. Tên field API, cơ chế lưu context và thời gian sống được chốt ở API/System Design; Use Case Specification chỉ yêu cầu reference do backend kiểm soát, không tạo entity nghiệp vụ mới và không khóa tên field triển khai.

## 2.6. Quyết định nguồn đã được baseline hóa

Các điểm từng được Rev.4 đánh dấu là Resolved Decision/Resolved Source Decision đã được đồng bộ vào baseline hiện hành. Use Case Specification v1.2 Baseline Rev.1 sử dụng trực tiếp các nguồn sau:

| Nội dung | Nguồn chính thức |
|---|---|
| `goal` của UC-STU-004 là optional context; thiếu goal không gây `INSUFFICIENT_DATA` | OD-41, BR-041 |
| Admin feedback AI dùng two-stage external inference | OD-42, BR-042, AI-REQ-024 |
| `issueGroups = []` trên dataset không rỗng vẫn là kết quả hợp lệ và không chặn stage 2 | OD-43, BR-043 |
| Deferred Save dùng backend-controlled analysis context/reference | OD-44, BR-044, DATA-REQ-015 |
| Teacher history read semantics | OD-45, BR-045, FR-TEA-008 |
| Administrator history read semantics | OD-46, BR-046, FR-ADM-007 |

Từ phiên bản Baseline, các hành vi trên **không còn là quyết định cục bộ của Use Case Specification**.


---

# 3. Hành vi xuyên suốt

## 3.1. AUTH – Xác thực, trạng thái tài khoản và phân quyền

Áp dụng cho `UC-COM-004`, toàn bộ `UC-STU-*`, `UC-TEA-*`, `UC-ADM-*` và `UC-FB-001`:

1. Backend xác thực phiên/token.
2. Backend xác định User hiện tại.
3. Backend kiểm tra `User.status = ACTIVE`.
4. Backend kiểm tra role và quyền sở hữu/tài nguyên.
5. Chỉ khi các kiểm tra trên thành công mới tiếp tục nghiệp vụ.

Nếu User đã bị chuyển sang `DISABLED`, protected request bị từ chối kể cả khi client còn giữ token/phiên cũ.

## 3.2. AI-ERROR – Xử lý lỗi chung cho Use Case có gọi AI

Áp dụng cho `UC-STU-004`, `UC-STU-005`, `UC-STU-009`, `UC-TEA-005`, `UC-TEA-006`, `UC-ADM-004`, `UC-ADM-005`:

- Nếu request dừng **trước external AI call** do `INSUFFICIENT_DATA`, business ineligible hoặc input validation fail: không gọi AI và không tạo `AIRequestLog`.
- Nếu backend đã attempt external AI call thì mỗi attempt phải có `AIRequestLog`.
- Với quan hệ `UC-TEA-005 <<include>> UC-TEA-006`, Use Case Specification chỉ yêu cầu recommendation phải được tạo trong luồng phân tích lớp. **Số external AI request cụ thể không được chốt ở tài liệu này**; mỗi external attempt thực tế phải tạo `AIRequestLog` theo AI-REQ-018. Quyết định một hay nhiều request được chuyển sang AI Contract/API Specification hoặc một Resolved Decision riêng nếu cần khóa baseline.
- Với quan hệ `UC-ADM-005 <<include>> UC-ADM-004`, Theo `OD-42/BR-042`: MVP dùng two-stage external AI flow, với backend validation/deduplicate issueGroups nằm giữa hai stage. Đây là Resolved Decision cần được đồng bộ upstream trước Baseline; mỗi external attempt thực tế phải tạo `AIRequestLog` theo AI-REQ-018.
- Connection failure, timeout, runtime unavailable, empty response, invalid structure hoặc thiếu field bắt buộc đều được xem là AI failure.
- Output lỗi không được lưu như kết quả hợp lệ.
- Dữ liệu nghiệp vụ trước lỗi phải được giữ nguyên.
- UI nhận thông báo có thể hiểu và cho phép retry khi phù hợp.

## 3.3. AI-VALIDATE – Structured output

Đối với output AI dùng cho nghiệp vụ, backend phải kiểm tra tối thiểu:

- parse được JSON/structured output;
- đủ field bắt buộc;
- đúng kiểu dữ liệu;
- enum/value nằm trong phạm vi cho phép;
- ID tham chiếu thuộc tập input hợp lệ khi Use Case yêu cầu.

## 3.4. Quy ước lỗi dùng trong đặc tả

| Mã SRS | Ý nghĩa | Hành vi chính |
|---|---|---|
| ERR-001 | Invalid Credentials | Từ chối đăng nhập, cho nhập lại |
| ERR-002 | Disabled Account | Từ chối login/protected request |
| ERR-003 | Forbidden Resource | Từ chối truy cập, không trả dữ liệu |
| ERR-004 | Invalid Input | Không ghi DB, trả lỗi validation |
| ERR-005 | Database Failure | Rollback nếu có transaction, không để dữ liệu một phần |
| ERR-006..010 | AI failure | Log failed nếu đã attempt AI, giữ nguyên dữ liệu |
| ERR-011 | Insufficient Data for AI | Không gọi AI, không tạo AIRequestLog |

---

## 3.5. CR-002 — Quy ước capacity/runtime cho mọi AI Use Case

Sau khi một AI Use Case đã vượt qua authorization, input validation, minimum-data và business eligibility, Backend phải chạy capacity preflight trước external attempt.

- `capacityProfile` hợp lệ nhưng authoritative input vượt validated budget → trả `422 AI_INPUT_TOO_LARGE`, không external call và không `AIRequestLog`;
- capacity profile missing/malformed/binding mismatch → trả `502 AI_RUNTIME_FAILURE`, không external call và không `AIRequestLog`;
- không truncate, sampling, page-limit, hidden chunking hoặc pre-summarize authoritative input để biến case fail thành success;
- runtime/provider technical failure sau dispatch → `502 AI_RUNTIME_FAILURE`, external attempt được log FAILED với internal diagnostic;
- network/unavailable, timeout, empty response, invalid/incomplete output tiếp tục giữ error semantics hiện hành.

Đối với Admin two-stage: nếu Stage 1 đã success nhưng Stage 2 bị capacity preflight reject thì không chạy Stage 2, không tạo `analysisRef`, chỉ giữ SUCCESS log của Stage 1.

Các quy tắc này là cross-cutting exception/alternate behavior; không tạo Use Case actor-facing mới và không thay quan hệ include/extend.

---

# 4. Danh mục và quan hệ Use Case

| Use Case | Tên | Actor chính | Quan hệ đáng chú ý |
|---|---|---|---|
| UC-COM-001 | Đăng nhập | Student/Teacher/Administrator | – |
| UC-COM-002 | Đăng xuất | Student/Teacher/Administrator | – |
| UC-COM-004 | Xem hồ sơ cá nhân | Student/Teacher/Administrator | – |
| UC-STU-001 | Xem dashboard học tập | Student | – |
| UC-STU-002 | Xem kết quả theo chủ đề | Student | – |
| UC-STU-003 | Nhập mục tiêu và khả năng học | Student | – |
| UC-STU-004 | AI phân tích điểm mạnh/yếu | Student | AI Service |
| UC-STU-005 | AI tạo kế hoạch học tập | Student | AI Service; được UC-STU-006 mở rộng khi Apply |
| UC-STU-006 | Lưu và áp dụng kế hoạch | Student | `<<extend>> UC-STU-005` |
| UC-STU-007 | Quản lý nhiệm vụ | Student | – |
| UC-STU-008 | Theo dõi tiến độ | Student | Độc lập UC-STU-009 |
| UC-STU-009 | AI đề xuất điều chỉnh | Student | AI Service |
| UC-TEA-001 | Xem danh sách lớp | Teacher | – |
| UC-TEA-002 | Xem Student trong lớp | Teacher | – |
| UC-TEA-003 | Xem dashboard lớp | Teacher | chứa xử lý nội bộ FR-TEA-004 |
| UC-TEA-005 | AI phân tích tình hình lớp | Teacher | `<<include>> UC-TEA-006`; chứa FR-TEA-004 |
| UC-TEA-006 | AI đề xuất phương án hỗ trợ | Teacher qua UC-TEA-005 | Included UC, không khởi chạy độc lập trong MVP |
| UC-TEA-007 | Lưu báo cáo phân tích | Teacher | `<<extend>> UC-TEA-005` |
| UC-TEA-008 | Xem lịch sử phân tích AI của lớp | Teacher | – |
| UC-ADM-001 | Xem dashboard hệ thống | Administrator | – |
| UC-ADM-002 | Quản lý người dùng cơ bản | Administrator | – |
| UC-ADM-003 | Xem và lọc feedback | Administrator | – |
| UC-ADM-004 | AI phân tích và nhóm vấn đề | Administrator | AI Service |
| UC-ADM-005 | AI tóm tắt và đề xuất cải thiện | Administrator | `<<include>> UC-ADM-004` |
| UC-ADM-006 | Lưu kết quả phân tích | Administrator | `<<extend>> UC-ADM-005` |
| UC-ADM-007 | Xem lịch sử phân tích feedback | Administrator | – |
| UC-FB-001 | Gửi feedback | Student/Teacher | – |

---

# 5. Common Use Cases

## UC-COM-001 – Đăng nhập

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Student, Teacher, Administrator |
| **Supporting actor** | Không |
| **Mục tiêu** | Cho phép người dùng truy cập hệ thống bằng tài khoản hợp lệ và được chuyển đến khu vực đúng với role. |
| **Trigger** | Người dùng mở màn hình đăng nhập và gửi thông tin đăng nhập. |

### Tiền điều kiện
- Người dùng chưa cần có phiên đăng nhập hợp lệ.
- Sự tồn tại của tài khoản, credential và trạng thái `ACTIVE` được backend kiểm tra trong luồng đăng nhập, không phải điều kiện để Use Case được bắt đầu.

### Hậu điều kiện
**Khi thành công**
- Phiên/token phù hợp được tạo cho thiết bị hiện tại.
- Frontend có thông tin user cơ bản và role để điều hướng đến dashboard tương ứng.

**Bảo toàn khi không thành công / bị từ chối**
- Không tạo phiên đăng nhập nếu thông tin sai hoặc tài khoản `DISABLED`.
- Không tiết lộ dữ liệu tài khoản nhạy cảm qua thông báo lỗi.

### Luồng chính
1. Người dùng nhập thông tin đăng nhập.
2. Frontend gửi request đăng nhập tới NestJS Backend.
3. Backend chuẩn hóa thông tin định danh cần thiết, bao gồm email theo quy tắc trim/lowercase nếu dùng email.
4. Backend xác thực thông tin tài khoản.
5. Backend kiểm tra trạng thái tài khoản.
6. Backend xác định role.
7. Backend tạo phiên/token phù hợp.
8. Frontend nhận thông tin user cơ bản và role.
9. Frontend chuyển người dùng đến dashboard theo role.

### Luồng thay thế / ngoại lệ
**E1 – Sai thông tin đăng nhập**
- Backend từ chối request theo ERR-001.
- Không tạo phiên/token.
- UI cho phép người dùng nhập lại.

**E2 – Tài khoản DISABLED**
- Backend từ chối theo ERR-002.
- Không tạo phiên/token.
- UI hiển thị thông báo dễ hiểu.

**E3 – Lỗi server/database**
- Không tạo phiên không hoàn chỉnh.
- UI nhận lỗi chung phù hợp.

### Business Rules / ràng buộc
- BR-039: email được normalize và phải unique.
- BR-023: ẩn menu frontend không thay thế kiểm tra quyền backend.
- Tài khoản DISABLED không được đăng nhập.

### Dữ liệu vào
- Thông tin đăng nhập, tối thiểu gồm email/credential theo cơ chế authentication được triển khai.

### Dữ liệu ra
- Trạng thái đăng nhập.
- User cơ bản.
- Role.
- Thông tin xác thực cần thiết cho phiên làm việc.

### Truy vết yêu cầu
- FR-COM-001
- ERR-001, ERR-002
- BR-039

### Acceptance Criteria
- [ ] Tài khoản hợp lệ và ACTIVE đăng nhập được.
- [ ] Sai thông tin đăng nhập bị từ chối.
- [ ] Tài khoản DISABLED bị từ chối.
- [ ] Role được xác định đúng.
- [ ] Việc nhập trực tiếp URL role khác không tạo quyền truy cập.

## UC-COM-002 – Đăng xuất

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Student, Teacher, Administrator |
| **Supporting actor** | Không |
| **Mục tiêu** | Kết thúc phiên làm việc trên thiết bị hiện tại bằng cơ chế đơn giản phù hợp MVP. |
| **Trigger** | Người dùng chọn Đăng xuất. |

### Tiền điều kiện
- Người dùng đang có trạng thái đăng nhập trên thiết bị hiện tại.

### Hậu điều kiện
**Khi thành công**
- Thông tin xác thực/cookie dùng cho phiên hiện tại được loại bỏ theo cơ chế triển khai.
- Frontend xóa trạng thái user cục bộ và chuyển về màn hình đăng nhập.

**Bảo toàn khi không thành công / bị từ chối**
- Nếu thao tác phía server gặp lỗi, frontend vẫn không nên tiếp tục coi người dùng là đang đăng nhập cục bộ nếu cơ chế auth cho phép xóa credential phía client an toàn.

### Luồng chính
1. Người dùng chọn Đăng xuất.
2. Frontend/NestJS xóa cookie hoặc thông tin xác thực của phiên hiện tại theo cơ chế authentication.
3. Frontend xóa trạng thái user cục bộ.
4. Frontend chuyển người dùng về trang đăng nhập.

### Luồng thay thế / ngoại lệ
**A1 – MVP không có session management nâng cao**
- Không yêu cầu token blacklist hoặc quản lý nhiều phiên đăng nhập.
- Protected API vẫn kiểm tra token/phiên và `User.status` ở backend.

### Business Rules / ràng buộc
- BR-032: protected API phải từ chối tài khoản đã bị DISABLED kể cả còn token cũ.
- MVP không bắt buộc module session management phức tạp.

### Dữ liệu vào
- Hành động logout từ phiên hiện tại.

### Dữ liệu ra
- Trạng thái client đã logout; người dùng ở màn hình đăng nhập.

### Truy vết yêu cầu
- FR-COM-002
- BR-032
- ERR-002

### Acceptance Criteria
- [ ] Sau logout, ứng dụng trên thiết bị hiện tại không tiếp tục dùng phiên vừa logout để truy cập màn hình/API bảo vệ.
- [ ] Logout không yêu cầu hệ thống blacklist token phức tạp.

## UC-COM-004 – Xem hồ sơ cá nhân cơ bản

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Student, Teacher, Administrator |
| **Supporting actor** | Không |
| **Mục tiêu** | Cho phép user đăng nhập xem thông tin tài khoản cơ bản của chính mình. |
| **Trigger** | Người dùng mở trang Hồ sơ/Tài khoản. |

### Tiền điều kiện
- User đã xác thực.
- User có trạng thái `ACTIVE` tại thời điểm gọi protected API.

### Hậu điều kiện
**Khi thành công**
- Thông tin cơ bản của chính user hiện tại được hiển thị.

**Bảo toàn khi không thành công / bị từ chối**
- Không trả dữ liệu nếu phiên không hợp lệ, tài khoản DISABLED hoặc request trái quyền.

### Luồng chính
1. User mở trang Hồ sơ/Tài khoản.
2. Frontend gửi yêu cầu lấy dữ liệu hồ sơ của user hiện tại; Backend xác thực phiên/token và kiểm tra `User.status`.
3. Backend xác định `userId` từ phiên, không tin userId khác do client tự khai báo.
4. Backend truy vấn thông tin tài khoản cơ bản.
5. Backend trả `fullName`, `email`, `role`, `status`.
6. Frontend hiển thị read-only theo phạm vi MVP.

### Luồng thay thế / ngoại lệ
**E1 – Phiên không hợp lệ hoặc tài khoản DISABLED**
- Backend từ chối protected request.
- Nếu là DISABLED, frontend xóa trạng thái đăng nhập và chuyển về login khi nhận lỗi phù hợp.

### Business Rules / ràng buộc
- BR-012: kiểm tra quyền ở backend trước khi trả dữ liệu.
- BR-023: ẩn UI không phải authorization.
- BR-032: user DISABLED bị từ chối protected API.

### Dữ liệu vào
- Thông tin phiên/token hiện tại.

### Dữ liệu ra
- Họ tên.
- Email.
- Role.
- Trạng thái tài khoản.

### Truy vết yêu cầu
- FR-COM-003
- FR-COM-004
- BR-012, BR-023, BR-032

### Acceptance Criteria
- [ ] User đăng nhập xem được thông tin tài khoản của mình.
- [ ] Không mở rộng thành module chỉnh sửa hồ sơ phức tạp trong MVP.
- [ ] Backend không trả hồ sơ người khác chỉ vì client gửi ID khác.

---

# 6. Student Use Cases

## UC-STU-001 – Xem dashboard học tập

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Student |
| **Supporting actor** | Không |
| **Mục tiêu** | Hiển thị nhanh trạng thái học tập hiện tại từ dữ liệu thật do backend tính. |
| **Trigger** | Student mở dashboard học tập. |

### Tiền điều kiện
- Student đã xác thực và ACTIVE.

### Hậu điều kiện
**Khi thành công**
- Dashboard hiển thị dữ liệu học tập hiện tại của chính Student.
- Không thay đổi dữ liệu nghiệp vụ chỉ vì mở dashboard.

**Bảo toàn khi không thành công / bị từ chối**
- Không trả dữ liệu Student khác; lỗi truy vấn không làm thay đổi StudyPlan/StudyTask.

### Luồng chính
1. Student mở dashboard.
2. Backend xác định Student hiện tại từ phiên.
3. Backend lấy AssessmentResult mới nhất theo từng Student–Topic trong Course chính.
4. Backend lấy StudyPlan hiện tại nếu có và các StudyTask liên quan.
5. Backend tính completed/total tasks, actualProgress, expectedProgress, overdue task và near-due task.
6. Backend đánh giá cảnh báo chậm tiến độ trên giá trị gốc trước khi làm tròn.
7. Frontend hiển thị score theo Topic, plan hiện tại, progress, task gần hạn và cảnh báo nếu có.

### Luồng thay thế / ngoại lệ
**A1 – Student chưa có StudyPlan hiện tại**
- Dashboard vẫn hiển thị dữ liệu AssessmentResult nếu có.
- Các metric phụ thuộc plan được hiển thị theo quy ước N/A/null phù hợp; các count có quy ước riêng giữ đúng định nghĩa.

**A2 – Plan đã quá endDate nhưng còn TODO**
- Plan vẫn giữ `ACTIVE` trong MVP.
- Task TODO quá hạn tiếp tục được tính overdue.
- Dashboard không tự tạo trạng thái EXPIRED.

### Business Rules / ràng buộc
- BR-001: chỉ dữ liệu của chính Student.
- BR-009: backend tính metric chính xác.
- BR-017: chậm tiến độ khi `actualProgress < expectedProgress - 20` điểm phần trăm.
- BR-025: near-due/overdue theo dueDate và status TODO.
- BR-027: completion rate/progress chỉ trên StudyPlan hiện tại.
- BR-034: dùng AssessmentResult mới nhất theo Student–Topic.
- BR-036: plan quá endDate nhưng còn TODO vẫn ACTIVE.

### Dữ liệu vào
- Student hiện tại từ phiên.
- AssessmentResult, StudyPlan, StudyTask liên quan.

### Dữ liệu ra
- Score theo Topic.
- StudyPlan hiện tại nếu có.
- completedTasks/totalTasks.
- actualProgress/expectedProgress.
- near-due/overdue tasks.
- cảnh báo chậm tiến độ.

### Truy vết yêu cầu
- FR-STU-001
- FR-COM-003
- BR-001, BR-009, BR-017, BR-025, BR-027, BR-034, BR-036

### Acceptance Criteria
- [ ] Dashboard không cần gọi AI để hiển thị số liệu cơ bản.
- [ ] Số liệu được backend tính từ dữ liệu thật.
- [ ] Cảnh báo chậm tiến độ đúng ngưỡng 20 điểm phần trăm.
- [ ] Student không xem dữ liệu Student khác.

## UC-STU-002 – Xem kết quả học tập theo chủ đề

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Student |
| **Supporting actor** | Không |
| **Mục tiêu** | Cho Student xem kết quả hiện tại của từng Topic và trạng thái đánh giá tương ứng. |
| **Trigger** | Student mở trang Kết quả học tập. |

### Tiền điều kiện
- Student đã xác thực và ACTIVE.

### Hậu điều kiện
**Khi thành công**
- Mỗi Topic có dữ liệu hiển thị tối đa một AssessmentResult hiện tại – bản ghi mới nhất theo `evaluatedAt`.

**Bảo toàn khi không thành công / bị từ chối**
- Không thay đổi AssessmentResult; không trả dữ liệu Student khác.

### Luồng chính
1. Student mở trang kết quả.
2. Backend xác định Student hiện tại.
3. Backend truy vấn AssessmentResult của Student trong Course chính MVP.
4. Với mỗi Topic, backend chọn bản ghi có `evaluatedAt` mới nhất.
5. Backend kiểm tra score trong thang 0–100.
6. Backend gán trạng thái: Tốt / Cần củng cố / Cần ưu tiên theo ngưỡng đã chốt.
7. Frontend hiển thị Topic, score, evaluatedAt và trạng thái.

### Luồng thay thế / ngoại lệ
**A1 – Topic chưa có AssessmentResult**
- Topic không có dữ liệu không bị tự gán score 0.
- MVP không bắt buộc hiển thị lịch sử/trend.

### Business Rules / ràng buộc
- BR-001: Student chỉ xem dữ liệu mình.
- BR-016: `score >= 80` Tốt; `60 <= score < 80` Cần củng cố; `< 60` Cần ưu tiên.
- BR-034: sử dụng AssessmentResult mới nhất theo Student–Topic.

### Dữ liệu vào
- Student hiện tại.
- AssessmentResult trong Course chính.

### Dữ liệu ra
- Topic, score, evaluatedAt, status hiện tại.

### Truy vết yêu cầu
- FR-STU-002
- DATA-REQ-008, DATA-REQ-010
- BR-001, BR-016, BR-034

### Acceptance Criteria
- [ ] Student không xem được AssessmentResult của người khác.
- [ ] Score nằm trong 0–100.
- [ ] Trạng thái hiển thị đúng ngưỡng.
- [ ] Mỗi Student/Topic chỉ dùng kết quả mới nhất cho trạng thái hiện tại.

## UC-STU-003 – Nhập mục tiêu và khả năng học

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Student |
| **Supporting actor** | Không |
| **Mục tiêu** | Thu thập mục tiêu, thời lượng học khả dụng và deadline để dùng cho các luồng AI Student. |
| **Trigger** | Student mở form mục tiêu/khả năng học và gửi dữ liệu. |

### Tiền điều kiện
- Student đã xác thực và ACTIVE.

### Hậu điều kiện
**Khi thành công**
- Backend trả bộ dữ liệu đã validate/chuẩn hóa để tiếp tục dùng trong luồng Student.
- Nếu plan sau đó được Student áp dụng, `availableMinutesPerWeek` và `targetDeadline` được lưu cùng StudyPlan; nếu không áp dụng thì không bắt buộc có entity riêng.

**Bảo toàn khi không thành công / bị từ chối**
- Dữ liệu invalid không được dùng để gọi AI hoặc ghi thành StudyPlan.

### Quan hệ Use Case
- Dữ liệu từ Use Case này có thể được dùng bởi `UC-STU-004` và được dùng bắt buộc bởi `UC-STU-005`.
- Không tạo quan hệ `include/extend` chỉ để thể hiện việc truyền dữ liệu.

### Luồng chính
1. Student nhập mục tiêu học tập, `availableHoursPerWeek` và `targetDeadline`, sau đó chọn tiếp tục.
2. Frontend validate cơ bản và gửi request tới Backend.
3. Backend trim/validate mục tiêu không rỗng.
4. Backend kiểm tra `availableHoursPerWeek > 0`.
5. Backend kiểm tra `targetDeadline` nằm sau thời điểm xử lý request.
6. Backend chuyển thành `availableMinutesPerWeek = availableHoursPerWeek × 60`.
7. Backend trả `goal`, `availableMinutesPerWeek` và `targetDeadline` đã chuẩn hóa.
8. Luồng phía client/UI có thể giữ dữ liệu này như trạng thái tạm; không cần tạo entity nghiệp vụ riêng chỉ để lưu draft.
9. Khi gọi `UC-STU-004` hoặc `UC-STU-005`, request gửi lại các field cần thiết và backend validate lại ở request mới.

### Luồng thay thế / ngoại lệ
**E1 – Input không hợp lệ**
- Backend trả ERR-004.
- Không gọi AI.
- Không coi đây là `INSUFFICIENT_DATA`.

### Business Rules / ràng buộc
- BR-037: goal do Student cung cấp; thời lượng > 0; deadline ở tương lai trước khi gọi AI.
- MVP không cần entity LearningPreference/StudyAvailability riêng.
- Trạng thái tạm phía client/UI không thay thế validation backend tại request AI/Apply sau đó.

### Dữ liệu vào
- Mục tiêu học tập.
- availableHoursPerWeek.
- targetDeadline.

### Dữ liệu ra
- Mục tiêu đã validate.
- availableMinutesPerWeek.
- targetDeadline hợp lệ.

### Truy vết yêu cầu
- FR-STU-003
- DATA-REQ-005
- BR-037

### Acceptance Criteria
- [ ] Goal sau trim không rỗng.
- [ ] availableHoursPerWeek > 0.
- [ ] targetDeadline ở tương lai.
- [ ] Không tạo entity preference riêng chỉ để lưu tạm dữ liệu này.
- [ ] Request của Use Case AI liên quan gửi lại dữ liệu cần thiết và backend validate lại.

## UC-STU-004 – Phân tích điểm mạnh và điểm yếu bằng AI

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Student |
| **Supporting actor** | AI Service |
| **Mục tiêu** | Giải thích kết quả học tập hiện tại và chỉ ra điểm mạnh, khu vực cần cải thiện và Topic ưu tiên dựa trên dữ liệu backend cung cấp. |
| **Trigger** | Student chọn Phân tích bằng AI. |

### Tiền điều kiện
- Student đã xác thực và ACTIVE.

### Hậu điều kiện
**Khi thành công**
- Student nhận structured analysis hợp lệ gồm strengths, areasToImprove, priorityTopics và reasons.
- AIRequestLog phản ánh external AI attempt nếu đã thực sự gọi AI.

**Bảo toàn khi không thành công / bị từ chối**
- Không sửa score/AssessmentResult/StudyPlan/StudyTask.
- AI lỗi hoặc output invalid không được hiển thị/lưu như kết quả thành công.

### Quan hệ Use Case
- Theo OD-41/BR-041, `goal` là optional context của UC-STU-004. Nếu Student có AssessmentResult hợp lệ nhưng chưa có `goal`, backend vẫn được gọi AI; thiếu goal không tạo `INSUFFICIENT_DATA`.
- `UC-STU-004` không phải dependency bắt buộc của `UC-STU-005`.

### Luồng chính
1. Student chọn Phân tích bằng AI và gửi dữ liệu mục tiêu hiện có nếu luồng hiện tại có cung cấp.
2. Backend xác định Student và kiểm tra quyền.
3. Backend lấy AssessmentResult mới nhất theo từng Topic và progress hiện tại nếu có; goal được xử lý theo input contract hiện hành của FR-STU-004 mà không tạo thêm điều kiện `INSUFFICIENT_DATA` ngoài SRS.
4. Backend kiểm tra dữ liệu tối thiểu cho phân tích.
5. Backend chuẩn hóa và chỉ gửi dữ liệu cần thiết sang AI Service.
6. AI Service trả structured output.
7. Backend validate schema và bảo đảm AI không trở thành nguồn score/statistics.
8. Backend ghi AIRequestLog cho external attempt.
9. Frontend hiển thị strengths, areasToImprove, priorityTopics và reasons.

### Luồng thay thế / ngoại lệ
**A1 – Không có AssessmentResult**
- Backend trả `INSUFFICIENT_DATA`.
- Không gọi AI Service.
- Không tạo AIRequestLog.
- UI hướng dẫn Student cần có dữ liệu đánh giá trước.

**E1 – AI unavailable/timeout**
- Áp dụng AI-ERROR.
- Ghi AIRequestLog failed nếu external call đã bắt đầu.
- Giữ nguyên dữ liệu Student.

**E2 – Output AI rỗng/sai cấu trúc/thiếu field**
- Backend từ chối output theo AI-VALIDATE.
- Không hiển thị như kết quả thành công.
- Không làm thay đổi dữ liệu nghiệp vụ.

### Business Rules / ràng buộc
- BR-001: chỉ dữ liệu Student hiện tại.
- BR-004/BR-009: AI không tự tạo score/statistics; backend là nguồn số liệu chính xác.
- BR-010/BR-011: lỗi AI giữ nguyên trạng thái; AI không truy cập PostgreSQL trực tiếp.
- BR-034: dùng latest AssessmentResult.
- BR-035: kiểm tra dữ liệu tối thiểu trước inference.
- OD-41/BR-041: minimum-data của UC-STU-004 là AssessmentResult; `goal` là optional context và thiếu goal không tạo `INSUFFICIENT_DATA`.

### Dữ liệu vào
- AssessmentResult mới nhất theo Topic — dữ liệu minimum-data bắt buộc theo SRS.
- Goal — theo input FR-STU-004 khi có trong ngữ cảnh/request hiện tại; tài liệu này không tạo thêm failure rule riêng nếu field này không có.
- Progress hiện tại — nếu có current StudyPlan.

### Dữ liệu ra
- strengths.
- areasToImprove.
- priorityTopics.
- reasons.
- AIRequestLog metadata cho external attempt.

### Truy vết yêu cầu
- FR-STU-004
- FR-COM-005, FR-COM-006
- AI-REQ-001..010, AI-REQ-015..018, AI-REQ-023
- BR-001, BR-004, BR-009, BR-010, BR-011, BR-034, BR-035
- BR-041
- OD-41

### Acceptance Criteria
- [ ] Không có AssessmentResult thì trả `INSUFFICIENT_DATA`, không gọi AI và không tạo `AIRequestLog`.
- [ ] Theo BR-041/OD-41, thiếu `goal` không tạo `INSUFFICIENT_DATA` nếu Student có AssessmentResult hợp lệ.
- [ ] AI chỉ sử dụng score do backend cung cấp.
- [ ] Output sai schema không được coi là thành công.
- [ ] AI failure không làm thay đổi dữ liệu nghiệp vụ.

## UC-STU-005 – Tạo kế hoạch học tập cá nhân hóa bằng AI

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Student |
| **Supporting actor** | AI Service |
| **Mục tiêu** | Tạo một StudyPlan preview có cấu trúc và các StudyTask đủ dữ liệu để Student xem, chỉnh các trường được phép và quyết định Áp dụng/Từ chối. |
| **Trigger** | Student yêu cầu AI tạo kế hoạch học tập. |

### Tiền điều kiện
- Student đã xác thực và ACTIVE.

### Hậu điều kiện
**Khi thành công**
- Có plan preview hợp lệ để Student xem và chỉnh các trường cho phép.
- Student đã đưa ra quyết định Áp dụng hoặc Từ chối trong ranh giới Use Case này; nếu Áp dụng thì kích hoạt UC-STU-006.

**Bảo toàn khi không thành công / bị từ chối**
- Chưa tạo StudyPlan/StudyTask nghiệp vụ cho đến khi UC-STU-006 hoàn tất thành công.
- Nếu Student từ chối hoặc AI lỗi thì database không có plan/task mới do preview này.

### Quan hệ Use Case
- `UC-STU-006 <<extend>> UC-STU-005` tại extension point **Student chọn Áp dụng**.
- `UC-STU-004` không phải bước bắt buộc trước UC-STU-005.
- Dữ liệu goal/time/deadline được gửi lại từ draft của `UC-STU-003` và backend validate lại tại request này.

### Luồng chính
1. Student chọn Tạo kế hoạch AI và gửi `goal`, `availableMinutesPerWeek`, `targetDeadline` từ draft hiện tại.
2. Backend kiểm tra quyền Student và validate lại goal/time/deadline.
3. Backend lấy AssessmentResult mới nhất theo Topic và danh sách Topic hợp lệ `{id, name}` của Course chính.
4. Backend kiểm tra dữ liệu tối thiểu cho generation.
5. Backend chuẩn hóa input và gọi AI Service.
6. AI Service trả `planTitle` và danh sách StudyTask có cấu trúc.
7. Backend validate structured output, topicId, enum priority, expectedMinutes, dueDate và số lượng task.
8. Frontend hiển thị preview cho Student.
9. Student có thể chỉnh `StudyPlan.title`, `StudyTask.title`, `expectedMinutes`, `dueDate`, `priority`.
10. Backend/frontend không cho Student sửa score, AssessmentResult, dữ liệu nguồn hay ghi đè StudyPlan.goal qua luồng preview.
11. Student chọn Áp dụng hoặc Từ chối.
12. Nếu chọn Áp dụng, extension point gọi UC-STU-006; nếu Từ chối, kết thúc mà không lưu plan/task.

### Luồng thay thế / ngoại lệ
**A1 – Thiếu AssessmentResult hoặc Topic hợp lệ**
- Backend trả `INSUFFICIENT_DATA`.
- Không gọi AI và không tạo AIRequestLog.

**A2 – Student chỉnh preview**
- Chỉ các field BR-021 cho phép được chỉnh.
- Dữ liệu chỉnh sửa phải được validate lại; validation preview không thay thế revalidation lúc Apply.

**A3 – Student từ chối preview**
- Không gọi UC-STU-006.
- Không tạo StudyPlan/StudyTask mới.

**E1 – Input goal/time/deadline không hợp lệ**
- Backend trả validation error.
- Không gọi AI.
- Không gộp thành `INSUFFICIENT_DATA`.

**E2 – AI failure hoặc structured output invalid**
- Áp dụng AI-ERROR/AI-VALIDATE.
- Không tạo plan/task.

### Business Rules / ràng buộc
- BR-021: giới hạn field được chỉnh ở preview.
- BR-022/BR-033: Topic từ seed data của một Course chính.
- BR-034: latest AssessmentResult.
- BR-035: kiểm tra minimum data trước AI.
- BR-037: AI chỉ tham chiếu Topic hợp lệ; StudyPlan.goal lấy từ Student; goal/time/deadline phải hợp lệ trước AI.
- AI không trực tiếp ghi database.

### Dữ liệu vào
- Latest AssessmentResult theo Topic.
- Student goal — bắt buộc.
- availableMinutesPerWeek — bắt buộc.
- targetDeadline — bắt buộc.
- Danh sách Topic hợp lệ `{id, name}`.
- Kết quả UC-STU-004 nếu đang có có thể bổ sung nhưng không bắt buộc.

### Dữ liệu ra
- Plan preview: `planTitle` + StudyTask[].
- Mỗi task: title, topicId, goal, expectedMinutes, dueDate, priority, reason nếu có.
- Quyết định Apply/Reject của Student.
- AIRequestLog metadata nếu external attempt xảy ra.

### Truy vết yêu cầu
- FR-STU-005
- FR-COM-005, FR-COM-006
- AI-REQ-009..011, AI-REQ-015..018, AI-REQ-023
- BR-021, BR-022, BR-033, BR-034, BR-035, BR-037

### Acceptance Criteria
- [ ] Có bước preview trước khi lưu.
- [ ] AI không ghi StudyPlan trực tiếp.
- [ ] Goal/time/deadline được backend validate lại tại request generation.
- [ ] Mọi topicId map được Topic hợp lệ.
- [ ] Plan có ít nhất một StudyTask hợp lệ.
- [ ] FR-STU-004 không phải dependency bắt buộc.
- [ ] Student chỉ sửa các field đã cho phép và backend validate lại.

## UC-STU-006 – Lưu và áp dụng kế hoạch

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Student |
| **Supporting actor** | Không |
| **Mục tiêu** | Chuyển plan preview đã được Student chấp nhận thành StudyPlan/StudyTask nghiệp vụ nhất quán trong database. |
| **Trigger** | Tại UC-STU-005, Student chọn **Áp dụng**. |

### Tiền điều kiện
- Có plan preview do `UC-STU-005` tạo và đang được hiển thị để Student quyết định.
- Student có phiên xác thực; trạng thái `ACTIVE`, quyền và tính hợp lệ của preview được backend kiểm tra lại tại thời điểm Apply.

### Hậu điều kiện
**Khi thành công**
- Plan hiện tại cũ nếu có đã chuyển `ARCHIVED`.
- StudyPlan mới được tạo `ACTIVE` và các StudyTask mới có status `TODO`.
- Dashboard có thể phản ánh plan mới.

**Bảo toàn khi không thành công / bị từ chối**
- Nếu revalidation/transaction thất bại: plan cũ không bị archive, không có plan/task mới tạo dở và trạng thái trước đó được giữ nguyên.

### Quan hệ Use Case
- `UC-STU-006 <<extend>> UC-STU-005` khi Student chọn Áp dụng.

### Luồng chính
1. Student chọn **Áp dụng** plan preview trong UC-STU-005.
2. Frontend gửi lệnh Apply; Backend lấy `applyTime = now`.
3. Backend kiểm tra lại quyền Student và revalidate toàn bộ preview trước bất kỳ database mutation nào.
4. Backend kiểm tra `targetDeadline > applyTime`.
5. Backend xác định `StudyPlan.startDate = applyTime`.
6. Backend kiểm tra mọi task thỏa `applyTime <= dueDate <= targetDeadline`, title hợp lệ, expectedMinutes > 0, priority hợp lệ và topicId tồn tại.
7. Backend bắt đầu transaction.
8. Nếu Student có StudyPlan hiện tại `ACTIVE` hoặc `COMPLETED`, backend chuyển plan đó sang `ARCHIVED`.
9. Backend tạo StudyPlan mới `ACTIVE` với title preview, goal của Student, startDate, endDate và availableMinutesPerWeek.
10. Backend tạo StudyTask mới với status `TODO`.
11. Backend commit transaction.
12. Frontend cập nhật dashboard/danh sách nhiệm vụ.

### Luồng thay thế / ngoại lệ
**E1 – Preview stale/không còn hợp lệ tại applyTime**
- Backend từ chối Apply.
- Không archive plan hiện tại.
- Không tạo plan/task mới.
- UI yêu cầu Student chỉnh preview hoặc tạo preview mới.

**E2 – Database failure trong transaction**
- Rollback toàn bộ thao tác.
- Không để trạng thái chỉ archive plan cũ hoặc chỉ tạo một phần task.

### Business Rules / ràng buộc
- BR-005: chỉ lưu plan sau khi Student chấp nhận và revalidate tại Apply.
- BR-021: validate lại field đã chỉnh.
- BR-024: tối đa một StudyPlan hiện tại; plan cũ archive khi plan mới được áp dụng.
- BR-025: StudyTask status TODO/COMPLETED và dueDate trong range plan.
- BR-037: topicId hợp lệ; goal lấy từ Student.

### Dữ liệu vào
- Plan preview sau chỉnh sửa.
- Student confirmation.
- applyTime do backend xác định.

### Dữ liệu ra
- StudyPlan mới ACTIVE.
- StudyTask mới TODO.
- Plan cũ ARCHIVED nếu có.

### Truy vết yêu cầu
- FR-STU-006
- FR-STU-005
- DATA-REQ-005, DATA-REQ-006, DATA-REQ-013
- BR-005, BR-021, BR-024, BR-025, BR-037
- ERR-004, ERR-005

### Acceptance Criteria
- [ ] Từ chối plan không tạo dữ liệu mới.
- [ ] Chỉ tạo plan/task khi preview vẫn hợp lệ tại applyTime.
- [ ] Không tồn tại đồng thời hai current StudyPlan.
- [ ] Tạo StudyPlan/StudyTask là thao tác nguyên tử.
- [ ] Stale preview không tạo `startDate >= endDate`.

## UC-STU-007 – Quản lý nhiệm vụ học tập

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Student |
| **Supporting actor** | Không |
| **Mục tiêu** | Cho Student xem và cập nhật trạng thái các StudyTask thuộc StudyPlan hiện tại của mình. |
| **Trigger** | Student mở danh sách nhiệm vụ hoặc chọn thay đổi trạng thái một task. |

### Tiền điều kiện
- Student đã xác thực và ACTIVE.

### Hậu điều kiện
**Khi thành công**
- Task có trạng thái TODO/COMPLETED và `completedAt` nhất quán.
- StudyPlan tự chuyển ACTIVE/COMPLETED theo trạng thái toàn bộ task.

**Bảo toàn khi không thành công / bị từ chối**
- Task thuộc plan ARCHIVED hoặc Student khác không bị cập nhật.

### Luồng chính
1. Student mở danh sách task của StudyPlan hiện tại.
2. Backend xác định Student và current plan.
3. Backend trả title, Topic, expectedMinutes, dueDate, priority và status của task.
4. Student chọn một task và yêu cầu chuyển trạng thái.
5. Backend kiểm tra ownership và xác nhận task thuộc current plan.
6. Nếu TODO → COMPLETED, backend đặt `completedAt = now`.
7. Nếu COMPLETED → TODO, backend đặt `completedAt = null`.
8. Nếu tất cả task của current plan đều COMPLETED, backend chuyển StudyPlan sang `COMPLETED`.
9. Nếu undo một task của plan COMPLETED, backend chuyển plan về `ACTIVE`.
10. Frontend hiển thị trạng thái mới.

### Luồng thay thế / ngoại lệ
**E1 – Task không thuộc Student/current plan**
- Backend từ chối theo authorization/business rule.
- Không cập nhật database.

**A1 – Plan ARCHIVED**
- Chỉ được xem nếu UI có hỗ trợ lịch sử; không được cập nhật trong MVP.

### Business Rules / ràng buộc
- BR-001: ownership Student.
- BR-024: vòng đời StudyPlan và ARCHIVED read-only.
- BR-025: TODO/COMPLETED; completedAt nhất quán.
- BR-036: plan quá endDate nhưng còn TODO vẫn ACTIVE.

### Dữ liệu vào
- TaskId hoặc định danh task thuộc current plan.
- Trạng thái mục tiêu TODO/COMPLETED.

### Dữ liệu ra
- StudyTask status/completedAt mới.
- StudyPlan status mới nếu điều kiện chuyển trạng thái thỏa.

### Truy vết yêu cầu
- FR-STU-007
- BR-001, BR-024, BR-025, BR-036

### Acceptance Criteria
- [ ] Student chỉ cập nhật task thuộc current plan của mình.
- [ ] ARCHIVED plan là read-only.
- [ ] Status và completedAt nhất quán.
- [ ] Undo task từ plan COMPLETED đưa plan về ACTIVE.

## UC-STU-008 – Theo dõi tiến độ

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Student |
| **Supporting actor** | Không |
| **Mục tiêu** | Tính và hiển thị tiến độ StudyPlan hiện tại dựa trên trạng thái/dueDate StudyTask. |
| **Trigger** | Student mở khu vực tiến độ hoặc trạng thái task vừa thay đổi làm UI cần refresh progress. |

### Tiền điều kiện
- Student đã xác thực và ACTIVE.

### Hậu điều kiện
**Khi thành công**
- Các metric tiến độ hiện tại được backend tính và hiển thị.
- Không cần lưu snapshot progress riêng trong MVP.

**Bảo toàn khi không thành công / bị từ chối**
- Không thay đổi task/plan chỉ vì đọc progress.

### Quan hệ Use Case
- UC-STU-008 độc lập với UC-STU-009; UC-STU-009 chỉ sử dụng metric do backend tính khi cần.

### Luồng chính
1. Student mở khu vực tiến độ hoặc UI yêu cầu refresh progress sau khi task thay đổi.
2. Backend xác định Student và lấy StudyPlan hiện tại cùng StudyTask liên quan.
3. Backend tính `completedTasks` và `totalTasks`.
4. Backend tính `actualProgress = completedTasks / totalTasks × 100`.
5. Backend tính `tasksDueByNow` từ task có `dueDate <= now`.
6. Backend tính `expectedProgress = tasksDueByNow / totalTasks × 100`.
7. Backend tính `overdueTasks` là task TODO có `dueDate < now`.
8. Nếu totalTasks = 0, backend trả actualProgress = expectedProgress = 0.
9. Backend đánh giá cảnh báo chậm bằng giá trị gốc trước rounding.
10. Frontend hiển thị metrics và warning nếu có.

### Luồng thay thế / ngoại lệ
**A1 – Không có current plan**
- completionRate/progress phụ thuộc plan được trả N/A/null theo quy ước; không tự coi là 0% hoàn thành chỉ vì chưa có plan.

**A2 – Plan đã quá endDate nhưng còn TODO**
- Plan vẫn ACTIVE.
- Task TODO quá hạn tiếp tục tính overdue.
- Không gọi AI adjustment chỉ vì hiển thị progress.

### Business Rules / ràng buộc
- BR-009: backend tính metrics.
- BR-017: threshold chậm 20 điểm phần trăm.
- BR-025: overdue và boundary dueDate.
- BR-027: completion rate/current plan.
- BR-036: overdue plan vẫn ACTIVE nếu còn TODO.

### Dữ liệu vào
- StudyPlan hiện tại nếu có.
- StudyTask của plan hiện tại.
- Thời điểm backend `now`.

### Dữ liệu ra
- completedTasks, totalTasks.
- completionPercentage/actualProgress.
- expectedProgress.
- overdueTasks.
- slow-progress warning nếu thỏa rule.

### Truy vết yêu cầu
- FR-STU-008
- FR-STU-001
- BR-009, BR-017, BR-025, BR-027, BR-036

### Acceptance Criteria
- [ ] Metric do backend tính.
- [ ] Thay đổi status task phản ánh vào progress.
- [ ] Cảnh báo đúng ngưỡng 20 điểm phần trăm.
- [ ] Không cần bảng progress snapshot riêng trong MVP.

## UC-STU-009 – Đề xuất điều chỉnh kế hoạch bằng AI

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Student |
| **Supporting actor** | AI Service |
| **Mục tiêu** | Đề xuất điều chỉnh `expectedMinutes`, `dueDate`, `priority` cho các task TODO của current StudyPlan mà không tự áp dụng thay đổi. |
| **Trigger** | Student chủ động yêu cầu hoặc Student chọn thực hiện gợi ý điều chỉnh khi hệ thống phát hiện chậm tiến độ. |

### Tiền điều kiện
- Student đã xác thực và ACTIVE.

### Hậu điều kiện
**Khi thành công**
- Student nhận adjustment preview hợp lệ.
- Nếu Student chấp nhận, backend cập nhật các task TODO hợp lệ; nếu từ chối, dữ liệu giữ nguyên.

**Bảo toàn khi không thành công / bị từ chối**
- AI lỗi, Student từ chối hoặc business ineligible không làm thay đổi StudyPlan/StudyTask.

### Quan hệ Use Case
- Độc lập với UC-STU-008; sử dụng progress metric do backend tính.
- Không dùng `<<extend>>` giữa UC-STU-009 và UC-STU-008.

### Luồng chính
1. Student chọn yêu cầu điều chỉnh kế hoạch; nếu hệ thống đã hiển thị gợi ý chậm tiến độ, Student chọn gợi ý đó để bắt đầu cùng flow.
2. Backend xác định Student, lấy current StudyPlan và kiểm tra eligibility.
3. Backend xác nhận `now <= StudyPlan.endDate` và current plan còn ít nhất một StudyTask `TODO`.
4. Backend tính/lấy actualProgress, expectedProgress và thời gian còn lại tới endDate.
5. Backend chuẩn bị current plan, các task TODO, goal và availableMinutesPerWeek rồi gửi dữ liệu cần thiết sang AI Service.
6. AI trả đề xuất có cấu trúc chỉ cho các field được phép.
7. Backend validate task ownership/status, expectedMinutes, priority và dueDate trong range plan.
8. Frontend hiển thị adjustment preview.
9. Student chọn Chấp nhận hoặc Từ chối.
10. Nếu Chấp nhận, backend cập nhật chỉ các StudyTask TODO hợp lệ.
11. Frontend hiển thị task/progress mới.

### Luồng thay thế / ngoại lệ
**A1 – Không có current StudyPlan**
- Không gọi AI.
- Không tạo AIRequestLog.
- Không trả `INSUFFICIENT_DATA`; hướng Student tạo StudyPlan trước.

**A2 – Plan đã quá endDate**
- Không gọi AI.
- Không tạo AIRequestLog.
- Không trả `INSUFFICIENT_DATA` chỉ vì quá hạn; hướng Student tạo plan mới nếu cần deadline mới.

**A3 – Không còn task TODO**
- Không gọi AI.
- Không tạo AIRequestLog.
- Thông báo không còn nhiệm vụ cần điều chỉnh.

**A4 – Student từ chối đề xuất**
- Không cập nhật task.
- Plan giữ nguyên.

**E1 – AI failure/invalid output**
- Áp dụng AI-ERROR/AI-VALIDATE.
- Không cập nhật task.

### Business Rules / ràng buộc
- BR-006: chỉ áp dụng adjustment sau xác nhận Student.
- BR-017: backend tính slow progress.
- BR-028: AI chỉ đổi expectedMinutes/dueDate/priority cho TODO; không thêm/xóa task, đổi Topic hoặc sửa COMPLETED.
- BR-035/OD-40: backend kiểm tra eligibility sau khi Student khởi tạo Use Case và trước external AI call.
- BR-036: plan quá endDate không được adjustment.

### Dữ liệu vào
- Current StudyPlan nếu tồn tại.
- StudyTask TODO nếu có.
- actualProgress, expectedProgress.
- Thời gian còn lại tới endDate.
- goal, availableMinutesPerWeek.

### Dữ liệu ra
- Adjustment preview cho TODO task.
- Task values mới nếu Student chấp nhận.
- AIRequestLog metadata nếu external attempt xảy ra.

### Truy vết yêu cầu
- FR-STU-009
- FR-COM-005, FR-COM-006
- AI-REQ-009, AI-REQ-012, AI-REQ-015..018, AI-REQ-023
- BR-006, BR-017, BR-028, BR-035, BR-036

### Acceptance Criteria
- [ ] Không gọi AI nếu không có plan, plan quá endDate hoặc không còn TODO.
- [ ] Business ineligible không bị gộp thành INSUFFICIENT_DATA.
- [ ] AI không tự sửa database.
- [ ] COMPLETED task không bị thay đổi.
- [ ] Chỉ cập nhật sau Student chấp nhận.

---

# 7. Teacher Use Cases

## UC-TEA-001 – Xem danh sách lớp

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Teacher |
| **Supporting actor** | Không |
| **Mục tiêu** | Cho Teacher xem các Class mình được phân công phụ trách. |
| **Trigger** | Teacher mở trang Danh sách lớp. |

### Tiền điều kiện
- Teacher đã xác thực và ACTIVE.

### Hậu điều kiện
**Khi thành công**
- Chỉ danh sách Class có `teacherId` tương ứng Teacher hiện tại được trả về.

**Bảo toàn khi không thành công / bị từ chối**
- Không trả Class ngoài quyền.

### Luồng chính
1. Teacher mở danh sách lớp.
2. Backend xác định Teacher hiện tại.
3. Backend kiểm tra trạng thái và role.
4. Backend truy vấn các Class được phân công cho Teacher.
5. Frontend hiển thị danh sách và cho Teacher chọn Class.

### Luồng thay thế / ngoại lệ
**A1 – Teacher chưa được phân công Class**
- Frontend hiển thị trạng thái danh sách rỗng phù hợp.

### Business Rules / ràng buộc
- BR-002: chỉ Class được phân công.
- BR-012/BR-023: authorization ở backend.

### Dữ liệu vào
- Teacher hiện tại từ phiên.

### Dữ liệu ra
- Danh sách Class được phân công.

### Truy vết yêu cầu
- FR-TEA-001
- FR-COM-003
- BR-002, BR-012, BR-023

### Acceptance Criteria
- [ ] Chỉ hiển thị Class thuộc Teacher hiện tại.
- [ ] Biết/đoán classId không tạo quyền truy cập.

## UC-TEA-002 – Xem danh sách/chi tiết Student trong lớp

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Teacher |
| **Supporting actor** | Không |
| **Mục tiêu** | Cho Teacher quan sát Student thuộc Class được phân công và các metric học tập read-only cần thiết. |
| **Trigger** | Teacher chọn một Class rồi mở danh sách Student hoặc chi tiết một Student. |

### Tiền điều kiện
- Teacher đã xác thực và ACTIVE.

### Hậu điều kiện
**Khi thành công**
- Teacher xem được danh sách/chi tiết read-only với metric backend tính.

**Bảo toàn khi không thành công / bị từ chối**
- Không cập nhật StudyPlan, StudyTask, goal hoặc AssessmentResult của Student.

### Luồng chính
1. Teacher chọn Class.
2. Backend kiểm tra Teacher–Class.
3. Backend lấy ClassMember.
4. Backend lấy latest AssessmentResult theo Student–Topic.
5. Backend tính `averageScore`, `completionRate`, `overdueTaskCount` theo từng Student.
6. Frontend hiển thị danh sách Student.
7. Nếu Teacher mở Student detail, backend kiểm tra lại quan hệ Teacher → Class → ClassMember → Student.
8. Backend trả score mới nhất theo Topic, averageScore, completionRate, overdueTaskCount, actualProgress và expectedProgress ở chế độ read-only.

### Luồng thay thế / ngoại lệ
**E1 – Class không thuộc Teacher**
- Backend từ chối theo ERR-003.
- Không trả dữ liệu Class/Student.

**E2 – Student không thuộc Class**
- Backend từ chối.
- Không trả Student detail.

**A1 – Student thiếu dữ liệu**
- averageScore/completionRate có thể trả null/N/A theo rule.
- Không tự chuyển dữ liệu thiếu thành 0, trừ count có quy ước cụ thể.

### Business Rules / ràng buộc
- BR-002: Teacher chỉ Class được phân công.
- BR-019: Student detail chỉ cho Student thuộc Class.
- BR-026: latest results; dữ liệu thiếu không là 0.
- BR-027: completion rate current plan.
- BR-034: latest AssessmentResult.
- BR-038: Student detail read-only.

### Dữ liệu vào
- classId.
- studentId khi mở detail.
- Teacher hiện tại từ phiên.

### Dữ liệu ra
- Student name.
- averageScore.
- completionRate.
- overdueTaskCount.
- Detail: latest scores, actualProgress, expectedProgress.

### Truy vết yêu cầu
- FR-TEA-002
- FR-COM-003
- BR-002, BR-019, BR-026, BR-027, BR-034, BR-038

### Acceptance Criteria
- [ ] Không xem Class/Student ngoài quyền.
- [ ] Metric do backend tính.
- [ ] Dữ liệu thiếu trả null/N/A phù hợp.
- [ ] Trang Student detail read-only; Teacher không sửa dữ liệu Student.

## UC-TEA-003 – Xem dashboard lớp

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Teacher |
| **Supporting actor** | Không |
| **Mục tiêu** | Hiển thị các metric tổng hợp và tín hiệu đáng chú ý của Class bằng tính toán/rule backend, không phụ thuộc AI. |
| **Trigger** | Teacher chọn một Class và mở dashboard lớp. |

### Tiền điều kiện
- Teacher đã xác thực và ACTIVE.

### Hậu điều kiện
**Khi thành công**
- Dashboard hiển thị studentCount, classAverageScore, topicAverageScores, classCompletionRate, overdueTaskCount và các Student cần chú ý theo rule.

**Bảo toàn khi không thành công / bị từ chối**
- Không thay đổi dữ liệu Student; không chạy AI chỉ để hiển thị dashboard.

### Quan hệ Use Case
- `FR-TEA-004` được thực hiện như xử lý nội bộ trong Use Case này, không có UC-TEA-004 riêng.

### Luồng chính
1. Teacher mở dashboard Class.
2. Backend kiểm tra Teacher–Class.
3. Backend lấy ClassMember và dữ liệu latest AssessmentResult/current StudyPlan/current StudyTask.
4. Backend tính studentCount, classAverageScore, topicAverageScores, classCompletionRate và class overdueTaskCount.
5. Backend thực hiện rule FR-TEA-004 trên giá trị gốc: xác định Weak Topic, Needs Attention và Progress Warning.
6. Backend không coi metric thiếu dữ liệu là 0 để kích hoạt rule.
7. Frontend hiển thị metric và tín hiệu đáng chú ý.

### Luồng thay thế / ngoại lệ
**A1 – Không đủ dữ liệu cho một metric**
- Backend trả null/N/A cho metric trung bình/tỷ lệ tương ứng.
- Topic không có AssessmentResult không tự trở thành Weak Topic.

**E1 – Class ngoài quyền**
- Backend từ chối, không trả dashboard.

### Business Rules / ràng buộc
- BR-002: Teacher–Class authorization.
- BR-009: backend tính metric.
- BR-017: Progress Warning khi actualProgress < expectedProgress - 20.
- BR-018: Needs Attention nếu averageScore <60 hoặc completionRate <50% hoặc overdueTaskCount >=2 trên metric có dữ liệu.
- BR-026: công thức metric Teacher và dữ liệu thiếu.
- BR-034: latest AssessmentResult.

### Dữ liệu vào
- classId.
- Dữ liệu Student/Class liên quan.

### Dữ liệu ra
- studentCount.
- classAverageScore.
- topicAverageScores.
- classCompletionRate.
- overdueTaskCount ở cấp Class.
- Weak Topics / Needs Attention / Progress Warning.

### Truy vết yêu cầu
- FR-TEA-003
- FR-TEA-004 (internal behavior)
- BR-002, BR-009, BR-017, BR-018, BR-026, BR-034

### Acceptance Criteria
- [ ] Dashboard hoạt động không cần AI.
- [ ] Metric do backend tính.
- [ ] Rule FR-TEA-004 deterministic với cùng input.
- [ ] Không coi dữ liệu thiếu là 0 để kích hoạt rule.

## UC-TEA-005 – Phân tích tình hình lớp bằng AI

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Teacher |
| **Supporting actor** | AI Service |
| **Mục tiêu** | Giải thích tình hình Class dựa trên metric/rule backend và cung cấp analysis + recommendation có cấu trúc cho Teacher. |
| **Trigger** | Teacher chọn Phân tích lớp bằng AI. |

### Tiền điều kiện
- Teacher đã xác thực và ACTIVE.

### Hậu điều kiện
**Khi thành công**
- Teacher nhận analysis hợp lệ gồm summary, weakTopics, progressIssues, attentionGroups và recommendations thông qua included UC-TEA-006.
- Kết quả có thể được lưu sau nếu Teacher chọn UC-TEA-007.
- Mỗi external AI attempt thực tế trong luồng được ghi `AIRequestLog` theo AI-REQ-018.

**Bảo toàn khi không thành công / bị từ chối**
- Không sửa dữ liệu Student.
- AI lỗi/invalid output không được lưu thành report hợp lệ.

### Quan hệ Use Case
- `UC-TEA-005 <<include>> UC-TEA-006`.
- `UC-TEA-007 <<extend>> UC-TEA-005` khi Teacher chọn Lưu.
- FR-TEA-004 là internal processing của Use Case này.
- Tài liệu này **không khóa số lượng external AI request** giữa UC-TEA-005 và included UC-TEA-006. Quan hệ nghiệp vụ là `include`; cách gộp/tách request thuộc AI Contract/API Specification hoặc một Resolved Decision riêng.

### Luồng chính
1. Teacher chọn Phân tích lớp bằng AI cho một Class.
2. Backend kiểm tra quyền Teacher–Class.
3. Backend tổng hợp studentCount, classAverageScore, topicAverageScores, classCompletionRate, overdueTaskCount.
4. Backend chạy rule FR-TEA-004 để xác định Weak Topics, Needs Attention và Progress Warning.
5. Backend kiểm tra minimum data theo OD-33.
6. Backend tạo input snapshot và chuẩn hóa payload cho AI analysis.
7. Backend thực hiện hành vi AI của UC-TEA-005 và include UC-TEA-006 để thu được analysis cùng recommendations theo AI contract hiện hành.
8. AI Service trả structured output theo contract tương ứng.
9. Backend validate output và bảo đảm các số liệu/ID dựa trên input backend.
10. Backend ghi `AIRequestLog` cho **từng external attempt thực tế** đã xảy ra trong luồng.
11. Backend tạo analysis context thuộc quyền backend từ inputSnapshot và output đã validate, trả analysis reference cho client cùng dữ liệu hiển thị.
12. Frontend hiển thị analysis + recommendations cho Teacher; nếu Teacher chọn Lưu, UC-TEA-007 dùng analysis reference.

### Luồng thay thế / ngoại lệ
**A1 – Không đủ dữ liệu Class**
- Backend trả `INSUFFICIENT_DATA`.
- Không gọi AI và không tạo AIRequestLog.

**E1 – Class ngoài quyền**
- Backend từ chối trước khi truy vấn/phân tích dữ liệu.

**E2 – AI failure/invalid output**
- Áp dụng AI-ERROR/AI-VALIDATE.
- Không lưu report.
- Giữ nguyên dữ liệu Class/Student.

### Business Rules / ràng buộc
- BR-002: Teacher chỉ Class được phân công.
- BR-004/BR-009: AI không tự tạo số liệu; backend tính metric.
- BR-007: AI insight/recommendation chỉ hỗ trợ Teacher.
- BR-010/BR-011: failure safety và AI không truy cập DB.
- BR-017/BR-018/BR-026: rule/metric Teacher.
- BR-035: minimum data trước AI.
- Số lượng request AI không phải business rule của Use Case; khi cần khóa, phải được quyết định trong AI Contract/API Specification hoặc Resolved Decision chính thức.

### Dữ liệu vào
- studentCount, classAverageScore, topicAverageScores.
- classCompletionRate, overdueTaskCount.
- Weak Topics, Needs Attention, Progress Warning.
- input snapshot của Class tại thời điểm phân tích.

### Dữ liệu ra
- summary.
- weakTopics.
- progressIssues.
- attentionGroups.
- recommendations từ included UC-TEA-006 theo AI contract hiện hành.
- backend-controlled analysis reference tham chiếu analysis context do backend sở hữu, dùng cho UC-TEA-007 nếu Teacher chọn Lưu.
- AIRequestLog metadata cho từng external attempt thực tế của lần phân tích.

### Truy vết yêu cầu
- FR-TEA-005
- FR-TEA-004 (internal)
- FR-COM-005, FR-COM-006
- AI-REQ-001..010, AI-REQ-013, AI-REQ-015..018, AI-REQ-023
- BR-002, BR-004, BR-007, BR-009, BR-010, BR-011, BR-017, BR-018, BR-026, BR-035

### Acceptance Criteria
- [ ] Không đủ dữ liệu thì không gọi AI.
- [ ] AI không tự tạo studentCount/score/rate.
- [ ] Nhận xét dựa trên input backend.
- [ ] UC-TEA-005 luôn bao gồm hành vi recommendation của UC-TEA-006 theo quan hệ `include`.
- [ ] Mỗi external AI attempt thực tế trong luồng tạo một AIRequestLog.
- [ ] AI không thay đổi Student data.
- [ ] Trend/history không bắt buộc MVP.

## UC-TEA-006 – Đề xuất phương án hỗ trợ bằng AI

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Teacher (thông qua UC-TEA-005) |
| **Supporting actor** | AI Service |
| **Mục tiêu** | Cung cấp recommendation hỗ trợ học tập dựa trên context phân tích Class mà không tự áp dụng hành động. |
| **Trigger** | Được include trong UC-TEA-005 khi luồng phân tích Class cần tạo recommendations cho Teacher. |

### Tiền điều kiện
- UC-TEA-005 đang chạy sau khi Teacher đã khởi tạo phân tích Class và Backend đã kiểm tra quyền/minimum data.

### Hậu điều kiện
**Khi thành công**
- Teacher xem được recommendations hợp lệ như một phần của kết quả UC-TEA-005.

**Bảo toàn khi không thành công / bị từ chối**
- Không tự giao bài, sửa StudyPlan/StudyTask hoặc kết luận chắc chắn về năng lực/thái độ Student.

### Quan hệ Use Case
- Included Use Case của UC-TEA-005; không khởi chạy độc lập bởi Teacher trong MVP.
- Số external AI request dùng để hiện thực hành vi này không được quy định tại Use Case level.

### Luồng chính
1. UC-TEA-005 cung cấp context phân tích Class đã được backend chuẩn hóa và include hành vi tạo recommendation.
2. Backend/AI Service tạo recommendations dựa trên context đó theo AI contract hiện hành.
3. Backend validate recommendations trước khi coi là kết quả hợp lệ.
4. UC-TEA-006 trả recommendations đã validate về UC-TEA-005 để hiển thị cho Teacher.

### Luồng thay thế / ngoại lệ
**E1 – Recommendation thiếu/sai schema hoặc AI failure**
- Áp dụng AI-ERROR/AI-VALIDATE cho external attempt tương ứng nếu có.
- Không tự áp dụng recommendation.

### Business Rules / ràng buộc
- BR-007: Teacher quyết định có sử dụng recommendation.
- AI không kết luận chắc chắn về năng lực, thái độ, động cơ, ý thức.
- AI không sửa dữ liệu Student.
- Logging tuân theo external attempts thực tế: attempt nào được thực hiện thì attempt đó phải có `AIRequestLog`; Use Case này không tự quy định việc gộp/tách request.

### Dữ liệu vào
- Context Class analysis do UC-TEA-005 chuẩn bị.

### Dữ liệu ra
- Danh sách recommendations hỗ trợ đã được backend validate và trả về UC-TEA-005.

### Truy vết yêu cầu
- FR-TEA-006
- FR-COM-005
- FR-COM-006 (áp dụng cho từng external attempt thực tế của hành vi AI)
- AI-REQ-013, AI-REQ-015..018
- BR-007

### Acceptance Criteria
- [ ] Recommendations chỉ là gợi ý.
- [ ] Teacher xem recommendation mà dữ liệu Student không đổi.
- [ ] Use Case không cần association trực tiếp Teacher trong diagram và không khởi chạy độc lập ở MVP.
- [ ] Mọi external AI attempt thực tế dùng để tạo recommendation đều được log theo FR-COM-006/AI-REQ-018.

## UC-TEA-007 – Lưu báo cáo phân tích

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Teacher |
| **Supporting actor** | Không |
| **Mục tiêu** | Lưu snapshot input và output AI đã validate của đúng lần phân tích Class để Teacher xem lại sau. |
| **Trigger** | Sau UC-TEA-005 thành công, Teacher chọn Lưu. |

### Tiền điều kiện
- Teacher đã xác thực và ACTIVE.

### Hậu điều kiện
**Khi thành công**
- Một ClassAnalysisReport mới được lưu với classId, inputSnapshot JSONB, analysisResult JSONB và createdAt.
- Report phản ánh snapshot tại thời điểm AI analysis, không bị thay thế bởi dữ liệu Class live ở thời điểm Save.

**Bảo toàn khi không thành công / bị từ chối**
- Không lưu report nếu Teacher không có quyền, analysis reference không còn hợp lệ/không thuộc context được phép dùng, hoặc backend context thiếu snapshot/result đã validate.

### Quan hệ Use Case
- `UC-TEA-007 <<extend>> UC-TEA-005` khi Teacher chọn Lưu.

### Luồng chính
1. Teacher xem kết quả UC-TEA-005 hợp lệ và chọn Lưu.
2. Frontend gửi analysis reference của lần phân tích vừa hoàn thành.
3. Backend kiểm tra lại Teacher–Class và quyền sử dụng analysis context tương ứng.
4. Backend lấy `classId`, `inputSnapshot` và `analysisResult` đã validate từ context do backend sở hữu.
5. Backend kiểm tra integrity/schema của context và **không dùng snapshot/result do client gửi lại làm nguồn chuẩn**.
6. Backend **không tái tính metric từ dữ liệu Class hiện tại để thay thế inputSnapshot**.
7. Backend tạo ClassAnalysisReport bằng snapshot/result của lần phân tích đó và lưu `createdAt` theo UTC.
8. Frontend xác nhận lưu thành công.

### Luồng thay thế / ngoại lệ
**A1 – analysis reference không tồn tại/không còn dùng được**
- Không lưu report.
- UI yêu cầu Teacher chạy lại phân tích nếu muốn tạo report mới.

**E1 – Class ngoài quyền**
- Backend từ chối, không tạo report.

**E2 – Backend analysis context thiếu snapshot/result hoặc sai schema/integrity**
- Backend từ chối Save; không tạo report.

**E3 – Database failure**
- Không để report ở trạng thái một phần.

### Business Rules / ràng buộc
- BR-002: quyền Teacher–Class.
- BR-007: report/recommendation chỉ hỗ trợ Teacher.
- BR-030: inputSnapshot/analysisResult lưu JSONB; không cần bảng con WeakTopic/AttentionGroup/Recommendation.
- BR-031: timestamp UTC/ISO 8601.
- Thay đổi dữ liệu Class sau thời điểm analysis không làm snapshot cũ mất ý nghĩa; report phải giữ đúng snapshot đã dùng cho AI.

### Dữ liệu vào
- analysis reference của lần phân tích Class đã thành công.

### Dữ liệu ra
- ClassAnalysisReport mới.

### Truy vết yêu cầu
- FR-TEA-007
- BR-002, BR-007, BR-030, BR-031
- DATA-REQ-007
- BR-044
- OD-44
- DATA-REQ-015

### Acceptance Criteria
- [ ] Chỉ Teacher có quyền Class mới lưu được.
- [ ] Report lưu đúng input snapshot và AI result lấy từ backend-owned analysis context của lần phân tích đã chọn.
- [ ] Client không thể thay snapshot/result nguồn chỉ bằng cách sửa payload Save.
- [ ] Backend không thay snapshot analysis-time bằng metric live tại thời điểm Save.
- [ ] Không tạo bảng riêng cho WeakTopic/AttentionGroup/Recommendation trong MVP.

---

## UC-TEA-008 – Xem lịch sử phân tích AI của lớp

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Teacher |
| **Supporting actor** | Không |
| **Mục tiêu** | Cho Teacher list và xem chi tiết các `ClassAnalysisReport` đã lưu của Class mình được phân công, sử dụng đúng snapshot lịch sử. |
| **Trigger** | Teacher chọn Lịch sử phân tích trong context của một Class. |

### Tiền điều kiện
- Teacher đã xác thực và `ACTIVE`.

### Hậu điều kiện
**Khi thành công**
- Teacher xem được danh sách/chi tiết report thuộc Class hợp lệ.
- Không thay đổi report, dữ liệu Student/Class hoặc AI log.

**Bảo toàn khi không thành công / bị từ chối**
- Không tiết lộ report của Class ngoài quyền.
- Không chạy AI fallback.

### Luồng chính
1. Teacher mở lịch sử phân tích của một Class.
2. Backend xác định Teacher hiện tại và kiểm tra Teacher–Class.
3. Backend truy vấn `ClassAnalysisReport` thuộc Class đó, sắp xếp theo `createdAt` phù hợp.
4. Frontend hiển thị danh sách report với metadata tối thiểu.
5. Teacher chọn một report.
6. Backend kiểm tra lại Teacher–Class và report thuộc Class.
7. Backend trả `inputSnapshot`, `analysisResult`, `createdAt` đã lưu.
8. Frontend hiển thị chi tiết read-only.

### Luồng thay thế / ngoại lệ
**A1 – Chưa có report**
- Trả danh sách rỗng; UI hiển thị empty state.

**E1 – Class ngoài quyền**
- Backend từ chối theo authorization; không trả metadata/report.

**E2 – Report không tồn tại hoặc không thuộc Class**
- Backend trả lỗi phù hợp mà không làm lộ dữ liệu ngoài quyền.

### Business Rules / ràng buộc
- BR-002, BR-012: Teacher–Class authorization ở backend.
- BR-030: report lưu snapshot/result JSONB.
- BR-031: thời gian lưu UTC/API ISO 8601.
- BR-045/OD-45: history read-only, dùng snapshot đã lưu, không recompute live, không gọi AI.

### Dữ liệu vào
- classId.
- reportId khi mở detail.
- Teacher hiện tại từ phiên.

### Dữ liệu ra
- List: reportId, classId, createdAt, summary ngắn nếu có.
- Detail: inputSnapshot, analysisResult, createdAt.

### Truy vết yêu cầu
- FR-TEA-008
- FR-COM-003
- BR-002, BR-012, BR-030, BR-031, BR-045
- OD-45

### Acceptance Criteria
- [ ] Teacher chỉ xem history của Class được phân công.
- [ ] Detail phản ánh đúng snapshot/result đã lưu.
- [ ] Dữ liệu Class live thay đổi không làm history cũ thay đổi.
- [ ] List/detail không gọi AI và không tạo AIRequestLog.
- [ ] MVP không edit/delete/compare/rerun report.

# 8. Administrator Use Cases

## UC-ADM-001 – Xem dashboard hệ thống

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Administrator |
| **Supporting actor** | Không |
| **Mục tiêu** | Hiển thị các metric quản trị MVP toàn thời gian do backend tính/truy vấn. |
| **Trigger** | Administrator mở System Dashboard. |

### Tiền điều kiện
- Administrator đã xác thực và ACTIVE.

### Hậu điều kiện
**Khi thành công**
- Dashboard hiển thị totalUsers, usersByRole, totalFeedback, totalAIRequests và failedAIRequests theo semantics đã chốt.

**Bảo toàn khi không thành công / bị từ chối**
- Không thay đổi dữ liệu hệ thống chỉ vì xem dashboard.

### Luồng chính
1. Administrator mở dashboard.
2. Backend kiểm tra role/status Administrator.
3. Backend tính/truy vấn totalUsers và usersByRole gồm cả ACTIVE/DISABLED.
4. Backend đếm totalFeedback.
5. Backend đếm totalAIRequests từ AIRequestLog của các external AI attempts.
6. Backend đếm failedAIRequests từ các log thất bại.
7. Frontend hiển thị metrics.

### Luồng thay thế / ngoại lệ
**A1 – Không có AIRequestLog**
- totalAIRequests và failedAIRequests bằng 0 theo dữ liệu thực tế.

**E1 – User không phải Administrator**
- Backend từ chối protected Admin API.

### Business Rules / ràng buộc
- BR-029: dashboard MVP chỉ có 5 metric bắt buộc; không DAU/MAU/hạ tầng chi tiết.
- BR-009: backend là nguồn tính số liệu.
- Theo OD-37, metric dashboard là toàn thời gian; failedAIRequests là tập con totalAIRequests.

### Dữ liệu vào
- Không có filter bắt buộc trong MVP.

### Dữ liệu ra
- totalUsers.
- usersByRole.
- totalFeedback.
- totalAIRequests.
- failedAIRequests.

### Truy vết yêu cầu
- FR-ADM-001
- BR-009, BR-029
- AI-REQ-018

### Acceptance Criteria
- [ ] Dashboard dùng số liệu toàn thời gian.
- [ ] Tính cả ACTIVE/DISABLED trong totalUsers/usersByRole.
- [ ] INSUFFICIENT_DATA/business ineligible trước AI call không tính vào AI request metrics.
- [ ] Không yêu cầu active user tracking hay infrastructure monitoring chi tiết.

## UC-ADM-002 – Quản lý người dùng cơ bản

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Administrator |
| **Supporting actor** | Không |
| **Mục tiêu** | Cho Administrator xem/tìm kiếm user và chuyển trạng thái tài khoản người khác giữa ACTIVE/DISABLED. |
| **Trigger** | Administrator mở trang quản lý người dùng hoặc chọn Activate/Disable một user. |

### Tiền điều kiện
- Administrator đã xác thực và ACTIVE.

### Hậu điều kiện
**Khi thành công**
- Danh sách user hiển thị đúng role/status; trạng thái target user được cập nhật nếu thao tác hợp lệ.

**Bảo toàn khi không thành công / bị từ chối**
- Admin không thể disable chính tài khoản đang đăng nhập; request trái quyền không thay đổi user.

### Luồng chính
1. Administrator mở danh sách user.
2. Backend kiểm tra role Administrator.
3. Backend truy vấn user và hỗ trợ tìm kiếm theo tên/email.
4. Frontend hiển thị fullName/email/role/status cần thiết.
5. Administrator chọn target user và hành động Activate hoặc Disable.
6. Backend kiểm tra target user và so sánh với Admin hiện tại.
7. Nếu hợp lệ, backend chuyển ACTIVE ↔ DISABLED.
8. Frontend hiển thị trạng thái mới.

### Luồng thay thế / ngoại lệ
**E1 – Admin cố disable chính mình**
- Backend từ chối theo BR-040.
- Trạng thái tài khoản Admin không đổi.

**E2 – User không phải Administrator gọi API**
- Backend từ chối.

**A1 – Target user đang giữ token cũ và bị disable**
- Protected request tiếp theo của target user bị từ chối theo BR-032.
- Frontend target user xóa trạng thái login và quay về login khi nhận lỗi phù hợp.

### Business Rules / ràng buộc
- BR-020: chuyển ACTIVE/DISABLED.
- BR-032: disabled user bị từ chối protected API.
- BR-040: Admin không disable chính mình.
- MVP không có reason/history, reset password hoặc permission tùy biến.

### Dữ liệu vào
- Search text tên/email nếu có.
- targetUserId.
- Hành động Activate/Disable.

### Dữ liệu ra
- Danh sách user.
- Role/status.
- Trạng thái target user sau update.

### Truy vết yêu cầu
- FR-ADM-002
- FR-COM-003
- BR-020, BR-032, BR-040
- ERR-002, ERR-003

### Acceptance Criteria
- [ ] Admin xem/tìm kiếm user được.
- [ ] Admin Active/Disable user khác được.
- [ ] Admin không disable chính mình.
- [ ] User vừa bị Disable bị từ chối protected API tiếp theo.

## UC-ADM-003 – Xem và lọc feedback

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Administrator |
| **Supporting actor** | Không |
| **Mục tiêu** | Cho Administrator xem Feedback đã lưu, lọc theo phạm vi MVP và quan sát tag chính thức do người dùng chọn. |
| **Trigger** | Administrator mở trang Feedback hoặc thay đổi filter. |

### Tiền điều kiện
- Administrator đã xác thực và ACTIVE.

### Hậu điều kiện
**Khi thành công**
- Danh sách feedback đúng với filter được trả về; tag hiển thị đúng giá trị đã lưu.

**Bảo toàn khi không thành công / bị từ chối**
- Không thay đổi Feedback; không để AI tự sửa tag.

### Luồng chính
1. Administrator mở danh sách Feedback.
2. Backend kiểm tra role.
3. Backend nhận filter thời gian, rating, tag nếu có.
4. Backend validate filter.
5. Backend truy vấn Feedback tương ứng.
6. Backend có thể tính thống kê theo tag trên tập dữ liệu cần hiển thị/phân tích theo yêu cầu màn hình.
7. Frontend hiển thị người gửi, role, tag, rating, content, createdAt.

### Luồng thay thế / ngoại lệ
**A1 – Filter không khớp feedback**
- Frontend hiển thị empty state; đây chưa tự động là AI analysis request.

**E1 – Filter invalid**
- Backend trả ERR-004; không truy vấn/không chạy AI.

### Business Rules / ràng buộc
- BR-013: feedback hợp lệ sau lưu phải xuất hiện trong nguồn Admin có thể xem/phân tích.
- BR-014: mỗi feedback có đúng một tag chính thức.
- BR-015: backend đếm theo tag; AI không phải nguồn count.

### Dữ liệu vào
- fromDate/toDate nếu có.
- rating nếu có.
- tag nếu có.

### Dữ liệu ra
- Feedback rows: sender, role, tag, rating, content, createdAt.
- Thống kê backend nếu màn hình yêu cầu.

### Truy vết yêu cầu
- FR-ADM-003
- BR-013, BR-014, BR-015

### Acceptance Criteria
- [ ] Filter thời gian/rating/tag trả đúng phạm vi.
- [ ] Tag hiển thị đúng dữ liệu user đã chọn.
- [ ] Thống kê theo tag do backend thực hiện.

## UC-ADM-004 – Phân tích và nhóm vấn đề từ feedback bằng AI

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Administrator |
| **Supporting actor** | AI Service |
| **Mục tiêu** | Phân tích content của tập Feedback đã chọn để nhóm các vấn đề chi tiết, trong khi tag/count chính thức vẫn do backend kiểm soát. |
| **Trigger** | Administrator chọn tập feedback và yêu cầu phân tích vấn đề. |

### Tiền điều kiện
- Administrator đã xác thực và ACTIVE.

### Hậu điều kiện
**Khi thành công**
- Có kết quả issue grouping hợp lệ; `issueGroups` có thể là danh sách rỗng theo `OD-43/BR-043`.
- Với mọi group tồn tại, mỗi feedbackId được tính tối đa một issueGroup và `count` được backend tính lại.
- tagStatistics/totalFeedback phản ánh dữ liệu backend.

**Bảo toàn khi không thành công / bị từ chối**
- Feedback/tag gốc không bị AI thay đổi.
- AI output invalid không được lưu như analysis thành công.

### Luồng chính
1. Administrator chọn filter hoặc toàn bộ feedback hiện có và yêu cầu phân tích.
2. Backend validate filter, truy vấn chính xác tập feedback và tạo `feedbackIds`.
3. Backend kiểm tra tập dữ liệu có đủ tối thiểu một feedback.
4. Backend tính totalFeedback và tagStatistics từ tag đã lưu.
5. Theo `OD-42/BR-042`, backend thực hiện external AI attempt stage 1 với content/tag cần thiết để tạo candidate issueGroups.
6. AI trả candidate issueGroups có tối thiểu title, summary, feedbackIds.
7. Backend validate mọi feedbackId thuộc input.
8. Trong từng group backend deduplicate feedbackIds.
9. Backend xử lý group theo thứ tự AI trả về; feedbackId đã được group trước giữ quyền sở hữu và bị loại khỏi group sau.
10. Backend loại group rỗng sau deduplicate.
11. Backend tính lại `count` từ feedbackIds hợp lệ còn lại.
12. Nếu không còn group nào sau validation/deduplicate, backend giữ kết quả hợp lệ với `issueGroups = []` theo `OD-43/BR-043`; không chuyển thành `INSUFFICIENT_DATA`.
13. Backend ghi `AIRequestLog` cho external attempt stage 1.
14. Frontend hiển thị tag statistics của backend và issueGroups. Các kết quả trung gian hợp lệ được chuyển tiếp cho included flow `UC-ADM-005`; chưa tạo analysis context dùng cho Save chỉ từ kết quả riêng của `UC-ADM-004`.

### Luồng thay thế / ngoại lệ
**A1 – Tập feedback rỗng**
- Backend trả `INSUFFICIENT_DATA`.
- Không gọi AI; không tạo AIRequestLog.

**A2 – feedbackId trùng giữa các group**
- Backend giữ ID ở group xuất hiện hợp lệ đầu tiên.
- Loại ID đó khỏi group sau và tính lại count.
- Nếu group sau rỗng thì loại group.

**E1 – Filter invalid**
- Backend trả ERR-004 trước AI call.
- Không tạo AIRequestLog.

**E2 – AI trả feedbackId ngoài input**
- Structured output không hợp lệ.
- Không lưu/hiển thị như kết quả thành công.

**E3 – AI failure/invalid output**
- Áp dụng AI-ERROR/AI-VALIDATE.
- Feedback gốc không đổi.

### Business Rules / ràng buộc
- BR-003/BR-008: Admin AI flow chỉ tạo insight, không sửa dữ liệu Student/Teacher/hệ thống.
- BR-013/BR-014: dùng feedback đã lưu và tag chính thức.
- BR-015/OD-34: backend count + deterministic deduplicate issue groups.
- BR-004/BR-009: AI không tự tạo counts/statistics.
- BR-035: tập feedback sau filter rỗng => `INSUFFICIENT_DATA` trước AI.
- `OD-42/BR-042`: UC-ADM-004 là external AI stage 1 trong Admin feedback analysis.
- `OD-43/BR-043`: dataset không rỗng nhưng issueGroups hợp lệ sau validation/deduplicate là `[]` vẫn là kết quả thành công, không phải `INSUFFICIENT_DATA`.

### Dữ liệu vào
- Filter feedback.
- feedbackIds.
- content + tag cần thiết.
- totalFeedback và tagStatistics do backend tính.

### Dữ liệu ra
- issueGroups: title, summary, feedbackIds, count backend tính.
- totalFeedback/tagStatistics backend.
- issueGroups và statistics hợp lệ làm dữ liệu trung gian cho `UC-ADM-005`; `issueGroups` có thể là `[]` theo `OD-43/BR-043`.
- AIRequestLog metadata của external AI stage 1.

### Truy vết yêu cầu
- FR-ADM-004
- FR-COM-005, FR-COM-006
- AI-REQ-001..010, AI-REQ-014..018, AI-REQ-023
- BR-003, BR-004, BR-008, BR-009, BR-013, BR-014, BR-015, BR-035
- BR-042, BR-043
- OD-42, OD-43
- AI-REQ-024

### Acceptance Criteria
- [ ] Nếu tập feedback sau khi áp dụng filter hoặc lấy toàn bộ dữ liệu hiện có là rỗng thì trả `INSUFFICIENT_DATA`, không gọi AI và không tạo `AIRequestLog`.
- [ ] Mọi feedbackId trong issueGroups thuộc input.
- [ ] Một feedback chỉ tính tối đa một issue group.
- [ ] Backend tự tính count sau deduplicate.
- [ ] Nếu dataset không rỗng nhưng không còn group sau validation/deduplicate, trả `issueGroups = []` và vẫn coi UC-ADM-004 thành công.
- [ ] AI không đổi tag chính thức.

## UC-ADM-005 – Tóm tắt vấn đề và đề xuất cải thiện bằng AI

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Administrator |
| **Supporting actor** | AI Service |
| **Mục tiêu** | Tóm tắt các vấn đề, xác định priorityAreas và đưa ra recommendations dựa trên dataset/issueGroups hợp lệ, để Admin quyết định ưu tiên. |
| **Trigger** | Administrator yêu cầu xem tổng hợp và đề xuất cải thiện cho tập feedback. |

### Tiền điều kiện
- Administrator đã xác thực và ACTIVE.

### Hậu điều kiện
**Khi thành công**
- Admin nhận summary, priorityAreas và recommendations đã qua backend validation.
- Backend có analysis context thuộc quyền sở hữu của backend cho lần phân tích hoàn chỉnh, có thể được tham chiếu bằng analysis reference nếu Admin chọn Save.

**Bảo toàn khi không thành công / bị từ chối**
- Không tự thay đổi tag, user, Student/Teacher data hoặc cấu hình hệ thống.

### Quan hệ Use Case
- `UC-ADM-005 <<include>> UC-ADM-004`: issue grouping là hành vi bắt buộc trong mục tiêu tổng hợp/đề xuất.
- `UC-ADM-006 <<extend>> UC-ADM-005` khi Admin chọn Lưu.
- Theo `OD-42/BR-042`: trong MVP, `UC-ADM-004` là external AI stage 1 và `UC-ADM-005` là external AI stage 2, với backend validation/deduplicate nằm giữa hai stage.
- `OD-43/BR-043`: `issueGroups = []` sau một grouping result hợp lệ không chặn UC-ADM-005.

### Luồng chính
1. Administrator khởi chạy tổng hợp/đề xuất trên tập feedback.
2. Use Case thực hiện UC-ADM-004 để lấy tập feedback, tag statistics và issueGroups đã qua backend validation; `issueGroups` có thể là `[]` theo `OD-43/BR-043`.
3. Backend chuẩn bị input stage 2 gồm feedback/tag, tagStatistics và issueGroups đã validate.
4. Theo `OD-42/BR-042`, backend thực hiện external AI attempt stage 2 để tạo `summary`, `priorityAreas` và `recommendations`.
5. AI Service trả structured output stage 2.
6. Backend validate output và ghi `AIRequestLog` cho external attempt stage 2 theo AI-REQ-018.
7. Backend tạo analysis context thuộc quyền backend từ inputSnapshot của dataset đã phân tích, issueGroups đã validate và analysisResult stage 2 đã validate; backend trả một backend-controlled analysis reference cho client cùng dữ liệu hiển thị.
8. Frontend hiển thị summary, priorityAreas và recommendations cho Administrator.
9. Administrator quyết định có sử dụng insight và có chọn Lưu hay không; nếu chọn Lưu, UC-ADM-006 dùng analysis reference này.

### Luồng thay thế / ngoại lệ
**A1 – UC-ADM-004 thành công nhưng `issueGroups = []`**
- Không xem là `INSUFFICIENT_DATA` nếu dataset feedback không rỗng.
- Tiếp tục external AI stage 2 với feedback/tagStatistics và danh sách issueGroups rỗng theo `OD-43/BR-043`.
- UI có thể thể hiện rằng stage grouping không phát hiện nhóm vấn đề nổi bật.

**A2 – UC-ADM-004 trả `INSUFFICIENT_DATA`**
- Không thực hiện external AI stage 2.
- Không tạo analysis context có thể Save.
- Giữ semantics của UC-ADM-004: dataset feedback sau filter rỗng.

**E1 – AI failure/invalid output ở bước summary/recommendation**
- Áp dụng AI-ERROR/AI-VALIDATE.
- Không tự áp dụng recommendation.

### Business Rules / ràng buộc
- BR-003: Admin AI flow không sửa trực tiếp dữ liệu Student/Teacher.
- BR-008: kết quả chỉ là đề xuất; Admin quyết định.
- BR-010/BR-011: failure safety và AI không truy cập DB.
- BR-015 + BR-042 + BR-043: count/tag statistics do backend; stage 2 chỉ dùng issueGroups đã validate và vẫn chạy khi danh sách hợp lệ là rỗng.
- `OD-42/BR-042`: Admin feedback AI dùng two-stage external inference trong MVP; đây là hành vi đã được chính thức hóa trong OD-42/BR-042.
- `OD-43/BR-043`: issueGroups rỗng sau grouping hợp lệ không chặn stage 2.
- Mỗi external attempt thực tế phải được log theo AI-REQ-018.

### Dữ liệu vào
- Feedback + official tag.
- tagStatistics backend.
- issueGroups hợp lệ từ UC-ADM-004.

### Dữ liệu ra
- summary.
- priorityAreas.
- recommendations.
- backend-controlled analysis reference tham chiếu backend-owned analysis context dùng cho UC-ADM-006 nếu Admin chọn Lưu.
- AIRequestLog metadata tương ứng external attempts thực tế.

### Truy vết yêu cầu
- FR-ADM-005
- FR-ADM-004
- FR-COM-005, FR-COM-006
- AI-REQ-009, AI-REQ-014..018
- BR-003, BR-008, BR-010, BR-011, BR-015
- BR-042, BR-043
- OD-42, OD-43
- AI-REQ-024

### Acceptance Criteria
- [ ] Summary/recommendation chỉ dựa trên input hợp lệ.
- [ ] Structured output được backend validate.
- [ ] Khi toàn bộ Admin analysis flow chạy qua cả hai stage, `UC-ADM-004` và `UC-ADM-005` tạo hai external AI attempts tách biệt theo `OD-42/BR-042`; mỗi attempt đều được log.
- [ ] `issueGroups = []` từ một grouping result hợp lệ vẫn cho phép stage 2 chạy theo `OD-43/BR-043`.
- [ ] Backend tạo analysis context từ đúng dataset snapshot, issueGroups đã validate và output stage 2 đã validate trước khi cho phép Save qua UC-ADM-006.
- [ ] Admin là người quyết định ưu tiên.
- [ ] Kết quả không tự thay đổi hệ thống.

## UC-ADM-006 – Lưu kết quả phân tích feedback

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Administrator |
| **Supporting actor** | Không |
| **Mục tiêu** | Lưu snapshot tập dữ liệu đã phân tích và AI output hợp lệ của đúng lần phân tích để xem lại sau. |
| **Trigger** | Sau UC-ADM-005 thành công, Administrator chọn Lưu. |

### Tiền điều kiện
- Administrator đã xác thực và ACTIVE.

### Hậu điều kiện
**Khi thành công**
- FeedbackAnalysis mới được lưu với inputSnapshot JSONB, analysisResult JSONB và createdAt.
- Snapshot phản ánh đúng tập feedback/filter tại thời điểm phân tích, không bị thay bằng dữ liệu feedback live ở thời điểm Save.

**Bảo toàn khi không thành công / bị từ chối**
- Không lưu nếu analysis reference không còn hợp lệ/không thuộc context được phép dùng, hoặc backend context thiếu snapshot/output đã validate.

### Quan hệ Use Case
- `UC-ADM-006 <<extend>> UC-ADM-005` khi Admin chọn Lưu.

### Luồng chính
1. Administrator xem kết quả UC-ADM-005 hợp lệ và chọn Lưu.
2. Frontend gửi analysis reference của lần phân tích feedback vừa hoàn thành.
3. Backend xác thực quyền Administrator và quyền sử dụng analysis context tương ứng.
4. Backend lấy `inputSnapshot` gồm filter, feedbackIds, totalFeedback, tagStatistics từ context do backend sở hữu.
5. Backend lấy `analysisResult` gồm issueGroups, summary, priorityAreas, recommendations đã validate từ cùng context và kiểm tra integrity/schema.
6. Backend **không dùng snapshot/output do client gửi lại làm nguồn chuẩn** và không truy vấn dữ liệu feedback hiện tại để thay thế inputSnapshot đã dùng cho AI.
7. Backend lưu FeedbackAnalysis với createdAt UTC.
8. Frontend xác nhận lưu thành công.

### Luồng thay thế / ngoại lệ
**A1 – analysis reference không tồn tại/không còn dùng được**
- Không lưu FeedbackAnalysis.
- UI yêu cầu Administrator chạy lại phân tích nếu muốn tạo analysis mới.

**E1 – Backend analysis context thiếu snapshot/output hoặc sai schema/integrity**
- Backend từ chối Save; không tạo FeedbackAnalysis.

**E2 – Database failure**
- Không tạo record một phần; trả lỗi phù hợp.

### Business Rules / ràng buộc
- BR-008: insight chỉ là đề xuất.
- BR-030: FeedbackAnalysis lưu JSONB snapshot/output; không cần bảng quan hệ Feedback–FeedbackAnalysis riêng.
- BR-031: UTC/ISO 8601.
- Dữ liệu feedback có thể thay đổi/tăng thêm sau analysis nhưng không làm snapshot đã phân tích bị thay thế khi Save.

### Dữ liệu vào
- analysis reference của lần phân tích feedback đã thành công.

### Dữ liệu ra
- FeedbackAnalysis mới.

### Truy vết yêu cầu
- FR-ADM-006
- BR-008, BR-030, BR-031
- DATA-REQ-007
- BR-044
- OD-44
- DATA-REQ-015

### Acceptance Criteria
- [ ] Chỉ lưu output AI đã validate.
- [ ] feedbackIds snapshot lấy từ backend-owned analysis context và khớp dataset backend thực sự phân tích.
- [ ] Client không thể thay snapshot/output nguồn chỉ bằng cách sửa payload Save.
- [ ] Backend không thay snapshot analysis-time bằng dữ liệu feedback live tại thời điểm Save.
- [ ] Không cần bảng quan hệ riêng giữa FeedbackAnalysis và Feedback trong MVP.

---

## UC-ADM-007 – Xem lịch sử phân tích feedback

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Administrator |
| **Supporting actor** | Không |
| **Mục tiêu** | Cho Administrator list và xem chi tiết các `FeedbackAnalysis` đã lưu, sử dụng đúng dataset/output snapshot của lần phân tích. |
| **Trigger** | Administrator mở Lịch sử phân tích feedback. |

### Tiền điều kiện
- Administrator đã xác thực và `ACTIVE`.

### Hậu điều kiện
**Khi thành công**
- Administrator xem được danh sách/chi tiết analysis đã lưu.
- Không thay đổi Feedback, analysis record hoặc AI log.

### Luồng chính
1. Administrator mở lịch sử phân tích feedback.
2. Backend kiểm tra role/status Administrator.
3. Backend truy vấn `FeedbackAnalysis` đã lưu, sắp xếp theo `createdAt` phù hợp.
4. Frontend hiển thị danh sách với createdAt, totalFeedback/filter snapshot nếu có.
5. Administrator chọn một analysis.
6. Backend kiểm tra lại quyền Administrator và lấy record tương ứng.
7. Backend trả `inputSnapshot`, `analysisResult`, `createdAt` đã lưu.
8. Frontend hiển thị chi tiết read-only.

### Luồng thay thế / ngoại lệ
**A1 – Chưa có analysis**
- Trả danh sách rỗng; UI hiển thị empty state.

**E1 – User không phải Administrator hoặc đã DISABLED**
- Backend từ chối protected request.

**E2 – Analysis không tồn tại**
- Trả lỗi/not-found phù hợp.

### Business Rules / ràng buộc
- BR-012, BR-032: protected Admin authorization/status.
- BR-030: FeedbackAnalysis lưu snapshot/result JSONB.
- BR-031: UTC/ISO 8601.
- BR-046/OD-46: history read-only, dùng snapshot đã lưu, không thay bằng Feedback live, không gọi AI.

### Dữ liệu vào
- analysisId khi mở detail.
- Administrator hiện tại từ phiên.

### Dữ liệu ra
- List: analysisId, createdAt, totalFeedback và filter snapshot nếu có.
- Detail: inputSnapshot, analysisResult, createdAt.

### Truy vết yêu cầu
- FR-ADM-007
- FR-COM-003
- BR-012, BR-030, BR-031, BR-032, BR-046
- OD-46

### Acceptance Criteria
- [ ] Chỉ Administrator hợp lệ truy cập được history.
- [ ] Detail phản ánh đúng inputSnapshot/analysisResult đã lưu.
- [ ] Feedback live thay đổi không làm history cũ thay đổi.
- [ ] List/detail không gọi AI và không tạo AIRequestLog.
- [ ] MVP không edit/delete/compare/rerun analysis.

# 9. Feedback Use Case

## UC-FB-001 – Gửi feedback

| Thuộc tính | Nội dung |
|---|---|
| **Primary actor** | Student, Teacher |
| **Supporting actor** | Không |
| **Mục tiêu** | Cho Student/Teacher gửi phản hồi thật để Administrator có thể xem, thống kê và sử dụng trong AI feedback analysis. |
| **Trigger** | Student hoặc Teacher mở form feedback và gửi nội dung. |

### Tiền điều kiện
- User đã xác thực, ACTIVE và role là Student hoặc Teacher.

### Hậu điều kiện
**Khi thành công**
- Feedback hợp lệ được lưu với userId từ phiên và createdAt; sau đó nằm trong nguồn Admin có thể xem/lọc/phân tích.

**Bảo toàn khi không thành công / bị từ chối**
- Feedback invalid không được lưu; không hỗ trợ sửa/xóa/reply/ticket trong MVP.

### Luồng chính
1. User mở chức năng Gửi feedback.
2. User chọn đúng một tag trong danh sách cho phép.
3. User chọn rating 1–5.
4. User nhập content.
5. Frontend validate cơ bản và gửi request.
6. Backend xác định userId từ phiên, không tin userId client tự khai báo.
7. Backend validate tag enum, rating và content sau trim.
8. Backend lưu Feedback với createdAt UTC.
9. Feedback trở thành dữ liệu Admin có thể xem, thống kê và chọn phân tích.
10. Frontend xác nhận gửi thành công.

### Luồng thay thế / ngoại lệ
**E1 – Tag/rating/content không hợp lệ**
- Backend trả ERR-004.
- Không lưu Feedback.

**E2 – Role không phải Student/Teacher**
- Backend từ chối request.

### Business Rules / ràng buộc
- BR-013: feedback hợp lệ đi vào nguồn Admin analysis.
- BR-014: đúng một tag bắt buộc; AI không đổi tag.
- BR-031: timestamp UTC.
- Rating nguyên 1–5; content không rỗng sau trim.

### Dữ liệu vào
- tag: AI_PERFORMANCE / STUDY_PLAN / UI_UX / LEARNING_ANALYTICS / OTHER.
- rating 1–5.
- content.

### Dữ liệu ra
- Feedback: userId, tag, rating, content, createdAt.

### Truy vết yêu cầu
- FR-FB-001
- DATA-REQ-004
- BR-013, BR-014, BR-031

### Acceptance Criteria
- [ ] User bắt buộc chọn đúng một tag hợp lệ.
- [ ] Rating trong 1–5.
- [ ] Content không rỗng sau trim.
- [ ] userId lấy từ phiên.
- [ ] Feedback mới xuất hiện trong nguồn dữ liệu Administrator.

---

# 10. Ma trận truy vết Use Case → Functional Requirement

| Use Case | Functional Requirement chính | Cross-cutting / rule quan trọng |
|---|---|---|
| UC-COM-001 | FR-COM-001 | ERR-001, ERR-002, BR-039 |
| UC-COM-002 | FR-COM-002 | BR-032 |
| UC-COM-004 | FR-COM-004 | FR-COM-003, BR-012/023/032 |
| UC-STU-001 | FR-STU-001 | BR-017/025/027/034/036 |
| UC-STU-002 | FR-STU-002 | BR-001/016/034 |
| UC-STU-003 | FR-STU-003 | BR-037 |
| UC-STU-004 | FR-STU-004 | FR-COM-005/006, BR-004/010/034/035/041 |
| UC-STU-005 | FR-STU-005 | FR-COM-005/006, BR-021/035/037 |
| UC-STU-006 | FR-STU-006 | BR-005/021/024/025 |
| UC-STU-007 | FR-STU-007 | BR-001/024/025/036 |
| UC-STU-008 | FR-STU-008 | BR-009/017/025/027/036 |
| UC-STU-009 | FR-STU-009 | FR-COM-005/006, BR-006/028/035/036 |
| UC-TEA-001 | FR-TEA-001 | BR-002 |
| UC-TEA-002 | FR-TEA-002 | BR-002/019/026/027/038 |
| UC-TEA-003 | FR-TEA-003 + FR-TEA-004 internal | BR-017/018/026 |
| UC-TEA-005 | FR-TEA-005 + FR-TEA-004 internal | FR-COM-005/006, BR-004/007/026/035 |
| UC-TEA-006 | FR-TEA-006 | FR-COM-005/006, BR-007 |
| UC-TEA-007 | FR-TEA-007 | BR-002/030/044, DATA-REQ-015 |
| UC-TEA-008 | FR-TEA-008 | BR-002/012/030/031/045 |
| UC-ADM-001 | FR-ADM-001 | BR-029, AI-REQ-018 |
| UC-ADM-002 | FR-ADM-002 | BR-020/032/040 |
| UC-ADM-003 | FR-ADM-003 | BR-013/014/015 |
| UC-ADM-004 | FR-ADM-004 | FR-COM-005/006, BR-015/035/042/043, AI-REQ-024 |
| UC-ADM-005 | FR-ADM-005 | FR-COM-005/006, BR-003/008/042/043, AI-REQ-024 |
| UC-ADM-006 | FR-ADM-006 | BR-030/044, DATA-REQ-015 |
| UC-ADM-007 | FR-ADM-007 | BR-012/030/031/032/046 |
| UC-FB-001 | FR-FB-001 | BR-013/014 |

---

# 11. Các điểm ranh giới phải giữ cho artifact tiếp theo

## 11.1. Student

- `UC-STU-003` trả dữ liệu `goal + availableMinutesPerWeek + targetDeadline` đã chuẩn hóa; state tạm có thể do client/UI giữ, request AI gửi lại dữ liệu cần thiết và backend luôn validate lại.
- Với `UC-STU-004`, minimum-data theo SRS là AssessmentResult; tài liệu này không tự bổ sung rule mới coi thiếu `goal` là `INSUFFICIENT_DATA`. `UC-STU-005` vẫn yêu cầu goal/time/deadline hợp lệ theo FR-STU-003/005.
- `UC-STU-005` chịu trách nhiệm **generate + validate preview + cho phép chỉnh field hợp lệ + quyết định Apply/Reject**.
- `UC-STU-006` chỉ chạy khi Student chọn Apply và chịu trách nhiệm **revalidate tại applyTime + transaction lưu plan/task**.
- `UC-STU-009` là Use Case độc lập với `UC-STU-008`; không mô hình hóa thành `extend` chỉ vì nó dùng progress metric.
- AI adjustment không thêm/xóa task, không đổi Topic và không sửa task COMPLETED trong MVP.

## 11.2. Teacher

- Không có `UC-TEA-004`; rule backend FR-TEA-004 nằm trong `UC-TEA-003` và `UC-TEA-005`.
- `UC-TEA-006` là included Use Case phục vụ UC-TEA-005, không là chức năng Teacher phải khởi chạy độc lập trong MVP.
- Use Case Specification không chốt một hay nhiều external AI request cho `UC-TEA-005 + UC-TEA-006`; mỗi attempt thực tế đều phải có AIRequestLog.
- `UC-TEA-007` lưu inputSnapshot/analysisResult từ backend-owned analysis context của lần phân tích đã chọn; không tin snapshot do client gửi lại và không recompute dữ liệu live để thay snapshot khi Save.
- `UC-TEA-008` chỉ đọc report đã lưu của Class được phân công; không gọi AI, không recompute live và không sửa report.

## 11.3. Administrator

- Tag Feedback là dữ liệu chính thức do Student/Teacher chọn; AI không thay tag.
- `UC-ADM-004` chịu trách nhiệm external AI stage 1 cho issue grouping; backend validate feedbackIds, deduplicate và tự tính count.
- Theo `OD-43/BR-043`, dataset feedback không rỗng nhưng `issueGroups = []` sau validation/deduplicate vẫn là kết quả hợp lệ, không phải `INSUFFICIENT_DATA`.
- `UC-ADM-005` luôn bao gồm hành vi UC-ADM-004 và theo `OD-42/BR-042` thực hiện external AI stage 2 trên issueGroups đã được backend kiểm soát.
- `UC-ADM-006` chỉ lưu snapshot/result khi Admin chủ động chọn Lưu; dữ liệu nguồn lấy từ backend-owned analysis context của lần phân tích, không từ payload snapshot client và không thay bằng dữ liệu live tại thời điểm Save.
- `UC-ADM-007` chỉ đọc FeedbackAnalysis đã lưu; không gọi AI, không thay snapshot bằng Feedback live và không sửa analysis.

## 11.4. AI

- Không gọi AI khi `INSUFFICIENT_DATA` hoặc business ineligible được phát hiện trước inference.
- Chỉ tạo AIRequestLog khi backend thực sự attempt external AI call.
- AI output phải qua backend validation trước khi hiển thị như kết quả hợp lệ hoặc chuyển thành dữ liệu nghiệp vụ.
- AI không trực tiếp truy cập hoặc sửa PostgreSQL.

---

# 12. Phạm vi không thêm vào Use Case Specification MVP

Không tạo thêm Use Case cho:

- chatbot AI tổng quát;
- RAG / hỏi đáp PDF;
- forum / realtime chat;
- gamification;
- hệ thống thi trực tuyến đầy đủ;
- video learning;
- notification phức tạp;
- recommendation engine khóa học;
- quản lý nội dung học tập đầy đủ;
- ticket/support system;
- Admin reply feedback;
- AI tự quyết định thay người dùng.

---

# 13. Checklist review tài liệu

- [x] Đủ 27 Use Case theo Use Case Diagram v1.4 Baseline.
- [x] Không tạo UC-TEA-004 riêng.
- [x] Giữ đúng các quan hệ include/extend đã chốt.
- [x] Đưa FR-COM-003/005/006 vào hành vi xuyên suốt thay vì tạo Use Case giả.
- [x] Phân biệt `INSUFFICIENT_DATA` với business ineligible trước AI call.
- [x] Không để AI tự tính metric/count chính xác.
- [x] Mọi quyết định Apply/Save quan trọng do người dùng chủ động thực hiện.
- [x] Dùng latest AssessmentResult cho trạng thái hiện tại.
- [x] Giữ Teacher Student-detail read-only.
- [x] Giữ Feedback tag là phân loại chính thức của user.
- [x] Không mở rộng phạm vi ngoài MVP.
- [x] Preconditions chỉ chứa điều kiện trước khi actor bắt đầu; eligibility/minimum data được kiểm tra trong flow.
- [x] Main Flow của các Use Case chính bắt đầu từ hành động actor.
- [x] UC-STU-003 làm rõ handoff dữ liệu mà không khóa cơ chế state management cụ thể ở frontend.
- [x] UC-STU-004 áp dụng OD-41/BR-041: `goal` là optional context và thiếu goal không gây `INSUFFICIENT_DATA`.
- [x] UC-TEA-005/006 giữ quan hệ include và dùng đúng một external AI attempt theo AI Contract v1.0.
- [x] Admin feedback AI áp dụng OD-42/BR-042: two-stage external inference với backend validation nằm giữa.
- [x] Semantics `issueGroups = []` áp dụng OD-43/BR-043 và không bị nhầm thành `INSUFFICIENT_DATA`.
- [x] UC-ADM-004 chỉ tạo kết quả trung gian; backend-owned Save context chỉ được hoàn chỉnh sau UC-ADM-005.
- [x] UC-TEA-007 và UC-ADM-006 áp dụng OD-44/BR-044/DATA-REQ-015 cho backend-controlled analysis reference.
- [x] OD-41 đến OD-46 và BR-041 đến BR-046 đã được đồng bộ vào SRS v1.6 Baseline / Business Rules v1.4 Baseline.
- [x] UC-TEA-008 và UC-ADM-007 là history read-only, snapshot-based và không gọi AI.
- [x] Metadata/traceability trỏ tới SRS v1.6 Baseline, Business Rules v1.4 Baseline và Use Case Diagram v1.4 Baseline.

---

# 14. Lịch sử phiên bản

| Phiên bản | Ngày | Nội dung |
|---|---|---|
| 1.0 Draft | 21/10/2026 | Khởi tạo Use Case Specification đầy đủ cho 25 Use Case từ SRS v1.4, Use Case Diagram v1.2 Baseline và Business Rules v1.1 Baseline |
| 1.0 Draft Rev.1 | 21/10/2026 | Chuẩn hóa precondition/alternate flow; làm rõ Student draft handoff; chốt Teacher analysis + recommendation dùng một AI inference; chuẩn hóa analysis context/snapshot khi Save; cập nhật metadata SRS v1.4 Draft |
| 1.0 Draft Rev.2 | 21/10/2026 | Loại các quyết định chưa có nguồn chuẩn khỏi business rule: không khóa số AI request Teacher; xử lý ambiguity goal STU-004 theo SRS; chuyển Save sang backend-owned analysis context (analysis reference); trung lập hóa cơ chế giữ Student draft; chuẩn hóa thêm actor-first Main Flow |
| 1.0 Draft Rev.3 | 21/10/2026 | Sửa các điểm review cuối: giữ STU-004 trung lập về goal; sửa semantics dataset rỗng ở ADM-004; chỉ tạo Save context sau flow ADM-005 hoàn chỉnh; không khóa số external AI requests Admin; dùng backend-controlled analysis reference trung lập triển khai; chuẩn hóa precondition COM-001/STU-006 |
| 1.0 Draft Rev.4 | 21/10/2026 | Pre-baseline refinement: thêm Design Decision/Source Gap registry; chốt Admin feedback AI thành two-stage external inference ở mức local design; chốt semantics `issueGroups = []`; ghi rõ STU-004 goal là source gap; trace backend-controlled analysis reference thành DD-UCS-001 |
| 1.0 Baseline | 21/10/2026 | Đồng bộ SRS v1.4 Baseline, Business Rules v1.2 Baseline và Use Case Diagram v1.3 Baseline; thay local DD/SG bằng OD-41..44 và BR-041..44; hoàn tất traceability/checklist pre-baseline |
| 1.0 Baseline Rev.1 | 21/10/2026 | Governance/traceability cleanup: cập nhật nguồn BR/UCD Rev.1; bổ sung trace cục bộ cho UC-STU-004, UC-TEA-007, UC-ADM-004/005/006; không thay đổi Main Flow/business behavior |
| 1.1 Baseline Rev.1 | 21/10/2026 | Thực hiện CR-001: thêm UC-TEA-008 và UC-ADM-007; history list/detail read-only, snapshot-based, không external AI call |
| 1.2 Baseline Rev.1 | 26/10/2026 | Thực hiện CR-002: đồng bộ cross-cutting capacity preflight, `AI_INPUT_TOO_LARGE`, `AI_RUNTIME_FAILURE`, no-truncation và pre/post-dispatch logging semantics; không thêm Use Case mới |

---

# 15. Kết luận

Use Case Specification này giữ nguyên mô hình giá trị của hệ thống:

- **Student:** dữ liệu học tập → AI hỗ trợ → Student quyết định → backend lưu/cập nhật.
- **Teacher:** dữ liệu Class → backend tính/rule → AI phân tích và đề xuất → Teacher quyết định/lưu report → xem lại report đã lưu.
- **Administrator:** Feedback + thống kê backend → AI nhóm/tóm tắt/đề xuất → Administrator quyết định/lưu analysis → xem lại analysis đã lưu.

Use Case Specification v1.2 Baseline Rev.1 đã đồng bộ với SRS v1.6 Baseline Final, Business Rules v1.4 Baseline Rev.1 và Use Case Diagram v1.4 Baseline. Các ambiguity từng tồn tại ở Student goal context, Admin two-stage AI, empty issueGroups semantics và deferred Save integrity đã được chính thức hóa bằng OD-41 đến OD-46 và BR-041 đến BR-046.

Tài liệu này được chốt làm nguồn trực tiếp cho Activity Diagram, Sequence Diagram, API Specification, AI Contract và Test Case. Các chi tiết transport/storage như tên field của analysis reference, TTL hoặc cơ chế lưu context tiếp tục thuộc API/System Design nhưng không được làm thay đổi business behavior đã baseline hóa.
