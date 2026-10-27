# ADR-CONTRACT-001 — OPENAPI-GENERATED SHARED API CONTRACTS
## Hệ thống hỗ trợ tự học ứng dụng AI

| Thuộc tính | Giá trị |
|---|---|
| **ADR ID** | `ADR-CONTRACT-001` |
| **Phiên bản** | `1.0` |
| **Ngày** | `27/10/2026` |
| **Trạng thái** | **Accepted — Official Release** |
| **Phạm vi** | Shared API contracts giữa Next.js Frontend và NestJS Backend |
| **Phase liên quan** | `Phase 1C — Shared API/Contracts` |
| **Kiến trúc** | Next.js → NestJS REST API |
| **Đóng Open Item** | `OPEN-ARCH-007` |
| **Supersedes** | Không |
| **Nguồn kiến trúc** | `System_Architecture_and_Technology_Stack_v1.0_baseline.md` |
| **Nguồn API** | `API_Specification_v1.4_baseline_final.md` |
| **Nguồn authentication** | `ADR_AUTH_001_Authentication_Architecture_Decision_v1.0_accepted.md` |
| **Final review score** | **9.9/10** |
| **Release gate** | **Critical: 0 · Important: 0 · Minor blocking: 0** |

---

# 1. Mục đích

ADR này chốt chiến lược quản lý **shared API contracts** giữa Next.js Frontend và NestJS Backend trước khi triển khai các vertical slice nghiệp vụ.

Quyết định chính:

```text
NestJS DTO / Swagger metadata
            ↓
       OpenAPI document
            ↓
      TypeScript codegen
            ↓
    packages/contracts
            ↓
       Next.js frontend
```

Hệ thống sử dụng **OpenAPI-generated TypeScript transport types** thay vì để Frontend và Backend tự duy trì hai bộ TypeScript interface độc lập.

ADR này chính thức đóng:

```text
OPEN-ARCH-007
OpenAPI codegen vs manually maintained shared transport types
```

được để mở trong `System_Architecture_and_Technology_Stack_v1.0_baseline.md` cho giai đoạn bootstrap API client workflow.

ADR chỉ cụ thể hóa **technical implementation workflow**.

ADR không được thay đổi:

- endpoint;
- HTTP method;
- request/response semantics;
- business rule;
- authorization;
- error semantics;
- pagination semantics;
- temporary-context semantics;
- observable business behavior.

---

# 2. Authority và quan hệ với baseline

`API_Specification_v1.4_baseline_final.md` vẫn là nguồn chuẩn về contract giữa Frontend và Backend.

Theo Architecture §13.1–13.3, implementation không được tự thay đổi:

- route;
- HTTP method;
- required DTO field;
- response semantics;
- error code;
- pagination behavior;
- context/reference semantics.

Quan hệ authority:

```text
API Specification v1.4
        │
        │ Design authority
        ▼
NestJS DTO / Controller / Swagger metadata
        │
        │ Executable API representation
        ▼
OpenAPI document
        │
        │ Code generation
        ▼
Generated TypeScript transport types
        │
        ▼
Frontend
```

Nếu OpenAPI hoặc generated TypeScript khác API Specification thì đó là **implementation defect**.

Không được sửa API baseline chỉ để phù hợp codegen.

---

# 3. Bối cảnh

API Specification v1.4 đã cung cấp contract đủ để tiếp tục:

- OpenAPI/Swagger;
- NestJS DTO/Controller/Service design;
- frontend data-access layer;
- API Test Case / Integration Test.

Do đó Phase 1C không thiết kế lại API.

Mục tiêu của Phase là biến contract đã được baseline hóa thành một representation máy đọc được để Frontend có thể sử dụng an toàn trong TypeScript.

---

# 4. Vấn đề cần giải quyết

Nếu Frontend và Backend tự duy trì type riêng:

```text
apps/api
└── LoginResponseDto

apps/web
└── LoginResponse
```

thì một API có hai nơi phải cập nhật thủ công.

Ví dụ Backend thay:

```text
name → fullName
```

nhưng Frontend vẫn giữ:

```text
name
```

TypeScript của từng application vẫn có thể compile riêng, trong khi lỗi chỉ xuất hiện khi tích hợp runtime.

Đây là:

```text
contract drift
```

Phase 1C giảm nguy cơ này bằng cách để TypeScript transport types mà Frontend sử dụng được sinh từ OpenAPI do NestJS expose.

---

# 5. Mục tiêu thiết kế

Thiết kế phải đạt:

```text
Một API implementation contract
          ↓
Một OpenAPI representation
          ↓
Một code generation workflow
          ↓
Frontend dùng generated transport types
```

Mục tiêu:

1. giảm duplicate request/response interfaces;
2. giảm duplicate transport enums;
3. phát hiện contract change sớm bằng typecheck;
4. hỗ trợ Frontend phát triển dựa trên API contract rõ ràng;
5. giữ `packages/contracts` độc lập với database và business logic;
6. hỗ trợ kiểm tra contract drift;
7. giữ workflow đơn giản cho MVP;
8. không biến Phase 1C thành frontend SDK platform.

---

# 6. Ngoài phạm vi

ADR này không chốt:

- AI Runtime input/output contract;
- AI prompt;
- AI structured-output validator;
- database model;
- Prisma model;
- domain entity;
- authorization implementation;
- HTTP client generator;
- TanStack Query generator;
- React hooks generator;
- UI form schema;
- frontend runtime-validation framework.

AI Contract vẫn là boundary riêng:

```text
NestJS
  ↓
AI Runtime
```

không thuộc shared API contract Next.js ↔ NestJS.

---

# 7. Các phương án đã xem xét

## 7.1. Phương án A — OpenAPI generate TypeScript transport types

```text
NestJS
  ↓
OpenAPI
  ↓
TypeScript transport types
  ↓
packages/contracts
  ↓
Frontend
```

Generated output chỉ mô tả shape và type của dữ liệu transport.

HTTP client và TanStack Query logic tiếp tục nằm trong `apps/web`.

### Ưu điểm

- trách nhiệm contract package nhỏ và rõ;
- ít coupling với frontend framework;
- dễ debug;
- Frontend vẫn chủ động fetch/cache/error handling;
- thay TanStack Query không ảnh hưởng contract package;
- phù hợp Architecture hiện tại.

### Hạn chế

Frontend vẫn cần tự viết API client functions.

### Quyết định

**Chọn.**

---

## 7.2. Phương án B — Generate types + HTTP client

Codegen sinh cả:

```text
LoginRequest
LoginResponse
login()
getProfile()
...
```

### Ưu điểm

Giảm code HTTP thủ công.

### Hạn chế

- contract package bắt đầu chịu trách nhiệm transport execution;
- auth/error/base URL dễ phụ thuộc generator;
- generated SDK lớn hơn;
- boundary kém rõ.

### Quyết định

**Không chọn cho MVP.**

---

## 7.3. Phương án C — Generate types + client + TanStack Query hooks

Ví dụ:

```text
useLoginMutation()
useProfileQuery()
```

### Ưu điểm

Có thể tăng tốc phát triển UI.

### Hạn chế

- contract package phụ thuộc frontend library;
- coupling trực tiếp TanStack Query;
- khó phân biệt contract layer và frontend data layer;
- quá mức cần thiết cho MVP.

### Quyết định

**Không chọn.**

---

# 8. Decision Summary

| Nội dung | Quyết định |
|---|---|
| Shared contract strategy | OpenAPI-generated |
| Design authority | API Specification v1.4 |
| Executable API representation | NestJS DTO + Swagger/OpenAPI |
| Generated language | TypeScript |
| Generated phạm vi | **Transport types only** |
| Generated runtime schema | Không bắt buộc bởi ADR này |
| Generated HTTP client | Không |
| Generated TanStack Query hooks | Không |
| Frontend HTTP client | `apps/web` |
| Frontend query/mutation layer | `apps/web` |
| Shared package | `packages/contracts` |
| Backend runtime validation | NestJS DTO + `class-validator` / `class-transformer` |
| Database model trong contracts | Không |
| Prisma Client trong contracts | Không |
| Business logic trong contracts | Không |
| Generated files chỉnh tay | Không |
| Duplicate handwritten API type | Không |
| Generation drift check | Bắt buộc |
| Baseline conformance check | Bắt buộc ở API review/test level |
| `OPEN-ARCH-007` | **CLOSED** |

---

# 9. Ba tầng contract

ADR phân biệt ba tầng rõ ràng.

## 9.1. Design Authority

```text
API_Specification_v1.4_baseline_final.md
```

Trả lời:

> API phải hoạt động như thế nào?

## 9.2. Executable API Representation

```text
NestJS DTO
Controller metadata
Swagger metadata
OpenAPI
```

Trả lời:

> Implementation hiện đang expose contract nào?

## 9.3. Consumer Compile-Time Representation

```text
Generated TypeScript transport types
```

Trả lời:

> Frontend compile-time hiểu contract này như thế nào?

---

# 10. Hai loại contract drift

## 10.1. Baseline Drift

```text
API Specification
       X
NestJS / OpenAPI
```

Ví dụ API Specification yêu cầu:

```text
fullName: required
```

nhưng Swagger/OpenAPI khai báo:

```text
fullName: optional
```

Đây là **baseline drift**.

Generated TypeScript có thể hoàn toàn đúng với OpenAPI nhưng toàn bộ implementation vẫn sai baseline.

Baseline drift phải được phát hiện bằng:

- contract review;
- API tests;
- integration tests;
- đối chiếu implementation với API Specification.

## 10.2. Generation Drift

```text
OpenAPI
    X
Generated TypeScript
```

Ví dụ DTO/OpenAPI đã thay đổi nhưng developer chưa regenerate `packages/contracts`.

Đây là **generation drift**.

`contracts:check` có trách nhiệm phát hiện loại drift này.

## 10.3. Không đánh đồng hai quality gate

```text
contracts:check
```

không chứng minh:

```text
OpenAPI == API Specification
```

Nó chỉ chứng minh generated artifacts đang đồng bộ với executable OpenAPI source.

---

# 11. OpenAPI Generation Boundary

Theo Architecture §13.3 và `ARCH-DD-020`, NestJS phải expose Swagger/OpenAPI trong development để:

- kiểm tra API contract;
- hỗ trợ frontend integration;
- hỗ trợ test/debug;
- hỗ trợ code generation.

OpenAPI phải mô tả đủ thông tin cần cho contract tooling.

Tối thiểu:

```text
paths
HTTP methods
path parameters
query parameters
request bodies
response status
response bodies
required fields
optional fields
nullable semantics
enum
securitySchemes
operation-level security
```

---

# 12. Bearer Authentication Metadata

API Specification §3.2 đã chốt:

```http
Authorization: Bearer <accessToken>
```

cho protected API.

Do đó OpenAPI phải khai báo Bearer authentication scheme tương ứng.

Conceptual:

```text
securitySchemes
└── bearerAuth
    └── HTTP Bearer
```

Protected operation phải có security metadata phù hợp.

Public operation như login không được vô tình mô tả là protected nếu API baseline không yêu cầu.

Swagger security metadata phục vụ:

- API documentation;
- contract review;
- development testing;
- consistency checking.

Nó không thay thế backend authentication Guard hoặc authorization.

---

# 13. `packages/contracts` Boundary

Theo Architecture §13.2, `packages/contracts` chỉ chứa transport-level artifacts an toàn để share.

Cấu trúc mục tiêu:

```text
packages/contracts/
├── package.json
├── tsconfig.json
└── src/
    ├── generated/
    │   └── openapi.ts
    └── index.ts
```

`generated/openapi.ts`:

```text
GENERATED FILE
DO NOT EDIT MANUALLY
```

Không đặt trong package:

```text
PrismaClient
database model implementation
Repository
Service
Guard
authorization rule
password/JWT implementation
server secret
AI prompt
React hook
TanStack Query hook
HTTP execution logic
backend business logic
```

---

# 14. Quy tắc handwritten code trong contracts

Không viết thủ công một bản duplicate của contract đã tồn tại trong OpenAPI.

Không tạo:

```text
generated Role
+
handwritten Role
```

Không tạo:

```text
generated LoginResponse
+
handwritten LoginResponse
```

Không tạo:

```text
generated ApiError
+
handwritten ApiError
```

Nếu transport type đã được OpenAPI sinh ra thì generated type là representation Frontend sử dụng.

Handwritten code chỉ được dùng cho artifact thực sự không duplicate OpenAPI và vẫn nằm đúng transport-level boundary.

---

# 15. `index.ts` Public Surface

`src/index.ts` là **thin public export layer**.

Vai trò:

```text
re-export generated types
+
optional aliases khi thật sự cần cho consumption ergonomics
```

Không được:

- định nghĩa lại request type;
- định nghĩa lại response type;
- định nghĩa lại enum;
- thêm business logic;
- thêm HTTP execution logic.

---

# 16. Dependency Direction

Dependency mong muốn:

```text
apps/api
   │
   │ expose
   ▼
OpenAPI
   │
   │ codegen
   ▼
packages/contracts
   │
   ├──────────────► apps/web
   │
   └──────────────► tests/tooling nếu cần
```

NestJS DTO **không được import ngược generated output** mà chính NestJS tạo ra.

Không tạo vòng:

```text
apps/api DTO
   ↓
OpenAPI
   ↓
packages/contracts
   ↓
apps/api DTO
```

Backend là producer của executable API representation.

Frontend là consumer của generated transport types.

---

# 17. Frontend Responsibility

`apps/web` chịu trách nhiệm:

```text
API base URL
Bearer token attachment
fetch / HTTP wrapper
API client functions
error handling
TanStack Query
query keys
cache
retry behavior
UI state
```

Generated contract chỉ cung cấp compile-time information:

```text
request shape
response shape
enum
required/optional
nullable
transport value types
```

Generated type không tự gửi HTTP request.

---

# 18. Backend Responsibility

NestJS tiếp tục chịu trách nhiệm:

```text
DTO validation
authentication
authorization
business validation
business calculation
transaction
AI orchestration
response mapping
HTTP status
```

Theo Architecture Technology Stack, HTTP boundary validation sử dụng:

```text
class-validator
+
class-transformer
```

Generated TypeScript transport types không thay thế runtime validation.

---

# 19. TypeScript Không Phải Runtime Validation

TypeScript types biến mất tại runtime.

Do đó:

```text
Generated TypeScript transport type
!=
Runtime validator
```

Ví dụ:

```ts
type Rating = number;
```

không ngăn client gửi:

```text
rating = 999
```

Backend vẫn phải validate request.

ADR không cho phép bỏ DTO validation chỉ vì Frontend đã sử dụng generated types.

---

# 20. Common API Semantics

## 20.1. ID

Theo API Specification §3.4, mọi API ID là:

```text
opaque string
```

Frontend không được phụ thuộc việc ID vật lý là UUID, sequence hoặc định dạng database khác.

## 20.2. Timestamp

Timestamp API sử dụng ISO 8601 UTC.

Transport type có thể là:

```ts
string
```

Frontend parse/format sang local time khi hiển thị.

## 20.3. Pagination

Theo API Specification §3.5:

```json
{
  "items": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Không tự tạo global response envelope nếu baseline không quy định.

## 20.4. Error response

Theo API Specification §3.6:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu đầu vào không hợp lệ.",
  "details": []
}
```

`details` có thể là `null`, object hoặc array phù hợp với contract.

Frontend không được bỏ qua API error code và chỉ xử lý generic JavaScript `Error`.

---

# 21. Enum Strategy

Các enum transport được API expose phải xuất hiện trong OpenAPI và generated TypeScript.

Ví dụ:

```text
Role
UserStatus
StudyPlanStatus
StudyTaskStatus
Priority
FeedbackTag
ScoreClassification
```

Không duy trì mirror enum riêng trong `apps/web`.

UI label vẫn thuộc presentation layer.

Ví dụ:

```text
STUDENT
```

có thể hiển thị:

```text
Sinh viên
```

nhưng API transport value không thay đổi.

---

# 22. Optional và Nullable

Codegen phải bảo toàn khác biệt giữa:

```text
field absent
```

và:

```text
field = null
```

khi API contract phân biệt hai trường hợp.

Không được tùy tiện đổi:

```ts
field?: string | null
```

thành:

```ts
field: string
```

chỉ để frontend đơn giản hơn.

Swagger metadata phải phản ánh chính xác semantics của API Specification.

---

# 23. Temporary Context References

Theo API Specification §3.7, các field:

```text
planPreviewRef
adjustmentRef
analysisRef
```

là opaque transport values.

Frontend không suy luận cấu trúc bên trong reference.

Các semantics về:

- TTL;
- ownership;
- consume;
- replay;
- idempotency;
- request fingerprint;
- concurrent access

vẫn thuộc Backend/API behavior.

Generated TypeScript chỉ mô tả transport representation.

---

# 24. Generation Workflow

Workflow chuẩn:

```text
1. Implement / update NestJS DTO + Swagger metadata
                    ↓
2. Generate OpenAPI document
                    ↓
3. Generate TypeScript transport types
                    ↓
4. Write generated output to packages/contracts
                    ↓
5. Typecheck packages/contracts
                    ↓
6. Typecheck apps/web
                    ↓
7. Run relevant API / integration tests
```

Thay đổi executable API contract không được kết thúc ở bước chỉnh DTO.

Generated output phải được regenerate.

---

# 25. Deterministic Generation Requirement

Contract generation phải **deterministic**.

Cùng:

```text
source code
+
dependency lockfile
+
generator configuration
```

phải tạo cùng logical contract output.

Generation không được yêu cầu:

```text
Google Colab đang chạy
AI Runtime đang online
live database connection
production database
external business service đang sẵn sàng
```

Codegen workflow phải chạy được trong local development và CI mà không phụ thuộc runtime nghiệp vụ bên ngoài.

Nếu NestJS bootstrap thông thường phụ thuộc database, AI hoặc external service, Phase 1C phải cung cấp một contract-generation bootstrap/path riêng phù hợp để tạo OpenAPI mà không thực hiện live connection hoặc external business call.

---

# 26. Script Contract

Repository phải có workflow tương đương:

```text
pnpm contracts:generate
pnpm contracts:check
```

Exact script name có thể được chốt trong implementation plan nhưng semantics phải giữ.

## 26.1. `contracts:generate`

Logical flow:

```text
generate OpenAPI
        ↓
generate TypeScript transport types
        ↓
format deterministic output nếu cần
```

## 26.2. `contracts:check`

Phải phát hiện:

```text
OpenAPI/source contract đã thay đổi
+
generated transport types chưa cập nhật
```

Command phải fail khi generated artifacts stale.

`contracts:check` chỉ kiểm tra **generation drift**.

Nó không chứng minh API implementation đúng API Specification.

---

# 27. Generated File Policy

Generated file:

```text
DO NOT EDIT MANUALLY
```

Mọi thay đổi phải đi theo:

```text
DTO / Swagger metadata
        ↓
OpenAPI
        ↓
regenerate
```

Nếu generated output sai:

- sửa DTO;
- sửa Swagger metadata;
- sửa generator configuration;
- hoặc sửa codegen toolchain.

Không patch generated file thủ công.

---

# 28. Generated Artifact Version-Control Policy

TypeScript transport types trong `packages/contracts` được **commit vào repository**.

Lý do:

- Frontend có thể typecheck mà không cần chạy API;
- reviewer nhìn thấy generated contract diff;
- branch/agent workflow đơn giản;
- demo/build ít phụ thuộc generation ngầm;
- phù hợp monorepo MVP.

OpenAPI artifact phải được tạo deterministically.

Việc commit riêng OpenAPI snapshot hay chỉ sử dụng nó như intermediate build artifact được để implementation plan quyết định, miễn:

```text
OpenAPI generation deterministic
+
generated TypeScript reproducible
+
contracts:check phát hiện stale output
```

---

# 29. Contract Drift Protection

Một API change chưa hoàn chỉnh nếu:

```text
NestJS/OpenAPI thay đổi
+
generated TypeScript chưa regenerate
```

Quality gate phải phát hiện tối thiểu:

1. generated output stale;
2. OpenAPI generation fail;
3. contracts package không typecheck;
4. Frontend không typecheck với contract mới;
5. required Swagger/OpenAPI representation không được tạo.

---

# 30. Baseline Conformance Protection

Generation pipeline không thể tự chứng minh implementation đúng baseline.

Khi triển khai endpoint phải đối chiếu:

```text
API Specification
vs
Controller
vs
DTO
vs
Swagger/OpenAPI
```

Đặc biệt:

```text
HTTP method
path
required field
nullable
enum
status code
error code
pagination
security
temporary-context reference
```

Baseline conformance được bảo vệ bằng:

- implementation review;
- API test;
- integration test;
- traceability khi cần.

---

# 31. Code Generator Selection

ADR chốt **codegen strategy**, không khóa package cụ thể.

Tool được chọn trong Phase 1C phải hỗ trợ:

```text
OpenAPI
   ↓
TypeScript transport types
```

Không bắt buộc sinh:

```text
HTTP client
React hooks
TanStack Query hooks
runtime business validator
```

Exact package/version:

- được chọn tại Phase 1C;
- dùng stable release phù hợp;
- pin thông qua `pnpm-lock.yaml`;
- không được thay đổi boundary của ADR.

Đổi generator sau này không cần ADR mới nếu architecture decision và contract semantics vẫn giữ nguyên.

---

# 32. Security Boundary

`packages/contracts` không được chứa:

```text
JWT secret
database credentials
password hash
AI token
private server configuration
```

OpenAPI cũng không được chứa secret value.

OpenAPI có thể mô tả:

```text
Authorization: Bearer token
```

nhưng không chứa token thực tế.

---

# 33. Authentication Compatibility

`ADR-AUTH-001` tiếp tục là authority về authentication implementation.

Generated transport types có thể mô tả:

```text
LoginRequest
LoginResponse
UserSummary
```

nhưng các nội dung sau không chuyển vào shared contract package:

```text
JWT signing implementation
Argon2
sessionStorage lifecycle
ACTIVE account check
role authorization
ownership authorization
```

---

# 34. AI Boundary

OpenAPI-generated shared contracts áp dụng cho:

```text
Next.js
   ↕
NestJS
```

Không mặc định áp dụng cho:

```text
NestJS
   ↕
AI Runtime
```

AI Runtime cần AI Contract riêng.

ADR này không đóng:

```text
OPEN-ARCH-004
OPEN-ARCH-008
```

---

# 35. Phase 1C Scope

API contract về mặt thiết kế **đã được xác định bởi API Specification v1.4**.

Phase 1C không thiết kế lại toàn bộ contract.

Phase 1C xây infrastructure để hiện thực và consume contract:

```text
Swagger/OpenAPI setup
+
OpenAPI generation
+
packages/contracts
+
TypeScript codegen
+
generation/check scripts
+
frontend consumption pattern
```

NestJS DTO/OpenAPI implementation cho từng endpoint có thể được hiện thực dần theo các vertical slice sau, nhưng phải tuân theo API Specification và sử dụng cùng contract workflow.

---

# 36. Phase 1C Acceptance Criteria

Phase 1C được xem là đạt phần Shared API/Contracts khi:

- [ ] `packages/contracts` tồn tại trong pnpm workspace;
- [ ] NestJS Swagger/OpenAPI generation hoạt động;
- [ ] Bearer security scheme được mô tả trong OpenAPI;
- [ ] protected/public operations có security metadata phù hợp;
- [ ] OpenAPI có thể được generate bằng command xác định;
- [ ] OpenAPI generation deterministic;
- [ ] OpenAPI generation không yêu cầu AI Runtime live;
- [ ] OpenAPI generation không yêu cầu live database connection;
- [ ] OpenAPI generation không yêu cầu external business service live;
- [ ] TypeScript transport types được generate từ OpenAPI;
- [ ] generated output không chỉnh tay;
- [ ] generated TypeScript transport types được commit;
- [ ] package contracts typecheck độc lập;
- [ ] `apps/web` import được generated transport types;
- [ ] Frontend không duplicate API request/response type tương ứng;
- [ ] Frontend không duplicate API enum tương ứng;
- [ ] `index.ts` chỉ đóng vai trò thin export layer;
- [ ] HTTP client vẫn nằm trong `apps/web`;
- [ ] không generate TanStack Query hooks;
- [ ] Backend DTO runtime validation vẫn độc lập;
- [ ] generation script tồn tại;
- [ ] stale-check script tồn tại;
- [ ] stale-check phát hiện generation drift;
- [ ] root typecheck bao gồm `packages/contracts`;
- [ ] generated artifacts không chứa Prisma/database/business logic;
- [ ] generated artifacts không chứa secret;
- [ ] API baseline không bị sửa để phù hợp codegen;
- [ ] workflow được mô tả trong repository documentation phù hợp.

---

# 37. Consequences

## 37.1. Positive

### Giảm duplicate contract code

Frontend không cần tự viết lại request/response types.

### Compile-time feedback

Contract change có thể làm Frontend typecheck fail sớm.

### Boundary rõ

Contract package chỉ làm transport representation.

### Dễ review

Generated diff giúp reviewer nhìn thấy thay đổi contract.

### Không khóa frontend implementation

HTTP client và TanStack Query vẫn được quản lý trong `apps/web`.

### Dễ mở rộng

Student, Teacher và Administrator sử dụng cùng workflow.

## 37.2. Negative

### Có thêm bước generation

Developer phải regenerate khi executable API representation thay đổi.

### Swagger metadata phải chính xác

DTO đúng nhưng Swagger metadata sai vẫn có thể tạo OpenAPI sai.

### Generated code không thân thiện bằng handwritten types

Generated file không phải nơi viết business code.

### Codegen không chứng minh baseline conformance

API/integration tests vẫn cần thiết.

### CI có thêm contract quality gate

Repository cần duy trì generation và stale-check scripts.

---

# 38. Những điều ADR này cố ý không làm

ADR không:

- biến OpenAPI thành requirement authority;
- thay thế API Specification;
- tạo endpoint mới;
- tạo frontend SDK;
- generate HTTP client;
- generate TanStack Query hooks;
- share Prisma model;
- share backend business logic;
- dùng TypeScript thay runtime validation;
- giải quyết AI Contract;
- tự chứng minh API implementation đúng business behavior.

---

# 39. Open Implementation Details Sau ADR

Sau khi ADR được Accepted, Phase 1C implementation plan được phép chốt:

```text
exact OpenAPI TypeScript generator
exact package version
exact generated filename
exact script names
OpenAPI snapshot commit strategy
exact CI command composition
exact OpenAPI generation bootstrap mechanism
```

Các quyết định này không được thay đổi architecture đã được ADR chốt.

---

# 40. Traceability

| Decision | Nguồn |
|---|---|
| API Specification là contract authority | API Specification v1.4 + Architecture §13.1 |
| `/api/v1` là base path | API Specification §3.1 |
| `packages/contracts` là shared contract package | Architecture §13.2 |
| Swagger/OpenAPI development setup bắt buộc | Architecture §13.3 / ARCH-DD-020 |
| Generated OpenAPI types được phép share | Architecture §13.2 |
| Prisma/business logic không được share | Architecture §13.2 |
| HTTP validation dùng `class-validator` / `class-transformer` | Architecture Technology Stack |
| Bearer authentication | API Specification §3.2 |
| OpenAPI codegen vs manual types | `OPEN-ARCH-007` |
| Pagination/error/context semantics | API Specification §3 |
| AI Contract là boundary riêng | Architecture §14 + Open Technical Items |

---

# 41. Quyết định cuối cùng

Dự án chính thức chọn:

```text
OPENAPI-GENERATED SHARED TYPES
```

với architecture flow:

```text
API Specification
      ↓
NestJS DTO / Swagger
      ↓
OpenAPI
      ↓
TypeScript codegen
      ↓
packages/contracts
      ↓
Next.js API/data-access layer
```

Codegen chỉ bắt buộc tạo:

```text
TypeScript transport types
```

không tạo:

```text
HTTP client
TanStack Query hooks
React hooks
business logic
database model
authorization logic
```

Generated TypeScript là compile-time consumer representation.

Nó không thay thế:

```text
API Specification
runtime validation
authentication/authorization
business validation
API/integration tests
```

Với việc ADR này được phát hành ở trạng thái:

```text
Accepted — Official Release
```

Open Technical Item:

```text
OPEN-ARCH-007
```

được chính thức chuyển thành:

```text
CLOSED
```

---

# 42. Final Review & Release Gate

Final review ngày `27/10/2026` xác nhận:

- [x] Không thay đổi API Specification v1.4.
- [x] Không thêm endpoint.
- [x] Không thay đổi observable business behavior.
- [x] Giữ API Specification là design authority.
- [x] Phân biệt baseline drift và generation drift.
- [x] Giữ NestJS/OpenAPI là executable API representation.
- [x] Giữ generated TypeScript là consumer compile-time representation.
- [x] Không share Prisma Client.
- [x] Không share backend business logic.
- [x] Không handwritten duplicate API contracts.
- [x] Không generate HTTP client.
- [x] Không generate frontend hooks.
- [x] Không bỏ runtime validation.
- [x] Có Bearer OpenAPI security metadata.
- [x] Generation phải deterministic.
- [x] Generation không phụ thuộc live AI Runtime.
- [x] Generation không phụ thuộc live database connection.
- [x] Generation không phụ thuộc external business service.
- [x] Giữ AI Contract boundary riêng.
- [x] Đóng đúng phạm vi `OPEN-ARCH-007`.

**Final review score:** `9.9/10`

**Release gate:**

```text
Critical issues      : 0
Important issues     : 0
Minor blocking issues: 0
```

**Release decision:**

```text
APPROVED
Accepted — Official Release
```