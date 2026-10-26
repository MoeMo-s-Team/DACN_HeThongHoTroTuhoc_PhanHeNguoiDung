# ADR-AUTH-001 — AUTHENTICATION ARCHITECTURE DECISION
## Hệ thống hỗ trợ tự học ứng dụng AI

| Thuộc tính | Giá trị |
|---|---|
| **ADR ID** | `ADR-AUTH-001` |
| **Phiên bản** | `1.0` |
| **Ngày** | `24/10/2026` |
| **Trạng thái** | **Accepted — Official Release** |
| **Phạm vi** | Authentication và authorization integration cho Web Application MVP |
| **Kiến trúc** | Next.js → NestJS REST API → PostgreSQL |
| **Đóng Open Item** | `OPEN-ARCH-001` |
| **Supersedes** | Không |
| **Nguồn kiến trúc** | `System_Architecture_and_Technology_Stack_v1.0_baseline.md` |
| **Nguồn API** | `API_Specification_v1.4_baseline_final.md` |
| **Nguồn yêu cầu** | SRS, Business Rules, Use Case Specification baseline hiện hành |
| **Final review score** | **9.8/10** |
| **Release gate** | Critical: 0 · Important: 0 · Minor blocking: 0 |

---

# 1. Mục đích

ADR này chốt các quyết định kỹ thuật authentication còn mở trước khi triển khai `AuthModule`.

Các quyết định gồm:

- access token mechanism;
- JWT signing algorithm;
- signing secret strategy;
- access token lifetime;
- JWT claims;
- password hashing;
- login flow;
- protected request flow;
- frontend token storage;
- auth-state rehydration;
- logout lifecycle;
- invalid/expired token handling;
- `DISABLED` account handling;
- Authentication–Authorization boundary;
- security configuration;
- kiểm thử tối thiểu.

Tài liệu chỉ cụ thể hóa **technical implementation**.

ADR không được thay đổi API contract, role, business rule, actor, ownership rule hoặc observable business behavior đã được baseline hóa.

---

# 2. Authority và quan hệ với baseline

Architecture cho phép ADR cụ thể hóa một technical decision cục bộ nhưng không được trái requirement hoặc API baseline.

Architecture hiện có Open Item:

```text
OPEN-ARCH-001

Exact JWT expiry,
signing algorithm/key strategy,
minimal claims
```

ADR này đóng `OPEN-ARCH-001` bằng các quyết định:

```text
JWT expiry = 2h
Signing = HS256
Secret = ≥ 32 cryptographically random bytes, Base64-encoded for environment transport
Claims = sub + iat + exp
```

ADR không tạo refresh-token API, token blacklist hoặc multi-session management ngoài baseline.

---

# 3. Bối cảnh

API sử dụng:

```http
Authorization: Bearer <accessToken>
```

Architecture đã chốt:

```text
Browser / Next.js
       ↓
Bearer JWT từ sessionStorage
       ↓
NestJS REST API
       ↓
PostgreSQL
```

Access token JWT được lưu trong `sessionStorage`; logout xóa token, User state và query cache; MVP không có refresh-token endpoint, blacklist hoặc multi-session management.

---

# 4. Mục tiêu thiết kế

Authentication MVP ưu tiên:

```text
Đơn giản
+
Dễ triển khai
+
Dễ kiểm thử
+
Dễ debug
+
Dễ giải thích khi bảo vệ
+
Đủ an toàn cho MVP/demo
```

Một yêu cầu xuyên suốt quan trọng:

> User đã bị chuyển sang `DISABLED` phải bị từ chối ở protected request tiếp theo kể cả khi client còn giữ token chưa hết hạn.

Do đó JWT không phải nguồn authorization duy nhất.

---

# 5. Ngoài phạm vi

ADR không bổ sung:

- refresh token;
- token rotation;
- token blacklist;
- server-side session store;
- multi-device session management;
- OAuth;
- Google Login;
- public registration;
- forgot/reset password;
- email verification;
- MFA;
- custom permission system;
- role mới;
- individual JWT revocation.

Các chức năng trên cần review/change control riêng nếu phạm vi thay đổi.

---

# 6. Phương án đã xem xét

## 6.1. JWT + HS256

NestJS sử dụng shared secret để ký và verify JWT.

### Ưu điểm

- ít configuration;
- phù hợp một NestJS backend;
- không cần public/private key management;
- dễ test;
- dễ triển khai;
- dễ giải thích.

### Hạn chế

Signing và verification sử dụng cùng secret.

Nếu tương lai nhiều service độc lập cần verify token, asymmetric signing có thể phù hợp hơn.

### Quyết định

**Chọn.**

## 6.2. JWT + RS256

Private key dùng để ký, public key dùng để verify.

### Ưu điểm

Phù hợp hệ thống có nhiều verifier độc lập.

### Hạn chế

- tăng key-management complexity;
- chưa đem lại giá trị tương xứng trong modular monolith hiện tại.

### Quyết định

**Không chọn cho MVP.**

## 6.3. Server-side Session

Backend giữ session state.

### Ưu điểm

Có thể revoke session trực tiếp.

### Hạn chế

- không phù hợp Bearer-token architecture đã chốt;
- cần persistence/lifecycle bổ sung;
- tăng infrastructure.

### Quyết định

**Không chọn.**

---

# 7. Decision Summary

| Nội dung | Quyết định |
|---|---|
| Authentication credential | Email + password |
| Password hashing | Argon2id |
| Argon2 memory | `19456 KiB` |
| Argon2 time cost | `2` |
| Argon2 parallelism | `1` |
| Access token | JWT |
| Signing algorithm | HS256 |
| Secret source | Backend environment |
| Secret material | ≥ 32 cryptographically random bytes |
| Environment representation | Base64 |
| JWT lifetime | 2 giờ |
| JWT claims | `sub`, `iat`, `exp` |
| Browser storage | `sessionStorage` |
| User-state rehydration | `GET /api/v1/me` |
| Authorization authority | Backend/database |
| Refresh token | Không |
| Token blacklist | Không |
| Server session store | Không |
| Multi-session management | Không |

---

# 8. Login API

```http
POST /api/v1/auth/login
```

Request:

```json
{
  "email": "student@example.com",
  "password": "user-password"
}
```

Email phải được normalize bằng `trim + lowercase`, response credential sai không tiết lộ account existence và User phải `ACTIVE`.

---

# 9. Email Normalization

Trước lookup:

```text
email
  ↓
trim
  ↓
lowercase
  ↓
lookup User
```

Ví dụ:

```text
" Student@Example.com "
```

thành:

```text
student@example.com
```

Cùng normalization rule được sử dụng cho create/import User, lookup, login và uniqueness validation.

---

# 10. Login Flow

```text
POST /auth/login
       ↓
Validate DTO
       ↓
trim + lowercase email
       ↓
Lookup User
       ↓
Argon2id verify
       ↓
Credential hợp lệ?
       ↓
User.status = ACTIVE?
       ↓
Sign JWT
       ↓
return accessToken + UserSummary
```

Không phát hành token khi credential invalid hoặc User `DISABLED`.

---

# 11. Login Error Semantics

## Invalid credential

Email không tồn tại hoặc password sai:

```text
401 INVALID_CREDENTIALS
```

External response không phân biệt hai trường hợp.

Không trả message như `Email không tồn tại` hoặc `Password sai`.

## Disabled account

Credential hợp lệ nhưng `User.status = DISABLED`:

```text
403 ACCOUNT_DISABLED
```

Không tạo token.

## Database/server failure

```text
500 DATABASE_FAILURE
```

Không phát hành authentication state không hoàn chỉnh.

---

# 12. Password Storage

Password không được lưu plain text.

Database chỉ lưu:

```text
passwordHash
```

Không lưu `password`, `plainPassword`, `rawPassword`.

Verification:

```text
password input
      +
encoded Argon2id hash
      ↓
Argon2 verify
      ↓
true / false
```

Backend không trả `passwordHash` trong API response.

Không ghi password hoặc hash vào application log.

---

# 13. Argon2id Configuration

ADR khóa:

```text
algorithm   = Argon2id
memoryCost  = 19456 KiB
timeCost    = 2
parallelism = 1
```

Đây là technical security decision của ADR, không phải business requirement upstream.

OWASP Password Storage Cheat Sheet tại thời điểm phát hành ADR khuyến nghị Argon2id với cấu hình tối thiểu `19 MiB`, `t=2`, `p=1`, đồng thời khuyến nghị benchmark work factor trên hệ thống đích.

Password-hashing library chịu trách nhiệm:

```text
generate unique random salt
+
hash bằng Argon2id
+
encode salt + parameters + hash
```

Application không tự hiện thực cryptographic algorithm.

Package/version được pin bằng project dependency lockfile.

---

# 14. Argon2id Performance Constraint

Cấu hình:

```text
m = 19456 KiB
t = 2
p = 1
```

là minimum được ADR chọn cho MVP.

Trong bootstrap/deployment environment phải benchmark hash và verify để bảo đảm login vẫn thực tế với tài nguyên demo.

Benchmark có thể dẫn đến **tăng** work factor nếu môi trường cho phép.

Không được tự giảm xuống dưới cấu hình ADR để xử lý performance issue nếu chưa review technical decision.

---

# 15. JWT Signing Algorithm

JWT sử dụng:

```text
HS256
```

NestJS là issuer/verifier của MVP.

Không có nhu cầu sử dụng asymmetric signing chỉ để hỗ trợ nhiều verifier vì hệ thống hiện không có topology đó.

---

# 16. JWT Secret Generation

Signing key phải bắt nguồn từ ít nhất:

```text
32 cryptographically random bytes
=
256 bits
```

RFC 7518 §3.2 yêu cầu HS256 sử dụng key có kích thước ít nhất bằng output SHA-256, tức 256 bit.

Không được dùng chuỗi dễ đoán như:

```text
secret
my-secret
123456
development-secret
```

---

# 17. JWT Secret Environment Representation

Environment variable:

```text
JWT_ACCESS_SECRET
```

chứa **Base64 representation của ít nhất 32 random bytes**.

Generation concept:

```text
CSPRNG
 ↓
32 random bytes
 ↓
Base64 encode
 ↓
JWT_ACCESS_SECRET
```

Runtime:

```text
JWT_ACCESS_SECRET
 ↓
Base64 decode
 ↓
raw secret bytes
 ↓
JWT HS256 signing / verification
```

Điều này phân biệt rõ `32 random bytes` với `32 ký tự do người viết tự nghĩ ra`.

---

# 18. Secret Handling Rules

Secret không được hard-code trong source, commit vào Git, đưa xuống frontend, ghi vào log, đặt trong URL hoặc trả qua API/error.

`.env.example`:

```env
JWT_ACCESS_SECRET=
```

không chứa giá trị thật.

Startup configuration validation phải từ chối:

```text
missing secret
invalid Base64
decoded secret < 32 bytes
```

MVP không yêu cầu secret rotation infrastructure.

---

# 19. JWT Lifetime

Access token:

```text
2 giờ
```

Rationale:

```text
đủ cho một phiên sử dụng/demo
+
không bắt login quá thường xuyên
+
giới hạn lifetime nếu token bị lộ
+
phù hợp hệ thống không refresh/blacklist
```

Lifetime là ADR constant:

```text
JWT_ACCESS_EXPIRES_IN = 2h
```

không phải environment setting tùy ý.

Thay đổi thời hạn cần review/revision ADR.

---

# 20. JWT Claims

Payload tối thiểu:

```json
{
  "sub": "user_opaque_id",
  "iat": 1792818000,
  "exp": 1792825200
}
```

`sub` là User ID, `iat` là issued-at, `exp` là expiration.

Không đưa profile hoặc authorization state không cần thiết vào token.

---

# 21. JWT Không Là Authorization Authority

JWT không phải nguồn chuẩn cho:

```text
User.status
role hiện tại
ownership
Teacher-Class relation
resource permission
custom permission
```

Nguyên tắc:

```text
JWT
→ identity

Database/backend
→ current authorization state
```

Frontend có thể sử dụng role trong UserSummary để navigation nhưng backend phải xác định quyền từ trạng thái hệ thống hiện tại.

---

# 22. JWT Verification

Protected request phải thực hiện:

```text
Bearer token tồn tại?
       ↓
format hợp lệ?
       ↓
JWT parse được?
       ↓
alg = HS256?
       ↓
signature hợp lệ?
       ↓
exp còn hạn?
       ↓
sub hợp lệ?
```

Reject token missing, malformed, wrong algorithm, invalid signature, expired hoặc invalid subject.

Chỉ sau verification mới lookup User.

---

# 23. Protected Request Flow

```text
Protected Request
       ↓
Extract Bearer JWT
       ↓
Verify JWT
       ↓
Read sub
       ↓
Lookup current User
       ↓
User tồn tại?
       ↓
User ACTIVE?
       ↓
Role được phép?
       ↓
Ownership/resource relation hợp lệ?
       ↓
Business Logic
```

Logical order:

```text
1. token valid
2. User exists
3. User ACTIVE
4. role allowed
5. ownership/resource relation allowed
```

---

# 24. DISABLED User Semantics

Ví dụ:

```text
09:00 Student login, JWT valid đến 11:00
09:30 Admin disable Student
09:31 Student gọi protected API
```

Backend:

```text
JWT valid
 ↓
lookup User
 ↓
status = DISABLED
 ↓
reject
```

Frontend clear login state khi nhận lỗi phù hợp.

---

# 25. Authentication vs Authorization

## Authentication

Trả lời:

```text
Request thuộc về User nào?
```

Cơ chế:

```text
JWT + sub
```

## Authorization

Trả lời:

```text
User hiện tại có được phép thực hiện operation này không?
```

Dựa trên User current state, role, ownership và resource relationship.

Frontend menu/route hiding không thay thế backend authorization.

---

# 26. Token Storage

Frontend lưu JWT trong:

```text
sessionStorage
```

API client gắn:

```http
Authorization: Bearer <accessToken>
```

MVP không yêu cầu đồng bộ authentication giữa browser tabs.

---

# 27. `sessionStorage` Semantics

MVP chấp nhận:

```text
Tab A login
→ Tab A có token

Tab B độc lập
→ không bắt buộc nhận auth state của Tab A
```

Auth state không phải persistent login dài hạn.

Đây là trade-off có chủ đích.

---

# 28. User-State Rehydration

Authenticated User state trong React/store có thể mất khi page reload, trong khi token trong `sessionStorage` vẫn tồn tại.

API đã có:

```http
GET /api/v1/me
```

cho authenticated `ACTIVE` User.

Do đó frontend bootstrap sử dụng `/me`.

---

# 29. Authentication Bootstrap States

Frontend tối thiểu dùng:

```text
UNKNOWN
AUTHENTICATED
UNAUTHENTICATED
AUTH_CHECK_ERROR
```

`AUTH_CHECK_ERROR` chỉ là frontend lifecycle state, không phải business state.

---

# 30. Bootstrap / Reload Flow

```text
Application start / reload
          ↓
Read token from sessionStorage
          ↓
      token exists?
       /       \
     no         yes
     ↓           ↓
UNAUTHENTICATED GET /api/v1/me
                 ↓
         classify response
```

### `/me` → 200

```text
restore User state
↓
AUTHENTICATED
↓
continue application
```

### Token invalid/expired

```text
clear token
clear User state
clear protected cache
↓
UNAUTHENTICATED
↓
/dang-nhap
```

### `ACCOUNT_DISABLED`

```text
clear token
clear User state
clear protected cache
↓
UNAUTHENTICATED
↓
/dang-nhap
```

---

# 31. Bootstrap Network / 5xx Failure

Network failure hoặc server `5xx` khi gọi `/me` **không chứng minh token invalid và không chứng minh User unauthenticated**.

Do đó:

```text
GET /me
  ↓
network failure / 5xx
  ↓
AUTH_CHECK_ERROR
```

Frontend phải giữ access token, không kết luận `UNAUTHENTICATED`, không tự logout và không xóa token chỉ vì backend unavailable.

UI có thể hiển thị trạng thái lỗi kết nối và cho retry.

Khi retry `/me` thành công:

```text
AUTH_CHECK_ERROR
→ AUTHENTICATED
```

Nếu retry xác nhận invalid/expired/disabled:

```text
AUTH_CHECK_ERROR
→ clear auth
→ UNAUTHENTICATED
```

---

# 32. Rehydration Decision Rule

Chỉ các lỗi xác nhận authentication/session không còn usable mới trigger local logout.

```text
invalid token
expired token
ACCOUNT_DISABLED
→ clear auth
```

Ngược lại:

```text
network unavailable
timeout
5xx
→ preserve token
→ AUTH_CHECK_ERROR
→ retry
```

---

# 33. XSS Considerations

Vì token JavaScript-accessible:

Không:

```text
dangerouslySetInnerHTML với untrusted data
JWT trong URL
JWT trong DOM
JWT trong error message
Bearer token trong logs
```

Ưu tiên React escaping mặc định.

Không đưa JWT secret, database secret hoặc AI secret xuống frontend.

Có thể thêm CSP khi deployment environment hỗ trợ mà không thay đổi business/API behavior.

---

# 34. Logout API

```http
POST /api/v1/auth/logout
```

Endpoint là convenience API và không đồng nghĩa token bị revoke ở server.

---

# 35. Logout Flow

```text
User chọn Logout
       ↓
attempt POST /auth/logout
       ↓
success OR failure
       ↓
ALWAYS:
remove JWT
clear User state
clear protected query cache
       ↓
/dang-nhap
```

Equivalent semantics:

```text
try:
    call logout API
finally:
    clear local auth
```

---

# 36. Logout Failure

Expired JWT, network failure, backend unavailable hoặc `500` không được ngăn frontend local logout.

MVP không có server-side session cần được revoke trước khi browser được phép clear state.

---

# 37. Protected API Authentication Failure

Khi protected API xác nhận token missing, invalid, malformed, invalid signature hoặc expired, frontend:

```text
clear token
clear User
clear protected cache
/dang-nhap
```

Không retry bằng cùng invalid token.

---

# 38. `ACCOUNT_DISABLED` Handling

Nếu backend trả lỗi phù hợp xác nhận User `DISABLED`:

```text
clear token
clear User
clear protected cache
/dang-nhap
```

kể cả JWT vẫn chưa hết `exp`.

---

# 39. Role-aware Navigation

Login hoặc `/me` trả User có role.

Frontend dùng role để điều hướng đến khu vực phù hợp.

Navigation chỉ là UX.

Backend vẫn bắt buộc ACTIVE check, role authorization và ownership/resource authorization.

---

# 40. NestJS Boundary

Cấu trúc dự kiến:

```text
AuthModule
├── AuthController
├── AuthService
├── JWT configuration
├── JWT verification strategy/layer
├── AuthGuard
└── DTO

UsersModule
└── current User lookup/status/role
```

Controller:

```text
receive DTO
→ call service
→ map response
```

Credential verification và authorization không đặt trực tiếp trong controller.

---

# 41. Configuration

Environment:

```env
JWT_ACCESS_SECRET=
```

Trong đó giá trị là Base64 của ít nhất 32 random bytes.

Pinned application configuration:

```text
JWT algorithm      = HS256
JWT lifetime       = 2h

Argon2id:
memoryCost         = 19456
timeCost           = 2
parallelism        = 1
```

Startup validation từ chối missing JWT secret, invalid Base64 hoặc decoded length nhỏ hơn 32 bytes.

---

# 42. Logging

Không log:

```text
password
passwordHash
Bearer token
JWT_ACCESS_SECRET
database password
AI secret
```

Auth error logs chỉ giữ safe context như error category, request path, safe User ID nếu đã authenticated và timestamp.

---

# 43. Authentication Tests

## AUTH-T01 — Successful Login

```text
ACTIVE User
+ correct credential
→ 200
→ accessToken
→ correct UserSummary
→ JWT valid
→ correct sub
→ exp ≈ iat + 2h
```

## AUTH-T02 — Email Normalization

```text
student@example.com
Student@Example.com
" student@example.com "
```

lookup cùng normalized User.

## AUTH-T03 — Wrong Password

```text
401 INVALID_CREDENTIALS
no JWT
```

## AUTH-T04 — Unknown Email

```text
401 INVALID_CREDENTIALS
```

External response không phân biệt với wrong password.

## AUTH-T05 — Disabled Login

```text
403 ACCOUNT_DISABLED
no JWT
```

## AUTH-T06 — Disabled After Login

```text
valid JWT
+
User ACTIVE → DISABLED
→ next protected request rejected
```

## AUTH-T07 — Expired JWT

```text
exp < now
→ authentication rejected
→ business logic not executed
```

## AUTH-T08 — Invalid Signature

Modified token hoặc token ký bằng secret khác bị reject.

## AUTH-T09 — Wrong Algorithm

Algorithm khác `HS256` bị reject.

## AUTH-T10 — Role Authorization

```text
Student
→ /admin/*
→ Forbidden
```

## AUTH-T11 — Ownership

```text
Teacher A
→ unauthorized Class
→ Forbidden
```

## AUTH-T12 — Logout Success

```text
204
→ local auth cleared
→ cache cleared
→ /dang-nhap
```

## AUTH-T13 — Logout With Expired JWT

```text
logout API fails
→ local auth still cleared
```

## AUTH-T14 — Logout Network Failure

```text
network failure
→ local auth still cleared
```

## AUTH-T15 — Reload With Valid JWT

```text
token exists
→ GET /me
→ 200
→ restore User
→ AUTHENTICATED
```

## AUTH-T16 — Reload With Expired JWT

```text
GET /me rejected
→ clear auth
→ UNAUTHENTICATED
```

## AUTH-T17 — Reload After Account Disabled

```text
JWT still valid
+
User DISABLED
→ /me rejected
→ clear auth
```

## AUTH-T18 — Argon2id Parameters

Encoded password hash sử dụng:

```text
Argon2id
m = 19456
t = 2
p = 1
```

và unique salt.

## AUTH-T19 — `/me` Network Failure

```text
GET /me → network failure / 5xx
→ token preserved
→ AUTH_CHECK_ERROR
→ no automatic logout
```

## AUTH-T20 — `/me` Retry

```text
AUTH_CHECK_ERROR
→ retry /me
→ 200
→ AUTHENTICATED
```

hoặc:

```text
retry confirms invalid/expired/disabled
→ clear auth
→ UNAUTHENTICATED
```

## AUTH-T21 — Secret Configuration

Application startup:

```text
valid Base64
+
decoded bytes >= 32
→ accepted
```

Ngược lại:

```text
missing / malformed / decoded < 32 bytes
→ startup configuration error
```

## AUTH-T22 — Argon2id Benchmark

Trên môi trường demo/deployment:

```text
hash + verify
→ benchmark thực tế
→ login vẫn usable
```

Không giảm cấu hình ADR chỉ để xử lý performance mà không review quyết định.

---

# 44. Security Acceptance Criteria

Implementation phải bảo đảm:

- password không lưu plain text;
- Argon2id được sử dụng;
- Argon2 parameters được pin;
- unique random salt cho từng password;
- Argon2 được benchmark trên môi trường mục tiêu;
- JWT dùng HS256;
- key material tối thiểu 256 bit;
- secret được tạo từ CSPRNG;
- secret được Base64 encode để truyền qua environment;
- runtime decode Base64 về raw bytes;
- JWT lifetime đúng 2 giờ;
- claims chỉ gồm dữ liệu tối thiểu cần thiết;
- signature và expiration được verify;
- wrong algorithm bị reject;
- protected request lookup current User;
- User `DISABLED` bị reject;
- role và ownership được kiểm tra backend;
- token nằm trong `sessionStorage`;
- `/me` được dùng để rehydrate User;
- network/5xx của `/me` không tự logout;
- logout luôn clear local state;
- invalid/expired token clear auth;
- `ACCOUNT_DISABLED` clear auth;
- Bearer token không xuất hiện trong logs;
- không refresh token;
- không blacklist;
- không server-side session management.

---

# 45. Trade-offs

## 45.1. Không revoke từng JWT

JWT bị copy có thể tồn tại đến `exp`, trừ khi User bị `DISABLED`.

MVP chấp nhận trade-off này.

## 45.2. User login lại sau 2 giờ

Không có refresh token.

Đổi lại implementation đơn giản hơn đáng kể.

## 45.3. JavaScript-accessible token

`sessionStorage` làm token chịu ảnh hưởng của XSS.

MVP chấp nhận cùng các mitigation đã nêu.

## 45.4. Không sync authentication đa tab

Không phải requirement MVP.

## 45.5. Backend unavailable không tự logout

Khi `/me` không thể xác minh User vì infrastructure/network failure, frontend giữ token và hiển thị trạng thái retry thay vì giả định User đã logout.

---

# 46. Alternatives Rejected

| Alternative | Lý do |
|---|---|
| RS256 | Chưa cần nhiều verifier |
| Refresh token | Ngoài MVP baseline |
| Token blacklist | Tạo server state không cần thiết |
| Redis/session DB | Thêm infrastructure |
| Server-side session | Không phù hợp Bearer-JWT architecture |
| OAuth | Ngoài scope |
| JWT chứa current authorization state đầy đủ | Có nguy cơ stale |
| Persist duplicate User profile làm auth authority | `/me` đã cung cấp current User |
| Environment-configurable expiry | Có nguy cơ config drift |
| Logout chỉ khi server trả 204 | Không phù hợp convenience logout semantics |
| Clear token khi `/me` 5xx/network error | Không có bằng chứng token invalid |

---

# 47. Traceability

| Quyết định | Nguồn |
|---|---|
| Bearer access token | API-DD-001 |
| Login | API-COM-AUTH-001 |
| Logout | API-COM-AUTH-002 |
| Current User `/me` | API-COM-PROFILE-001 |
| Email normalization | BR-039 / OD-38 |
| Invalid credential semantics | ERR-001 |
| DISABLED login | ERR-002 |
| DISABLED protected API | BR-032 / NFR-SEC-009 |
| Backend authorization | NFR-SEC-002 |
| Student ownership | BR-001 / NFR-SEC-003 |
| Teacher scope | BR-002 / NFR-SEC-004 |
| Password not plain text | NFR-SEC-001 |
| Không trả `passwordHash` | NFR-SEC-006 |
| JWT in NestJS | ARCH-DD-015 |
| `sessionStorage` | ARCH-DD-022 |
| No refresh/blacklist/multi-session | ARCH-DD-023 |
| Expiry/signing/claims | OPEN-ARCH-001 → ADR-AUTH-001 |
| HS256 | ADR-AUTH-001 |
| 2-hour expiry | ADR-AUTH-001 |
| `sub/iat/exp` | ADR-AUTH-001 |
| Argon2id | ADR-AUTH-001 |
| Argon2 parameters | ADR-AUTH-001 |
| `/me` rehydration | ADR-AUTH-001 |
| Network-safe rehydration | ADR-AUTH-001 |
| Logout always local-clear | ADR-AUTH-001 |
| Secret Base64 representation | ADR-AUTH-001 |

---

# 48. Baseline vs External Security Guidance

## Project-baseline-derived

Các quyết định sau đến từ project artifacts:

```text
Bearer token
JWT trong NestJS
sessionStorage
ACTIVE check
role/ownership authorization
login/logout
GET /me
không refresh token
không blacklist
```

## ADR technical decisions

Các quyết định sau do ADR chốt:

```text
HS256
2-hour expiry
sub + iat + exp
Argon2id
Argon2 parameters
32-byte random JWT secret
Base64 environment representation
rehydration failure semantics
```

## External security references

External guidance chỉ hỗ trợ lựa chọn implementation, không thay thế SRS/API/Architecture authority.

- OWASP Cheat Sheet Series, **Password Storage Cheat Sheet**, tham chiếu tại thời điểm phát hành 24/10/2026.
- RFC 7518 §3.2, **JSON Web Algorithms (JWA)**.

---

# 49. Change-Control Boundary

Cần review ADR/Architecture nếu thay đổi:

```text
JWT expiry
signing algorithm
key strategy
token storage strategy
minimal claims
password hashing strategy
refresh-token behavior
blacklist/session architecture
```

Có thể refactor nội bộ nếu behavior không đổi:

```text
AuthService structure
file layout
internal equivalent library
query implementation
guard composition
```

Nếu thay đổi observable API/business behavior thì phải tuân theo upstream change-control tương ứng.

---

# 50. Architecture Diagram

```text
                      LOGIN
                        │
                        ▼
               email + password
                        │
                normalize email
                        │
                        ▼
                 PostgreSQL User
                        │
                 Argon2id verify
               m=19456 / t=2 / p=1
                        │
                  check ACTIVE
                        │
                        ▼
                JWT — HS256 — 2h
                 sub / iat / exp
                        │
                        ▼
                  sessionStorage
                        │
                        ▼
          Authorization: Bearer JWT
                        │
                        ▼
                  NestJS Guard
                        │
                   verify JWT
                        │
                 lookup User DB
                        │
                  check ACTIVE
                        │
                   check role
                        │
          check ownership/resource
                        │
                        ▼
                 Business Logic
```

---

# 51. Rehydration Diagram

```text
                 APP START / RELOAD
                         │
                         ▼
                token in sessionStorage?
                    /           \
                  no             yes
                  │               │
                  ▼               ▼
          UNAUTHENTICATED      GET /me
                                  │
                 ┌────────────────┼──────────────────┐
                 │                │                  │
               200         invalid/disabled    network/5xx
                 │                │                  │
                 ▼                ▼                  ▼
         restore User       clear local auth   KEEP TOKEN
                 │                │                  │
                 ▼                ▼                  ▼
         AUTHENTICATED    UNAUTHENTICATED    AUTH_CHECK_ERROR
                                                    │
                                                    ▼
                                                   retry
```

---

# 52. Logout Diagram

```text
             USER CHỌN LOGOUT
                    │
                    ▼
          attempt POST /auth/logout
                    │
             success OR failure
                    │
                    ▼
               ALWAYS CLEAR
             ┌──────┼──────┐
             │      │      │
           token   User   cache
             └──────┼──────┘
                    │
                    ▼
               /dang-nhap
```

---

# 53. Nguyên tắc trung tâm

```text
JWT xác định danh tính.

Database xác định quyền hiện tại.

GET /me khôi phục current User sau reload.

Network failure không đồng nghĩa authentication failure.

Logout local không phụ thuộc server-side revocation.
```

---

# 54. Release Record

| Version | Date | Status | Nội dung |
|---|---|---|---|
| Draft | 24/10/2026 | Proposed | Khởi tạo Auth ADR; lựa chọn JWT + HS256 + Argon2id |
| Draft Rev.1 | 24/10/2026 | Proposed | Bổ sung login flow, JWT verification, secret policy, test và traceability |
| Draft Rev.2 | 24/10/2026 | Proposed — Final Review | Bổ sung `/me` rehydration, local logout guarantee, Argon2id parameters và disabled-state handling |
| Release Candidate | 24/10/2026 | Final Review | Bổ sung network-safe rehydration, Base64 secret representation và release metadata |
| **1.0** | **24/10/2026** | **Accepted — Official Release** | Final review đạt **9.8/10**; `Critical=0`, `Important=0`, không còn finding chặn phát hành; đóng `OPEN-ARCH-001` |

---

# 55. Acceptance Record

ADR v1.0 phát hành với các quyết định:

```text
JWT
HS256
2-hour expiry
sub / iat / exp
32-byte-or-stronger random secret
Base64 environment transport
Argon2id
m=19456 KiB
t=2
p=1
sessionStorage
GET /me rehydration
network-safe auth bootstrap
database-backed authorization
no refresh token
no blacklist
no server session
```

`OPEN-ARCH-001` được coi là **resolved by ADR-AUTH-001 v1.0**.

ADR không thay đổi endpoint hoặc observable business behavior của API/SRS baseline.

---

# 56. Release Governance

Bản `v1.0` là artifact downstream chính thức cho authentication implementation.

Nếu repository đã được bootstrap và sử dụng `BASELINE_MANIFEST.sha256`, hash của file ADR này phải được thêm vào manifest theo governance của System Architecture.

Sau khi phát hành:

- không sửa trực tiếp nội dung `v1.0` đã phát hành;
- thay đổi technical decision phải tạo revision/version mới;
- thay đổi observable API/business behavior phải đi qua upstream review/change control tương ứng.

---

# 57. Kết luận

Authentication MVP được khóa theo hướng:

```text
đúng baseline
+
đủ an toàn cho MVP
+
ít infrastructure
+
dễ triển khai
+
dễ kiểm thử
+
dễ debug
+
dễ giải thích
```

Quyết định cốt lõi:

```text
JWT xác định User.

Backend/database xác định quyền hiện tại.

Token chỉ là authentication credential,
không phải nguồn authorization authority.
```

**Trạng thái phát hành:** `ADR-AUTH-001 v1.0 — Accepted — Official Release`.
