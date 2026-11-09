# CHANGE REQUEST — CR-006
## Xử lý khi terminal AIRequestLog không được xác nhận sau external AI attempt

**Dự án:** Hệ thống hỗ trợ tự học ứng dụng AI  
**Change ID:** `CR-006` (registered; no prior collision found in repository governance records)  
**Phiên bản:** 1.0 Approved  
**Ngày:** 09/11/2026  
**Trạng thái:** APPROVED — DOWNSTREAM RELEASE  
**Loại:** AI request logging reliability / failure semantics  
**Trigger:** Phase 2B AIRequestLog Persistence Failure Change Request  
**Quyết định:** Project Owner approved Option A on 09/11/2026. This release changes downstream authority only; R3 source artifacts and frozen manifest remain unchanged.

**Registry check:** Governance Index R3 v1.2 lists CR-002 only. A repository search before registration found no other CR-006. This release registers CR-006 in Governance Index v1.3 Addendum; the R3 index and freeze record are preserved unchanged.

## 1. Tóm tắt thay đổi

Đề nghị thay yêu cầu tuyệt đối “mỗi external attempt phải có một terminal `AIRequestLog`” bằng quy tắc khả thi với schema/lifecycle hiện tại:

1. Sau khi phân loại kết quả của external attempt, backend thực hiện **đúng một** lần insert terminal `SUCCESS` hoặc `FAILED`.
2. Không tạo `PENDING`/placeholder, không giữ transaction qua inference, không retry inference và không retry insert khi kết quả ghi không xác định.
3. Nếu inference thành công nhưng backend không xác nhận được insert, backend bỏ kết quả AI, không tạo preview/context hoặc business success, và trả `502 AI_RUNTIME_FAILURE` với message đã có.
4. Nếu inference đã thất bại, backend giữ nguyên public error gốc; persistence failure được ghi bằng diagnostic an toàn.
5. Nếu insert đã commit nhưng acknowledgement bị timeout/mất, backend vẫn trả theo quy tắc trên vì không thể biết commit outcome. Row có thể tồn tại với status phản ánh inference outcome; không tạo insert thứ hai để dò hoặc bù.

`AIRequestLog.status` phân loại **AI attempt sau NestJS output validation**. `SUCCESS` chỉ khi response envelope/correlation, task schema, semantic/reference checks và required-content rules đều được NestJS chấp nhận. HTTP 200, JSON parse thành công, hoặc model tự cho rằng hoàn tất không đủ để ghi `SUCCESS`. `FAILED` áp dụng cho mọi external attempt kết thúc bằng runtime/network/protocol/output-validation failure; persistence failure là một failure channel riêng, không tự đổi status inference đã được phân loại.

Thay đổi này **không bảo đảm có một `AIRequestLog` cho mọi external attempt**. Nó sửa cách diễn giải downstream của AI-REQ-018 cùng các semantics phụ thuộc, đặc biệt `FR-COM-006`, `NFR-LOG-002` và Admin dashboard aggregates, qua addendum được phát hành cùng CR này. R3 baseline, schema và API surface không bị ghi đè hoặc mở rộng ngoài ngoại lệ đã phê duyệt.

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
| Plan / design | Phase 2B Implementation Plan Task 5–6; AI Foundation Design §8 | Task 5 previously lacked terminal-write disposition; dispatch remains separately capacity/runtime-gated. | CR-006 now resolves the Task 5 policy; the plan adds failure/ambiguity tests and acceptance. Fresh read-only plan review and separate Task 5 authorization remain required; CR-006 does not authorize Task 5/6 implementation.

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

## 9. Downstream updates released

The approved addendum in this release package is the non-destructive revision mechanism: it leaves the R3 artifacts and baseline manifest unchanged while amending their downstream interpretation. Cross-document audit is in `Cross_Document_Audit_CR-006_v1.0.md`.

- [x] SRS/Business Rules: `FR-COM-006`, `AI-REQ-018`, `NFR-LOG-002`, `BR-029`/`OD-37`; `DATA-REQ-009` retention unchanged.
- [x] API v1.5: §§3.8, 11.5, 13, 22 / XAI-002 narrow mapping exception; error catalog values and response shapes unchanged.
- [x] AI Contract §14.2 lifecycle/status semantics; `SUCCESS`/`FAILED` after NestJS validation.
- [x] Database Design §§6.7, 10.6, 20.7: aggregate interpretation; schema unchanged.
- [x] Use Case Spec §3.2 `AI-ERROR`; Activity Diagram terminal persistence branch.
- [x] Wireframe dashboard metric caveat; UI Sitemap has no route/screen inventory change.
- [x] Phase 2B Design Spec and Implementation Plan updated; fresh read-only Plan Review remains a Task 5 gate.
- [x] Governance Index v1.3 downstream addendum and CR-006 cross-document audit released; R3 freeze record/manifest left untouched.
- [x] Task 5 test strategy includes CR6-T01–T11, persistence/non-AI portions of T12, and guarded PostgreSQL insert/aggregate integration tests. Task 6 owns the network transaction assertion in T12.

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

**Release status:** APPROVED — DOWNSTREAM RELEASE.  
**Affected implementation status:** Task 5 remains gated by fresh read-only Plan Review PASS and separate Task 5 implementation authorization. Task 6 additionally depends on Task 4B and runtime governance/capacity gates.

Không bắt đầu phát hành CR, checksum, cross-document audit hoặc sửa Implementation Plan trước khi nhận được quyết định phê duyệt rõ ràng.

Task 5 chỉ được mở sau tất cả điều kiện sau:

1. CR-006 v1.0 is registered and released with the downstream addendum, Governance Index v1.3 Addendum and cross-document audit in this release package.
2. The Project Owner approved all five decisions in §12 on 09/11/2026.
3. The Implementation Plan has been updated; a fresh read-only Plan Review must PASS before Task 5 implementation.
4. Separate explicit authorization is required before Task 5 code/tests begin. No `PENDING`, schema change, inference retry or blind persistence retry is permitted by this CR.
5. Task 5 cannot be declared PASS until its approved acceptance/tests pass. Task 6 is not authorized by this release and remains gated by Task 4B/capacity and runtime governance.

Phê duyệt CR-006 **không tự mở khóa Task 6 dispatch**. Task 6 còn phụ thuộc Task 4B/capacity profile được duyệt và các runtime governance gates riêng trong Implementation Plan (bao gồm CR-005/ADR nếu dùng runtime portability đề xuất).

## 12. Decision

**Decision:** APPROVED — DOWNSTREAM RELEASE  
**Approver:** Project Owner  
**Decision date:** 09/11/2026  
**Approved basis:** CR-006 v0.2 Release Candidate; all five decisions below explicitly accepted.  
**Project Owner decision:**

- [x] Accept best-effort terminal logging: one insert attempt when the handler reaches persistence; no row guarantee after DB error/ambiguous ACK or process crash before insert.
- [x] Accept `totalAIRequests`/`failedAIRequests` as persisted-log aggregates that may undercount actual external attempts.
- [x] Accept that a commit followed by ACK timeout returns HTTP 502 to the user while a `SUCCESS` row may exist and be counted.
- [x] Accept `AI_RUNTIME_FAILURE` for inference success with unconfirmed terminal-log persistence, as a narrow exception to generic `DATABASE_FAILURE`; preserve the original inference error when inference failed.
- [x] Confirm `SUCCESS`/`FAILED` reflect the AI attempt after NestJS output validation, not merely the model/runtime response.

**Notes:** No R3 baseline file, database schema, or code was changed by this release. No commit was made.
