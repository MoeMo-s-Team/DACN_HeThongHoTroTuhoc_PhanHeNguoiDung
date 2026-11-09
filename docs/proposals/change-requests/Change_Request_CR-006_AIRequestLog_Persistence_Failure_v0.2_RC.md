# CHANGE REQUEST — CR-006 (SUPERSEDED RELEASE CANDIDATE)
## Xử lý khi terminal AIRequestLog không được xác nhận sau external AI attempt

**Dự án:** Hệ thống hỗ trợ tự học ứng dụng AI  
**Change ID:** `CR-006` (*candidate; cần xác minh governance registry trước phát hành*)  
**Phiên bản:** 0.2 Release Candidate  
**Ngày:** 09/11/2026  
**Trạng thái:** SUPERSEDED — approved downstream release is CR-006 v1.0  
**Loại:** AI request logging reliability / failure semantics  
**Trigger:** Phase 2B AIRequestLog Persistence Failure Change Request  
**Disposition:** Project Owner approved the five decisions on 09/11/2026; see [CR-006 v1.0 Approved](../../implementation/releases/CR-006/Change_Request_CR-006_v1.0_approved.md). This file is retained as the v0.2 review artifact and is not the operative authority.

**Registry check:** Governance Index R3 v1.2 chỉ đăng ký CR-002; không có mục CR-006. Repository search không tìm thấy CR-006 trước candidate này. Không thấy một registry CR độc lập trong repo; vì vậy chưa có xung đột ID được phát hiện, nhưng `CR-006` vẫn là candidate chưa được formally reserved cho đến khi Project Owner/governance custodian xác nhận khi phê duyệt.

## 1. Tóm tắt thay đổi

Đề nghị thay yêu cầu tuyệt đối “mỗi external attempt phải có một terminal `AIRequestLog`” bằng quy tắc khả thi với schema/lifecycle hiện tại:

1. Sau khi phân loại kết quả của external attempt, backend thực hiện **đúng một** lần insert terminal `SUCCESS` hoặc `FAILED`.
2. Không tạo `PENDING`/placeholder, không giữ transaction qua inference, không retry inference và không retry insert khi kết quả ghi không xác định.
3. Nếu inference thành công nhưng backend không xác nhận được insert, backend bỏ kết quả AI, không tạo preview/context hoặc business success, và trả `502 AI_RUNTIME_FAILURE` với message đã có.
4. Nếu inference đã thất bại, backend giữ nguyên public error gốc; persistence failure được ghi bằng diagnostic an toàn.
5. Nếu insert đã commit nhưng acknowledgement bị timeout/mất, backend vẫn trả theo quy tắc trên vì không thể biết commit outcome. Row có thể tồn tại với status phản ánh inference outcome; không tạo insert thứ hai để dò hoặc bù.

`AIRequestLog.status` phân loại **AI attempt sau NestJS output validation**. `SUCCESS` chỉ khi response envelope/correlation, task schema, semantic/reference checks và required-content rules đều được NestJS chấp nhận. HTTP 200, JSON parse thành công, hoặc model tự cho rằng hoàn tất không đủ để ghi `SUCCESS`. `FAILED` áp dụng cho mọi external attempt kết thúc bằng runtime/network/protocol/output-validation failure; persistence failure là một failure channel riêng, không tự đổi status inference đã được phân loại.

Thay đổi này **không bảo đảm có một `AIRequestLog` cho mọi external attempt**. Nó cần sửa AI-REQ-018 cùng các semantics phụ thuộc, đặc biệt `FR-COM-006`, `NFR-LOG-002` và Admin dashboard aggregates. Không có baseline, schema, API behavior hay code nào được sửa bởi release candidate này.

Phạm vi guarantee còn lại cũng phải viết chính xác: một insert được thử khi handler còn chạy tới bước terminal persistence; process crash/kill sau dispatch nhưng trước bước đó vẫn có thể để lại attempt không log. Option A không có recovery cho trường hợp này.

## 2. Lý do đề xuất

- [x] Baseline hiện hành quy định một bảo đảm không thể thực thi tuyệt đối với terminal insert sau inference, trong khi cấm các cơ chế khắc phục đang được xem xét.
- [x] Cần xác định failure behavior trước khi Task 5 implement persistence lifecycle và trước khi Task 6 cho phép dispatch.

AI Contract v1.0 §14.2 yêu cầu terminal row sau mỗi dispatch. Database Design v1.0 chỉ có terminal `SUCCESS|FAILED`; không có `PENDING`. Database Design §10.6 cấm transaction kéo dài qua external call. Việc kiểm tra kết nối DB trước dispatch không bảo đảm lần ghi sau inference sẽ thành công. Một timeout khi ghi còn có thể xảy ra sau khi transaction đã commit nhưng acknowledgement không tới backend.

Định hướng Option A do người yêu cầu chọn làm cơ sở soạn CR, không được hiểu là chấp thuận thay đổi baseline hay cho phép triển khai.

## 3. Baseline và traceability bị ảnh hưởng

| Loại | Tham chiếu | Ý nghĩa hiện hành | Thay đổi đề xuất |
|---|---|---|---|
| Use Case | `UC-STU-004`, `UC-STU-005`, `UC-STU-009`, `UC-TEA-005`, `UC-TEA-006`, `UC-ADM-004`, `UC-ADM-005`; Use Case Spec §3.2 `AI-ERROR` | Mỗi attempt đã dispatch phải có `AIRequestLog`; AI lỗi không làm mất dữ liệu cũ; UI hiển thị lỗi và cho retry khi phù hợp. | Ngoại lệ terminal-write failure được mô tả rõ; giữ nguyên dữ liệu và error gốc; không hứa row khi insert không được xác nhận. User retry là request/attempt mới, không phải retry tự động.
| Requirement | `AI-REQ-016`, `AI-REQ-017`, `AI-REQ-018`, `AI-REQ-019` | Giữ dữ liệu; báo lỗi dễ hiểu; mọi external attempt có log; không lưu raw prompt/output mặc định. | Giữ 016/017/019; sửa 018 thành một lần thử insert terminal, với khả năng row không tồn tại/không xác định khi persistence thất bại.
| Requirement | `FR-COM-006` | Mỗi lần gọi AI tạo được log thành công hoặc thất bại. | Thay acceptance thành một lần terminal insert sau attempt; chỉ xác nhận được row khi insert được xác nhận; định nghĩa rõ khi ghi không xác nhận.
| Data / NFR | `DATA-REQ-009`, `NFR-LOG-002` | Log được giữ trong vòng đời demo; mọi AI call phải có AIRequestLog. | Giữ nguyên retention; sửa NFR-LOG-002 cùng AI-REQ-018 để ghi rõ giới hạn best-effort và trường hợp chưa có row.
| Business Rule | `OD-37`, `BR-029` | `totalAIRequests` đại diện external attempts; `failedAIRequests` đếm log `FAILED`; các metrics là lifetime. | Đổi nghĩa `totalAIRequests` thành số terminal rows đã lưu/được ghi nhận, tức lower bound của attempts; `failedAIRequests` vẫn đếm row `FAILED`. Không suy ra HTTP/API completion từ status của log.
| API | API-ADM-DASH-001 `GET /api/v1/admin/dashboard`; API Specification v1.5 §§3.8, 9.1, 11.5, 13, 22 | Dashboard trả `totalAIRequests`/`failedAIRequests`; mọi attempt phải có log; `500 DATABASE_FAILURE` là lỗi DB chung; `AI_RUNTIME_FAILURE` hiện chỉ bao runtime/provider/integration failure. | Giữ endpoint/response schema/error catalog values; mở rộng mapping `AI_RUNTIME_FAILURE` cho terminal-log persistence failure sau inference success; inference failure + log failure → giữ error gốc. Generic DB failures khác vẫn là `500 DATABASE_FAILURE`.
| UI | `UC-ADM-001`, `FR-ADM-001`, `SCR-ADM-001`, Wireframe §Admin Dashboard; AI error states | Dashboard thể hiện `totalAIRequests`, `failedAIRequests`; AI_RUNTIME_FAILURE dùng error panel/message hiện có và cho retry khi phù hợp. | Dashboard hiển thị số liệu của log đã lưu, có thể thấp hơn attempts thực tế; thêm nội dung giải thích “lượt đã ghi nhận”/caveat nếu hiện tại UI tuyên bố là số lần gọi chính xác. Giữ error panel và không tự retry.
| Database | Database Design v1.0 §§6.7, 10.6, 20.7 | Model `AIRequestLog` chỉ có status terminal `SUCCESS` hoặc `FAILED`; dashboard đếm rows; mỗi actual attempt cần row; không transaction qua inference. | Không đổi schema, enum, field, migration hoặc query shape. Cập nhật mô tả semantics row/aggregate và nêu rõ row có thể vắng mặt/không xác định khi insert không được xác nhận.
| AI Contract | AI Contract v1.0 §§6.6–7, 14.1–14.3; approved Erratum 2 E6 | Mỗi dispatch phải kết thúc bằng đúng một terminal row; NestJS validate envelope, correlation, schema và semantics trước khi business success; không `PENDING`; lưu `createdAt=attemptStartedAt`, monotonic duration khi có. | Sửa lifecycle để yêu cầu một terminal insert attempt và xác định `SUCCESS/FAILED` từ kết quả AI attempt sau NestJS output validation; quy định hai nhánh response; không tuyên bố guarantee row khi insert thất bại/ack mất; giữ field, feature keys, privacy, no-PENDING và timestamp rules.
| Activity / workflow | Activity Diagram 3 §4.2 và các AI main flows | Mọi attempt thực tế phải có log; log trước khi hoàn tất các flow liên quan. | Bổ sung terminal insert failure branch sau inference; không tạo preview/context hoặc business success khi inference thành công nhưng write không được xác nhận.
| Plan / design | Phase 2B Implementation Plan Task 5–6; AI Foundation Design §8 | Task 5/6 bị block do disposition chưa có; log trước success/context; dispatch qua gateway. | Sau approval, thay blocker bằng policy đã phát hành; thêm tests và acceptance cho failed/ambiguous terminal writes. Fresh plan review trước code.

## 4. Hành vi baseline hiện tại

- SRS v1.6 AI-REQ-018 và API Specification §§3.8/13 yêu cầu log cho mọi external attempt đã bắt đầu; pre-dispatch rejection không có log.
- SRS FR-COM-006 yêu cầu mỗi lần gọi AI tạo được log `SUCCESS` hoặc `FAILED`.
- Business Rules OD-37 định nghĩa `totalAIRequests` là actual external attempts được phản ánh qua log; `failedAIRequests` là các log có status `FAILED`.
- AI Contract §§6.6–7, 14.2 và approved Erratum 2 E6 quy định NestJS là nơi kiểm tra envelope/correlation/schema/semantics và chỉ NestJS-validated output được xem là business success; Contract validation matrix ghi “Output qua toàn bộ validation → success/SUCCESS”. Model HTTP 200 hoặc JSON parse đơn thuần không đủ.
- AI Contract §14.2 ghi nhận `attemptStartedAt` ngay trước dispatch, rồi lưu đúng một terminal row sau khi phân loại outcome; không ghi `PENDING`.
- Database Design giữ các field metadata hiện hữu và yêu cầu không mở transaction trong inference.
- API v1.5/SRS XAI-002 đã định nghĩa `502 AI_RUNTIME_FAILURE` và message chung; CR giữ nguyên code/status/message nhưng đề xuất mở rộng trường hợp mapping như nêu dưới đây.

**Xung đột cần phê duyệt:** API v1.5 §11.5 hiện giới hạn `AI_RUNTIME_FAILURE` cho runtime/provider/integration errors và API §22 có `500 DATABASE_FAILURE`. CR này đề xuất dùng `AI_RUNTIME_FAILURE` cho trường hợp hẹp inference đã thành công nhưng terminal AIRequestLog chưa được xác nhận. Đây là mở rộng semantics của public error mapping, dù không thêm code/status/response shape; API/XAI-002 phải ghi rõ exception này sau approval. Lỗi DB ngoài nhánh AI không đổi.

## 5. Hành vi đề xuất sau phê duyệt

### 5.1. Persistence protocol

- Capture `attemptStartedAt` ngay trước dispatch; dispatch vẫn là thời điểm attempt bắt đầu.
- Sau khi có inference outcome, gọi đúng một lần terminal insert với status inference `SUCCESS` hoặc `FAILED`, `createdAt=attemptStartedAt`, `durationMs` monotonic nếu đo được, và `errorCode` theo Contract.
- Quy tắc một insert áp dụng khi backend còn chạy tới bước persistence sau khi phân loại outcome; crash/kill trước bước đó không được phục hồi trong Option A.
- Không gọi insert lần hai khi Prisma/PostgreSQL trả lỗi, timeout hoặc acknowledgement không xác định. Không retry external inference.
- Persistence error phải có diagnostic key `AI_REQUEST_LOG_PERSISTENCE_FAILURE`, cùng metadata kỹ thuật tối thiểu đã lọc; không ghi token, prompt, raw output hay thông tin user không cần thiết.

### 5.2. Public result handling

| AI attempt outcome after NestJS output validation | Terminal insert result | Public response | Business effect |
|---|---|---|---|
| Success | Confirmed | Existing success response sau các validation khác | Chỉ tiếp tục flow bình thường sau xác nhận log.
| Success | Definite rejection / DB outage | `502 AI_RUNTIME_FAILURE`, existing message | Bỏ output; không tạo preview/context; không mutation/business success.
| Success | Timeout/ACK mất; commit outcome unknown | Cũng `502 AI_RUNTIME_FAILURE`, existing message | Xử lý fail-closed như unconfirmed; không dò/bù bằng insert thứ hai; row có thể đã commit hoặc không.
| Failure (`AI_TIMEOUT`, `AI_CONNECTION_FAILURE`, `AI_EMPTY_RESPONSE`, `AI_INVALID_STRUCTURE`, `AI_INCOMPLETE_DATA`, hoặc `AI_RUNTIME_FAILURE`) | Definite rejection hoặc outcome unknown | Giữ nguyên public status/code/message của inference failure | Giữ dữ liệu cũ; không tạo business success; ghi persistence diagnostic an toàn.

Trong trường hợp “DB commit nhưng backend timeout”, response vẫn là lỗi vì backend không nhận được xác nhận. Nếu row đã commit và inference thành công, row có thể có `status=SUCCESS` dù người dùng nhận HTTP 502 và không nhận preview/context. `AIRequestLog.status` phản ánh outcome inference đã validate, không phải việc HTTP response đã được giao hay nghiệp vụ đã hoàn tất. Không được đổi row thành `FAILED` hoặc tạo row thứ hai dựa trên việc backend không nhận ACK.

Message `AI_RUNTIME_FAILURE` hiện có có thể khuyến khích user thử lại sau. User-initiated retry là một request/attempt mới và có thể gọi inference lại; backend không tự retry. CR không bổ sung idempotency API hoặc đảm bảo retry của user không trùng external work.

### 5.3. Aggregate/dashboard semantics

- `totalAIRequests = COUNT(ai_request_logs)` vẫn giữ nguyên query và field API, nhưng được định nghĩa là **số external attempts có terminal row đã lưu**, không phải tổng số attempts thực tế.
- `failedAIRequests = COUNT(*) WHERE status='FAILED'` vẫn giữ nguyên. Đây là số row ghi nhận inference failure, không phải số HTTP errors hay số lần terminal insert failure.
- Nếu insert không commit, cả hai aggregates không bao gồm attempt đó. Nếu insert đã commit nhưng ACK timeout, row vẫn được tính; với inference success, `totalAIRequests` tăng nhưng `failedAIRequests` không tăng dù client đã nhận `AI_RUNTIME_FAILURE`.
- Dashboard không có đủ dữ liệu để khôi phục hoặc đo chính xác số attempts bị thiếu. Không tạo metric/API mới trong CR này; UI/docs phải tránh gọi aggregate là số chính xác của mọi external attempt và giải thích đây là số lượt đã ghi nhận.

## 6. Vì sao không thể giữ baseline như cũ bằng implementation detail

Với terminal insert sau inference, backend không thể atomically commit kết quả inference ở runtime và row trong PostgreSQL. Preflight DB connectivity không dự đoán được trạng thái DB khi inference kết thúc. Timeout có thể xảy ra sau commit nên blind retry có thể tạo duplicate; không retry có thể để row thiếu. Hiện schema không có attempt id/unique key hoặc recovery journal để giải quyết ambiguity.

Ngoài ra, process crash/kill sau dispatch và trước terminal insert cũng không thể được phát hiện hay phục hồi bằng Option A. Guarantee tối đa của phương án là một lần insert khi application handler còn sống và đi tới nhánh persistence; không phải mọi dispatch trong mọi failure mode.

Các phương án dùng placeholder/PENDING, write-ahead row hoặc transaction kéo dài qua inference trái AI Contract §14 và Database Design §10.6. Vì vậy việc nới guarantee của AI-REQ-018 và đổi dashboard semantics là thay đổi yêu cầu/observable behavior, không thể ban hành như một technical-only decision.

## 7. Tác động

### Requirements / Use Cases

- Sửa AI-REQ-018 và FR-COM-006 như ma trận traceability.
- Đồng bộ `NFR-LOG-002`; giữ nguyên `DATA-REQ-009` retention.
- Giữ AI-REQ-016, AI-REQ-017, AI-REQ-019; không mất dữ liệu cũ, giữ message/error gốc khi inference đã fail, không log raw data.
- Cập nhật phần AI-ERROR trong Use Case Specification cho nhóm AI UC bị ảnh hưởng. Không đổi actor, quyền, eligibility, hoặc business outcome.

### Business Rules / Dashboard

- Cập nhật BR-029/OD-37 để thống kê rows đã lưu thay vì giả định phản ánh đầy đủ mọi attempt.
- Giữ trường `totalAIRequests`/`failedAIRequests`, lifetime scope và quan hệ `failedAIRequests` là subset của `totalAIRequests`.
- Nêu rõ hai ví dụ ACK timeout trên để tránh diễn giải `AI_RUNTIME_FAILURE` đồng nghĩa inference failure.
- Dashboard sẽ undercount khi log không commit; trong trường hợp commit-then-timeout, dashboard có thể count một inference SUCCESS mà API không trả success.

### API / Frontend

- Không thêm endpoint, status/code, response field hoặc retry behavior.
- Giữ nguyên public error catalog values, nhưng mở rộng XAI-002 để nhánh inference-success + unconfirmed terminal log dùng `502 AI_RUNTIME_FAILURE`; đây là exception có chủ đích so với generic `500 DATABASE_FAILURE`.
- Giữ nguyên mapping của inference failure nếu persistence cũng thất bại; diagnostic persistence chỉ ở server side.
- Giữ UI error/loading semantics; không tự retry. Cập nhật dashboard label/help text nếu nội dung hiện tại khẳng định totalAIRequests bằng đúng số external attempts.

### Database / AI Contract

- Không đổi schema, migration, fields, enum, key, hoặc retention.
- Sửa prose trong Database Design §20.7 và aggregate semantics; không đổi `COUNT` SQL semantics.
- Sửa AI Contract §14.2 lifecycle/error notes theo 5.1–5.2; giữ sáu feature keys, `attemptStartedAt`, `createdAt`, monotonic duration, privacy, không `PENDING`, không transaction inference, không inference retry.

### Tests / Operations

- Bổ sung unit/integration tests liệt kê ở §8.
- Phát diagnostic an toàn `AI_REQUEST_LOG_PERSISTENCE_FAILURE` qua logger hiện có. Operator cần alert/điều tra DB từ log vận hành; diagnostic không phục hồi row bị thiếu.
- Không thêm queue, retry subsystem, reconciliation job, database profile hay monitoring platform.

## 8. Test cases và tiêu chí nghiệm thu đề xuất

| ID | Kịch bản | Kết quả cần xác nhận |
|---|---|---|
| CR6-T01 | Runtime response qua envelope/correlation, task schema, semantic/reference và required-content validation của NestJS | Chỉ output được NestJS chấp nhận mới có thể ghi một `SUCCESS`; sau khi insert xác nhận mới trả success/tiếp tục tạo context.
| CR6-T02 | Runtime trả HTTP 200/JSON nhưng NestJS từ chối envelope/correlation hoặc task schema/reference | Ghi terminal `FAILED` với public/internal category đúng; không trả business success.
| CR6-T03 | Schema hợp lệ nhưng NestJS semantic/required-content validation từ chối, gồm thiếu nội dung StudyPlan | Ghi `FAILED`; giữ mapping phù hợp (`AI_INVALID_STRUCTURE` hoặc `AI_INCOMPLETE_DATA`); không tạo preview/context.
| CR6-T04 | NestJS chấp nhận output; terminal insert bị reject do DB outage/constraint | Chỉ một insert; HTTP 502 `AI_RUNTIME_FAILURE`; không output, context, preview hay business mutation.
| CR6-T05 | NestJS chấp nhận output; row commit nhưng ACK timeout về backend | HTTP 502 `AI_RUNTIME_FAILURE`; không context/mutation; row `SUCCESS` có thể tồn tại và dashboard đếm row đó; không insert lần hai.
| CR6-T06 | Inference thất bại (`AI_TIMEOUT`, connection/protocol/output error) và terminal insert bị reject | Giữ HTTP/code/message gốc; phát persistence diagnostic; không inference retry.
| CR6-T07 | Inference thất bại; row commit nhưng ACK timeout | Giữ public inference error; nếu row tồn tại, status/errorCode phản ánh inference failure; không insert lần hai.
| CR6-T08 | DB connection refused/timeout ở terminal write | Một insert attempt tối đa; không retry insert/inference; terminal row có thể thiếu hoặc commit status không xác định.
| CR6-T09 | Đo timestamp/duration khi write lỗi | `attemptStartedAt` ngay trước dispatch; duration monotonic; không tạo timestamp/log giả để lấp gap.
| CR6-T10 | Diagnostic redaction | Có feature, safe DB error class/code, validated outcome class; không secret, prompt, raw output hoặc dữ liệu cá nhân không cần thiết.
| CR6-T11 | Aggregates khi row thiếu và khi SUCCESS row commit nhưng client nhận 502 | Chỉ đếm row tồn tại; row SUCCESS commit làm total tăng, failed không tăng; UI không diễn giải count là số attempt tuyệt đối.
| CR6-T12 | No-PENDING/no-long-transaction/non-AI isolation | Không pre-dispatch row/PENDING; inference mở không giữ DB transaction; DB logging failure policy không đổi startup hoặc non-AI endpoints.

**Acceptance:** với mỗi dispatched attempt còn chạy tới terminal persistence, thực hiện một insert attempt; `SUCCESS` chỉ sau khi NestJS output validation pass; output/model/runtime response không qua validation là `FAILED`; zero automatic inference retries; zero blind persistence retries; success không thoát ra ứng dụng nếu terminal log chưa được xác nhận; error gốc được giữ nếu inference đã thất bại; process crash trước bước insert và mọi failed/ambiguous insert đều có thể để lại attempt không row. Không claim rằng mỗi attempt luôn có row. Định nghĩa cuối cùng phải được cập nhật đồng bộ trong các tài liệu được phát hành sau approval.

## 9. Tài liệu cần cập nhật sau phê duyệt

Chỉ cập nhật artifact mới có version/revision sau khi CR được phê duyệt; giữ nguyên artifact R3 lịch sử và manifest hiện tại trong giai đoạn review.

- [ ] SRS v1.6 → revision mới: FR-COM-006, AI-REQ-018, NFR-LOG-002, AI error acceptance và OD-37/dashboard semantics; xác nhận DATA-REQ-009 retention giữ nguyên.
- [ ] Business Rules v1.4 → revision mới: BR-029/OD-37 aggregate interpretation.
- [ ] API Specification v1.5 → revision mới: §§3.8, 11.5, 13, 22 / XAI-002; ghi exception mapping mới, giữ nguyên error catalog values và response shapes.
- [ ] AI Contract v1.0 → approved supplement/revision cho §14.2 failure semantics; xác nhận Contract version compatibility.
- [ ] Database Design v1.0 → revision mới hoặc approved addendum: §20.7, dashboard aggregate meaning; xác nhận schema không đổi.
- [ ] Use Case Specification: §3.2 `AI-ERROR`.
- [ ] Activity Diagram 3: terminal log persistence failure branch cho flow AI.
- [ ] Wireframe SCR-ADM-001 / UI Sitemap: diễn giải metrics là số log/attempt đã ghi nhận, caveat undercount.
- [ ] Phase 2B Design Spec và Implementation Plan: cập nhật blocker, Task 5/6 behavior, acceptance và test plan; fresh plan review.
- [ ] Governance Index / Freeze Record / manifest / traceability reports: chỉ sau khi downstream revisions được audit và phát hành.
- [ ] Test strategy / API contract tests / admin dashboard tests.

Không phải tài liệu nào trong danh sách cũng cần sửa nội dung; người quản trị baseline quyết định revision/cross-document sync sau approval. Checklist này không cho phép tự sửa các file trên.

## 10. Rủi ro

### Nếu CR được phê duyệt

- AIRequestLog và dashboard có thể thiếu attempt khi DB không commit hoặc process dừng trước terminal insert; Option A không thể khôi phục thiếu sót.
- Người dùng có thể nhận `AI_RUNTIME_FAILURE` dù inference thành công và row `SUCCESS` đã commit; Dashboard sẽ ghi nhận inference success, không phản ánh HTTP failure.
- Người dùng bấm thử lại có thể tạo external attempt mới vì không có idempotency key; backend không retry tự động.
- Operations phải dựa vào sanitized server diagnostics để phát hiện persistence outage; diagnostic không tương đương audit record bền vững.

### Nếu CR bị từ chối / chưa được phê duyệt

- AI-REQ-018 và AI Contract §14.2 tiếp tục yêu cầu row cho mọi dispatch; Task 5 không thể đóng với Option A.
- Task 6 và mọi application dispatch phụ thuộc vào Task 5 tiếp tục bị khóa; không được code Option A như thể đã được duyệt.
- Cần chọn một phương án khác và làm change control nếu phương án đó sửa schema/lifecycle, hoặc giữ dispatch disabled.

## 11. Implementation hold và mở khóa Task 5

**Candidate status:** RELEASE CANDIDATE — PENDING HUMAN APPROVAL.  
**Affected implementation status:** BLOCKED.

Không bắt đầu phát hành CR, checksum, cross-document audit hoặc sửa Implementation Plan trước khi nhận được quyết định phê duyệt rõ ràng.

Task 5 chỉ được mở sau tất cả điều kiện sau:

1. Project Owner/reviewer có thẩm quyền phê duyệt CR-006 và xác nhận rõ các mục trong §12, bao gồm việc AI-REQ-018 không còn bảo đảm row cho mọi attempt.
2. Governance custodian xác nhận/đăng ký candidate ID `CR-006`; đây là candidate duy nhất trong repo search nhưng hiện chưa được formally reserved.
3. Sau approval, phát hành CR theo governance process và tạo checksum cho artifact release.
4. Sau đó revision/addendum các tài liệu downstream trong §9; chạy cross-document audit và đăng ký các artifact mới trong governance authority. Không sửa đè R3.
5. Sau khi authority revisions được phát hành, cập nhật Implementation Plan Task 5 theo disposition và yêu cầu **fresh read-only Plan Review**; plan review cũ không cover thay đổi này.
6. Chỉ sau review PASS và explicit Task 5 implementation authorization mới bắt đầu code/test; không thêm `PENDING`, schema change, inference retry hay blind persistence retry. Task 5 chỉ được tuyên bố PASS khi acceptance/test đã duyệt đều đạt.

Phê duyệt CR-006 **không tự mở khóa Task 6 dispatch**. Task 6 còn phụ thuộc Task 4B/capacity profile được duyệt và các runtime governance gates riêng trong Implementation Plan (bao gồm CR-005/ADR nếu dùng runtime portability đề xuất).

## 12. Decision

**Decision:** RELEASE CANDIDATE — PENDING HUMAN APPROVAL  
**Recommendation:** Approve Option A only if the owner explicitly accepts the AI-REQ-018 guarantee gap, dashboard undercount, commit-then-ACK-timeout result, and `AI_RUNTIME_FAILURE` exception to the current `DATABASE_FAILURE` mapping.  
**Project Owner decision required:**

- [ ] Accept best-effort terminal logging: one insert attempt when the handler reaches persistence; no row guarantee after DB error/ambiguous ACK or process crash before insert.
- [ ] Accept `totalAIRequests`/`failedAIRequests` as persisted-log aggregates that may undercount actual external attempts.
- [ ] Accept that a commit followed by ACK timeout returns HTTP 502 to the user while a `SUCCESS` row may exist and be counted.
- [ ] Accept `AI_RUNTIME_FAILURE` for inference success with unconfirmed terminal-log persistence, as a narrow exception to generic `DATABASE_FAILURE`; preserve the original inference error when inference failed.
- [ ] Confirm `SUCCESS`/`FAILED` reflect the AI attempt after NestJS output validation, not merely the model/runtime response.

**Reviewer:**  
**Decision Date:**  
**Notes:** Option A was selected as drafting direction only. No release, checksum, cross-document audit, baseline/schema/plan/code update, or commit has occurred.
