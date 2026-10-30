# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## Hệ thống hỗ trợ tự học ứng dụng AI

**Phiên bản:** 1.7 Downstream Approved  
**Ngày:** 30/10/2026  
**Phạm vi:** MVP phục vụ đồ án chuyên ngành  
**Tech stack bắt buộc:** Next.js, NestJS, PostgreSQL, AI model tự triển khai (self-managed) trên Local GPU cho development/demo theo CP-005

---

# 1. Introduction – Giới thiệu

> **Governance:** Bản 1.7 là downstream successor được phê duyệt cho đúng phạm vi runtime host development/demo trong CP-005. Nó không thay đổi hoặc ghi đè `docs/baseline/SRS_v1.6_baseline_final.md`, R3 freeze, AI Contract, API, business rules, sáu AI task, authorization hay capacity preflight. Colab Lite PASS vẫn là bằng chứng lịch sử T4 FP16; Local GPU acceptance vẫn đang chờ kiểm thử phần cứng thật.

## 1.1. Purpose – Mục đích tài liệu

Tài liệu Software Requirements Specification (SRS) mô tả các yêu cầu phần mềm của **Hệ thống hỗ trợ tự học ứng dụng AI**.

Tài liệu được sử dụng làm cơ sở thống nhất cho các hoạt động:

- phân tích yêu cầu;
- thiết kế Use Case;
- thiết kế cơ sở dữ liệu;
- thiết kế API;
- thiết kế giao diện;
- tích hợp AI;
- triển khai phần mềm;
- kiểm thử;
- xây dựng dữ liệu demo;
- chuẩn bị kịch bản trình diễn đồ án.

SRS tập trung vào phiên bản MVP có ba vai trò chính: **Student, Teacher và Administrator**. Mỗi vai trò có một nhóm chức năng nền tảng và một luồng AI nổi bật.

## 1.2. Product Scope – Phạm vi sản phẩm

Hệ thống hỗ trợ quá trình tự học bằng cách kết hợp dữ liệu học tập với AI.

Ba luồng giá trị chính:

### Student – AI Learning Companion

`Kết quả học tập → phân tích điểm yếu → tạo kế hoạch cá nhân hóa → lưu kế hoạch → thực hiện nhiệm vụ → theo dõi tiến độ → đề xuất điều chỉnh`

### Teacher – AI Teaching Insight

`Dữ liệu lớp → backend tổng hợp → AI phân tích → xác định vấn đề đáng chú ý → đề xuất hỗ trợ → Teacher xem xét → lưu báo cáo → xem lại lịch sử phân tích`

### Administrator – AI System Intelligence

`Feedback có tag do người dùng chọn → backend thống kê theo tag → AI phân tích và nhóm vấn đề chi tiết → AI tóm tắt → đề xuất khu vực cải thiện → Administrator xem xét → lưu kết quả → xem lại lịch sử phân tích`

Nguyên tắc chung:

`Dữ liệu đầu vào → Backend xử lý → AI phân tích → Người dùng xem xét → Người dùng quyết định → Hệ thống lưu/cập nhật dữ liệu`

AI là thành phần hỗ trợ, không thay thế các phép tính chính xác của backend và không tự động ra quyết định thay người dùng.

## 1.3. Intended Audience – Đối tượng sử dụng tài liệu

Tài liệu dành cho:

- sinh viên thực hiện đồ án;
- thành viên nhóm phát triển;
- người thiết kế database/API/UI;
- người xây dựng và tích hợp AI;
- người kiểm thử;
- giảng viên hướng dẫn;
- hội đồng đánh giá đồ án.

## 1.4. Definitions, Acronyms and Abbreviations – Thuật ngữ

| Thuật ngữ | Ý nghĩa |
|---|---|
| AI | Artificial Intelligence – Trí tuệ nhân tạo |
| SRS | Software Requirements Specification |
| MVP | Minimum Viable Product – Phiên bản tối thiểu đủ chứng minh giá trị chính |
| Student | Người học |
| Teacher | Giáo viên phụ trách lớp |
| Administrator / Admin | Quản trị viên hệ thống |
| Frontend | Phần giao diện người dùng |
| Backend | Phần xử lý nghiệp vụ và API |
| API | Giao diện để các thành phần phần mềm trao đổi dữ liệu |
| Structured Output | Đầu ra AI theo cấu trúc xác định trước, ví dụ JSON |
| Study Plan | Kế hoạch học tập |
| Study Task | Nhiệm vụ thuộc kế hoạch học tập |
| Feedback | Phản hồi do Student hoặc Teacher gửi |
| Feedback Tag | Nhóm phản hồi do người dùng tự chọn khi gửi feedback |
| AI Request | Một lần hệ thống gửi dữ liệu sang AI để xử lý |
| Human-in-the-loop | AI đề xuất, con người quyết định áp dụng hay không |
| Seed Data | Dữ liệu mẫu được tạo trước phục vụ phát triển/demo |
| Self-managed AI | Mô hình AI do dự án tự triển khai và quản lý runtime/inference thay vì gọi dịch vụ AI thương mại trực tiếp |
| JSONB | Kiểu dữ liệu JSON dạng nhị phân của PostgreSQL, dùng để lưu snapshot/kết quả AI có cấu trúc nhưng không cần tách thành nhiều bảng |
| UTC | Múi giờ chuẩn dùng để lưu thời gian ở backend/database |
| ISO 8601 | Định dạng chuỗi ngày giờ chuẩn dùng trong API |

## 1.5. References – Tài liệu tham khảo

### REF-01
**Đặc tả phạm vi chức năng nền tảng – Hệ thống hỗ trợ tự học – Phiên bản 1.0**

Đây là tài liệu nguồn chính để xác định:

- phạm vi chức năng;
- ba vai trò;
- luồng nghiệp vụ;
- dữ liệu tối thiểu;
- business rules;
- ưu tiên MVP;
- các giới hạn AI;
- các vấn đề cần chốt tiếp.

### REF-02
Cấu trúc SRS của tài liệu này được tổ chức theo hướng thực dụng cho đồ án: giữ các phần chính thường có trong SRS và nhóm yêu cầu chức năng theo vai trò để dễ phát triển Use Case, API và Test Case.

## 1.6. Document Overview – Tổng quan tài liệu

- Section 2: Overall Description
- Section 3: System Context and User Interaction
- Section 4: Functional Requirements
- Section 5: AI-specific Requirements
- Section 6: Data Requirements
- Section 7: Business Rules
- Section 8: External Interface Requirements
- Section 9: Non-functional Requirements
- Section 10: Error Handling and Recovery
- Section 11: Requirements Traceability
- Section 12: Resolved Decisions
- Section 13: Appendices

---

# 2. Overall Description – Mô tả tổng quan

## 2.1. Product Perspective – Bối cảnh sản phẩm

Hệ thống là một web application hỗ trợ ba vai trò Student, Teacher và Administrator.

Hệ thống không nhằm xây dựng một LMS đầy đủ. Nội dung học tập chỉ cần đủ để hỗ trợ các luồng:

- kết quả học tập;
- chủ đề;
- kế hoạch;
- nhiệm vụ;
- tiến độ;
- dữ liệu lớp;
- feedback;
- phân tích AI.

Kiến trúc tổng quát:

```text
Web Browser
    |
    v
Next.js Frontend
    |
    | HTTP/HTTPS
    v
NestJS Backend API
    |
    +------------------------+
    |                        |
    v                        v
PostgreSQL               AI Service
                             |
                             v
                      Windows 11 + WSL2
                      Local GPU Runtime
```

## 2.2. Product Objectives – Mục tiêu hệ thống

### OBJ-01 – Hỗ trợ Student

Hệ thống phải giúp Student:

- hiểu tình trạng học tập;
- nhận biết điểm mạnh và điểm cần củng cố;
- đặt mục tiêu;
- nhận kế hoạch học tập;
- thực hiện các nhiệm vụ;
- theo dõi tiến độ;
- nhận gợi ý điều chỉnh khi cần.

### OBJ-02 – Hỗ trợ Teacher

Hệ thống phải giúp Teacher:

- theo dõi dữ liệu lớp;
- phát hiện khu vực cần chú ý;
- sử dụng AI để giải thích dữ liệu;
- nhận đề xuất hỗ trợ;
- lưu kết quả phân tích.

### OBJ-03 – Hỗ trợ Administrator

Hệ thống phải giúp Administrator:

- theo dõi một số chỉ số cơ bản;
- quản lý người dùng ở mức cơ bản;
- xem feedback;
- thống kê feedback theo tag và sử dụng AI để phân tích, nhóm, tóm tắt các vấn đề;
- nhận đề xuất cải thiện sản phẩm.

## 2.3. Product Scope and Boundaries – Phạm vi và ranh giới

### Trong phạm vi MVP

#### Common
- đăng nhập;
- đăng xuất;
- phân quyền;
- hồ sơ cơ bản;
- xử lý lỗi AI;
- AI request log.

#### Student
- dashboard;
- kết quả theo chủ đề;
- mục tiêu học;
- AI phân tích điểm mạnh/yếu;
- AI tạo kế hoạch;
- lưu kế hoạch;
- quản lý nhiệm vụ;
- theo dõi tiến độ;
- AI đề xuất điều chỉnh;
- gửi feedback.

#### Teacher
- danh sách lớp;
- danh sách Student;
- dashboard lớp;
- backend tổng hợp dữ liệu;
- backend phát hiện dữ liệu đáng chú ý;
- AI phân tích lớp;
- AI đề xuất hỗ trợ;
- lưu báo cáo;
- xem lịch sử phân tích AI đã lưu;
- gửi feedback.

#### Administrator
- dashboard hệ thống;
- quản lý người dùng cơ bản;
- xem/lọc feedback;
- backend thống kê feedback theo tag;
- AI phân tích và nhóm vấn đề chi tiết;
- AI tóm tắt vấn đề;
- AI đề xuất cải thiện;
- lưu kết quả phân tích;
- xem lịch sử phân tích feedback đã lưu.

### Ngoài phạm vi MVP

- chatbot AI tổng quát;
- RAG;
- upload PDF hỏi đáp;
- forum;
- realtime chat;
- gamification;
- badge/achievement;
- hệ thống thi trực tuyến đầy đủ;
- video learning;
- calendar phức tạp;
- email notification;
- AI tự tạo đề thi;
- recommendation engine khóa học;
- quản lý nội dung học tập đầy đủ;
- ticket/support system;
- Admin reply feedback;
- AI tự động đưa ra quyết định thay người dùng.

## 2.4. User Classes and Characteristics

### Student
Student là người sử dụng các chức năng hỗ trợ tự học và chỉ được truy cập dữ liệu học tập của chính mình.

### Teacher
Teacher phụ trách một hoặc nhiều lớp và chỉ được truy cập dữ liệu các lớp được phân công.

### Administrator
Administrator theo dõi hệ thống, người dùng và feedback trong phạm vi quyền quản trị được cho phép.

## 2.5. Operating Environment – Môi trường vận hành

### Frontend
- Next.js
- TypeScript
- chạy trên trình duyệt hiện đại

### Backend
- NestJS
- TypeScript
- REST API là giao thức mặc định của MVP

### Database
- PostgreSQL

### AI Runtime
- mô hình AI do dự án tự triển khai và quản lý runtime/inference (self-managed);
- cho development/demo, chạy trên một máy Windows 11 + WSL2 có GPU local được kiểm chứng; NestJS Windows gọi qua loopback và NestJS Linux gọi cùng instance qua HTTPS Tailscale Serve;
- FastAPI giữ bind loopback trong WSL2; chỉ một FastAPI/Qwen instance; Serve không khởi chạy model thứ hai;
- runtime phải được expose dưới dạng API/endpoint để NestJS có thể gọi và tiếp tục dùng Bearer token;
- Local GPU PASS phải được ghi nhận trước khi dọn Colab serving; Colab Lite PASS vẫn là historical model-candidate smoke, không phải bằng chứng Local GPU hoặc production readiness.

## 2.6. Design and Implementation Constraints

### CON-01
Frontend phải sử dụng Next.js.

### CON-02
Backend phải sử dụng NestJS.

### CON-03
Database chính phải sử dụng PostgreSQL.

### CON-04
AI runtime development/demo được triển khai trên máy Local GPU theo topology được CP-005 phê duyệt. Yêu cầu này chỉ operative sau release CP-005; Colab Lite PASS không được diễn giải thành Local GPU PASS.

### CON-05
Frontend không được truy cập trực tiếp PostgreSQL.

### CON-06
Frontend không được gọi trực tiếp AI runtime trong các luồng AI chính.

### CON-07
NestJS là thành phần trung gian giữa frontend và AI runtime.

### CON-08
AI runtime không được truy cập hoặc sửa PostgreSQL trực tiếp.

### CON-09
Các thống kê có thể tính chính xác bằng backend phải do backend tính.

### CON-10
Các đầu ra AI dùng cho nghiệp vụ phải ưu tiên structured output.

### CON-11
AI không được tự động áp dụng các thay đổi quan trọng nếu chưa có xác nhận của người dùng.

### CON-12
MVP ưu tiên luồng end-to-end hoàn chỉnh hơn số lượng chức năng.

## 2.7. Assumptions and Dependencies

### AS-01
Course và Topic của MVP sử dụng seed data nội bộ. AssessmentResult, Class và ClassMember cũng có thể được seed để phục vụ phát triển/demo.

### AS-02
Feedback được kết hợp giữa seed data và feedback thật khi demo.

### AS-03
AI phụ thuộc vào runtime/endpoint development-demo đang hoạt động. Trong cấu hình CP-005, runtime phụ thuộc vào máy Windows/WSL2 của đồng đội và Tailscale Serve cho NestJS trên Linux; nếu runtime không sẵn sàng, các chức năng không phụ thuộc AI vẫn hoạt động.

### AS-04
Nếu AI không khả dụng, các chức năng không phụ thuộc AI vẫn phải tiếp tục hoạt động.

### AS-05
Qwen model candidate đã qua Phase 1D.3-Lite smoke trên Colab; Local GPU acceptance trên Windows/WSL2 vẫn là gate riêng. Runtime phải hỗ trợ tối thiểu:
- phân tích;
- tóm tắt;
- nhóm vấn đề từ văn bản;
- tạo đề xuất;
- sinh structured output.

### AS-06
Mỗi tài khoản có một vai trò chính.

### AS-07
Teacher-Class có thể được seed hoặc thiết lập trước trong MVP.

### AS-08
MVP sử dụng **một Course chính** cho toàn bộ luồng demo. Tất cả Topic, AssessmentResult và dữ liệu lớp dùng trong ba luồng chính đều thuộc Course này. MVP không yêu cầu chức năng chọn/chuyển Course và Class không cần thêm `courseId` chỉ để phục vụ luồng demo.

---

# 3. System Context and User Interaction

## 3.1. System Context

Các thành phần chính:

1. **User**
   - Student
   - Teacher
   - Administrator

2. **Next.js Frontend**
   - hiển thị UI;
   - gửi request;
   - nhận và hiển thị dữ liệu.

3. **NestJS Backend**
   - xác thực;
   - phân quyền;
   - xử lý nghiệp vụ;
   - tính toán;
   - truy vấn PostgreSQL;
   - gọi AI;
   - validate đầu ra AI.

4. **PostgreSQL**
   - lưu dữ liệu nghiệp vụ.

5. **AI Runtime Local GPU trên Windows/WSL2 (development/demo)**
   - phân tích dữ liệu do backend cung cấp;
   - trả structured output.

## 3.2. Actors

| Actor | Mô tả |
|---|---|
| Student | Người học |
| Teacher | Giáo viên phụ trách lớp |
| Administrator | Quản trị viên |
| AI Service | Thành phần AI được backend gọi để phân tích và đề xuất |

AI Service không phải người dùng và không có quyền thao tác trực tiếp trên database.

## 3.3. High-level User Flows

### 3.3.1. Student Flow

1. Student đăng nhập.
2. Mở dashboard.
3. Xem kết quả theo chủ đề.
4. Nhập mục tiêu và khả năng học.
5. Yêu cầu AI phân tích.
6. Xem điểm mạnh/yếu.
7. Yêu cầu AI tạo kế hoạch.
8. Xem và chỉnh sửa thông tin được phép.
9. Chấp nhận kế hoạch.
10. Backend lưu StudyPlan và StudyTask.
11. Student thực hiện nhiệm vụ.
12. Student cập nhật trạng thái nhiệm vụ.
13. Backend tính lại tiến độ.
14. Khi cần, Student yêu cầu AI đề xuất điều chỉnh.
15. Student quyết định chấp nhận hoặc từ chối điều chỉnh.

### 3.3.2. Teacher Flow

1. Teacher đăng nhập.
2. Chọn lớp được phân công.
3. Xem dashboard lớp.
4. Backend tổng hợp dữ liệu.
5. Backend phát hiện các dữ liệu đáng chú ý theo rule.
6. Teacher yêu cầu AI phân tích lớp.
7. AI giải thích các vấn đề đáng chú ý dựa trên dữ liệu backend cung cấp.
8. AI đề xuất phương án hỗ trợ.
9. Teacher xem xét.
10. Teacher lưu báo cáo nếu cần.
11. Khi cần, Teacher mở lịch sử phân tích của Class và xem lại report đã lưu ở chế độ read-only.

### 3.3.3. Administrator Flow

1. Student hoặc Teacher chọn tag, rating và gửi feedback.
2. Administrator đăng nhập.
3. Xem dashboard hệ thống.
4. Xem danh sách feedback và tag tương ứng.
5. Chọn phạm vi feedback cần phân tích.
6. Backend lấy dữ liệu, thống kê số lượng theo tag và chuẩn hóa input cho AI.
7. AI phân tích nội dung và nhóm các vấn đề chi tiết.
8. AI tóm tắt vấn đề.
9. AI đề xuất khu vực cải thiện.
10. Administrator xem xét.
11. Administrator lưu kết quả phân tích.
12. Khi cần, Administrator mở lịch sử phân tích và xem lại FeedbackAnalysis đã lưu ở chế độ read-only.

## 3.4. Role-Permission Matrix

| Chức năng | Student | Teacher | Administrator |
|---|:---:|:---:|:---:|
| Đăng nhập/đăng xuất | ✓ | ✓ | ✓ |
| Xem hồ sơ cơ bản | ✓ | ✓ | ✓ |
| Xem dữ liệu học tập cá nhân | ✓ | Không | Không bắt buộc |
| Tạo kế hoạch học tập | ✓ | – | – |
| Quản lý StudyTask cá nhân | ✓ | – | – |
| AI phân tích Student | ✓ | – | – |
| Xem lớp được phân công | – | ✓ | – |
| Xem danh sách/chi tiết Student trong lớp được phân công | – | ✓ | – |
| AI phân tích lớp | – | ✓ | – |
| Lưu ClassAnalysisReport | – | ✓ | – |
| Xem lịch sử ClassAnalysisReport của Class được phân công | – | ✓ | – |
| Gửi feedback | ✓ | ✓ | – |
| Xem toàn bộ feedback | – | – | ✓ |
| AI phân tích feedback | – | – | ✓ |
| Xem lịch sử FeedbackAnalysis | – | – | ✓ |
| Xem và Active/Disable user | – | – | ✓ |
| Xem system dashboard | – | – | ✓ |

---

# 4. Functional Requirements – Yêu cầu chức năng

## 4.0. Quy ước mô tả yêu cầu

Mỗi yêu cầu chức năng có:

- **ID**
- **Tên**
- **Actor**
- **Mục tiêu**
- **Tiền điều kiện**
- **Đầu vào**
- **Luồng chính**
- **Đầu ra**
- **Hậu điều kiện**
- **Ngoại lệ**
- **Acceptance Criteria**

---

## 4.1. Common Functions

### FR-COM-001 – Đăng nhập

**Actor:** Student, Teacher, Administrator

**Mục tiêu:** Cho phép người dùng truy cập hệ thống bằng tài khoản hợp lệ.

**Tiền điều kiện:**
- tài khoản tồn tại;
- tài khoản ở trạng thái được phép đăng nhập.

**Đầu vào:**
- thông tin đăng nhập.

**Luồng chính:**
1. Người dùng nhập thông tin đăng nhập.
2. Frontend gửi request đến NestJS.
3. Backend kiểm tra dữ liệu.
4. Backend xác thực tài khoản.
5. Backend xác định role.
6. Backend tạo phiên/token phù hợp.
7. Frontend nhận thông tin đăng nhập.
8. Người dùng được chuyển đến dashboard theo role.

**Đầu ra:**
- trạng thái thành công;
- thông tin user cơ bản;
- role;
- thông tin xác thực cần thiết cho phiên làm việc.

**Ngoại lệ:**
- sai thông tin đăng nhập;
- tài khoản bị Disabled;
- lỗi server.

**Acceptance Criteria:**
- tài khoản hợp lệ đăng nhập được;
- tài khoản sai thông tin bị từ chối;
- role được xác định chính xác;
- user không thể truy cập màn hình role khác chỉ bằng cách nhập URL.

---

### FR-COM-002 – Đăng xuất

**Actor:** Student, Teacher, Administrator

**Mục tiêu:** Kết thúc phiên làm việc trên thiết bị hiện tại bằng cơ chế đơn giản phù hợp MVP.

**Luồng chính:**
1. User chọn đăng xuất.
2. Frontend/NestJS xóa cookie hoặc thông tin xác thực của phiên hiện tại theo cơ chế authentication được triển khai.
3. Frontend xóa trạng thái user cục bộ.
4. User được chuyển về trang đăng nhập.

**Quy tắc MVP:**
- không bắt buộc xây token blacklist hoặc hệ thống quản lý nhiều phiên đăng nhập;
- protected API vẫn phải xác thực token/phiên và kiểm tra `User.status` ở backend;
- tài khoản `DISABLED` phải bị từ chối ở protected API kể cả khi client còn giữ thông tin xác thực cũ.

**Acceptance Criteria:**
- sau đăng xuất, ứng dụng trên thiết bị hiện tại không tiếp tục sử dụng phiên vừa đăng xuất để truy cập màn hình/API bảo vệ;
- logout không yêu cầu module session management phức tạp.

### FR-COM-003 – Phân quyền theo vai trò

**Actor:** Hệ thống

**Mục tiêu:** Ngăn truy cập trái quyền.

**Luồng xử lý:**
1. Backend nhận request.
2. Xác định user và role.
3. Kiểm tra quyền đối với endpoint/tài nguyên.
4. Cho phép hoặc từ chối.

**Quy tắc:**
- Student không truy cập Teacher/Admin API.
- Teacher không truy cập Admin API.
- Teacher chỉ xem lớp được phân công.
- Student chỉ xem dữ liệu của mình.
- kiểm tra quyền phải thực hiện ở backend.

**Acceptance Criteria:**
- việc ẩn menu frontend không được xem là cơ chế phân quyền duy nhất;
- request trái quyền phải bị backend từ chối.

---

### FR-COM-004 – Xem hồ sơ cá nhân cơ bản

**Actor:** Student, Teacher, Administrator

**Dữ liệu tối thiểu:**
- họ tên;
- email;
- role;
- trạng thái tài khoản.

**Acceptance Criteria:**
- user đăng nhập có thể xem thông tin tài khoản của mình;
- MVP không yêu cầu module chỉnh sửa hồ sơ phức tạp.

---

### FR-COM-005 – Xử lý lỗi AI

**Actor:** Hệ thống

**Mục tiêu:** Đảm bảo lỗi AI không làm hỏng dữ liệu nghiệp vụ.

**Các trường hợp tối thiểu:**
- AI provider/runtime không phản hồi;
- timeout;
- response rỗng;
- response sai cấu trúc;
- response thiếu dữ liệu bắt buộc.

**Hành vi:**
1. Không lưu output lỗi như kết quả hợp lệ.
2. Không làm mất trạng thái nghiệp vụ trước lỗi.
3. Trả thông báo dễ hiểu.
4. Cho phép user thử lại khi phù hợp.
5. Ghi AIRequestLog.

**Acceptance Criteria:**
- lỗi AI không làm mất StudyPlan/StudyTask/report trước đó;
- UI nhận được trạng thái lỗi có thể hiển thị.

---

### FR-COM-006 – Ghi nhận lần gọi AI

**Actor:** Hệ thống

**Dữ liệu tối thiểu:**
- userId;
- feature;
- thời điểm;
- status;
- duration nếu thu thập được;
- errorCode nếu có.

**Acceptance Criteria:**
- mỗi lần gọi AI trong các tính năng chính tạo được log thành công hoặc thất bại;
- không bắt buộc lưu toàn bộ prompt.

---

## 4.2. Student – AI Learning Companion

### FR-STU-001 – Dashboard học tập

**Actor:** Student

**Mục tiêu:** Hiển thị nhanh trạng thái học tập hiện tại.

**Dữ liệu tối thiểu:**
- điểm theo chủ đề;
- StudyPlan hiện tại nếu có;
- số nhiệm vụ hoàn thành/tổng số;
- phần trăm tiến độ;
- nhiệm vụ gần hạn;
- cảnh báo chậm tiến độ khi `actualProgress < expectedProgress - 20` điểm phần trăm.

**Quy ước:**
- StudyPlan hiện tại là plan duy nhất của Student có status `ACTIVE` hoặc `COMPLETED`;
- task gần hạn là task `TODO` có `dueDate` lớn hơn thời điểm hiện tại và không quá `48 giờ` tiếp theo;
- task quá hạn là task `TODO` có `dueDate` nhỏ hơn thời điểm hiện tại.

**Luồng chính:**
1. Student mở dashboard.
2. Backend xác định Student hiện tại.
3. Backend lấy dữ liệu liên quan.
4. Backend tính các chỉ số.
5. Frontend hiển thị.

**Acceptance Criteria:**
- dashboard không cần gọi AI để hiển thị số liệu cơ bản;
- số liệu phải được backend tính từ dữ liệu thật;
- không cần tạo bảng `LearningProgress` chỉ để hiển thị dashboard.

### FR-STU-002 – Xem kết quả học tập theo chủ đề

**Actor:** Student

**Dữ liệu hiển thị:**
- Topic;
- Score;
- EvaluatedAt;
- trạng thái theo score: `>= 80` = Tốt; `60–79` = Cần củng cố; `< 60` = Cần ưu tiên.

**Luồng chính:**
1. Student mở trang kết quả.
2. Backend truy vấn AssessmentResult của Student hiện tại trong Course chính của MVP.
3. Với mỗi Topic, backend chọn AssessmentResult có `evaluatedAt` mới nhất.
4. Backend trả một kết quả hiện tại cho mỗi Topic có dữ liệu.
5. Frontend hiển thị.

**Acceptance Criteria:**
- Student không thể xem AssessmentResult của Student khác;
- score phải nằm trong thang `0–100`;
- trạng thái hiển thị đúng theo các ngưỡng đã chốt;
- cùng một Student/Topic chỉ dùng AssessmentResult mới nhất cho màn hình kết quả hiện tại;
- lịch sử điểm/trend không phải yêu cầu bắt buộc của MVP.

---

### FR-STU-003 – Nhập mục tiêu và khả năng học

**Actor:** Student

**Đầu vào:**
- mục tiêu học tập;
- số giờ có thể học mỗi tuần (`availableHoursPerWeek`);
- thời hạn mục tiêu (`targetDeadline`).

**Luồng chính:**
1. Student nhập thông tin.
2. Frontend validate cơ bản.
3. Backend validate.
4. Backend chuyển `availableHoursPerWeek` thành `availableMinutesPerWeek` để dùng thống nhất trong xử lý.
5. Dữ liệu được dùng làm input cho AI phân tích/tạo kế hoạch.
6. Nếu Student chấp nhận StudyPlan, `availableMinutesPerWeek` và `targetDeadline` được lưu vào StudyPlan tương ứng; nếu không chấp nhận thì không bắt buộc lưu riêng.

**Acceptance Criteria:**
- mục tiêu không được rỗng;
- `availableHoursPerWeek` phải lớn hơn `0`;
- `targetDeadline` phải nằm sau thời điểm hiện tại;
- MVP không cần entity riêng cho LearningPreference/StudyAvailability.

### FR-STU-004 – AI phân tích điểm mạnh và điểm yếu

**Actor:** Student

**Mục tiêu:** Giải thích kết quả học tập và xác định khu vực cần ưu tiên.

**Đầu vào do backend chuẩn bị:**
- AssessmentResult mới nhất theo từng Topic của Student trong Course chính;
- mục tiêu nếu Student đã nhập/có trong ngữ cảnh hiện tại;
- tiến độ hiện tại nếu có.

**Luồng chính:**
1. Student chọn phân tích bằng AI.
2. Backend lấy dữ liệu của Student.
3. Backend kiểm tra dữ liệu tối thiểu. Nếu Student chưa có AssessmentResult nào thì trả trạng thái `INSUFFICIENT_DATA` và không gọi AI.
4. Backend chuẩn hóa dữ liệu.
5. Backend gửi dữ liệu sang AI runtime.
6. AI trả structured output.
7. Backend validate.
8. Frontend hiển thị.

**Đầu ra tối thiểu:**
- strengths;
- areasToImprove;
- priorityTopics;
- reasons.

**Quy tắc:**
- AI không được tự tạo score;
- `goal` là **optional context** đối với Strength/Weakness Analysis; thiếu `goal` không làm request trở thành `INSUFFICIENT_DATA` nếu Student vẫn có AssessmentResult hợp lệ.

**Acceptance Criteria:**
- response chỉ sử dụng các score mới nhất theo Topic do backend cung cấp;
- nếu không có AssessmentResult, hệ thống không gọi AI và hiển thị thông báo chưa đủ dữ liệu;
- thiếu `goal` không phải điều kiện `INSUFFICIENT_DATA` của FR-STU-004;
- nếu AI response sai cấu trúc, hệ thống không hiển thị như kết quả thành công;
- lịch sử/trend điểm không phải đầu vào bắt buộc của AI Student trong MVP.

---

### FR-STU-005 – AI tạo kế hoạch học tập cá nhân hóa

**Actor:** Student

**Đầu vào:**
- AssessmentResult mới nhất theo từng Topic;
- mục tiêu Student đã nhập;
- `availableMinutesPerWeek`;
- `targetDeadline`;
- danh sách Topic hợp lệ của Course chính ở dạng tối thiểu `{ id, name }`.

Kết quả FR-STU-004 có thể được dùng bổ sung nếu đang có sẵn trong phiên làm việc, nhưng **không phải dependency bắt buộc** để tạo StudyPlan. Backend luôn có thể tạo request từ dữ liệu gốc ở trên.

**Đầu ra kế hoạch tối thiểu:**
- `planTitle`;
- danh sách StudyTask.

**Đầu ra mỗi task tối thiểu:**
- title;
- `topicId`;
- goal;
- expectedMinutes;
- dueDate;
- priority;
- reason nếu cần.

**Luồng chính:**
1. Backend chuẩn bị dữ liệu.
2. Backend kiểm tra dữ liệu tối thiểu. Nếu Student chưa có AssessmentResult nào hoặc danh sách Topic hợp lệ rỗng, backend trả `INSUFFICIENT_DATA` và không gọi AI.
3. Backend gọi AI.
4. AI trả kế hoạch có cấu trúc.
5. Backend validate.
6. Student xem trước.
7. Student có thể chỉnh `title`, `expectedMinutes`, `dueDate` và `priority` của StudyTask ở bước preview; có thể chỉnh `title` của StudyPlan.
8. Student không chỉnh trực tiếp kết quả phân tích AI, score hoặc dữ liệu nguồn.
9. Student chọn áp dụng hoặc từ chối.

**Quy tắc preview:**
- `planTitle` không được rỗng;
- `topicId` của mỗi task phải thuộc danh sách Topic backend đã cung cấp; AI không được tự tạo Topic mới;
- `priority` chỉ thuộc `LOW`, `MEDIUM`, `HIGH`;
- `expectedMinutes > 0`;
- `dueDate` của mỗi task không được sau `targetDeadline`;
- kế hoạch phải có ít nhất một StudyTask hợp lệ;
- `StudyPlan.goal` không lấy từ AI mà lấy trực tiếp từ mục tiêu Student đã nhập.

**Acceptance Criteria:**
- AI chưa được phép ghi StudyPlan trực tiếp;
- phải có bước preview trước khi lưu;
- output phải có `planTitle` và đủ dữ liệu để chuyển thành StudyTask;
- mọi `topicId` phải map được tới Topic tồn tại trong seed data của Course chính;
- nếu thiếu AssessmentResult hoặc Topic hợp lệ, hệ thống không gọi AI và trả trạng thái chưa đủ dữ liệu;
- FR-STU-004 không phải bước bắt buộc trước FR-STU-005;
- các trường Student được phép chỉnh phải được backend validate lại trước khi lưu.

### FR-STU-006 – Lưu và áp dụng kế hoạch

**Actor:** Student

**Tiền điều kiện:**
- có kế hoạch AI hợp lệ đang ở trạng thái preview;
- Student đã xác nhận áp dụng.

**Luồng chính:**
1. Student chọn áp dụng.
2. Backend lấy `applyTime = now`, kiểm tra lại quyền Student và **revalidate toàn bộ preview tại thời điểm Apply trước bất kỳ database mutation nào**.
3. Backend xác nhận:
   - `targetDeadline > applyTime`;
   - `StudyPlan.startDate` dự kiến bằng `applyTime`;
   - mọi StudyTask thỏa `applyTime <= dueDate <= targetDeadline`;
   - `expectedMinutes`, `priority`, `topicId`, title và các field bắt buộc khác vẫn hợp lệ.
4. Chỉ sau khi toàn bộ validation thành công, trong một transaction backend chuyển StudyPlan hiện tại (status `ACTIVE` hoặc `COMPLETED`) sang `ARCHIVED` nếu tồn tại.
5. Backend tạo StudyPlan mới với:
   - `title` = `planTitle` sau bước preview/chỉnh sửa;
   - `goal` = mục tiêu Student đã nhập;
   - `startDate` = `applyTime`;
   - `endDate` = `targetDeadline`;
   - `availableMinutesPerWeek` = giá trị đã chuẩn hóa;
   - `status` = `ACTIVE`.
6. Backend tạo các StudyTask với status ban đầu `TODO`.
7. Dashboard phản ánh kế hoạch mới.

**Quy tắc:**
- mỗi Student chỉ có tối đa một StudyPlan không bị archive, tức status thuộc `ACTIVE` hoặc `COMPLETED`;
- StudyPlan cũ chỉ được archive **sau khi** preview mới vượt qua toàn bộ validation tại thời điểm Apply;
- toàn bộ StudyTask phải có `dueDate` nằm từ `startDate` đến `endDate` của StudyPlan;
- tạo StudyPlan và StudyTask phải là thao tác nguyên tử: nếu tạo task thất bại thì không để lại plan tạo dở;
- preview từng hợp lệ trước đó không bảo đảm vẫn hợp lệ tại thời điểm Apply.

**Nếu validation tại thời điểm Apply thất bại:**
- không archive StudyPlan hiện tại;
- không tạo StudyPlan mới;
- không tạo StudyTask mới;
- giữ nguyên trạng thái nghiệp vụ trước đó;
- trả validation/business error phù hợp để Student chỉnh lại hoặc tạo preview mới.

**Acceptance Criteria:**
- từ chối kế hoạch không tạo StudyPlan mới;
- chấp nhận kế hoạch chỉ tạo plan/task khi dữ liệu vẫn hợp lệ tại `applyTime`;
- database update phải do backend thực hiện;
- không tồn tại đồng thời hai StudyPlan hiện tại cho cùng một Student;
- stale preview không được làm tạo `StudyPlan.startDate >= StudyPlan.endDate`.

### FR-STU-007 – Quản lý nhiệm vụ học tập

**Actor:** Student

**Chức năng tối thiểu:**
- xem danh sách task của StudyPlan hiện tại;
- xem Topic;
- xem expectedMinutes;
- xem dueDate;
- xem priority;
- đánh dấu hoàn thành;
- hoàn tác trạng thái hoàn thành khi plan vẫn là plan hiện tại.

**Status StudyTask:**
- `TODO`;
- `COMPLETED`.

**Luồng cập nhật trạng thái:**
1. Student chọn task.
2. Gửi thay đổi trạng thái.
3. Backend kiểm tra quyền sở hữu và xác nhận task thuộc StudyPlan hiện tại.
4. Khi chuyển sang `COMPLETED`, backend đặt `completedAt` bằng thời điểm hiện tại.
5. Khi hoàn tác về `TODO`, backend đặt `completedAt = null`.
6. Nếu tất cả task của StudyPlan hiện tại đều `COMPLETED`, backend chuyển StudyPlan sang `COMPLETED`.
7. Nếu Student hoàn tác một task của StudyPlan `COMPLETED`, StudyPlan quay lại `ACTIVE`.

**Acceptance Criteria:**
- Student chỉ cập nhật task thuộc StudyPlan hiện tại của mình;
- StudyPlan `ARCHIVED` là read-only trong MVP;
- status và `completedAt` phải nhất quán;
- không xây Todo system mở rộng ngoài các chức năng trên.

### FR-STU-008 – Theo dõi tiến độ

**Actor:** Student

**Backend tính tối thiểu trên StudyPlan hiện tại:**
- completedTasks;
- totalTasks;
- completionPercentage;
- overdueTasks;
- actualProgress;
- expectedProgress.

**Luồng chính:**
1. Student thay đổi StudyTask.
2. Backend lưu.
3. Backend tính lại chỉ số.
4. Dashboard hiển thị trạng thái mới.

**Công thức:**
- `actualProgress = completedTasks / totalTasks × 100`;
- `expectedProgress = tasksDueByNow / totalTasks × 100`, trong đó `tasksDueByNow` là số task có `dueDate <= thời điểm hiện tại`;
- `overdueTasks` là số task `TODO` có `dueDate < thời điểm hiện tại`;
- nếu `totalTasks = 0`, `actualProgress = expectedProgress = 0`;
- `completionRate` dùng trong Teacher metric bằng `actualProgress` trên StudyPlan hiện tại; Student chưa có StudyPlan hiện tại thì `completionRate = null`/N/A;
- Student được xem là chậm tiến độ khi `actualProgress < expectedProgress - 20` điểm phần trăm;
- các threshold/rule số học phải đánh giá trên **giá trị gốc trước khi làm tròn**; rounding chỉ phục vụ hiển thị;
- nếu thời điểm hiện tại đã vượt `StudyPlan.endDate` nhưng vẫn còn task `TODO`, StudyPlan **vẫn giữ status `ACTIVE`** trong MVP; các task chưa hoàn thành được xem là overdue theo rule hiện tại. Không tạo thêm status `EXPIRED`.

**Acceptance Criteria:**
- `completionPercentage`, `actualProgress`, `expectedProgress` và `overdueTasks` phải được backend tính;
- thay đổi trạng thái task phải phản ánh vào tiến độ;
- cảnh báo chậm tiến độ phải tuân thủ đúng ngưỡng 20 điểm phần trăm;
- không cần lưu snapshot tiến độ trong MVP.

### FR-STU-009 – AI đề xuất điều chỉnh kế hoạch

**Actor:** Student

**Điều kiện kích hoạt:**
- Student chủ động yêu cầu; hoặc
- hệ thống gợi ý khi backend phát hiện `actualProgress < expectedProgress - 20` điểm phần trăm.

**Eligibility trước khi gọi AI adjustment:**
Backend chỉ được gọi AI khi đồng thời:
1. Student có StudyPlan hiện tại;
2. `now <= StudyPlan.endDate`;
3. StudyPlan hiện tại có ít nhất một StudyTask `TODO`.

Nếu không có StudyPlan hiện tại:
- không gọi AI;
- không tạo `AIRequestLog`;
- không xem là AI inference failure;
- hướng Student tạo StudyPlan trước khi yêu cầu điều chỉnh.

Nếu `now > StudyPlan.endDate`:
- không gọi AI;
- không tạo `AIRequestLog`;
- không trả `INSUFFICIENT_DATA` chỉ vì plan quá hạn;
- hướng Student tạo plan mới nếu muốn deadline mới.

Nếu không còn StudyTask `TODO`:
- không gọi AI;
- không tạo `AIRequestLog`;
- thông báo kế hoạch không còn nhiệm vụ cần điều chỉnh.

Ba trường hợp trên là **không đủ điều kiện nghiệp vụ để adjustment**, không phải `INSUFFICIENT_DATA`.

**Đầu vào khi đủ eligibility:**
- StudyPlan hiện tại;
- các StudyTask `TODO`;
- actualProgress;
- expectedProgress;
- thời gian còn lại đến `endDate`;
- mục tiêu;
- `availableMinutesPerWeek`.

**Phạm vi AI được đề xuất điều chỉnh trong MVP:**
- `expectedMinutes` của task `TODO`;
- `dueDate` của task `TODO`;
- `priority` của task `TODO`.

AI không được đề xuất trong MVP:
- thêm hoặc xóa task;
- đổi Topic;
- sửa task `COMPLETED`;
- sửa score hoặc dữ liệu đánh giá;
- tự thay đổi database.

**Luồng chính:**
1. Backend tính tình trạng tiến độ và kiểm tra eligibility.
2. Student yêu cầu AI phân tích điều chỉnh.
3. Backend chỉ gửi dữ liệu cần thiết.
4. AI trả đề xuất có cấu trúc.
5. Backend validate các giá trị và bảo đảm `StudyPlan.startDate <= dueDate <= StudyPlan.endDate`.
6. Student xem đề xuất.
7. Student chấp nhận hoặc từ chối.
8. Nếu chấp nhận, backend cập nhật các StudyTask `TODO` được đề xuất.

**Acceptance Criteria:**
- AI không tự sửa database;
- không cập nhật kế hoạch nếu Student chưa chấp nhận;
- task `COMPLETED` không bị thay đổi bởi luồng điều chỉnh AI;
- không gọi AI adjustment khi không có current plan, plan đã quá `endDate`, hoặc không còn task `TODO`;
- các trường hợp business ineligible xảy ra trước external AI call và không tạo `AIRequestLog`.

## 4.3. Teacher – AI Teaching Insight

### FR-TEA-001 – Xem danh sách lớp

**Actor:** Teacher

**Luồng chính:**
1. Teacher mở danh sách lớp.
2. Backend xác định Teacher.
3. Truy vấn các Class được phân công.
4. Frontend hiển thị.

**Acceptance Criteria:**
- chỉ hiển thị lớp thuộc Teacher hiện tại.

---

### FR-TEA-002 – Xem danh sách Student trong lớp

**Actor:** Teacher

**Dữ liệu tối thiểu:**
- Student name;
- `averageScore`;
- `completionRate` của StudyPlan hiện tại nếu có;
- `overdueTaskCount` của StudyPlan hiện tại.

**Quy ước metric:**
- với mỗi Student/Topic, chỉ dùng AssessmentResult có `evaluatedAt` mới nhất;
- `averageScore` của Student là trung bình các score mới nhất theo Topic mà Student có kết quả; nếu chưa có kết quả thì trả `null`/N/A;
- `completionRate = completedTasks / totalTasks × 100 = actualProgress` trên StudyPlan hiện tại;
- nếu Student chưa có StudyPlan hiện tại thì `completionRate = null`/N/A thay vì `0`;
- nếu StudyPlan hiện tại tồn tại nhưng `totalTasks = 0` thì `completionRate = 0`;
- `overdueTaskCount` chỉ tính task `TODO` có `dueDate < now` của StudyPlan hiện tại; nếu không có plan thì bằng `0`;
- threshold/rule dùng giá trị tính toán gốc trước khi làm tròn.

**Luồng chính:**
1. Teacher chọn Class.
2. Backend kiểm tra Class thuộc Teacher.
3. Backend lấy ClassMember.
4. Backend tổng hợp dữ liệu theo các quy ước trên.
5. Frontend hiển thị.

**Acceptance Criteria:**
- Teacher không xem được danh sách lớp không thuộc quyền;
- Teacher được mở trang chi tiết từng Student nếu Student đó thuộc Class mình phụ trách;
- trang chi tiết Student trong MVP chỉ cần hiển thị read-only: score mới nhất theo Topic, `averageScore`, `completionRate`, `overdueTaskCount`, `actualProgress`, `expectedProgress`;
- Teacher không được chỉnh StudyPlan/StudyTask hoặc mục tiêu học tập của Student từ trang này;
- Teacher không được xem chi tiết Student ngoài các Class mình phụ trách;
- số liệu tổng hợp phải do backend tính.

### FR-TEA-003 – Dashboard lớp học

**Actor:** Teacher

**Dữ liệu tối thiểu:**
- `studentCount`;
- `classAverageScore`;
- `topicAverageScores`;
- `classCompletionRate`;
- `overdueTaskCount`;
- danh sách Student `Needs Attention`.

**Quy ước tính:**
- `topicAverageScores`: với mỗi Topic, lấy score mới nhất của từng Student có kết quả rồi tính trung bình; Student chưa có kết quả Topic đó không được xem là score `0`;
- `classAverageScore`: trung bình của các score mới nhất theo Student/Topic đang có dữ liệu;
- `classCompletionRate`: `tổng completedTasks / tổng tasks × 100` trên StudyPlan hiện tại của các Student có plan; Student chưa có plan không bị tính là `0%`;
- `overdueTaskCount` ở cấp Class = tổng số task `TODO` có `dueDate < now` thuộc StudyPlan hiện tại của tất cả Student trong Class; Student không có current plan đóng góp `0` vào count này;
- metric cấp Class này là **số task quá hạn**, không phải số Student có task quá hạn;
- nếu không có dữ liệu để tính một metric trung bình/tỷ lệ thì trả `null`/N/A.

**Acceptance Criteria:**
- dashboard hiển thị số liệu backend tính;
- AI không bắt buộc để dashboard hoạt động;
- trend/history chart không phải yêu cầu bắt buộc của MVP.

### FR-TEA-004 – Backend phát hiện dữ liệu đáng chú ý

**Actor:** Hệ thống

**Mục tiêu:** Xác định các tín hiệu đáng chú ý bằng rule trước khi AI phân tích.

**Rule đã chốt:**
- Topic có `averageScore < 60` → `Weak Topic`;
- Student → `Needs Attention` nếu thỏa ít nhất một điều kiện có dữ liệu: `averageScore < 60`, `completionRate < 50%`, hoặc `overdueTaskCount >= 2`;
- Student có StudyPlan hiện tại và `actualProgress < expectedProgress - 20` điểm phần trăm → `Progress Warning`;
- mọi threshold trên được đánh giá bằng **giá trị gốc trước khi làm tròn**; rounding chỉ phục vụ hiển thị UI.

**Quy tắc dữ liệu thiếu:**
- metric có giá trị `null`/N/A không được tự chuyển thành `0` chỉ để kích hoạt rule;
- Topic không có AssessmentResult nào thì không tự động được đánh dấu Weak Topic.

**Acceptance Criteria:**
- logic rule chạy ở backend;
- AI không tự quyết định hoặc thay đổi ngưỡng;
- cùng một dữ liệu đầu vào phải cho cùng một kết quả rule.

### FR-TEA-005 – AI phân tích tình hình lớp

**Actor:** Teacher

**Đầu vào:**
- studentCount;
- classAverageScore;
- topicAverageScores;
- classCompletionRate;
- overdueTaskCount;
- Weak Topics;
- Student/nhóm Student `Needs Attention` do backend xác định;
- Progress Warning nếu có.

**Luồng chính:**
1. Teacher chọn phân tích.
2. Backend tổng hợp dữ liệu và tạo input snapshot.
3. Backend kiểm tra dữ liệu tối thiểu. Class được xem là đủ dữ liệu để chạy AI Class Analysis nếu có ít nhất một trong hai:
   - có ít nhất một `AssessmentResult` hợp lệ của Student thuộc Class; hoặc
   - có ít nhất một Student thuộc Class có StudyPlan hiện tại chứa ít nhất một `StudyTask`.
   Nếu cả hai điều kiện đều không thỏa, backend trả `INSUFFICIENT_DATA`, không gọi AI và không tạo AI inference failure log.
4. Backend gửi AI.
5. AI trả phân tích có cấu trúc.
6. Backend validate.
7. Frontend hiển thị.

**Đầu ra tối thiểu:**
- summary;
- weakTopics;
- progressIssues;
- attentionGroups.

**Acceptance Criteria:**
- AI không tự tạo số lượng Student, score hoặc tỷ lệ;
- nhận xét phải dựa trên input backend cung cấp;
- phân tích trend theo lịch sử không bắt buộc trong MVP và được xem là P2.

### FR-TEA-006 – AI đề xuất phương án hỗ trợ

**Actor:** Teacher

**Đề xuất có thể gồm:**
- ôn lại Topic;
- giao bài thực hành;
- tăng hoạt động củng cố;
- theo dõi lại nhóm Student;
- ưu tiên hỗ trợ nhóm cụ thể.

**Quy tắc:**
- chỉ là gợi ý;
- không kết luận chắc chắn về năng lực, thái độ, động cơ hoặc ý thức của Student.

**Acceptance Criteria:**
- Teacher có thể xem đề xuất mà không làm thay đổi dữ liệu Student;
- hệ thống không tự động áp dụng đề xuất.

---

### FR-TEA-007 – Lưu báo cáo phân tích

**Actor:** Teacher

**Dữ liệu tối thiểu:**
- classId;
- inputSnapshot (`JSONB`);
- analysisResult (`JSONB`);
- createdAt.

`inputSnapshot` lưu dữ liệu tổng hợp chính xác tại thời điểm chạy AI. `analysisResult` lưu output AI đã validate, ví dụ `summary`, `weakTopics`, `progressIssues`, `attentionGroups`, `recommendations`.

**Luồng chính:**
1. Teacher xem kết quả AI hợp lệ.
2. Backend duy trì analysis context của lần phân tích đã hoàn thành và cung cấp cho client một opaque **backend-controlled analysis reference**.
3. Teacher chọn lưu.
4. Client gửi analysis reference; backend kiểm tra reference, quyền Class và lấy lại đúng `inputSnapshot` + `analysisResult` đã validate của lần phân tích đó.
5. Backend tạo ClassAnalysisReport.

**Acceptance Criteria:**
- chỉ Teacher có quyền với Class mới lưu report;
- report đủ dữ liệu để xem lại input tổng hợp và kết quả AI;
- dữ liệu dùng để Save phải lấy từ analysis context do backend kiểm soát; backend không coi snapshot/result do client tự gửi lại là nguồn chuẩn và không thay snapshot bằng dữ liệu live tại thời điểm Save;
- MVP không tạo bảng riêng cho WeakTopic, AttentionGroup hoặc Recommendation.

### FR-TEA-008 – Xem lịch sử phân tích AI của lớp

**Actor:** Teacher

**Mục tiêu:** Cho Teacher xem lại các `ClassAnalysisReport` đã lưu của Class mình được phân công mà không chạy lại AI hoặc thay thế snapshot lịch sử bằng dữ liệu live.

**Dữ liệu hiển thị tối thiểu ở danh sách:**
- report identifier;
- classId;
- createdAt;
- summary ngắn nếu `analysisResult` đã lưu có dữ liệu phù hợp.

**Dữ liệu chi tiết:**
- `inputSnapshot` đã lưu;
- `analysisResult` đã lưu, gồm các trường có trong report như `summary`, `weakTopics`, `progressIssues`, `attentionGroups`, `recommendations`.

**Luồng chính:**
1. Teacher chọn một Class mình được phân công và mở lịch sử phân tích.
2. Backend kiểm tra quyền Teacher–Class trước khi truy vấn report.
3. Backend trả các `ClassAnalysisReport` thuộc Class đó.
4. Teacher chọn một report.
5. Backend kiểm tra lại quyền và trả đúng snapshot/result đã lưu của report.
6. Frontend hiển thị chi tiết ở chế độ read-only.

**Quy tắc:**
- chỉ được xem report của Class Teacher đang được phân công;
- history là read-only trong MVP;
- không recompute metric từ dữ liệu Class hiện tại để thay thế `inputSnapshot`;
- không gọi AI chỉ để list hoặc mở report;
- không tạo `AIRequestLog` cho thao tác chỉ đọc lịch sử;
- không bao gồm edit/delete/compare/rerun AI trong MVP.

**Acceptance Criteria:**
- Teacher không xem được report của Class ngoài quyền dù biết reportId/classId;
- list/detail trả đúng record đã lưu;
- chi tiết phản ánh snapshot tại thời điểm analysis, không phản ánh lại dữ liệu live hiện tại;
- mở lịch sử không phát sinh external AI request.

## 4.4. Administrator – AI System Intelligence

### FR-ADM-001 – Dashboard hệ thống

**Actor:** Administrator

**Dữ liệu tối thiểu:**
- `totalUsers`;
- `usersByRole`;
- `totalFeedback`;
- `totalAIRequests`;
- `failedAIRequests`.

**Semantics metric trong MVP:**
- dashboard dùng số liệu **toàn thời gian**, không có date filter riêng;
- `totalUsers` = tổng số User đang lưu, bao gồm `ACTIVE` và `DISABLED`;
- `usersByRole` = tổng User theo role, bao gồm `ACTIVE` và `DISABLED`;
- `totalFeedback` = tổng số Feedback đang lưu;
- `totalAIRequests` = tổng số `AIRequestLog` của các lần backend đã thực sự attempt gọi external AI runtime/endpoint;
- `failedAIRequests` = số `AIRequestLog` có trạng thái thất bại;
- `totalAIRequests` bao gồm success, connection failure, timeout, empty response, invalid structured output và failure khác xảy ra sau khi backend đã bắt đầu external AI call;
- không tính vào `totalAIRequests`/`failedAIRequests` nếu request bị dừng trước external AI call, ví dụ `INSUFFICIENT_DATA`, business ineligible hoặc validation input thất bại.

**Ngoài phạm vi dashboard MVP:**
- activeUsers/DAU/MAU;
- CPU/GPU metrics;
- request-per-minute;
- biểu đồ monitoring hạ tầng chi tiết.

**Acceptance Criteria:**
- số liệu được backend tính/truy vấn;
- `failedAIRequests` luôn là tập con của `totalAIRequests`;
- dashboard không bắt buộc gọi AI;
- không cần thêm activity-tracking chỉ để phục vụ dashboard Admin.

### FR-ADM-002 – Quản lý người dùng cơ bản

**Actor:** Administrator

**Chức năng tối thiểu:**
- xem danh sách user;
- tìm kiếm theo tên/email;
- xem role;
- xem status;
- chuyển trạng thái tài khoản giữa `ACTIVE` và `DISABLED`.

**Quy tắc:**
- tài khoản `DISABLED` không được đăng nhập;
- protected API phải từ chối tài khoản `DISABLED` nếu trạng thái bị đổi trong khi user đang có phiên/token;
- thao tác thay đổi trạng thái phải đi qua backend và yêu cầu quyền Administrator;
- Administrator **không được disable chính tài khoản đang đăng nhập của mình** trong MVP;
- MVP không bao gồm reason/history cho việc disable, reset mật khẩu hoặc phân quyền tùy biến.

**Acceptance Criteria:**
- Admin xem được danh sách;
- role và status hiển thị đúng;
- Admin có thể Active/Disable user khác;
- Admin không thể disable chính tài khoản đang đăng nhập;
- user bị Disabled bị từ chối ở lần gọi protected API tiếp theo;
- không mở rộng thành module quản trị tài khoản phức tạp trong MVP.

### FR-ADM-003 – Xem danh sách feedback

**Actor:** Administrator

**Dữ liệu hiển thị:**
- người gửi;
- role;
- tag;
- rating;
- content;
- createdAt.

**Filter tối thiểu:**
- thời gian;
- rating;
- tag.

**Acceptance Criteria:**
- filter trả đúng phạm vi dữ liệu;
- tag hiển thị đúng giá trị người dùng đã chọn;
- thống kê theo tag phải do backend thực hiện.

---

### FR-ADM-004 – AI phân tích và nhóm vấn đề từ feedback

**Actor:** Administrator

**Mục tiêu:** Phân tích nội dung feedback đã có tag để phát hiện các vấn đề chi tiết và nhóm các phản hồi có nội dung tương tự.

**Tag cấp cao do người dùng chọn:**
- `AI_PERFORMANCE` – AI hỗ trợ;
- `STUDY_PLAN` – Kế hoạch học tập;
- `UI_UX` – Giao diện & trải nghiệm;
- `LEARNING_ANALYTICS` – Kết quả & tiến độ học tập;
- `OTHER` – Khác.

**Luồng chính:**
1. Admin chọn tập feedback bằng filter thời gian/rating/tag hoặc dùng toàn bộ dữ liệu hiện có.
2. Backend truy vấn tập feedback và tạo danh sách `feedbackIds` chính xác.
3. Nếu tập feedback rỗng, backend trả `INSUFFICIENT_DATA` và không gọi AI.
4. Backend tính `totalFeedback` và số lượng theo tag.
5. Backend loại bỏ dữ liệu không cần thiết trước khi gọi AI.
6. Backend thực hiện **external AI attempt stage 1** để AI phân tích content và tạo candidate issueGroups.
7. Mỗi candidate `issueGroup` tối thiểu có `title`, `summary`, `feedbackIds`.
8. Backend validate issue grouping theo thứ tự AI trả về:
   - deduplicate `feedbackIds` ngay trong từng group;
   - mọi `feedbackId` phải thuộc tập input;
   - group đầu tiên chứa một `feedbackId` hợp lệ được giữ ID đó;
   - nếu cùng `feedbackId` xuất hiện lại ở group sau, backend loại ID trùng khỏi group sau;
   - nếu một group không còn ID nào sau deduplicate, backend loại group rỗng;
   - `feedbackId` không thuộc tập input làm structured output không hợp lệ và không được lưu như kết quả thành công.
9. Backend tự tính lại `count = số feedbackIds` hợp lệ còn lại của từng issueGroup; không tin con số do AI tự ghi.
10. Nếu dataset feedback ban đầu không rỗng nhưng sau validation/deduplicate không còn issue group nào, backend giữ kết quả hợp lệ `issueGroups = []`; trường hợp này **không phải `INSUFFICIENT_DATA`**.
11. Frontend hiển thị thống kê tag của backend cùng các nhóm vấn đề do AI phát hiện.

**Quy tắc:**
- AI không được tự động thay đổi tag do người dùng chọn;
- số lượng theo tag và số lượng trong issue group do backend tính;
- issue grouping là insight hỗ trợ Admin, không thay thế tag chính thức của Feedback;
- FR-ADM-004 là stage 1 của Admin feedback AI flow; output phải qua backend validation/deduplicate trước khi được dùng bởi FR-ADM-005.

**Acceptance Criteria:**
- nếu filter không trả feedback nào, hệ thống không gọi AI và hiển thị trạng thái chưa đủ dữ liệu;
- mỗi feedback dùng đúng tag đã lưu trong database;
- thống kê tag khớp số lượng backend truy vấn;
- mọi `feedbackId` trong issueGroups thuộc tập input;
- AI output phải qua schema validation;
- dataset không rỗng nhưng `issueGroups = []` sau validation/deduplicate vẫn là kết quả thành công của FR-ADM-004;
- AI không ghi lại hoặc thay đổi tag của feedback.

### FR-ADM-005 – AI tóm tắt vấn đề và đề xuất cải thiện

**Actor:** Administrator

**Đầu vào:**
- feedback và tag do người dùng chọn;
- thống kê theo tag do backend tính;
- `issueGroups` từ FR-ADM-004 **sau backend validation/deduplicate**; danh sách này có thể rỗng nếu dataset feedback không rỗng nhưng không phát hiện nhóm vấn đề nổi bật.

**Luồng chính:**
1. FR-ADM-004 hoàn thành stage 1 và backend có dataset snapshot, tagStatistics và issueGroups đã validate.
2. Backend thực hiện **external AI attempt stage 2** với feedback/tagStatistics/issueGroups đã validate.
3. AI trả structured output gồm `summary`, `priorityAreas`, `recommendations`.
4. Backend validate output và ghi `AIRequestLog` cho external attempt stage 2 theo AI-REQ-018.
5. Backend chuẩn bị analysis context hoàn chỉnh để Admin xem và có thể Save qua FR-ADM-006.

**Đầu ra:**
- summary;
- priorityAreas;
- recommendations.

**Acceptance Criteria:**
- AI chỉ đề xuất;
- Admin là người quyết định ưu tiên;
- structured output phải được backend validate;
- khi toàn bộ Admin feedback analysis flow chạy thành công qua cả FR-ADM-004 và FR-ADM-005, có hai external AI attempts tách biệt và mỗi attempt được log;
- `issueGroups = []` từ một grouping result hợp lệ không chặn FR-ADM-005 nếu dataset feedback ban đầu không rỗng.

---

### FR-ADM-006 – Lưu kết quả phân tích feedback

**Actor:** Administrator

**Dữ liệu tối thiểu:**
- inputSnapshot (`JSONB`);
- analysisResult (`JSONB`);
- createdAt.

`inputSnapshot` tối thiểu lưu:
- filter đã dùng (`fromDate`, `toDate`, `rating`, `tag` nếu có);
- `feedbackIds`;
- `totalFeedback`;
- `tagStatistics`.

`analysisResult` tối thiểu lưu:
- `issueGroups`;
- `summary`;
- `priorityAreas`;
- `recommendations`.

**Luồng lưu:**
1. Sau FR-ADM-005 thành công, backend duy trì analysis context hoàn chỉnh và cung cấp opaque **backend-controlled analysis reference**.
2. Administrator chọn Lưu; client gửi analysis reference.
3. Backend lấy lại đúng `inputSnapshot` và `analysisResult` đã validate từ analysis context, kiểm tra quyền/trạng thái hợp lệ rồi tạo FeedbackAnalysis.

**Acceptance Criteria:**
- chỉ lưu output AI đã validate;
- `feedbackIds` phải khớp tập dữ liệu backend thực sự gửi phân tích;
- backend không coi snapshot/result do client tự gửi lại là nguồn chuẩn và không thay snapshot bằng dữ liệu live tại thời điểm Save;
- không cần bảng quan hệ riêng giữa FeedbackAnalysis và từng Feedback trong MVP vì danh sách ID đã được snapshot trong JSONB.

### FR-ADM-007 – Xem lịch sử phân tích feedback

**Actor:** Administrator

**Mục tiêu:** Cho Administrator xem lại các `FeedbackAnalysis` đã lưu mà không chạy lại AI hoặc thay snapshot lịch sử bằng dữ liệu Feedback hiện tại.

**Dữ liệu hiển thị tối thiểu ở danh sách:**
- analysis identifier;
- createdAt;
- `totalFeedback` từ `inputSnapshot` nếu có;
- filter snapshot (`fromDate`, `toDate`, `rating`, `tag` nếu có).

**Dữ liệu chi tiết:**
- `inputSnapshot` đã lưu;
- `analysisResult` đã lưu gồm `issueGroups`, `summary`, `priorityAreas`, `recommendations`.

**Luồng chính:**
1. Administrator mở lịch sử phân tích feedback.
2. Backend xác thực role/status Administrator.
3. Backend trả danh sách `FeedbackAnalysis` đã lưu.
4. Administrator chọn một analysis.
5. Backend trả đúng `inputSnapshot` và `analysisResult` đã lưu.
6. Frontend hiển thị chi tiết ở chế độ read-only.

**Quy tắc:**
- không recompute `totalFeedback`, `tagStatistics` hoặc issue groups từ dữ liệu Feedback live để thay snapshot;
- không gọi AI chỉ để list hoặc mở analysis;
- không tạo `AIRequestLog` cho thao tác chỉ đọc lịch sử;
- không bao gồm edit/delete/compare/rerun AI trong MVP.

**Acceptance Criteria:**
- chỉ Administrator hợp lệ truy cập được history;
- list/detail phản ánh record đã lưu;
- dữ liệu Feedback mới hoặc thay đổi sau analysis không làm thay nội dung snapshot lịch sử;
- mở lịch sử không phát sinh external AI request.

## 4.5. Feedback

### FR-FB-001 – Gửi feedback

**Actor:** Student, Teacher

**Đầu vào:**
- tag bắt buộc;
- rating 1–5;
- content.

**Các tag hiển thị cho người dùng:**
- **AI hỗ trợ** → `AI_PERFORMANCE`;
- **Kế hoạch học tập** → `STUDY_PLAN`;
- **Giao diện & trải nghiệm** → `UI_UX`;
- **Kết quả & tiến độ học tập** → `LEARNING_ANALYTICS`;
- **Khác** → `OTHER`.

**Backend bổ sung:**
- userId;
- createdAt.

**Luồng chính:**
1. User mở chức năng gửi feedback.
2. Chọn một tag dễ hiểu.
3. Chọn rating.
4. Nhập content.
5. Gửi.
6. Backend validate tag, rating và content.
7. Backend lưu Feedback.
8. Feedback xuất hiện trong phạm vi Admin có thể xem và thống kê.

**Ngoài phạm vi MVP:**
- sửa feedback;
- xóa feedback;
- Admin reply;
- ticket;
- Open/Resolved;
- notification xử lý feedback.

**Acceptance Criteria:**
- user bắt buộc chọn đúng một tag trong danh sách cho phép;
- chỉ chấp nhận rating từ `1–5`;
- content bắt buộc và không được chỉ chứa khoảng trắng;
- userId lấy từ phiên đăng nhập, không tin trực tiếp giá trị do client tự khai báo;
- AI không tự đổi tag sau khi feedback đã được lưu.

---

# 5. AI-specific Requirements

## 5.1. AI Responsibility

### AI-REQ-001
AI chỉ được sử dụng để:
- giải thích dữ liệu;
- tóm tắt;
- nhóm/phân tích văn bản;
- đề xuất phương án;
- tạo kế hoạch có cấu trúc.

### AI-REQ-002
AI không được tự tạo các số liệu mà backend có thể tính chính xác.

### AI-REQ-003
AI không được trực tiếp ghi hoặc sửa PostgreSQL.

### AI-REQ-004
Mọi lời gọi AI nghiệp vụ phải đi qua NestJS.

## 5.2. AI Input Requirements

### AI-REQ-005
Backend phải chuẩn hóa dữ liệu trước khi gửi AI.

### AI-REQ-006
Chỉ gửi dữ liệu cần thiết cho tác vụ hiện tại.

### AI-REQ-007
Không gửi secret, password hash hoặc dữ liệu không cần thiết vào prompt.

### AI-REQ-008
Dữ liệu số quan trọng phải được cung cấp rõ ràng, tránh yêu cầu AI tự suy đoán.

## 5.3. Structured Output

### AI-REQ-009
Các tính năng sau phải ưu tiên structured output:
- Student analysis;
- Study Plan generation;
- Study Plan adjustment;
- Class analysis;
- Teacher recommendations;
- Feedback issue grouping;
- Feedback summary/recommendations.

### AI-REQ-010
Backend phải validate:
- JSON parse được;
- field bắt buộc tồn tại;
- kiểu dữ liệu phù hợp;
- enum/giá trị nằm trong phạm vi nếu có schema.

## 5.4. Human-in-the-loop

### AI-REQ-011
StudyPlan chỉ được áp dụng sau khi Student chấp nhận.

### AI-REQ-012
Điều chỉnh StudyPlan chỉ được áp dụng sau khi Student chấp nhận.

### AI-REQ-013
Teacher quyết định có sử dụng recommendation hay không.

### AI-REQ-014
Administrator quyết định khu vực cải thiện, AI không tự thay đổi hệ thống.

## 5.5. AI Failure Handling

### AI-REQ-015
Phải xử lý:
- connection error;
- timeout;
- configured AI runtime unavailable;
- invalid response;
- empty response;
- schema validation failure.

### AI-REQ-016
AI error không được làm mất dữ liệu nghiệp vụ đã tồn tại.

### AI-REQ-017
User phải nhận thông báo có thể hiểu và có thể thử lại khi thích hợp.

## 5.6. AI Logging

### AI-REQ-018
Mỗi lần backend đã thực sự **attempt gọi external AI runtime/endpoint** phải có `AIRequestLog`.

Các trường hợp dừng trước external AI call như validation input thất bại, `INSUFFICIENT_DATA` hoặc business ineligible không tạo `AIRequestLog`.

### AI-REQ-019
MVP không lưu toàn bộ prompt hoặc raw response mặc định. Hệ thống chỉ bắt buộc lưu metadata trong AIRequestLog và các output nghiệp vụ đã được backend validate khi chức năng yêu cầu lưu. Việc bật log raw phục vụ debug chỉ được thực hiện tạm thời ở môi trường phát triển và không phải hành vi mặc định.

## 5.7. AI Runtime

### AI-REQ-020
AI model self-managed cho development/demo phải được expose qua API endpoint mà NestJS truy cập được. Theo CP-005, chỉ một FastAPI/Qwen NF4 instance chạy trong WSL2 trên máy Windows 11 GPU; NestJS trên cùng máy dùng loopback sau khi Windows-to-WSL localhost được xác minh, NestJS Linux dùng HTTPS Tailscale Serve. Bảo toàn model revision đã chọn và toàn bộ yêu cầu tác vụ/structured output hiện hành. Local GPU PASS cần kiểm thử thật; Lite PASS trên Colab T4 không thay thế gate này.

### AI-REQ-021
Hệ thống phải coi AI runtime là external dependency có thể tạm thời unavailable.

### AI-REQ-022
Không được giả định runtime host hoặc Tailscale Serve luôn hoạt động. Nếu máy WSL2 ngủ/tắt, runtime dừng hoặc endpoint không truy cập được, hệ thống phải đánh dấu chức năng AI là tạm thời không khả dụng và không làm gián đoạn các chức năng không phụ thuộc AI.

### AI-REQ-023
Backend phải kiểm tra dữ liệu tối thiểu và eligibility nghiệp vụ trước khi gọi AI.

- Nếu không đủ dữ liệu tối thiểu, backend trả `INSUFFICIENT_DATA`, không gửi request sang AI runtime, không tạo `AIRequestLog` và UI hiển thị thông báo phù hợp.
- Nếu chức năng không đủ eligibility nghiệp vụ để gọi AI nhưng dữ liệu không thuộc trường hợp `INSUFFICIENT_DATA`, backend không gọi AI, không tạo `AIRequestLog` và trả trạng thái/message nghiệp vụ phù hợp.
- Teacher Class Analysis áp dụng điều kiện dữ liệu tối thiểu tại OD-33; StudyPlan Adjustment áp dụng eligibility tại OD-40.

### AI-REQ-024
Admin feedback analysis trong MVP sử dụng **two-stage external AI inference**:
1. stage 1 (`FR-ADM-004`) tạo candidate issueGroups;
2. backend validate/deduplicate issueGroups và tự tính count;
3. stage 2 (`FR-ADM-005`) dùng feedback/tagStatistics/issueGroups đã validate để tạo summary, priorityAreas và recommendations.

Mỗi external attempt thực tế phải có `AIRequestLog` theo AI-REQ-018. Nếu stage 1 dừng trước external call do dataset rỗng thì không có stage 1 log và không chạy stage 2.

---

## 5.8. CR-002 — Capacity preflight và authoritative dataset

Các AI task phải dùng toàn bộ authoritative input theo contract. Model/context limit không được biến thành business rule bằng cách tự cắt dữ liệu.

Mỗi deployment AI phải có `capacityProfileVersion` được benchmark và bind tối thiểu với `contractVersion`, `modelId`, `tokenizerId`, `contextWindowTokens`, safety margin và `promptVersion`/reserved output/prompt+schema overhead theo task.

Backend phải thực hiện capacity preflight trước network dispatch. Profile missing/malformed/binding mismatch là `AI_RUNTIME_FAILURE`; profile hợp lệ nhưng input vượt validated budget là `AI_INPUT_TOO_LARGE`. Cả hai path trước dispatch đều không tạo `AIRequestLog`.

Việc đổi model/tokenizer/prompt version yêu cầu capacity profile mới được benchmark và deploy đồng bộ; không được tái sử dụng profile cũ chỉ vì JSON schema vẫn tương thích.

---

# 6. Data Requirements

## 6.1. User

Thuộc tính tối thiểu:
- id;
- fullName;
- email;
- passwordHash hoặc thông tin xác thực tương ứng;
- role;
- status;
- createdAt.

Ràng buộc:
- email phải định danh tài khoản và **unique** trong hệ thống;
- trước lookup/lưu email, backend phải `trim` và chuyển email về lowercase;
- uniqueness được kiểm tra trên giá trị email đã normalize; ví dụ `Student@Demo.com` và `student@demo.com` được xem là cùng một email trong MVP;
- login/lookup phải áp dụng cùng quy tắc normalization với lúc tạo tài khoản;
- role thuộc tập role được hệ thống hỗ trợ;
- status thuộc `ACTIVE` hoặc `DISABLED`;
- passwordHash không được trả về frontend.

## 6.2. Class

- id;
- name;
- teacherId.

Quan hệ:
- một Teacher có thể phụ trách nhiều Class;
- Class thuộc một Teacher trong mô hình MVP hiện tại;
- MVP sử dụng một Course chính dùng chung cho các Class demo, vì vậy `Class` không cần `courseId` trong phạm vi hiện tại.

## 6.3. ClassMember

- classId;
- studentId.

Mục tiêu:
- biểu diễn Student thuộc Class.

## 6.4. Course

- id;
- name;
- description.

MVP chỉ cần đủ dữ liệu cho luồng học tập.

## 6.5. Topic

- id;
- courseId;
- name.

## 6.6. AssessmentResult

- id;
- studentId;
- topicId;
- score;
- evaluatedAt.

Ràng buộc:
- score sử dụng thang `0–100`;
- `>= 80`: Tốt; `60–79`: Cần củng cố; `< 60`: Cần ưu tiên;
- các màn hình/metric hiện tại của Student và Teacher sử dụng bản ghi có `evaluatedAt` mới nhất cho mỗi cặp Student–Topic; lịch sử AssessmentResult vẫn có thể tồn tại trong database nhưng phân tích trend không thuộc MVP.

## 6.7. StudyPlan

- id;
- studentId;
- title;
- goal;
- availableMinutesPerWeek;
- startDate;
- endDate;
- status;
- createdAt.

`status` chỉ gồm:
- `ACTIVE`;
- `COMPLETED`;
- `ARCHIVED`.

Quy tắc:
- mỗi Student có tối đa một StudyPlan hiện tại với status `ACTIVE` hoặc `COMPLETED`;
- `startDate` là thời điểm Student chấp nhận kế hoạch;
- `endDate` là target deadline đã nhập;
- khi Student áp dụng plan mới, plan hiện tại cũ chuyển `ARCHIVED`;
- khi toàn bộ task hoàn thành, plan `ACTIVE` chuyển `COMPLETED`;
- nếu `endDate` đã qua nhưng vẫn còn task `TODO`, plan vẫn là `ACTIVE`; không tạo status `EXPIRED` trong MVP;
- Student muốn có deadline mới sau khi plan quá hạn phải tạo plan mới, khi đó plan cũ chuyển `ARCHIVED`;
- StudyPlan `ARCHIVED` là read-only trong MVP.

## 6.8. StudyTask

- id;
- studyPlanId;
- topicId;
- title;
- goal;
- expectedMinutes;
- dueDate;
- priority;
- status;
- completedAt.

`priority` chỉ gồm:
- `LOW`;
- `MEDIUM`;
- `HIGH`.

`status` chỉ gồm:
- `TODO`;
- `COMPLETED`.

Quy tắc:
- `topicId` phải tham chiếu Topic tồn tại trong Course chính của MVP;
- `expectedMinutes > 0`;
- `dueDate` phải nằm trong khoảng từ `StudyPlan.startDate` đến `StudyPlan.endDate`;
- `completedAt` bắt buộc có khi status `COMPLETED` và bằng `null` khi status `TODO`;
- task quá hạn khi status `TODO` và `dueDate < now`;
- task gần hạn khi status `TODO` và `now < dueDate <= now + 48 giờ`.

## 6.9. LearningProgress

Không bắt buộc tạo bảng riêng.

Ưu tiên tính trực tiếp từ StudyTask.

Chỉ tạo entity/table riêng nếu cần:
- snapshot;
- lịch sử tiến độ;
- biểu đồ lịch sử.

## 6.10. ClassAnalysisReport

- id;
- classId;
- inputSnapshot (`JSONB`);
- analysisResult (`JSONB`);
- createdAt.

`inputSnapshot` lưu các metric/backend rule tại thời điểm phân tích. `analysisResult` lưu output AI đã validate. MVP không tách các nhóm weak topic, attention group hoặc recommendation thành bảng riêng.

## 6.11. Feedback

- id;
- userId;
- tag;
- rating;
- content;
- createdAt.

`tag` là enum bắt buộc gồm:
- `AI_PERFORMANCE`;
- `STUDY_PLAN`;
- `UI_UX`;
- `LEARNING_ANALYTICS`;
- `OTHER`.

Tag do Student/Teacher chọn khi gửi và không bị AI tự động thay đổi.

## 6.12. FeedbackAnalysis

- id;
- inputSnapshot (`JSONB`);
- analysisResult (`JSONB`);
- createdAt.

`inputSnapshot` tối thiểu gồm filter, `feedbackIds`, `totalFeedback`, `tagStatistics`. `analysisResult` tối thiểu gồm `issueGroups`, `summary`, `priorityAreas`, `recommendations`.

MVP không cần bảng nối riêng Feedback–FeedbackAnalysis vì `feedbackIds` được lưu trong snapshot.

## 6.13. AIRequestLog

- id;
- userId;
- feature;
- status;
- errorCode;
- duration;
- createdAt.

Quy ước:
- tạo log khi backend đã thực sự attempt external AI call;
- connection failure, timeout, empty response, invalid structured output và các failure khác sau khi external call bắt đầu vẫn tạo log với trạng thái thất bại phù hợp;
- validation input thất bại trước AI call, `INSUFFICIENT_DATA` và business ineligible trước AI call không tạo log.

## 6.14. Data Relationships

```text
User(Student)
   |
   +-- AssessmentResult -- Topic -- Course
   |
   +-- StudyPlan -- StudyTask

User(Teacher)
   |
   +-- Class -- ClassMember -- User(Student)
   |
   +-- ClassAnalysisReport

User(Student/Teacher)
   |
   +-- Feedback

Feedback
   |
   +-- FeedbackAnalysis (phân tích theo tập dữ liệu)

Toàn hệ thống
   |
   +-- AIRequestLog
```

## 6.15. Data Validation

### DATA-REQ-001
Backend phải validate dữ liệu từ client.

### DATA-REQ-002
Không tin các ID quyền sở hữu do frontend gửi nếu backend có thể xác định từ phiên đăng nhập.

### DATA-REQ-003
Mọi timestamp lưu trong backend/database phải dùng UTC. API truyền ngày giờ theo ISO 8601; frontend chịu trách nhiệm hiển thị theo local time.

### DATA-REQ-004
Rating chỉ nhận giá trị nguyên từ `1–5`; Feedback.tag phải thuộc enum được định nghĩa ở Section 6.11; Feedback.content bắt buộc và không được rỗng sau khi trim.

### DATA-REQ-005
`availableMinutesPerWeek` và `expectedMinutes` phải lớn hơn `0`.

### DATA-REQ-006
`StudyTask.dueDate` phải nằm từ `StudyPlan.startDate` đến `StudyPlan.endDate`.

### DATA-REQ-007
AI structured output phải được validate trước khi chuyển thành entity nghiệp vụ hoặc lưu trong report.

### DATA-REQ-008
AssessmentResult.score phải nằm trong khoảng `0–100`.

### DATA-REQ-009
AIRequestLog được giữ trong suốt vòng đời phát triển/demo của đồ án; MVP không triển khai job tự động xóa log.

### DATA-REQ-010
Với metric Teacher, AssessmentResult dùng để tính cho mỗi Student/Topic là bản ghi có `evaluatedAt` mới nhất.

### DATA-REQ-011
Metric không có đủ dữ liệu phải trả `null`/N/A thay vì tự suy diễn thành `0`, trừ các count có quy ước rõ như `overdueTaskCount = 0` khi Student không có task hiện tại.

Với Student có StudyPlan hiện tại:
- `completionRate = completedTasks / totalTasks × 100 = actualProgress`;
- nếu `totalTasks = 0` thì `completionRate = 0`;
- Student không có StudyPlan hiện tại thì `completionRate = null`/N/A.

Mọi threshold/rule dùng metric số phải đánh giá trên giá trị gốc trước khi làm tròn.

### DATA-REQ-012
`User.email` phải unique trên giá trị đã normalize. Backend phải `trim` và lowercase email trước lookup/lưu; backend/database phải từ chối tạo dữ liệu làm trùng email tài khoản sau normalization.

### DATA-REQ-013
`StudyTask.topicId` phải thuộc danh sách Topic hợp lệ do backend cung cấp cho AI và phải tồn tại trong database trước khi tạo StudyTask.

### DATA-REQ-014
Các luồng AI phải kiểm tra dữ liệu tối thiểu và eligibility trước khi gọi model.

- `INSUFFICIENT_DATA` là trạng thái nghiệp vụ, không gọi external AI và không tạo AI inference failure log.
- Business ineligible trước AI call cũng không tạo `AIRequestLog`, nhưng không được tự động gộp thành `INSUFFICIENT_DATA`.
- điều kiện chi tiết của Teacher Class Analysis và StudyPlan Adjustment tuân theo OD-33 và OD-40.

### DATA-REQ-015
Khi chức năng cho phép Save kết quả AI sau một bước xem/xác nhận riêng, backend phải duy trì analysis context của lần phân tích và dùng một **backend-controlled analysis reference** để truy xuất lại đúng `inputSnapshot` + `analysisResult` đã validate. Client không phải nguồn chuẩn của snapshot/result dùng để lưu và backend không được thay snapshot phân tích bằng dữ liệu live tại thời điểm Save.

## 6.16. Seed Data

Hệ thống được phép có seed data cho:
- User;
- Class;
- ClassMember;
- Course;
- Topic;
- AssessmentResult;
- StudyPlan/StudyTask khi cần demo;
- Feedback.

Seed feedback phải được trình bày là dữ liệu mẫu.

Khuyến nghị demo từ tài liệu phạm vi:
- có tập feedback seed đủ lớn;
- Student/Teacher gửi thêm feedback thật;
- Admin thấy dữ liệu thay đổi;
- chạy AI trên tập dữ liệu mới.

---

# 7. Business Rules

### BR-001
Student chỉ được truy cập dữ liệu học tập của chính mình.

### BR-002
Teacher chỉ được xem Class mình được phân công.

### BR-003
Administrator không dùng AI để thay đổi trực tiếp dữ liệu Student hoặc Teacher.

### BR-004
AI không được tự tạo số liệu thống kê.

### BR-005
StudyPlan do AI tạo chỉ được lưu/áp dụng sau khi Student chấp nhận. Backend phải revalidate preview tại thời điểm Apply trước mọi database mutation; nếu validation thất bại thì không archive plan hiện tại và không tạo plan/task mới.

### BR-006
Điều chỉnh StudyPlan do AI đề xuất chỉ được áp dụng sau khi Student chấp nhận.

### BR-007
ClassAnalysisReport và recommendation của AI chỉ là hỗ trợ Teacher.

### BR-008
Kết quả AI cho Administrator chỉ là đề xuất cải thiện.

### BR-009
Tỷ lệ, số lượng, tiến độ và các thống kê chính xác phải được backend tính.

### BR-010
Nếu AI lỗi, trạng thái nghiệp vụ trước đó phải được giữ nguyên.

### BR-011
AI runtime không được truy cập PostgreSQL trực tiếp.

### BR-012
Backend phải kiểm tra quyền trước khi truy vấn hoặc cập nhật dữ liệu nhạy cảm theo role.

### BR-013
Feedback của Student/Teacher sau khi lưu phải có thể xuất hiện trong nguồn dữ liệu phân tích của Administrator.

### BR-014
Student/Teacher phải chọn đúng một tag khi gửi Feedback. Tag đã lưu là nguồn phân loại cấp cao chính thức và AI không được tự động thay đổi tag.

### BR-015
Backend phải đếm số lượng Feedback theo tag; không yêu cầu AI tự tổng hợp con số. Với AI issue grouping, backend phải deduplicate `feedbackIds`, bảo đảm mỗi feedback được tính vào tối đa một group và tự tính lại `count` sau validation.

### BR-016
AssessmentResult sử dụng thang điểm `0–100`: `>=80` Tốt, `60–79` Cần củng cố, `<60` Cần ưu tiên.

### BR-017
Student được xem là chậm tiến độ khi `actualProgress < expectedProgress - 20` điểm phần trăm.

### BR-018
Student được đánh dấu `Needs Attention` cho Teacher nếu `averageScore < 60` hoặc `completionRate < 50%` hoặc `overdueTaskCount >= 2`.

### BR-019
Teacher chỉ được xem chi tiết Student thuộc Class mình được phân công.

### BR-020
Administrator được phép chuyển trạng thái tài khoản giữa `ACTIVE` và `DISABLED`; tài khoản `DISABLED` không được đăng nhập.

### BR-021
Trong MVP, Student chỉ được chỉnh `StudyPlan.title` và các trường `StudyTask.title`, `expectedMinutes`, `dueDate`, `priority` trước khi áp dụng kế hoạch; các score và kết quả phân tích AI không được chỉnh qua luồng này.

### BR-022
Course và Topic của MVP sử dụng seed data nội bộ do dự án quản lý.

### BR-023
Frontend không được xem việc ẩn menu là biện pháp bảo mật/phân quyền duy nhất.

### BR-024
Mỗi Student có tối đa một StudyPlan hiện tại với status `ACTIVE` hoặc `COMPLETED`; khi áp dụng plan mới, plan hiện tại cũ chuyển `ARCHIVED`.

### BR-025
StudyTask chỉ dùng status `TODO` và `COMPLETED`; task quá hạn khi `TODO` và `dueDate < now`; task gần hạn khi còn không quá 48 giờ đến `dueDate`.

### BR-026
Teacher metric dùng AssessmentResult mới nhất theo từng cặp Student–Topic. Dữ liệu thiếu không được tự quy đổi thành score hoặc tỷ lệ bằng `0`; `overdueTaskCount` cấp Class là tổng số task quá hạn trên current StudyPlan của các Student trong Class.

### BR-027
Completion rate của Student/Teacher chỉ dựa trên StudyPlan hiện tại: `completionRate = completedTasks / totalTasks × 100 = actualProgress`. Student chưa có plan trả N/A thay vì `0%`; plan tồn tại nhưng `totalTasks = 0` thì completion rate bằng `0`.

### BR-028
AI adjustment trong MVP chỉ được đề xuất `expectedMinutes`, `dueDate`, `priority` cho StudyTask `TODO`; không thêm/xóa task, đổi Topic hoặc sửa task `COMPLETED`.

### BR-029
Admin dashboard MVP không yêu cầu active user tracking hoặc hạ tầng monitoring chi tiết. Các metric là số liệu toàn thời gian; `totalUsers/usersByRole` tính cả ACTIVE và DISABLED, và AI request metrics chỉ tính các external AI call đã thực sự được attempt.

### BR-030
ClassAnalysisReport và FeedbackAnalysis lưu snapshot input và kết quả AI đã validate bằng JSONB; MVP không tạo bảng con riêng cho các nhóm insight AI.

### BR-031
Tất cả timestamp backend/database dùng UTC; API trao đổi thời gian theo ISO 8601.

### BR-032
Protected API phải từ chối tài khoản `DISABLED` kể cả khi user còn giữ token/phiên đã được cấp trước đó.

### BR-033
MVP sử dụng một Course chính cho toàn bộ luồng demo; không yêu cầu chức năng chọn Course và không thêm `courseId` vào Class chỉ để phục vụ MVP.

### BR-034
Student và Teacher sử dụng AssessmentResult mới nhất theo `evaluatedAt` cho mỗi cặp Student–Topic khi hiển thị trạng thái hiện tại hoặc chuẩn bị dữ liệu AI. Phân tích lịch sử/trend là P2.

### BR-035
Backend phải kiểm tra dữ liệu tối thiểu và eligibility trước khi gọi AI. Thiếu dữ liệu tối thiểu trả `INSUFFICIENT_DATA`; trường hợp business ineligible trước AI call phải được phân biệt với `INSUFFICIENT_DATA`. Cả hai đều không tạo `AIRequestLog`.

### BR-036
StudyPlan đã qua `endDate` nhưng còn task `TODO` vẫn giữ status `ACTIVE`; các task chưa hoàn thành tiếp tục là overdue. Student muốn deadline mới phải tạo plan mới.

### BR-037
AI tạo StudyPlan chỉ được tham chiếu Topic bằng `topicId` thuộc danh sách backend cung cấp. `StudyPlan.goal` lấy từ mục tiêu Student nhập; AI chỉ sinh `planTitle` và dữ liệu task.

### BR-038
Trang chi tiết Student dành cho Teacher là read-only trong MVP và chỉ hiển thị dữ liệu học tập/tổng hợp cần thiết; Teacher không chỉnh StudyPlan, StudyTask hoặc mục tiêu của Student.

### BR-039
`User.email` phải unique trong hệ thống trên giá trị đã được `trim` và lowercase; lookup/login phải dùng cùng quy tắc normalization.

### BR-040
Administrator không được chuyển chính tài khoản đang đăng nhập của mình sang `DISABLED` trong MVP.

### BR-041
Đối với FR-STU-004, `goal` là optional context. Student có AssessmentResult hợp lệ vẫn đủ minimum-data để chạy Strength/Weakness Analysis khi chưa có `goal`; thiếu goal không được trả `INSUFFICIENT_DATA`.

### BR-042
Admin feedback AI trong MVP dùng two-stage external inference: FR-ADM-004 tạo candidate issueGroups; backend validate/deduplicate và tự tính count; FR-ADM-005 mới dùng issueGroups đã validate để tạo summary/priorityAreas/recommendations. Mỗi external attempt thực tế phải được log.

### BR-043
Nếu tập feedback sau filter không rỗng nhưng issueGroups hợp lệ sau validation/deduplicate là `[]`, FR-ADM-004 vẫn thành công và FR-ADM-005 vẫn tiếp tục. Trường hợp này không phải `INSUFFICIENT_DATA`.

### BR-044
Khi lưu ClassAnalysisReport hoặc FeedbackAnalysis sau một bước xem kết quả AI, backend phải lấy snapshot/output từ analysis context do backend kiểm soát thông qua opaque analysis reference. Backend không dùng snapshot/result do client tự gửi lại làm nguồn chuẩn và không thay analysis-time snapshot bằng dữ liệu live tại thời điểm Save.

---

### BR-045
Teacher chỉ được xem `ClassAnalysisReport` của Class mình được phân công. Lịch sử phải hiển thị snapshot/result đã lưu ở chế độ read-only; không recompute bằng dữ liệu Class live và không gọi AI chỉ để xem lịch sử.

### BR-046
Administrator xem `FeedbackAnalysis` đã lưu ở chế độ read-only. Lịch sử phải dùng `inputSnapshot`/`analysisResult` đã lưu; không thay bằng Feedback live và không gọi AI chỉ để xem lịch sử.

# 8. External Interface Requirements

## 8.1. User Interface Requirements

### UI-REQ-001
Ứng dụng phải có giao diện riêng phù hợp với ba role.

### UI-REQ-002
Sau đăng nhập, user được điều hướng tới dashboard tương ứng role.

### UI-REQ-003
Các chức năng AI phải thể hiện rõ trạng thái:
- chưa chạy;
- đang xử lý;
- thành công;
- thất bại.

### UI-REQ-004
Các đề xuất cần xác nhận phải có hành động rõ:
- Chấp nhận/Áp dụng;
- Từ chối;
- Thử lại khi lỗi.

### UI-REQ-005
Không hiển thị dữ liệu role khác chỉ vì frontend giữ sẵn dữ liệu.

### UI-REQ-006
Form Feedback phải hiển thị các tag bằng nhãn dễ hiểu: “AI hỗ trợ”, “Kế hoạch học tập”, “Giao diện & trải nghiệm”, “Kết quả & tiến độ học tập”, “Khác”; người dùng phải chọn một tag trước khi gửi.

### UI-REQ-007
Giao diện tối thiểu phải dùng được trên desktop/laptop để phục vụ demo.

Responsive mobile có thể được triển khai nếu nguồn lực cho phép nhưng không phải chức năng nổi bật.

### UI-REQ-008
Khi backend trả `INSUFFICIENT_DATA`, UI phải hiển thị thông báo dạng “Chưa đủ dữ liệu để phân tích” hoặc nội dung tương đương, không hiển thị như lỗi AI/provider.

### UI-REQ-009
Màn hình lịch sử phân tích AI của Teacher phải hiển thị list/detail `ClassAnalysisReport` ở chế độ read-only và giữ rõ context Class hiện tại.

### UI-REQ-010
Màn hình lịch sử phân tích feedback của Administrator phải hiển thị list/detail `FeedbackAnalysis` ở chế độ read-only; dữ liệu hiển thị phải nhận biết được snapshot/filter tại thời điểm phân tích.

## 8.2. Frontend–Backend Interface

Giao tiếp mặc định:
- HTTP/HTTPS;
- REST API;
- JSON.

### API-REQ-001
Frontend chỉ giao tiếp dữ liệu nghiệp vụ qua NestJS API.

### API-REQ-002
API protected phải yêu cầu thông tin xác thực.

### API-REQ-003
Backend trả HTTP status phù hợp với loại kết quả.

### API-REQ-004
Error response nên có cấu trúc nhất quán tối thiểu:
- code;
- message;
- details nếu an toàn và cần thiết.

## 8.3. Backend–Database Interface

### DB-REQ-001
NestJS là thành phần ứng dụng truy cập PostgreSQL.

### DB-REQ-002
Transaction phải được dùng cho thao tác cần tạo/cập nhật nhiều bản ghi liên quan nếu thất bại từng phần có thể gây dữ liệu không nhất quán.

Ví dụ:
- tạo StudyPlan và StudyTask.

### DB-REQ-003
Database schema phải hỗ trợ các entity tối thiểu ở Section 6.

### DB-REQ-004
PostgreSQL `JSONB` được phép sử dụng cho `inputSnapshot` và `analysisResult` của các report AI để tránh tạo nhiều bảng phụ không cần thiết trong MVP.

### DB-REQ-005
Database lưu timestamp theo UTC; việc chuyển sang local time thuộc trách nhiệm tầng hiển thị.

## 8.4. Backend–AI Interface

### AI-INT-001
NestJS gửi request đến AI endpoint.

### AI-INT-002
Request chỉ chứa dữ liệu cần thiết.

### AI-INT-003
AI response ưu tiên JSON có schema.

### AI-INT-004
NestJS phải timeout AI request sau tối đa `60 giây`.

### AI-INT-005
Retry nếu triển khai phải có giới hạn, tránh lặp vô hạn.

### AI-INT-006
AI endpoint có thể thay đổi theo runtime host/Tailscale Serve; cách cấu hình URL phải nằm ở environment/configuration, không hard-code vào business logic.

### AI-INT-007
Nếu endpoint yêu cầu token/secret, secret phải nằm ở backend environment/configuration.

---

# 9. Non-functional Requirements

## 9.1. Security

### NFR-SEC-001
Password không được lưu dạng plain text.

### NFR-SEC-002
Backend phải xác thực và phân quyền API bảo vệ.

### NFR-SEC-003
Student không được truy cập dữ liệu Student khác.

### NFR-SEC-004
Teacher không được truy cập Class ngoài phạm vi được phân công.

### NFR-SEC-005
Secret của database và AI endpoint không được đưa vào frontend bundle.

### NFR-SEC-006
Backend không được trả passwordHash trong response.

### NFR-SEC-007
Input từ frontend phải được validate.

### NFR-SEC-008
Dữ liệu gửi AI phải được giảm thiểu theo nhu cầu tính năng.

### NFR-SEC-009
Mỗi protected request phải bảo đảm tài khoản hiện vẫn ở trạng thái `ACTIVE`; user `DISABLED` bị từ chối truy cập.

## 9.2. Performance

MVP sử dụng các ngưỡng định lượng sau trong môi trường demo với seed dataset của dự án:

### NFR-PERF-001
Các API nghiệp vụ không gọi AI phải **hướng tới** thời gian phản hồi `<= 2 giây` với seed dataset và điều kiện sử dụng bình thường của môi trường demo. Đây là mục tiêu MVP, không phải SLA production.

### NFR-PERF-002
Các phép tổng hợp cơ bản phải được backend/database thực hiện thay vì AI.

### NFR-PERF-003
UI phải hiển thị loading state ngay khi một AI request bắt đầu và duy trì trạng thái xử lý cho đến khi có kết quả hoặc lỗi.

### NFR-PERF-004
NestJS phải cấu hình timeout tối đa `60 giây` cho một AI request. Khi vượt ngưỡng, request được xử lý theo ERR-007.

### NFR-PERF-005
Ngưỡng 2 giây không áp dụng cho AI inference; AI được kiểm soát bằng timeout tối đa 60 giây theo quy định hiện hành.

## 9.3. Reliability

### NFR-REL-001
Lỗi AI không được làm hỏng dữ liệu nghiệp vụ.

### NFR-REL-002
Các thao tác tạo nhiều entity liên quan phải tránh trạng thái lưu một phần.

### NFR-REL-003
Backend phải validate AI output trước khi sử dụng.

## 9.4. Availability

### NFR-AVL-001
Chức năng không phụ thuộc AI phải hoạt động khi AI runtime unavailable.

### NFR-AVL-002
Hệ thống phải báo rõ khi chức năng AI tạm thời không khả dụng.

Không đặt yêu cầu availability production cho Local GPU/Tailscale Serve vì môi trường này được dùng cho development/demo. Laptop ngủ, WSL2/runtime dừng hoặc tailnet không sẵn sàng có thể làm chức năng AI tạm unavailable.

## 9.5. Usability

### NFR-USA-001
Các chức năng chính phải có đường đi rõ từ dashboard.

### NFR-USA-002
Thông báo lỗi phải dùng ngôn ngữ dễ hiểu.

### NFR-USA-003
Kết quả AI phải phân biệt được với dữ liệu/thống kê hệ thống.

### NFR-USA-004
Các hành động áp dụng đề xuất AI phải thể hiện rõ user đang xác nhận thay đổi.

## 9.6. Maintainability

### NFR-MNT-001
Frontend, backend, AI runtime và database phải tách trách nhiệm.

### NFR-MNT-002
Business logic không được đặt trong AI prompt nếu có thể thực hiện chính xác ở backend.

### NFR-MNT-003
AI endpoint và cấu hình môi trường phải có khả năng thay đổi mà không sửa luồng nghiệp vụ chính.

### NFR-MNT-004
Mỗi nhóm chức năng nên được tổ chức module/service rõ ràng trong NestJS.

## 9.7. Compatibility

### NFR-COM-001
Frontend phải chạy được trên trình duyệt desktop hiện đại.

### NFR-COM-002
API sử dụng JSON chuẩn để giảm phụ thuộc client.

## 9.8. Logging and Monitoring

### NFR-LOG-001
Backend phải ghi log lỗi server cần thiết để debug.

### NFR-LOG-002
Lần gọi AI phải có AIRequestLog.

### NFR-LOG-003
AIRequestLog được giữ trong suốt vòng đời phát triển và demo của đồ án; MVP không yêu cầu cơ chế purge tự động.

### NFR-LOG-004
Không bắt buộc xây monitoring production phức tạp trong MVP.

---

# 10. Error Handling and Recovery

## 10.1. Authentication Errors

### ERR-001 – Invalid Credentials
Hành vi:
- từ chối đăng nhập;
- không tiết lộ quá nhiều thông tin nội bộ;
- cho phép nhập lại.

### ERR-002 – Disabled Account
Hành vi:
- từ chối đăng nhập mới;
- từ chối protected request của tài khoản đã bị chuyển sang `DISABLED`;
- frontend xóa trạng thái đăng nhập và chuyển về màn hình đăng nhập khi nhận lỗi phù hợp;
- hiển thị thông báo dễ hiểu.

## 10.2. Authorization Errors

### ERR-003 – Forbidden Resource
Ví dụ:
- Student truy cập dữ liệu người khác;
- Teacher truy cập lớp không phụ trách.

Hành vi:
- backend từ chối;
- không trả dữ liệu tài nguyên.

## 10.3. Validation Errors

### ERR-004 – Invalid Input
Hành vi:
- không ghi database;
- trả danh sách lỗi hoặc message đủ để UI hiển thị.

## 10.4. Database Errors

### ERR-005 – Database Failure
Hành vi:
- rollback transaction nếu đang trong transaction;
- không để dữ liệu ở trạng thái một phần;
- trả lỗi chung phù hợp;
- ghi server log.

## 10.5. AI Errors

### ERR-006 – AI Connection Failure
- ghi AIRequestLog failed;
- thông báo AI tạm không khả dụng;
- giữ nguyên dữ liệu.

### ERR-007 – AI Timeout
- dừng chờ theo timeout;
- ghi log;
- cho phép retry phù hợp.

### ERR-008 – Empty AI Response
- xem là thất bại;
- không lưu.

### ERR-009 – Invalid AI Structure
- schema validation fail;
- không lưu;
- thông báo lỗi;
- có thể retry.

### ERR-010 – Incomplete AI Data
- nếu thiếu field bắt buộc thì xem là response không hợp lệ.

### ERR-011 – Insufficient Data for AI
Hành vi:
- không gọi AI runtime;
- không tạo `AIRequestLog`;
- trả trạng thái nghiệp vụ `INSUFFICIENT_DATA`;
- UI hiển thị hướng dẫn/ngữ cảnh thiếu dữ liệu phù hợp.

**Phân biệt:** trường hợp business ineligible trước AI call (ví dụ StudyPlan Adjustment không có current plan, plan quá hạn hoặc không còn task `TODO`) cũng không gọi AI và không tạo `AIRequestLog`, nhưng **không được tự động trả `INSUFFICIENT_DATA`**.

## 10.5.1. CR-002 — AI input capacity và runtime technical failure

Phần này là **normative clarification** cho các AI error/recovery rule hiện hành, không tạo thêm Use Case hay business capability mới.

### XAI-001 — AI input vượt capacity đã benchmark

Khi authoritative input đã qua validation/minimum-data/business eligibility và `capacityProfile` đang active đã resolve/bind hợp lệ, nhưng toàn bộ input của external attempt bắt buộc không thể nằm trong `validatedInputBudget(task)`:

- Backend phải dừng **trước network dispatch**;
- không gọi AI Runtime;
- không tạo `AIRequestLog` cho attempt chưa bắt đầu;
- không silently truncate, sampling, page-limit, pre-summarize hoặc chunk thành thêm external attempts;
- public API trả `HTTP 422` với code `AI_INPUT_TOO_LARGE`;
- message chuẩn: `Dữ liệu hiện vượt khả năng xử lý của AI cho yêu cầu này. Hãy thu hẹp phạm vi dữ liệu khi có thể và thử lại.`;
- response không cần expose context-window/token-count nội bộ.

Nếu Admin Stage 1 đã thành công nhưng Stage 2 bị capacity preflight reject thì giữ đúng một `AIRequestLog` SUCCESS của Stage 1, không có Stage 2 attempt/log và không tạo `analysisRef`.

### XAI-002 — AI runtime/provider/integration technical failure

Public code `HTTP 502 / AI_RUNTIME_FAILURE` được dùng cho các failure kỹ thuật không thuộc connection/timeout/empty/invalid-output semantics hiện hành, gồm:

- capacity profile missing/malformed/binding mismatch phát hiện trước dispatch;
- runtime trả `400/422` cho request contract mà Backend đã build/validate;
- runtime trả `401/403` do AI Runtime auth/config;
- runtime báo `INFERENCE_FAILED`;
- technical `5xx` không phân loại là `RUNTIME_UNAVAILABLE`.

Quy tắc logging:

- failure phát hiện **trước dispatch** do capacity-profile mismatch: không tạo `AIRequestLog`; server diagnostic dùng `AI_CAPACITY_PROFILE_MISMATCH`;
- failure sau khi external attempt đã bắt đầu: tạo `AIRequestLog.status = FAILED` và giữ internal diagnostic phù hợp (`AI_RUNTIME_PROTOCOL_FAILURE`, `AI_RUNTIME_AUTH_FAILURE`, `AI_RUNTIME_INFERENCE_FAILURE`, `AI_RUNTIME_TECHNICAL_FAILURE`).

Các code cũ giữ nguyên semantics:

- network/DNS/TLS hoặc Runtime `RUNTIME_UNAVAILABLE` → `AI_CONNECTION_FAILURE`;
- timeout → `AI_TIMEOUT`;
- empty body → `AI_EMPTY_RESPONSE`;
- output parse/schema/correlation invalid → `AI_INVALID_STRUCTURE`;
- output thiếu required content → `AI_INCOMPLETE_DATA`.

Public message cho `AI_RUNTIME_FAILURE`: `AI tạm thời chưa thể xử lý yêu cầu. Vui lòng thử lại sau.` Internal subcategory không được leak cho client.

## 10.6. Recovery Principles

1. Không mất dữ liệu đã tồn tại.
2. Không tự lưu output AI lỗi.
3. Không tự áp dụng recommendation khi lỗi/không chắc chắn.
4. User có thể thử lại các tác vụ AI khi runtime hoạt động trở lại.
5. Các chức năng cơ bản không phụ thuộc AI vẫn sử dụng được.

---

# 11. Requirements Traceability

## 11.1. Quy tắc truy vết

Mỗi artifact ở giai đoạn sau nên tham chiếu requirement ID.

Ví dụ:

```text
FR-STU-005
   ↓
UC-STU-005 – Generate Study Plan
   ↓
API-STU-PLAN-001
   ↓
TC-STU-005-01
```

## 11.2. Traceability Matrix tổng quan

| Requirement Group | Use Case dự kiến | Data chính | Test focus |
|---|---|---|---|
| FR-COM-* | UC-COM-* | User | Auth, role, errors |
| FR-STU-* | UC-STU-* | AssessmentResult, StudyPlan, StudyTask | Student flow |
| FR-TEA-* | UC-TEA-* | Class, ClassMember, ClassAnalysisReport | Teacher permission + analysis |
| FR-ADM-* | UC-ADM-* | User, Feedback, FeedbackAnalysis, AIRequestLog | Admin flow |
| FR-FB-* | UC-FB-* | Feedback | Validation + persistence |
| AI-REQ-* | dùng chung | AIRequestLog + snapshots | AI schema, error handling |
| NFR-* | dùng chung | – | Security, performance, reliability |

## 11.3. Priority Convention

### P0 – Nền tảng bắt buộc
- authentication;
- authorization;
- database;
- API nền;
- dữ liệu User/Class/Topic/Assessment;
- dashboard cơ bản;
- error handling.

### P1 – Chức năng nổi bật bắt buộc

#### Student
- AI analysis;
- AI Study Plan;
- lưu StudyPlan;
- StudyTask;
- progress;
- AI adjustment.

#### Teacher
- class dashboard;
- backend aggregation;
- AI class analysis;
- recommendation;
- save report;
- xem lại lịch sử phân tích AI đã lưu.

#### Administrator
- system dashboard;
- feedback;
- backend tag statistics;
- AI issue grouping;
- AI summary;
- improvement recommendation;
- save analysis;
- xem lại lịch sử phân tích feedback đã lưu.

### P2 – Hoàn thiện
- biểu đồ đẹp;
- filter nâng cao;
- lịch sử/so sánh nâng cao ngoài hai màn hình lịch sử AI đã baseline;
- phân tích trend/xu hướng theo thời gian;
- chỉnh sửa kế hoạch nâng cao;
- export report;
- notification;
- audit log nâng cao.

---

# 12. Resolved Decisions – Các quyết định đã chốt

Các quyết định dưới đây được chốt cho phạm vi MVP và là cơ sở cho Use Case, Business Rules, ERD, API, UI và Test Case.

## OD-01 – Ngưỡng đánh giá điểm

**Trạng thái:** Đã chốt

- `score >= 80`: **Tốt**;
- `60 <= score < 80`: **Cần củng cố**;
- `score < 60`: **Cần ưu tiên**.

Weak Topic của Teacher sử dụng ngưỡng `averageScore < 60`.

## OD-02 – Ngưỡng chậm tiến độ

**Trạng thái:** Đã chốt

Student được xem là chậm tiến độ khi:

`actualProgress < expectedProgress - 20`

Trong đó 20 là **điểm phần trăm**, không phải 20% của expectedProgress.

## OD-03 – Rule xác định Student cần chú ý

**Trạng thái:** Đã chốt

Student được đánh dấu `Needs Attention` nếu thỏa ít nhất một điều kiện:
- `averageScore < 60`; hoặc
- `completionRate < 50%`; hoặc
- `overdueTaskCount >= 2`.

## OD-04 – Công thức expected progress

**Trạng thái:** Đã chốt

- `actualProgress = completedTasks / totalTasks × 100`;
- `expectedProgress = tasksDueByNow / totalTasks × 100`;
- `tasksDueByNow` là số task có `dueDate <= thời điểm hiện tại`;
- nếu `totalTasks = 0` thì cả hai giá trị bằng `0`.

## OD-05 – Teacher xem chi tiết Student

**Trạng thái:** Đã chốt

Teacher được xem trang chi tiết từng Student **chỉ khi Student thuộc Class mà Teacher được phân công**. Backend phải kiểm tra quan hệ Teacher–Class–ClassMember trước khi trả dữ liệu.

## OD-06 – Quyền Administrator đối với tài khoản

**Trạng thái:** Đã chốt

Administrator được:
- xem user;
- tìm kiếm;
- xem role/status;
- chuyển trạng thái `ACTIVE` ↔ `DISABLED`.

Tài khoản `DISABLED` không được đăng nhập. MVP không bao gồm quản trị quyền tùy biến hoặc quản lý tài khoản nâng cao.

## OD-07 – AI model cụ thể

**Trạng thái:** Đã chốt ở mức SRS

SRS **không khóa vào một model cụ thể**. Model candidate đã được chọn qua Lite smoke trên Google Colab; việc chấp nhận Local GPU yêu cầu kiểm chứng trên máy Windows/WSL2 đã phê duyệt. Model được chọn phải:
- chạy được trên tài nguyên Local GPU được phê duyệt mà không bỏ qua capacity preflight;
- hỗ trợ phân tích, tóm tắt, nhóm vấn đề, recommendation và sinh StudyPlan;
- trả structured output đủ ổn định;
- có thể expose qua API để NestJS gọi.

Việc đổi model không được yêu cầu thay đổi business rules hoặc database schema cốt lõi.

## OD-08 – Tài nguyên và tính sẵn sàng của AI

**Trạng thái:** Đã chốt

Local GPU + WSL2 + Tailscale Serve được xem là môi trường AI phục vụ development/demo, không phải hạ tầng production có availability đảm bảo. Khi runtime bị ngắt hoặc endpoint unavailable:
- chức năng AI báo tạm không khả dụng;
- không làm mất dữ liệu;
- chức năng không phụ thuộc AI vẫn hoạt động;
- user có thể thử lại sau khi runtime được khởi động lại.

## OD-09 – Lưu prompt/response AI

**Trạng thái:** Đã chốt

MVP không lưu full prompt/raw response theo mặc định. Bắt buộc lưu:
- metadata trong `AIRequestLog`;
- output nghiệp vụ đã validate nếu chức năng yêu cầu lưu, ví dụ StudyPlan, ClassAnalysisReport, FeedbackAnalysis.

Raw prompt/response chỉ có thể bật tạm phục vụ debug trong môi trường phát triển.

## OD-10 – Thời gian lưu AI log

**Trạng thái:** Đã chốt

`AIRequestLog` được giữ trong suốt vòng đời phát triển và demo của đồ án. MVP không triển khai job tự động xóa log.

## OD-11 – Nguồn Course/Topic

**Trạng thái:** Đã chốt

Course và Topic của MVP sử dụng **seed data nội bộ** do dự án quản lý. Không tích hợp LMS/API nội dung bên ngoài trong phạm vi MVP. MVP dùng **một Course chính** cho toàn bộ luồng demo nên không cần chức năng chọn Course hoặc thêm quan hệ Course–Class phức tạp.

## OD-12 – Mức chỉnh sửa StudyPlan

**Trạng thái:** Đã chốt

Ở bước preview trước khi áp dụng kế hoạch, Student được chỉnh:
- `StudyPlan.title`;
- `StudyTask.title`;
- `StudyTask.expectedMinutes`;
- `StudyTask.dueDate`;
- `StudyTask.priority`.

Student không được chỉnh trực tiếp score, kết quả phân tích AI hoặc dữ liệu nguồn thông qua luồng chỉnh kế hoạch. Backend phải validate lại các trường đã chỉnh trước khi lưu.

## OD-13 – Feedback tag

**Trạng thái:** Đã chốt theo yêu cầu dự án

Student/Teacher **tự chọn một tag** khi gửi feedback để giảm nhầm lẫn. UI sử dụng nhãn dễ hiểu:

| Nhãn hiển thị | Giá trị lưu | Ý nghĩa |
|---|---|---|
| AI hỗ trợ | `AI_PERFORMANCE` | Tốc độ, chất lượng hoặc kết quả AI |
| Kế hoạch học tập | `STUDY_PLAN` | Kế hoạch và nhiệm vụ học tập |
| Giao diện & trải nghiệm | `UI_UX` | Giao diện, thao tác, trải nghiệm sử dụng |
| Kết quả & tiến độ học tập | `LEARNING_ANALYTICS` | Điểm, tiến độ, dashboard, thống kê học tập |
| Khác | `OTHER` | Nội dung không thuộc các nhóm trên |

Quy tắc:
- tag là bắt buộc;
- mỗi feedback có một tag chính;
- backend thống kê theo tag;
- AI không được tự động thay đổi tag do người dùng chọn;
- AI tập trung phát hiện/nhóm vấn đề chi tiết, tóm tắt và đề xuất cải thiện.

## OD-14 – Thang điểm AssessmentResult

**Trạng thái:** Đã chốt

AssessmentResult sử dụng thang điểm `0–100`. Backend phải từ chối score ngoài khoảng này.

## OD-15 – Performance Threshold

**Trạng thái:** Đã chốt cho môi trường MVP/demo

- API thông thường không gọi AI: hướng tới phản hồi `<= 2 giây` với seed dataset/điều kiện demo bình thường;
- AI request timeout: tối đa `60 giây`;
- UI phải hiển thị trạng thái loading trong khi chờ AI;
- timeout được xem là AI error và không làm thay đổi dữ liệu nghiệp vụ hiện có.

## OD-16 – Vòng đời StudyPlan

**Trạng thái:** Đã chốt

- mỗi Student có tối đa một StudyPlan hiện tại (`ACTIVE` hoặc `COMPLETED`);
- `startDate` là thời điểm Student chấp nhận plan;
- `endDate` là target deadline;
- `availableMinutesPerWeek` được lưu trên plan;
- áp dụng plan mới sẽ chuyển plan hiện tại cũ sang `ARCHIVED`;
- toàn bộ task hoàn thành thì plan chuyển `COMPLETED`; undo task trên plan hiện tại có thể đưa plan về `ACTIVE`.

## OD-17 – Quy tắc StudyTask

**Trạng thái:** Đã chốt

- status: `TODO`, `COMPLETED`;
- priority: `LOW`, `MEDIUM`, `HIGH`;
- overdue: `TODO` và `dueDate < now`;
- near due: `TODO` và còn tối đa 48 giờ đến deadline;
- dueDate phải nằm trong khoảng thời gian của StudyPlan.

## OD-18 – Cách tính metric Teacher

**Trạng thái:** Đã chốt

- mỗi Student/Topic dùng AssessmentResult mới nhất theo `evaluatedAt`;
- Student thiếu score Topic nào thì không tự coi là `0` ở Topic đó;
- completion rate dùng StudyPlan hiện tại;
- Student chưa có plan trả N/A cho completion rate;
- trend/history không bắt buộc trong MVP.

## OD-19 – Phạm vi AI điều chỉnh kế hoạch

**Trạng thái:** Đã chốt

AI chỉ đề xuất thay đổi `expectedMinutes`, `dueDate`, `priority` cho task `TODO`. Không thêm/xóa task, đổi Topic, sửa task `COMPLETED` hoặc sửa dữ liệu đánh giá.

## OD-20 – Phạm vi Admin Dashboard

**Trạng thái:** Đã chốt

Dashboard Admin chỉ bắt buộc: `totalUsers`, `usersByRole`, `totalFeedback`, `totalAIRequests`, `failedAIRequests`. Không triển khai active user tracking hoặc infrastructure monitoring trong MVP.

## OD-21 – Lưu báo cáo AI

**Trạng thái:** Đã chốt

`ClassAnalysisReport` và `FeedbackAnalysis` dùng `inputSnapshot JSONB` và `analysisResult JSONB`. Cách này giữ đủ dữ liệu để xem lại mà không tạo nhiều bảng phụ chỉ phục vụ output AI.

## OD-22 – Chuẩn ngày giờ

**Trạng thái:** Đã chốt

Backend/database lưu timestamp theo UTC. API dùng ISO 8601. Frontend chuyển sang local time để hiển thị.

## OD-23 – Logout và phiên đăng nhập MVP

**Trạng thái:** Đã chốt

Logout kết thúc phiên trên client/thiết bị hiện tại bằng cách xóa cookie/token phù hợp. MVP không bắt buộc token blacklist hoặc quản lý nhiều session, nhưng backend luôn kiểm tra tài khoản vẫn `ACTIVE` khi xử lý protected request.

## OD-24 – Course trong phạm vi MVP

**Trạng thái:** Đã chốt

MVP sử dụng một Course chính cho toàn bộ demo. Class không cần `courseId`, không có chức năng chọn/chuyển Course và mọi Topic/AssessmentResult dùng trong luồng chính thuộc Course này.

## OD-25 – AssessmentResult hiện tại

**Trạng thái:** Đã chốt

Student dashboard/result, Student AI và Teacher metric đều dùng AssessmentResult mới nhất theo `evaluatedAt` cho từng cặp Student–Topic. Lịch sử vẫn có thể được lưu nhưng phân tích trend/history là P2.

## OD-26 – Không đủ dữ liệu cho AI

**Trạng thái:** Đã chốt

Backend phải kiểm tra dữ liệu tối thiểu trước inference. Nếu không đủ dữ liệu, trả `INSUFFICIENT_DATA`, không gọi AI và không ghi thành AI inference failure.

## OD-27 – StudyPlan quá deadline

**Trạng thái:** Đã chốt

Nếu `endDate` đã qua nhưng còn StudyTask `TODO`, plan vẫn giữ `ACTIVE`; không thêm status `EXPIRED`. Các task chưa hoàn thành tiếp tục là overdue. Muốn có deadline mới, Student tạo plan mới và plan cũ được archive.

## OD-28 – Contract Topic khi AI tạo StudyPlan

**Trạng thái:** Đã chốt

Backend gửi danh sách Topic hợp lệ `{ id, name }`; AI trả `topicId` cho từng StudyTask. Backend từ chối `topicId` không tồn tại hoặc không thuộc danh sách được cung cấp. AI không tự tạo Topic mới.

## OD-29 – Nguồn title/goal và dependency của StudyPlan

**Trạng thái:** Đã chốt

AI sinh `planTitle`; `StudyPlan.goal` luôn lấy từ mục tiêu Student đã nhập. FR-STU-004 không phải dependency bắt buộc của FR-STU-005; backend có thể tạo StudyPlan từ latest scores + goal + availability + deadline + Topic list.

## OD-30 – Student detail dành cho Teacher

**Trạng thái:** Đã chốt

Trang chi tiết Student dành cho Teacher là read-only, chỉ hiển thị score mới nhất theo Topic và các metric tiến độ cần thiết. Teacher không chỉnh StudyPlan, StudyTask hoặc mục tiêu học tập của Student trong MVP.

## OD-31 – Tính duy nhất của email

**Trạng thái:** Đã chốt

`User.email` là unique identifier của tài khoản và phải unique trong database.

## OD-32 – Admin tự disable tài khoản

**Trạng thái:** Đã chốt

Administrator không được disable chính tài khoản đang đăng nhập của mình trong MVP. Không bổ sung workflow phê duyệt hay quản trị tài khoản nâng cao.

## OD-33 – Minimum Data for Teacher AI Analysis

**Trạng thái:** Đã chốt trong v1.4 Baseline


Class được xem là có dữ liệu tối thiểu để chạy AI Class Analysis nếu thỏa **ít nhất một** điều kiện:

1. có ít nhất một `AssessmentResult` hợp lệ của Student thuộc Class; hoặc
2. có ít nhất một Student thuộc Class có StudyPlan hiện tại chứa ít nhất một `StudyTask`.

Nếu cả hai điều kiện đều không thỏa, backend trả `INSUFFICIENT_DATA`, không gọi AI runtime và không ghi AI inference failure.

## OD-34 – Feedback Issue Group Uniqueness

**Trạng thái:** Đã chốt trong v1.4 Baseline


Mỗi `feedbackId` chỉ được **tính vào tối đa một `issueGroup`** trong một lần phân tích.

Backend xử lý các `issueGroup` theo đúng thứ tự AI trả về:

1. trong từng `issueGroup`, backend deduplicate `feedbackIds` nội bộ trước;
2. group đầu tiên chứa một `feedbackId` hợp lệ được giữ ID đó;
3. nếu cùng `feedbackId` xuất hiện lại ở group sau, backend loại ID trùng khỏi group sau;
4. backend tính lại `count` từ danh sách `feedbackIds` sau deduplicate;
5. nếu một group không còn `feedbackId` nào sau deduplicate, backend loại group rỗng khỏi kết quả;
6. `feedbackId` không thuộc tập input vẫn làm structured output không hợp lệ và không được lưu như kết quả thành công.

Cách xử lý này làm hành vi deterministic để backend và test case có cùng một cách hiểu.

## OD-35 – Metric Precision and Rounding

**Trạng thái:** Đã chốt trong v1.4 Baseline


Các threshold/rule phải được đánh giá trên **giá trị tính toán gốc trước khi làm tròn**. Việc làm tròn chỉ phục vụ hiển thị UI và không được dùng ngược lại để quyết định `Weak Topic`, `Needs Attention`, `Progress Warning` hoặc các rule số học khác.

Ví dụ: `averageScore = 59.8` vẫn thỏa điều kiện `averageScore < 60`.

Backend phải trả kết quả rule/status dựa trên giá trị gốc; **trạng thái/rule do backend trả về là nguồn chuẩn**. Cách làm tròn và số chữ số thập phân chỉ là quyết định trình bày của UI Specification và không được làm thay đổi kết quả rule.

## OD-36 – Teacher Class Overdue Task Metric

**Trạng thái:** Đã chốt trong v1.4 Baseline


`overdueTaskCount` ở cấp Student và cấp Class được xác định như sau:

- `studentOverdueTaskCount` = số `StudyTask` có `status = TODO` và `dueDate < now` thuộc StudyPlan hiện tại của Student;
- Student không có StudyPlan hiện tại đóng góp `0` vào count này;
- field `overdueTaskCount` ở cấp Class (gọi rõ nghĩa là `classOverdueTaskCount` trong tài liệu này) = tổng `studentOverdueTaskCount` của tất cả Student thuộc Class.

Tên field/API vẫn bám SRS là `overdueTaskCount`; ký hiệu `classOverdueTaskCount` chỉ dùng trong Business Rules để phân biệt với metric cấp Student. Metric cấp Class là **số task quá hạn**, không phải số Student có task quá hạn.

## OD-37 – Admin Dashboard Metric Semantics

**Trạng thái:** Đã chốt trong v1.4 Baseline


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

## OD-38 – Email Normalization and Uniqueness

**Trạng thái:** Đã chốt trong v1.4 Baseline


Trước khi lookup/lưu email tài khoản, backend phải:

1. loại bỏ khoảng trắng đầu/cuối (`trim`);
2. chuyển email về chữ thường (`lowercase`);
3. kiểm tra uniqueness trên giá trị đã normalize.

Ví dụ `Student@Demo.com` và `student@demo.com` được xem là cùng một email định danh tài khoản trong MVP.

## OD-39 – Student Completion Rate

**Trạng thái:** Đã chốt trong v1.4 Baseline


Với Student có StudyPlan hiện tại:

`completionRate = completedTasks / totalTasks × 100 = actualProgress`.

Quy ước:

- chỉ tính các StudyTask thuộc StudyPlan hiện tại; không tổng hợp task từ plan `ARCHIVED`;
- Student chưa có StudyPlan hiện tại → `completionRate = null/N/A`;
- nếu StudyPlan hiện tại tồn tại nhưng `totalTasks = 0` → `completionRate = 0`, thống nhất với quy ước `actualProgress = 0` của OD-04;
- threshold như `completionRate < 50%` được đánh giá trên giá trị gốc trước khi làm tròn theo OD-35.

## OD-40 – AI StudyPlan Adjustment Eligibility

**Trạng thái:** Đã chốt trong v1.4 Baseline


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

## OD-41 – Optional Goal Context for Student Strength/Weakness Analysis

**Trạng thái:** Đã chốt trong v1.4 Baseline

Đối với FR-STU-004:
- minimum-data bắt buộc là có ít nhất một AssessmentResult hợp lệ;
- `goal` là optional context, không phải eligibility condition;
- nếu Student chưa có `goal`, backend vẫn được gọi AI khi AssessmentResult hợp lệ;
- thiếu `goal` không trả `INSUFFICIENT_DATA`.

Quyết định này chỉ áp dụng cho Strength/Weakness Analysis. FR-STU-005 vẫn yêu cầu goal/time/deadline hợp lệ để tạo StudyPlan.

## OD-42 – Admin Feedback AI Two-Stage Inference

**Trạng thái:** Đã chốt trong v1.4 Baseline

Admin feedback AI trong MVP dùng hai external AI stages:
1. FR-ADM-004 gọi AI để tạo candidate issueGroups.
2. Backend validate schema/feedbackIds, deduplicate theo OD-34, loại group rỗng và tự tính lại count.
3. FR-ADM-005 gọi AI lần hai với feedback/tagStatistics/issueGroups đã validate để tạo summary, priorityAreas và recommendations.

Backend validation phải nằm giữa hai stage. Mỗi external attempt thực tế tạo `AIRequestLog` theo AI-REQ-018.

## OD-43 – Empty IssueGroups Semantics

**Trạng thái:** Đã chốt trong v1.4 Baseline

Nếu tập feedback sau filter **không rỗng**, stage 1 đã được gọi và output hợp lệ, nhưng sau backend validation/deduplicate không còn issue group nào:
- kết quả FR-ADM-004 là `issueGroups = []`;
- không trả `INSUFFICIENT_DATA`;
- FR-ADM-005 vẫn tiếp tục stage 2 với feedback/tagStatistics và danh sách issueGroups rỗng;
- UI có thể thông báo rằng chưa phát hiện nhóm vấn đề nổi bật.

`INSUFFICIENT_DATA` chỉ áp dụng khi tập feedback sau filter rỗng trước external AI call.

## OD-44 – Backend-Controlled Analysis Context for Deferred Save

**Trạng thái:** Đã chốt trong v1.4 Baseline

Đối với FR-TEA-007 và FR-ADM-006:
- backend sở hữu analysis context chứa đúng input snapshot và AI output đã validate của lần phân tích;
- client chỉ giữ opaque analysis reference;
- khi Save, backend resolve reference để lấy lại dữ liệu của chính lần phân tích đó và kiểm tra quyền;
- client không phải nguồn chuẩn của snapshot/result dùng để lưu;
- backend không query dữ liệu live để thay thế snapshot đã dùng cho AI.

Tên field API, storage mechanism và TTL của analysis context được chốt ở API/System Design và không tạo entity nghiệp vụ mới trong MVP.

---

## OD-45 – Teacher AI Analysis History Read Semantics

**Trạng thái:** Đã chốt theo CR-001

Teacher được list/detail `ClassAnalysisReport` chỉ cho Class mình được phân công. Dữ liệu history lấy từ `inputSnapshot` và `analysisResult` đã lưu, hiển thị read-only, không recompute bằng dữ liệu Class live và không gọi AI chỉ để xem lịch sử.

## OD-46 – Administrator Feedback Analysis History Read Semantics

**Trạng thái:** Đã chốt theo CR-001

Administrator được list/detail `FeedbackAnalysis` đã lưu. Dữ liệu history lấy từ `inputSnapshot` và `analysisResult` đã lưu, hiển thị read-only, không thay bằng Feedback live và không gọi AI chỉ để xem lịch sử.

# 13. Appendices

## Appendix A – Requirement ID Convention

| Prefix | Ý nghĩa |
|---|---|
| FR-COM | Common Functional Requirement |
| FR-STU | Student Functional Requirement |
| FR-TEA | Teacher Functional Requirement |
| FR-ADM | Administrator Functional Requirement |
| FR-FB | Feedback Functional Requirement |
| AI-REQ | AI Requirement |
| DATA-REQ | Data Requirement |
| BR | Business Rule |
| UI-REQ | User Interface Requirement |
| API-REQ | Frontend–Backend API Requirement |
| DB-REQ | Database Interface Requirement |
| AI-INT | Backend–AI Interface Requirement |
| NFR-SEC | Security |
| NFR-PERF | Performance |
| NFR-REL | Reliability |
| NFR-AVL | Availability |
| NFR-USA | Usability |
| NFR-MNT | Maintainability |
| NFR-COM | Compatibility |
| NFR-LOG | Logging |
| ERR | Error Handling |
| OD | Resolved Decision |

## Appendix B – Main Demo Scenario

### B.1. Student Demo
1. Đăng nhập Student.
2. Mở dashboard.
3. Xem score theo Topic.
4. Nhập mục tiêu, số giờ học mỗi tuần và deadline.
5. AI phân tích điểm yếu.
6. AI tạo StudyPlan.
7. Student xem/chỉnh sửa.
8. Student chấp nhận.
9. Backend tạo StudyPlan và StudyTask.
10. Student hoàn thành một task.
11. Dashboard cập nhật progress.
12. Student yêu cầu AI adjustment.
13. Student chấp nhận/từ chối.

**Giá trị cần chứng minh:**  
AI sử dụng dữ liệu Student thật, output được biến thành dữ liệu nghiệp vụ và trạng thái hệ thống thay đổi theo hành động thật.

### B.2. Teacher Demo
1. Đăng nhập Teacher.
2. Chọn Class.
3. Xem dashboard.
4. Xem số liệu backend tổng hợp.
5. Chạy AI class analysis.
6. Xem weak Topic/attention group.
7. Xem recommendation.
8. Lưu ClassAnalysisReport.
9. Mở lịch sử phân tích của Class và xem lại report vừa lưu.

**Giá trị cần chứng minh:**  
AI giải thích dữ liệu lớp có sẵn, không tự tạo số liệu.

### B.3. Administrator Demo
1. Student/Teacher gửi feedback thật.
2. Đăng nhập Administrator.
3. Xem feedback mới.
4. Mở dashboard.
5. Chọn tập feedback.
6. Backend thống kê theo tag người dùng đã chọn.
7. Chạy AI phân tích và nhóm vấn đề chi tiết.
8. Xem AI summary.
9. Xem recommendation.
10. Lưu FeedbackAnalysis.
11. Mở lịch sử phân tích và xem lại snapshot/result vừa lưu.

**Giá trị cần chứng minh:**  
Feedback thật đi từ user (có tag) → database → backend statistics → AI issue analysis → Admin insight.

## Appendix C – AI Responsibility Summary

| Công việc | Backend | AI |
|---|:---:|:---:|
| Xác thực | ✓ | – |
| Phân quyền | ✓ | – |
| Query database | ✓ | – |
| Tính score/tỷ lệ/số lượng | ✓ | – |
| Kiểm tra threshold/rule | ✓ | – |
| Lưu dữ liệu | ✓ | – |
| Validate AI output | ✓ | – |
| Giải thích dữ liệu | – | ✓ |
| Tóm tắt | – | ✓ |
| Nhóm/phân tích vấn đề từ text | – | ✓ |
| Đề xuất | – | ✓ |
| Tạo StudyPlan cấu trúc | – | ✓ |

## Appendix D – MVP Completion Criteria

Một chức năng AI chỉ được xem là hoàn thành khi:

1. Có input rõ ràng.
2. Input đến từ dữ liệu thật hoặc seed được công khai.
3. Có lời gọi AI thật qua AI runtime hoặc cơ chế thay thế được mô tả minh bạch.
4. Output có cấu trúc đủ dùng.
5. Backend validate output.
6. User có hành động tiếp theo.
7. Dữ liệu được lưu/cập nhật đúng nếu cần.
8. Dashboard phản ánh trạng thái mới nếu cần.
9. Có xử lý AI error.
10. AI không tự bịa số liệu.
11. User có quyền chấp nhận/từ chối các đề xuất quan trọng.

## Appendix E – Revision History

| Version | Date | Nội dung |
|---|---|---|
| 0.1 | 20/10/2026 | Khởi tạo cấu trúc SRS và Introduction |
| 0.2 | 20/10/2026 | Bổ sung Overall Description và tech stack |
| 1.0 Draft | 20/10/2026 | Hoàn thiện toàn bộ SRS MVP |
| 1.1 Baseline | 20/10/2026 | Chốt OD-01 đến OD-15; cập nhật feedback tag do người dùng chọn; đồng bộ functional requirements, data, business rules, AI, UI và NFR |
| 1.2 Baseline | 20/10/2026 | Siết logic MVP cho StudyPlan/StudyTask, Teacher metrics, Admin dashboard, AI report JSONB, date/time và auth; chốt OD-16 đến OD-23 |
| 1.3 Baseline | 20/10/2026 | Chốt single-Course MVP, latest AssessmentResult dùng chung, insufficient-data rule, hành vi plan quá deadline, AI Topic contract, nguồn title/goal, Teacher Student detail và ràng buộc tài khoản; chốt OD-24 đến OD-32 |
| 1.4 Draft | 20/10/2026 | Đồng bộ Business Rules v1.1 Draft Rev4; chính thức hóa OD-33 đến OD-40; làm rõ Teacher minimum data, feedback dedup, metric precision, class overdue metric, Admin dashboard semantics, email normalization, completion rate, AI adjustment eligibility, apply-time revalidation và AIRequestLog theo external call attempt |
| 1.4 Baseline | 21/10/2026 | Chốt OD-41 đến OD-44 và BR-041 đến BR-044: goal optional cho STU-004; Admin feedback AI two-stage; semantics issueGroups rỗng; backend-controlled analysis context cho deferred Save; bổ sung AI-REQ-024 và DATA-REQ-015 |
| 1.5 Baseline | 21/10/2026 | Thực hiện CR-001: bổ sung FR-TEA-008/FR-ADM-007 cho lịch sử phân tích AI; chốt OD-45/OD-46, BR-045/BR-046, UI-REQ-009/UI-REQ-010; giữ history read-only, snapshot-based và không phát sinh AI call |
| 1.6 Baseline Final | 26/10/2026 | Thực hiện CR-002: khóa public semantics `422 AI_INPUT_TOO_LARGE` và `502 AI_RUNTIME_FAILURE`; capacity-profile preflight; no-truncation/no-hidden-chunking; logging semantics trước/sau dispatch; đồng bộ baseline R3 cho AI Contract v1.0 |

---

# Kết luận

SRS này xác định một MVP tập trung vào ba vai trò có giá trị rõ ràng:

- **Student:** từ dữ liệu cá nhân đến kế hoạch học và điều chỉnh tiến độ.
- **Teacher:** từ dữ liệu lớp đến insight và recommendation.
- **Administrator:** từ feedback có tag và thống kê backend đến AI insight cải thiện sản phẩm.

Kiến trúc kỹ thuật được cố định ở mức:

```text
Next.js
   ↓
NestJS
   ↓
PostgreSQL

NestJS
   ↓
AI API / Endpoint
   ↓
Self-managed AI Model trên Local GPU / Windows 11 + WSL2 (Tailscale Serve cho Linux peer)
```

Nguyên tắc xuyên suốt:

**Dữ liệu thật → backend xử lý có kiểm soát → AI hỗ trợ → con người quyết định → hệ thống cập nhật trạng thái.**
