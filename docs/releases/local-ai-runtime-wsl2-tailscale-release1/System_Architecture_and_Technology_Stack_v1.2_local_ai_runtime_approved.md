# SYSTEM ARCHITECTURE & TECHNOLOGY STACK
## Hệ thống hỗ trợ tự học ứng dụng AI

**Phiên bản:** 1.2 Downstream Approved  
**Ngày:** 30/10/2026  
**Trạng thái:** Approved downstream architecture update under CP-005  
**Phạm vi:** Web Application MVP — Student, Teacher, Administrator  
**Baseline nguồn:** `DACN-REQ-UC-BL-2026-10-26-R3`  
**API Baseline:** `API_Specification_v1.5_baseline_final.md`  

> **Governance:** Bản 1.2 là downstream successor được phê duyệt cho runtime-host development/demo theo CP-005. Nó không sửa hoặc thay thế Architecture v1.1 frozen baseline, R3, AI Contract, API, business rules, sáu AI task, authorization hay capacity preflight. Colab Lite PASS vẫn là bằng chứng lịch sử T4 FP16; Local GPU PASS chưa được xác nhận cho đến khi kiểm thử trên máy thật.

---

# 1. Mục đích tài liệu

Tài liệu này cụ thể hóa kiến trúc hệ thống và lựa chọn công nghệ triển khai cho MVP **Hệ thống hỗ trợ tự học ứng dụng AI** từ bộ Requirements / Use Case / API / UI baseline hiện hành.

Mục tiêu chính:

- chốt cấu trúc kỹ thuật đủ rõ để bootstrap repository và bắt đầu implementation;
- phân biệt rõ công nghệ **bắt buộc từ baseline** với công nghệ **được chọn ở mức triển khai**;
- xác định ranh giới trách nhiệm giữa Next.js, NestJS, PostgreSQL, Prisma ORM và AI Runtime;
- chốt nguyên tắc tổ chức monorepo, module, data access, validation, testing và configuration;
- cụ thể hóa một số điểm mà API Specification giao cho System Design, đặc biệt temporary context, idempotency và AI gateway;
- tạo nguồn kiến trúc trực tiếp cho `AGENTS.md`, ADR, Database Design, AI Contract, Test Strategy và implementation plan;
- bảo đảm các quyết định kỹ thuật không tự tạo thêm observable business behavior ngoài baseline đã freeze.

Tài liệu này **không thay thế SRS, Business Rules, Use Case Specification, API Specification hoặc UI Specification**.

---

# 2. Phạm vi

## 2.1. Trong phạm vi tài liệu

Tài liệu chốt ở mức kiến trúc:

- runtime components;
- technology stack;
- monorepo structure;
- frontend architecture;
- backend architecture;
- ORM và database access;
- authentication/authorization integration boundary;
- AI integration boundary;
- temporary technical context;
- transaction/idempotency/concurrency principles;
- configuration và secret management;
- testing layers;
- local development model;
- quality gates;
- nguyên tắc dành cho Codex/multi-agent implementation.

## 2.2. Ngoài phạm vi tài liệu

Tài liệu này không chốt:

- model AI cụ thể trước khi benchmark;
- prompt chi tiết và AI input/output schema đầy đủ — thuộc AI Contract;
- schema database vật lý cuối cùng — thuộc Database Design/Prisma Schema;
- toàn bộ sequence diagram;
- deployment production-grade;
- Kubernetes;
- Redis;
- message queue;
- microservice decomposition;
- observability/monitoring production đầy đủ;
- CI provider bắt buộc;
- chức năng ngoài MVP đã bị SRS loại khỏi phạm vi.

Nếu một quyết định kỹ thuật trong tương lai làm thay đổi observable business behavior hoặc API contract đã freeze, thay đổi đó không được xử lý chỉ bằng tài liệu kiến trúc này.

---

# 3. Nguồn authority

## 3.1. Tài liệu nguồn

| Mức | Tài liệu | Vai trò |
|---|---|---|
| 1 | `SRS_v1.6_baseline_final.md` | Requirement, data, AI behavior, NFR, implementation constraints |
| 2A | `Business_Rules_v1.4_baseline_rev1.md` | Authorization, validation, calculation, state, AI governance, data integrity |
| 2B | `Use_Case_Diagram_he_thong_ho_tro_tu_hoc_AI_v1.4_baseline_rev1.md` | Actor, system boundary, 27 Use Case, include/extend |
| 3 | `Use_Case_Specification_v1.2_baseline_rev1.md` | Main/alternate/exception flow, I/O, acceptance behavior |
| 4 | `Activity_Diagram_3_AI_Main_Flows_v1.3_baseline_final.md` | Thứ tự và boundary của 3 AI main flows |
| 5 | `API_Specification_v1.5_baseline_final.md` | REST contract, auth, errors, context semantics, API-level idempotency |
| UI | `UI_Sitemap_v1.1_baseline.md` | Screen/route/navigation |
| UI | `Wireframe_Screen_Specification_v1.1_baseline_final.md` | Screen behavior/state/action |
| UI | `Global UI Design System — Editorial Tech.md` | Visual language và component direction |
| Change Control | `Change_Request_CR-002_AI_Input_Capacity_and_Runtime_Failure_Semantics_v1.0_approved.md` | Authority cho XAI-001/XAI-002 của R3 |
| AI Contract | `AI_Contract_v1.0_baseline_final.md` | Structured AI contract, validator, orchestration/capacity profile binding |
| Governance | `Document_Governance_and_Traceability_Index_v1.2.md` + `Requirements_UseCase_Baseline_Freeze_Record_v1.2.md` | Authority, versioning, change control |

## 3.2. Thứ tự xử lý xung đột

Tài liệu này áp dụng các nguyên tắc:

1. Requirement/business behavior → SRS.
2. Actor/system boundary/Use Case relationship → Use Case Diagram.
3. Business rule/validation/state/data integrity → Business Rules.
4. Main/alternate/exception flow → Use Case Specification.
5. Frontend–Backend contract → API Specification.
6. Screen/navigation → UI Sitemap và Wireframe Specification.
7. Visual style → Global UI Design System.
8. System Architecture chỉ được cụ thể hóa **cách triển khai**, không ghi đè các nguồn trên.

## 3.3. Authority của tài liệu này

Từ phiên bản 1.0 Baseline, tài liệu này là nguồn chuẩn cho:

- lựa chọn framework/library triển khai;
- repository structure;
- module boundaries;
- data-access approach;
- technical temporary-context strategy;
- local development setup;
- coding/agent instructions liên quan kiến trúc.

ADR có thể cụ thể hóa hoặc thay thế một technical decision cục bộ, nhưng không được trái baseline nghiệp vụ/API. Nếu ADR thay đổi một quyết định quan trọng trong tài liệu này, phải xem xét phát hành revision/version mới của tài liệu.


## 3.4. UI Design System Governance

`Global UI Design System — Editorial Tech.md` hiện được dùng làm **current UI design authority** cho visual language/component direction.

Tại thời điểm phát hành Architecture v1.1 Baseline:

- Design System chưa có version/status/freeze metadata tương đương các frozen artifact khác;
- Governance Index v1.1 chưa liệt kê Design System trong baseline/authority model;
- vì vậy **Architecture v1.1 Baseline không tự động biến Design System thành frozen artifact**.

Quy tắc áp dụng:

- implementation tiếp tục tuân theo current Design System cho visual language/component direction;
- Design System không được ghi đè SRS, Business Rules, Use Case, API, Sitemap hoặc Wireframe baseline;
- nếu Design System thay đổi theo cách làm đổi observable UI behavior đã được baseline hóa, thay đổi đó phải được review theo governance/change-control phù hợp;
- việc version hóa/freeze Design System và cập nhật Governance Index là **governance follow-up độc lập**, không phải điều kiện hiệu lực của Architecture v1.1 Baseline;
- chỉ thêm Design System vào `BASELINE_MANIFEST.sha256` sau khi chính artifact đó được approve/baseline.

Cách phân tách này cho phép Architecture được baseline hóa độc lập mà không tuyên bố sai rằng Design System đã frozen.

---

# 4. Architecture Drivers

Các quyết định kiến trúc phải phục vụ các driver sau.

## 4.1. Giữ đúng baseline hơn tối ưu hóa quá mức

MVP ưu tiên một luồng end-to-end hoàn chỉnh và dễ kiểm thử hơn kiến trúc phức tạp.

Không thêm infrastructure chỉ vì “best practice” nếu chưa có nhu cầu cụ thể.

## 4.2. Backend là nguồn chuẩn của business logic

Backend chịu trách nhiệm:

- authentication;
- authorization;
- validation cuối cùng;
- metric/count/calculation chính xác;
- state transition;
- transaction;
- AI orchestration;
- validate AI output;
- persistence orchestration.

Frontend không được trở thành nguồn chuẩn của business rule.

## 4.3. AI là external supporting component

AI:

- chỉ nhận dữ liệu backend cung cấp;
- không truy cập PostgreSQL trực tiếp;
- không có quyền mutation nghiệp vụ trực tiếp;
- không tự tạo metric/count chính xác nếu backend có thể tính;
- output phải được backend validate;
- đề xuất quan trọng cần human-in-the-loop theo baseline.

## 4.4. Reliability trước AI failure

Local AI runtime trên Windows/WSL2 hoặc Tailscale Serve có thể unavailable.

Kiến trúc phải bảo đảm:

- lỗi AI không làm hỏng dữ liệu cũ;
- non-AI features vẫn hoạt động;
- external attempt được log đúng semantics;
- user nhận error state dễ hiểu.

## 4.5. Dễ phát triển và bảo vệ đồ án

Kiến trúc phải đủ rõ để:

- sinh viên có thể giải thích;
- Codex có thể triển khai theo task nhỏ;
- reviewer kiểm tra traceability;
- lỗi có thể khoanh vùng frontend/backend/database/AI;
- không cần vận hành nhiều service ngoài phạm vi MVP.

---

# 5. Kiến trúc tổng thể được chọn

## 5.1. Logical Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                           Web Browser                               │
│                                                                     │
│  Next.js frontend application                                      │
│  UI / Routing / Forms / Client interaction / Server-state UI       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ REST / HTTPS / JSON
                               │ Authorization: Bearer <accessToken>
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NestJS Backend API                               │
│                                                                     │
│ Auth │ Authorization │ Business Logic │ Metrics │ AI Orchestration │
│ Validation │ Transactions │ Temporary Context │ Persistence        │
└───────────────────┬───────────────────────────────┬─────────────────┘
                    │                               │
                    │ Prisma ORM                    │ HTTP/HTTPS
                    ▼                               ▼
┌──────────────────────────────┐      ┌───────────────────────────────┐
│ PostgreSQL                   │      │ AI Runtime                    │
│                              │      │                               │
│ Business data                │      │ Self-managed model           │
│ JSONB snapshots/results      │      │ Windows 11 / WSL2 GPU        │
│ Technical context storage    │      │ Structured output            │
└──────────────────────────────┘      └───────────────────────────────┘
```

Next.js là frontend application của web browser. Trong kiến trúc MVP v1.0, data-access layer phía frontend gọi **trực tiếp NestJS REST API** từ browser; Next.js Route Handler/BFF không phải một hop bắt buộc cho API nghiệp vụ.

## 5.2. Architectural Style

MVP sử dụng:

- **modular monolith** cho backend NestJS;
- một Next.js frontend application;
- một PostgreSQL database;
- một external AI runtime boundary;
- monorepo cho source code và shared tooling.

Không sử dụng microservices trong MVP.

### Lý do

- domain chưa đủ lớn để cần distributed architecture;
- tránh network/ops complexity không tạo giá trị cho đồ án;
- transaction và business invariants dễ quản lý hơn;
- phù hợp với một developer và AI-assisted development;
- vẫn giữ module boundary đủ rõ để mở rộng sau này.


## 5.3. Frontend–Backend Request Topology

**Quyết định triển khai v1.0:** browser-side Next.js frontend gọi trực tiếp NestJS REST API.

```text
Browser / Next.js Client
        │
        │ REST + Authorization: Bearer <accessToken>
        ▼
NestJS API
```

Hệ quả:

- frontend API base URL phải được cấu hình theo environment;
- NestJS cấu hình CORS theo frontend origin;
- access token được gắn vào protected request tại frontend data-access layer;
- protected business-data fetching của MVP thực hiện phía browser/client qua API client + TanStack Query;
- Server Component không tự gọi protected NestJS endpoint yêu cầu user Bearer token nếu chưa có một cơ chế token-forwarding/BFF được review riêng;
- không tạo Next.js API proxy/BFF mặc định chỉ để chuyển tiếp request;
- nếu tương lai cần BFF vì một nhu cầu kỹ thuật cụ thể, phải có ADR và không được tự làm thay đổi API contract/observable behavior.

Quyết định này không thay đổi system boundary của Use Case; đây chỉ là topology triển khai frontend–backend.

---

# 6. Technology Stack

## 6.1. Tổng hợp

| Layer | Technology | Trạng thái | Vai trò |
|---|---|---|---|
| Runtime | Node.js LTS | Implementation Decision | Runtime cho Next.js/NestJS/tooling |
| Language | TypeScript | Baseline + Implementation | Ngôn ngữ chính Frontend/Backend |
| Frontend | Next.js | **Bắt buộc từ SRS** | Web UI |
| Styling | Tailwind CSS | Implementation Decision | Utility styling bám Design System |
| Server State | TanStack Query | Implementation Decision | Fetch/cache/mutation state phía frontend |
| Forms | React Hook Form | Implementation Decision | Form state và UX validation |
| Backend | NestJS | **Bắt buộc từ SRS** | REST API + business orchestration |
| HTTP Validation | `class-validator` + `class-transformer` | Implementation Decision | DTO validation tại NestJS boundary |
| ORM | Prisma ORM | **Implementation Decision được chốt** | Data access + migration |
| Database | PostgreSQL | **Bắt buộc từ SRS** | Persistent storage |
| AI Runtime | Self-managed model trên Local GPU / Windows 11 + WSL2; Tailscale Serve cho Linux peer | **CP-005 approved for development/demo** | Inference service |
| AI Transport | HTTP/HTTPS JSON endpoint | Baseline-derived | NestJS gọi AI runtime |
| Monorepo | pnpm workspace | Implementation Decision | Workspace/package management |
| Task orchestration | Turborepo | Implementation Decision | Build/lint/test task graph |
| Backend Test | Jest | Implementation Decision | Unit/integration testing NestJS |
| Frontend Test | Vitest + Testing Library | Implementation Decision | Component/unit testing |
| E2E | Playwright | Implementation Decision | Browser end-to-end testing |
| Lint | ESLint | Implementation Decision | Static quality checks |
| Format | Prettier | Implementation Decision | Formatting consistency |

## 6.2. Version Policy

Tài liệu này **không khóa số major/minor package cụ thể** trừ khi baseline upstream bắt buộc.

Khi bootstrap repository:

- chọn một **Node.js LTS** phù hợp và pin runtime bằng `.nvmrc` hoặc `.node-version`;
- khai báo `engines.node` và `packageManager` trong root `package.json`;
- sử dụng stable release phù hợp của pnpm/framework/library tại thời điểm bootstrap;
- pin exact dependency resolution trong `pnpm-lock.yaml`;
- commit lockfile và runtime-version file;
- không tự động nâng major version trong cùng implementation task;
- major upgrade cần technical review/ADR nếu có nguy cơ ảnh hưởng architecture/API/behavior.

Nguyên tắc:

```text
Architecture chốt runtime/tool family
        ↓
Repository bootstrap chốt exact versions
        ↓
Lockfile + runtime file bảo đảm reproducible setup
```

Cách này giúp tài liệu kiến trúc ổn định hơn vòng đời release của thư viện nhưng repository vẫn có toolchain tái lập được.

---

# 7. Quyết định Monorepo

## 7.1. Cấu trúc được chọn

```text
dacn/
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── .gitignore
├── .env.example
│
├── apps/
│   ├── web/                         # Next.js
│   │   ├── AGENTS.md
│   │   └── ...
│   │
│   └── api/                         # NestJS
│       ├── AGENTS.md
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       └── ...
│
├── packages/
│   ├── contracts/                   # Transport types/schema/constants được phép share
│   ├── eslint-config/
│   └── tsconfig/
│
├── ai/
│   ├── AGENTS.md
│   ├── notebooks/
│   ├── contracts/
│   └── README.md
│
├── docs/
│   ├── baseline/
│   ├── architecture/
│   ├── decisions/
│   ├── superpowers/
│   │   ├── specs/
│   │   └── plans/
│   ├── implementation/
│   └── testing/
│
├── tests/
│   ├── e2e/
│   └── fixtures/
│
└── scripts/
```

## 7.2. Vì sao dùng monorepo

- Frontend/backend cùng một project đồ án và thay đổi thường đi theo vertical slice.
- Dễ đồng bộ API contract và test fixtures.
- Một command có thể lint/typecheck/test toàn hệ thống.
- Codex/multi-agent có thể giới hạn ownership theo thư mục.
- Một repository dễ demo, bàn giao và backup hơn nhiều repository nhỏ.

## 7.3. Các hướng không chọn

### Separate repositories

Không chọn vì:

- tăng overhead version/coordination;
- khó giữ frontend/backend contract đồng bộ;
- không đem lại lợi ích đáng kể cho MVP một người phát triển.

### Nx

Không chọn ở v1.0 vì:

- cung cấp nhiều capability hơn nhu cầu hiện tại;
- learning/operational overhead cao hơn pnpm + Turborepo;
- MVP chỉ có ít application/package.

Nếu project phát triển thành nhiều app/package phức tạp, có thể đánh giá lại bằng ADR.


## 7.4. Frozen Baseline Protection

Thư mục:

```text
docs/baseline/
```

được xem là **read-only đối với implementation agent**.

Quy tắc:

- Codex/agent không sửa file frozen baseline trong feature/fix/bootstrap task;
- nếu implementation có vẻ yêu cầu sửa baseline, agent phải dừng phần thay đổi đó và báo conflict kèm FR/UC/BR/API liên quan;
- thay đổi baseline chỉ thực hiện qua quy trình version/change control phù hợp;
- kiểm tra integrity không thay thế review nghiệp vụ nhưng giúp phát hiện agent sửa nhầm tài liệu nguồn.

### Repository Baseline Manifest

Freeze Record R3 là authority freeze hiện hành cho requirements/use-case baseline. Repo vẫn phải duy trì manifest riêng để bao phủ cả các downstream artifact frozen/approved như API Specification, Wireframe, Architecture, ADR, Database Design và AI Contract.

Vì vậy repository phải duy trì thêm:

```text
docs/baseline/BASELINE_MANIFEST.sha256
```

Manifest repo-level:

- dùng hash của các artifact thuộc baseline R3/Freeze Record hiện hành;
- bổ sung hash của các downstream artifact đã được phát hành immutable/frozen nhưng không nằm trong freeze manifest requirements/use-case;
- bổ sung Architecture/Design System vào manifest **chỉ sau khi chính các artifact đó được approve/baseline**;
- được commit cùng repository;
- không được auto-rewrite bởi implementation agent.

`pnpm verify:baseline` phải:

1. tính hash các file được liệt kê;
2. so sánh với `BASELINE_MANIFEST.sha256`;
3. fail nếu mismatch/missing file;
4. chỉ báo lỗi, không tự sửa manifest hay baseline file.

---

# 8. Frontend Architecture

## 8.1. Trách nhiệm

Next.js chịu trách nhiệm:

- routing;
- render UI;
- role-aware navigation;
- form interaction;
- loading/empty/error state;
- gọi NestJS REST API;
- hiển thị dữ liệu backend;
- hiển thị AI result tách biệt system data;
- chuyển ISO 8601 UTC sang local time khi hiển thị.

Next.js **không** chịu trách nhiệm:

- authorization cuối cùng;
- tính metric nghiệp vụ authoritative;
- truy cập PostgreSQL;
- gọi AI runtime trực tiếp trong các main flow;
- quyết định eligibility AI;
- reimplement business rules từ backend.

## 8.2. Folder Direction

Gợi ý cấu trúc:

```text
apps/web/src/
├── app/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── data-display/
│   └── ai/
├── features/
│   ├── auth/
│   ├── student/
│   ├── teacher/
│   ├── admin/
│   └── feedback/
├── lib/
│   ├── api/
│   ├── auth/
│   ├── query/
│   └── date/
├── hooks/
└── types/
```

Feature folder được ưu tiên để code của một business capability nằm gần nhau.

## 8.3. Server-state Management

Sử dụng **TanStack Query** cho dữ liệu đến từ NestJS API.

Áp dụng cho:

- query data;
- cache;
- loading/error state;
- invalidation sau mutation;
- retry có kiểm soát;
- pagination/filter state liên quan server data.

Không dùng TanStack Query để chứa business state authoritative.

### Quy tắc retry

- GET/read request có thể retry hợp lý;
- mutation quan trọng không retry mù quáng ở frontend;
- idempotent replay phải dựa trên context/reference semantics từ backend;
- AI `INSUFFICIENT_DATA` và business ineligible không được xử lý như provider failure để auto retry.

## 8.4. Local State

Ưu tiên:

1. component state;
2. React Hook Form state;
3. URL/search params cho filter có ý nghĩa điều hướng;
4. TanStack Query cho server state.

Không thêm Redux/Zustand ở MVP nếu chưa xuất hiện nhu cầu state dùng chung thực sự.

## 8.5. Forms

Sử dụng **React Hook Form**.

Frontend validation chỉ phục vụ:

- phản hồi nhanh cho user;
- field-level error;
- giảm request sai rõ ràng.

Backend validation vẫn là nguồn chuẩn cuối cùng.

## 8.6. Styling và Design System

Sử dụng **Tailwind CSS** để hiện thực Global UI Design System.

Các design token chuẩn phải được map thành CSS custom properties/Tailwind theme, ví dụ:

```css
--color-background: #fffcf7;
--color-ink: #0d0129;
--color-accent: #fae59b;
--color-teal: #19615c;
--color-surface: #ffffff;
```

Không dùng utility class để phá vỡ các global design rules:

- không rounded card mặc định;
- không gradient;
- không glassmorphism;
- không soft large shadow;
- system data và AI result phải phân biệt rõ.

## 8.7. Component Strategy

Component dùng chung nên phát triển theo Design System hiện hành:

```text
AppShell
AuthShell
Sidebar
TopBar
PageHeader
Section
NavItem
ClassContextNav
Breadcrumb
AccountMenu
Input
Textarea
Select
Radio
DateInput
Button
AIActionButton
MetricCard
DataTable
FilterBar
Badge
Pagination
AIInsightPanel
AIProcessingState
AIErrorState
AIPreviewPanel
EmptyState
ErrorState
LoadingState
Toast
Alert
Modal
ConfirmDialog
```

Không tạo package `packages/ui` ngay từ đầu nếu chỉ có một frontend application. Component UI đặt trong `apps/web` để giảm abstraction sớm. Chỉ tách `packages/ui` khi có consumer thứ hai hoặc lý do tái sử dụng rõ ràng.

---

# 9. Backend Architecture

## 9.1. Architectural Pattern

NestJS backend sử dụng modular monolith + layered responsibility nhẹ:

```text
Controller
   ↓
Application/Domain Service
   ↓
Repository/Data Access / External Gateway
```

Controller chỉ:

- nhận request;
- chạy DTO validation qua framework pipeline;
- lấy auth context;
- gọi service;
- map response/status.

Business logic không đặt trong controller.

## 9.2. Module Direction

Cấu trúc module khuyến nghị:

```text
AuthModule
UsersModule
StudentModule
  ├── StudentDashboardService
  ├── AssessmentService
  ├── StudyPlanService
  ├── StudyTaskService
  └── StudentAiService
TeacherModule
  ├── TeacherClassService
  ├── ClassAnalyticsService
  └── ClassAnalysisService
AdminModule
  ├── AdminDashboardService
  ├── AdminUserService
  └── FeedbackAnalysisService
FeedbackModule
AiModule
  ├── AiGateway
  └── AiRequestLogService
ContextModule
  └── TemporaryContextService
DatabaseModule
```

Tên class/file cụ thể có thể thay đổi trong implementation miễn giữ separation of responsibility.

## 9.3. Validation

HTTP DTO sử dụng:

- `class-validator`;
- `class-transformer`;
- NestJS `ValidationPipe` ở global boundary.

Nguyên tắc:

- whitelist field;
- reject/strip unknown field theo policy được thống nhất;
- normalize dữ liệu ở service/helper phù hợp;
- frontend validation không thay backend validation.

## 9.4. Business Rule Placement

Business rule đặt trong backend service/domain helper có tên rõ nghĩa.

Ví dụ:

```text
calculateActualProgress()
calculateExpectedProgress()
isStudyPlanAdjustmentEligible()
classifyScore()
normalizeAccountEmail()
deduplicateFeedbackIssueGroups()
```

Không đặt các rule này:

- trong controller;
- trong React component;
- trong AI prompt;
- trong Prisma hook một cách khó quan sát.

## 9.5. Transaction Boundary

Các mutation nhiều bước phải dùng database transaction khi baseline yêu cầu atomic behavior.

Đặc biệt:

- Apply StudyPlan;
- update StudyTask status + cập nhật StudyPlan state nếu cần;
- Apply AI adjustment;
- Save report/analysis cùng technical-context consume/replay metadata khi cần bảo đảm idempotency.

Transaction phải nằm ở service/application boundary, không để controller tự ghép nhiều database call độc lập.

### ARCH-RULE-TX-001 — Không giữ transaction khi chờ external network/AI

Không giữ PostgreSQL transaction mở trong lúc chờ:

- AI Runtime;
- external HTTP request;
- thao tác mạng có latency không kiểm soát.

Luồng chuẩn:

```text
read / prepare input
        ↓
external AI call
        ↓
validate structured output
        ↓
user confirmation nếu flow yêu cầu
        ↓
BEGIN DATABASE TRANSACTION
        ↓
atomic business mutation + related technical metadata
        ↓
COMMIT
```

Mục tiêu là tránh giữ lock dài trong thời gian AI có thể chờ đến timeout, đồng thời giữ đúng yêu cầu AI failure không làm thay đổi business state cũ.

---

# 10. Prisma ORM & Database Access

## 10.1. Quyết định

**Prisma ORM được chọn làm data-access layer chuẩn giữa NestJS và PostgreSQL.**

```text
NestJS Service
     ↓
Prisma Client
     ↓
PostgreSQL
```

## 10.2. Lý do chọn Prisma

- TypeScript-friendly;
- schema tập trung, dễ đọc với sinh viên;
- migration workflow rõ;
- generated client giảm lỗi tên field/type;
- transaction API phù hợp phần lớn mutation MVP;
- tooling tốt cho seed/demo data;
- dễ để Codex/reviewer nhìn thấy data model và constraint.

## 10.3. Alternatives Considered

### TypeORM

Ưu điểm:

- tích hợp lâu đời với NestJS;
- decorator/entity style quen thuộc.

Không chọn vì:

- entity/migration behavior dễ phân tán hơn;
- Prisma schema phù hợp mục tiêu đơn giản và type-safe của dự án hơn.

### Drizzle

Ưu điểm:

- gần SQL;
- type-safe;
- nhẹ.

Không chọn vì:

- yêu cầu hiểu SQL/query detail nhiều hơn;
- không tạo lợi ích đủ lớn cho đồ án so với Prisma.

### Raw SQL làm data layer chính

Không chọn vì:

- tăng lỗi thủ công;
- khó maintain;
- khó cho agent tự kiểm tra schema/relationship;
- không cần thiết cho phần lớn MVP.

## 10.4. Raw SQL Policy

Application service không dùng ad-hoc raw SQL nếu Prisma diễn đạt được yêu cầu.

Raw SQL chỉ được phép khi:

- Prisma không cung cấp primitive cần thiết;
- cần một database capability cụ thể cho correctness/performance;
- có comment hoặc ADR giải thích lý do;
- có integration test bảo vệ behavior;
- không dùng để bypass authorization/business rule.

## 10.5. Migration Policy

Mọi thay đổi schema phải đi qua:

```text
Requirement / Architecture impact check
        ↓
prisma/schema.prisma
        ↓
Prisma migration
        ↓
seed/fixture update nếu cần
        ↓
affected tests
```

Không dùng `db push` như cơ chế thay thế migration cho thay đổi cần lưu lịch sử chính thức sau khi repository đi vào giai đoạn implementation ổn định.

## 10.6. JSONB

Giữ JSONB cho các snapshot/result đã được baseline xác định, ví dụ:

- `ClassAnalysisReport.inputSnapshot`;
- `ClassAnalysisReport.analysisResult`;
- `FeedbackAnalysis.inputSnapshot`;
- `FeedbackAnalysis.analysisResult`;
- technical context payload/replay result khi phù hợp.

Business field cần query/filter/constraint thường xuyên không nên đưa vào JSONB chỉ để giảm số cột.

---

# 11. Data Architecture Principles

## 11.1. PostgreSQL là persistent source of truth

PostgreSQL lưu:

- user/account;
- class/membership;
- course/topic;
- assessment result;
- study plan/task;
- feedback;
- AI request log;
- saved analysis report/history;
- technical context nếu được dùng để bảo đảm API semantics.

## 11.2. UTC

Backend/database lưu timestamp theo UTC.

API truyền ISO 8601.

Frontend chuyển sang local time khi hiển thị.

Không lưu local-time string không timezone làm nguồn chuẩn cho timestamp nghiệp vụ.

## 11.3. Identifier

API ID là opaque string.

Database implementation có thể dùng UUID/CUID hoặc strategy phù hợp, nhưng frontend không phụ thuộc format cụ thể.

Database Design sẽ chốt identifier strategy vật lý.

## 11.4. Constraint Philosophy

Một invariant quan trọng nên được bảo vệ ở nhiều lớp khi hợp lý:

```text
DTO/service validation
        +
Database constraint/index
        +
Test
```

Database constraint không thay business authorization.

## 11.5. Seed Data

Seed data là một phần chính thức của MVP development/demo.

Seed phải:

- deterministic khi có thể;
- đủ cho 3 role demo;
- có dữ liệu edge case cần test;
- phân biệt rõ seed feedback với feedback thật khi trình bày demo.

---

# 12. Authentication & Authorization Architecture

## 12.1. API Contract

MVP dùng Bearer access token:

```http
Authorization: Bearer <accessToken>
```

**Quyết định triển khai v1.0:** access token được hiện thực bằng **JWT** do NestJS phát hành/xác thực. JWT chỉ là cơ chế kỹ thuật phía backend; role/status/ownership vẫn phải được kiểm tra từ dữ liệu hệ thống theo request và không được coi claim cũ là đủ để bỏ qua `User.status = ACTIVE`.

Authentication implementation phải giữ đúng API baseline.

## 12.2. Backend Checks

Protected request kiểm tra theo thứ tự logic:

1. token hợp lệ;
2. user tồn tại;
3. user `ACTIVE`;
4. role được phép;
5. ownership/resource relation.

Frontend route guard/menu visibility chỉ là UX optimization.

## 12.3. Password

Password không lưu plain text.

Hashing implementation phải sử dụng thư viện password-hashing phù hợp; thuật toán cụ thể được khóa ở Auth implementation/ADR và không làm thay đổi API contract.

## 12.4. Token Storage — MVP Decision

API baseline không khóa cơ chế lưu access token phía browser. Để nhất quán với topology **browser-side Next.js → NestJS trực tiếp**, kiến trúc v1.0 chốt:

- access token JWT được lưu trong **`sessionStorage`** của browser cho MVP;
- `sessionStorage` có phạm vi theo browser tab; MVP không yêu cầu đồng bộ authentication state giữa nhiều tab;
- token chỉ được đọc bởi frontend API client khi tạo protected request;
- protected business-data fetch sử dụng client-side data layer/TanStack Query;
- logout gọi endpoint logout theo API baseline, sau đó xóa token + user state + query cache cục bộ và điều hướng về màn hình đăng nhập;
- không hard-code token;
- không ghi bearer token vào application log;
- không đưa database/AI secrets ra frontend;
- MVP **không bổ sung refresh-token endpoint, refresh-token rotation, token blacklist hoặc multi-session management** ngoài API baseline.

`sessionStorage` là quyết định trade-off cho MVP, không phải cơ chế authentication production mặc định. Vì token JavaScript-accessible, implementation phải giảm rủi ro XSS:

- không render HTML không tin cậy bằng `dangerouslySetInnerHTML`;
- ưu tiên React escaping mặc định cho nội dung người dùng;
- không đưa token vào URL, DOM hoặc error message;
- dependency/security review tập trung vào code chạy trong browser;
- có thể bổ sung CSP phù hợp khi triển khai nếu hosting hỗ trợ.

Các tham số JWT còn lại như exact expiry, signing algorithm/key strategy và minimal claims được chốt trong **Auth ADR** trước khi hoàn tất authentication implementation. Các quyết định đó không được tạo endpoint/behavior mới ngoài API baseline.

---

# 13. API Integration Architecture

## 13.1. Contract Source

`API_Specification_v1.5_baseline_final.md` là nguồn chuẩn cho frontend–backend contract.

REST base path giữ theo API baseline:

```text
/api/v1
```

Không tự đổi:

- route;
- HTTP method;
- required DTO field;
- response semantics;
- error code;
- pagination behavior;
- context/reference semantics.

## 13.2. Shared Contracts Package

`packages/contracts` chỉ chứa transport-level artifacts an toàn để share, ví dụ:

- enum/API type không chứa server secret;
- generated OpenAPI types nếu áp dụng;
- request/response type dùng chung khi có workflow rõ;
- constant transport-level.

Không đặt trong package shared:

- Prisma Client;
- database model implementation;
- authorization logic;
- backend service;
- server secret;
- business logic cần nằm ở backend.

## 13.3. OpenAPI

NestJS **phải expose Swagger/OpenAPI trong development** để:

- kiểm tra API contract;
- hỗ trợ frontend integration;
- hỗ trợ test/debug;
- có thể sinh frontend transport types nếu workflow được chọn.

OpenAPI generation là downstream implementation artifact và không được tự thay API baseline.

---

# 14. AI Integration Architecture

## 14.1. Boundary

Mọi AI call nghiệp vụ:

```text
Frontend
   ↓
NestJS
   ↓
AI Gateway
   ↓
External AI Runtime / Local GPU on Windows 11 + WSL2
```

Không có đường:

```text
Frontend → AI Runtime
AI Runtime → PostgreSQL
```

## 14.2. AI Gateway

`AiGateway` chịu trách nhiệm kỹ thuật:

- base URL từ environment;
- auth header nếu AI endpoint yêu cầu;
- timeout;
- HTTP/network error normalization;
- request serialization;
- response parsing;
- không chứa business eligibility.

Business eligibility phải được kiểm tra ở application service trước khi gateway được gọi.

## 14.3. AI URL Configuration

AI endpoint dùng loopback trên Windows clone và HTTPS Tailscale Serve trên Linux clone; địa chỉ Serve có thể thay đổi theo tailnet/host configuration.

Do đó:

- URL nằm trong environment/config;
- không hard-code trong source/business logic;
- secret/token nếu có chỉ nằm backend env;
- frontend không được biết AI secret.

## 14.4. Timeout

Một external AI attempt có timeout tối đa `60 giây` theo baseline.

Phải phân biệt:

```text
external-attempt timeout
!=
frontend/proxy/controller end-to-end timeout
```

### Admin feedback analysis

Admin two-stage flow gồm hai external attempts tuần tự + backend validation/orchestration. End-to-end HTTP timeout **khuyến nghị tối thiểu khoảng 130 giây** theo API-DD-003 (`2 × 60 giây` + overhead).

### Teacher class analysis

AI Contract v1.0 khóa Teacher Class Analysis + Recommendation thành **một external attempt**. End-to-end timeout phải lớn hơn timeout 60 giây của attempt cộng orchestration/validation overhead.

### Client/proxy rule

Các lớp sau không được timeout sớm hơn orchestration hợp lệ của backend:

- frontend HTTP client;
- Next.js/network layer nếu có;
- reverse proxy;
- hosting platform/controller timeout.

Không tự đổi sang async job/polling trong MVP nếu chưa có architecture/change decision phù hợp.

## 14.5. Structured Output Validation

Pipeline:

```text
AI raw response
     ↓
parse structured output
     ↓
schema/type validation
     ↓
reference/enum/business-boundary validation
     ↓
validated result
```

Invalid AI output:

- không được coi là success;
- external attempt vẫn phải log nếu call đã xảy ra;
- không làm thay đổi dữ liệu nghiệp vụ cũ.

HTTP DTO validation (`class-validator`) **không mặc nhiên được xem là AI structured-output validator**.

AI Contract phải chốt schema validation mechanism riêng, ví dụ:

- JSON Schema + Ajv; hoặc
- Zod; hoặc
- cơ chế tương đương có schema rõ và test được.

Cho tới khi AI Contract chốt, implementation agent không được coi “JSON parse thành công” là đủ để chấp nhận AI output.

## 14.6. AIRequestLog

Mỗi external attempt thực tế phải tạo/hoàn thiện log.

Không tạo AIRequestLog khi request dừng trước external call do:

- validation fail;
- `INSUFFICIENT_DATA`;
- business ineligible.

Không lưu full raw prompt/response mặc định.

---

## 14.7. CR-002 — Capacity Profile Architecture

AI input capacity là technical deployment concern, không phải business max-length/max-items cố định.

Mỗi deployment phải release một `capacityProfileVersion` bind tối thiểu với:

```text
contractVersion
modelId
tokenizerId
contextWindowTokens
inputSafetyMarginTokens
taskProfiles[task].promptVersion
taskProfiles[task].reservedOutputTokens
taskProfiles[task].promptAndSchemaOverheadTokens
```

Backend chạy capacity preflight **trước network dispatch** trên payload serialize thực tế. Không được silently truncate/sample/page-limit/pre-summarize/chunk authoritative input.

- profile missing/malformed/binding mismatch → public `502 AI_RUNTIME_FAILURE`, internal `AI_CAPACITY_PROFILE_MISMATCH`, không `AIRequestLog`;
- profile hợp lệ nhưng input vượt validated budget → public `422 AI_INPUT_TOO_LARGE`, internal `AI_INPUT_BUDGET_EXCEEDED`, không `AIRequestLog`.

Đổi `modelId`, `tokenizerId` hoặc active `promptVersion` yêu cầu benchmark/release `capacityProfileVersion` mới và deploy atomically cùng backend/runtime config.

## 14.8. CR-002 — Runtime Technical Failure Boundary

Gateway phải phân biệt connection/unavailable với protocol/auth/inference/technical provider failure. Runtime `400/422`, `401/403`, `INFERENCE_FAILED` và unclassified technical `5xx` dùng public `AI_RUNTIME_FAILURE`; nếu dispatch đã xảy ra thì attempt được log FAILED với internal subcategory. `AI_INVALID_STRUCTURE` chỉ dành cho response/output đã nhận nhưng fail parse/schema/correlation/semantic validation.

---

# 15. Temporary Context Architecture

## 15.1. Nhu cầu

API baseline yêu cầu backend-owned opaque context cho:

- `planPreviewRef`;
- `adjustmentRef`;
- Teacher `analysisRef`;
- Admin `analysisRef`.

Client không phải nguồn chuẩn của snapshot/result gốc.

## 15.2. Quyết định Storage

MVP sử dụng **PostgreSQL-backed technical context storage**, truy cập qua Prisma.

Lý do:

- không cần thêm Redis;
- giữ context qua API process restart trong thời gian TTL;
- dễ kiểm thử integration;
- hỗ trợ atomic claim/idempotent replay tốt hơn in-memory Map;
- phù hợp với single-backend MVP.

Đây là **technical storage**, không phải entity nghiệp vụ mới.

## 15.3. Conceptual Technical Context

Database Design có thể triển khai một model kỹ thuật tương đương:

```text
TemporaryContext
- id / opaqueRef
- contextType
- ownerUserId
- resourceKey/resourceScope
- payload JSONB
- status: OPEN | CONSUMED
- requestFingerprint nullable
- replayResult JSONB nullable
- expiresAt
- consumedAt nullable
- createdAt
- updatedAt
- concurrency/version metadata nếu cần
```

Tên field/model cụ thể được chốt trong Database/System Design chi tiết.

## 15.4. TTL

Context OPEN có TTL mặc định 60 phút theo API baseline.

Sau khi context được consume thành công, replay mapping phải được giữ tối thiểu đến `expiresAt` và ít nhất **10 phút sau `consumedAt`**, lấy mốc muộn hơn, đúng API-DD-002.

## 15.5. Idempotency và Atomic Transaction Boundary

Với context dùng cho mutation, **atomic claim/serialization + business mutation + context consume + replay metadata phải thuộc cùng một atomic database transaction hoặc cơ chế tương đương có cùng semantics**.

Luồng chuẩn:

```text
BEGIN DATABASE TRANSACTION
        ↓
lock / atomically claim OPEN context
        ↓
authorize + validate + revalidate business state
        ↓
perform business mutation
        ↓
write context:
  status = CONSUMED
  consumedAt
  requestFingerprint (khi áp dụng)
  replayResult / resource identity
        ↓
COMMIT
        ↓
return logical result
```

Nếu bất kỳ bước nào thất bại:

```text
ROLLBACK
    ↓
business mutation không tồn tại
    ↓
context vẫn OPEN nếu chưa hết hạn
```

Không được triển khai theo mô hình commit tách rời kiểu:

```text
claim context → COMMIT
business mutation → COMMIT
set CONSUMED → COMMIT
```

vì có thể tạo crash window khiến business mutation đã commit nhưng context vẫn bị dùng để mutation lần hai.

Context chỉ được xem là `CONSUMED` sau khi **cùng atomic unit** đã commit thành công.

## 15.6. Concurrency

Implementation phải bảo đảm hai request concurrent không cùng mutation một context `OPEN`.

Cơ chế cụ thể có thể dùng:

- transactional conditional update;
- optimistic version/compare-and-set;
- database row locking nếu thật sự cần.

Cơ chế cuối cùng phải được integration-test tối thiểu cho:

- hai request concurrent cùng reference + cùng payload;
- cùng reference + payload khác sau consume;
- request đầu rollback rồi request hợp lệ tiếp theo;
- replay sau thành công không tạo mutation thứ hai.

Nếu Prisma API không đủ để biểu đạt một atomic primitive bắt buộc, targeted raw SQL được phép theo Raw SQL Policy.

External AI/network call không được đặt bên trong transaction consume/mutation này; AI output phải được nhận và validate trước transaction theo `ARCH-RULE-TX-001`.

## 15.7. Cleanup và Replay Retention

Physical cleanup không được làm mất replay mapping trước thời hạn API-DD-002.

Định nghĩa logic:

```text
OPEN:
  retentionUntil = expiresAt

CONSUMED:
  retentionUntil = max(expiresAt, consumedAt + 10 phút)
```

Quy tắc:

- context `OPEN` hết `expiresAt` phải bị xem là invalid ở API;
- context `CONSUMED` vẫn phải giữ replay metadata đến `retentionUntil`;
- chỉ được physical-delete context khi `now >= retentionUntil`;
- không được dùng rule đơn giản `DELETE WHERE expiresAt < now` cho mọi context vì có thể xóa replay mapping quá sớm.

MVP có thể cleanup bằng:

- lazy cleanup khi đọc/ghi; và/hoặc
- development/manual maintenance script.

Không bắt buộc thêm queue/cron infrastructure chỉ cho cleanup MVP.

---

# 16. Error Handling Architecture

## 16.1. Error Categories

Backend phải phân biệt tối thiểu:

- authentication error;
- authorization/forbidden;
- validation error;
- not found;
- context invalid/expired/consumed;
- business ineligible;
- `INSUFFICIENT_DATA`;
- database failure;
- AI provider/connection failure;
- AI timeout;
- AI invalid/empty structured output.

## 16.2. Frontend Principle

Frontend không được gom mọi AI-related non-success thành “AI lỗi”.

Phải phân biệt:

```text
INSUFFICIENT_DATA
Business ineligible
Validation error
AI provider/runtime failure
Invalid AI output
```

## 16.3. Data Preservation

Error path không được để lại mutation một phần nếu operation yêu cầu atomicity.

AI failure không được làm thay đổi trạng thái nghiệp vụ cũ.

---

# 17. Performance Architecture

## 17.1. Baseline Target

Đối với API nghiệp vụ **không gọi AI**, kiến trúc phải hỗ trợ mục tiêu `NFR-PERF-001`: hướng tới thời gian phản hồi `<= 2 giây` với seed dataset và điều kiện demo bình thường.

Đây là mục tiêu MVP, không phải SLA production; tuy nhiên implementation không được bỏ qua requirement này.

## 17.2. Query Strategy

Backend/database phải ưu tiên:

- query theo đúng dữ liệu endpoint cần, tránh load toàn bộ graph không cần thiết;
- tránh N+1 query trong list/detail flow;
- dùng pagination đúng các collection đã được API Specification quy định;
- dùng database aggregation cho count/average/statistics có thể tính chính xác;
- chọn index trong Database Design dựa trên actual filter/join/order/query pattern của API;
- không thêm Redis/cache infrastructure chỉ để đạt mục tiêu MVP khi PostgreSQL + query/index hợp lý đã đủ.

Prisma là data-access layer chính, nhưng performance-critical query phải được quan sát bằng query plan/log phù hợp trước khi tối ưu.

## 17.3. Verification

Khi có seed dataset đại diện cho demo:

- chạy performance smoke test cho các non-AI API chính;
- ghi lại latency tối thiểu ở mức đủ phát hiện regression rõ ràng;
- nếu một endpoint thường xuyên vượt mục tiêu 2 giây, kiểm tra query count, N+1, index và lượng dữ liệu trả về trước khi thêm hạ tầng mới.

Performance smoke test không thay thế functional/integration test và không cần xây load-testing platform production cho MVP.

---

# 18. Logging & Observability

## 18.1. MVP Logging

MVP sử dụng hai lớp:

1. application logs từ NestJS;
2. persistent `AIRequestLog` theo business/AI baseline.

## 18.2. Application Log

Backend **phải ghi server error log cần thiết để debug** theo `NFR-LOG-001`.

Application log nên chứa:

- request/error context vừa đủ;
- module/feature;
- safe identifiers;
- latency khi hữu ích;
- error category.

Không log:

- password;
- password hash;
- bearer token;
- database password;
- AI secret;
- full prompt/raw AI response mặc định.

## 18.3. Infrastructure Monitoring

CPU/GPU/dashboard monitoring production không nằm trong MVP.

Không thêm Prometheus/Grafana chỉ để “đủ kiến trúc”.

---

# 19. Security Architecture

## 19.1. Required Principles

- password không plain text;
- protected API luôn auth + authorization backend;
- user `DISABLED` bị từ chối ở protected request;
- Student chỉ dữ liệu của mình;
- Teacher chỉ Class được phân công;
- secret không vào frontend bundle;
- frontend input không được tin cậy;
- AI input được data-minimize;
- AI không nhận secret/password hash;
- AI không truy cập database trực tiếp.

## 19.2. Environment Secrets

Secret chỉ được lấy từ environment/configuration.

`.env` thật không commit.

Repository phải có `.env.example` chỉ chứa tên biến và giá trị mẫu không nhạy cảm.

## 19.3. CORS

NestJS chỉ allow frontend origin phù hợp theo environment.

Development origin và deployed origin không hard-code rải rác trong code.

---

# 20. Configuration Architecture

## 20.1. Environment

Tối thiểu dự kiến:

```text
NODE_ENV
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN
WEB_ORIGIN
AI_BASE_URL
AI_AUTH_TOKEN              # optional nếu runtime cần
AI_REQUEST_TIMEOUT_MS       # baseline default 60000
PORT

# Frontend public configuration — không phải secret
NEXT_PUBLIC_API_BASE_URL
```

Tên cụ thể có thể refine khi bootstrap nhưng phải tập trung qua configuration module.

## 20.2. Config Validation

Backend **phải validate required environment variables khi start**.

Không để ứng dụng chạy một nửa rồi mới phát hiện thiếu `DATABASE_URL` hoặc `JWT_SECRET` ở request đầu tiên.

## 20.3. Environment Separation

Ít nhất phân biệt:

- development;
- test;
- demo/deployment environment.

Test không dùng production/demo database.

---

# 21. Local Development Architecture

## 21.1. Local Components

Hướng local development:

```text
Next.js      → chạy local
NestJS       → chạy local
PostgreSQL   → local service hoặc Docker container
AI Runtime   → một FastAPI/Qwen NF4 trong WSL2 trên máy Windows GPU đồng đội
NestJS Linux → HTTPS Tailscale Serve tới cùng runtime; NestJS Windows → loopback tới cùng runtime
```

## 21.2. Docker

Docker không bắt buộc cho toàn bộ application ở MVP.

Khuyến nghị dùng Docker Compose cho PostgreSQL để:

- setup nhất quán;
- dễ reset test/dev database;
- giảm phụ thuộc cài PostgreSQL trực tiếp trên máy.

Không containerize AI Runtime trong phạm vi CP-005; chỉ một instance chạy trong WSL2. Giữ Colab artifacts làm lịch sử/evidence cho đến sau Local GPU PASS và một cleanup được phê duyệt riêng.

## 21.3. Offline-from-AI Development

Frontend/backend non-AI feature phải phát triển và test được khi Local GPU/WSL2/Tailscale runtime offline.

AI integration test có thể sử dụng:

- mock/fake server cho phần contract kỹ thuật;
- real Local GPU endpoint cho integration/demo verification phù hợp sau khi Local GPU acceptance đạt PASS.

Fake AI không được trình bày như real inference trong demo chính thức nếu requirement yêu cầu call AI thật.

---

# 22. Testing Strategy at Architecture Level

## 22.1. Test Pyramid cho MVP

```text
                 E2E / Playwright
               /                  \
       API Integration          UI Integration
          /                          \
 Backend Unit                    Frontend Unit
```

## 22.2. Backend Unit Test

Dùng cho:

- calculation;
- eligibility;
- normalization;
- deduplication;
- pure business rule;
- validation helper.

## 22.3. API Integration Test

Dùng cho:

- authorization;
- Prisma/PostgreSQL interaction;
- transaction;
- context TTL/consume/replay;
- concurrent mutation;
- AI logging semantics;
- endpoint contract.

Đây là lớp test rất quan trọng cho API-DD-002 semantics.

## 22.4. Frontend Unit/Component Test

Dùng cho:

- form validation UX;
- loading/empty/error state;
- role-specific rendering;
- component behavior;
- AI/system-data distinction khi phù hợp.

## 22.5. E2E

Playwright tập trung vào main demo path và critical negative path.

Ưu tiên:

- login/role landing;
- Student plan flow;
- Teacher analysis/save/history;
- Feedback submission;
- Admin analysis/save/history;
- critical authorization denial.

## 22.6. Test Source of Truth

Expected behavior phải lấy từ:

```text
Acceptance Criteria
Business Rules
API Specification
Wireframe/UI states
```

Không lấy implementation hiện có làm nguồn định nghĩa expected behavior.

---

# 23. Quality Gates

Một implementation task không được xem là complete chỉ vì UI “chạy được”.

Quality gate tối thiểu ở repository:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Khi task ảnh hưởng database/API:

```bash
pnpm test:integration
```

Khi task ảnh hưởng user flow chính:

```bash
pnpm test:e2e
```

Tên command cụ thể được bootstrap ở root scripts nhưng semantics phải tương đương.

---

# 24. Codex / Multi-Agent Architecture Alignment

## 24.1. Source Hierarchy cho Agent

Agent phải đọc theo thứ tự:

```text
Task
 ↓
Relevant frozen baseline
 ↓
API/UI baseline nếu liên quan
 ↓
System Architecture & Technology Stack
 ↓
Relevant ADR
 ↓
Existing code/tests
```

Code không được dùng để ghi đè requirement.

## 24.2. Agent Roles

Workflow hướng 3 sử dụng các role logic:

- Planner;
- Test Designer;
- Backend Implementer;
- Frontend Implementer;
- Database/Prisma Implementer khi cần;
- AI Integration Implementer khi cần;
- Reviewer;
- Verification Agent.

Một agent có thể thực hiện nhiều role trong task nhỏ, nhưng review/verification cần giữ tư duy độc lập.

## 24.3. Vertical Slice

Implementation ưu tiên vertical slice:

```text
Requirement
  ↓
Database change nếu cần
  ↓
Backend/API
  ↓
Frontend
  ↓
Tests
  ↓
Review/Verification
```

Không xây toàn bộ DB → toàn bộ backend → toàn bộ frontend rồi mới integration.

## 24.4. Agent Boundary

Root `AGENTS.md` sẽ tham chiếu tài liệu này.

Subdirectory có thể có:

```text
apps/web/AGENTS.md
apps/api/AGENTS.md
ai/AGENTS.md
```

Các file con không được ghi đè baseline/architecture ở root; chúng chỉ cụ thể hóa quy tắc theo khu vực.

---

# 25. Development Workflow

## 25.1. Feature Workflow

```text
Baseline trace
    ↓
Implementation plan
    ↓
Test cases / acceptance mapping
    ↓
Implementation
    ↓
Code review
    ↓
Integration/E2E verification
    ↓
Human review
```

## 25.2. Git Strategy

Không code trực tiếp trên `main` cho feature implementation.

Branch gợi ý:

```text
feat/auth-login
feat/student-dashboard
feat/student-study-plan
feat/teacher-analysis
feat/admin-feedback-analysis
fix/context-idempotency
```

Task đủ lớn có thể dùng Git worktree để agent làm việc cô lập.

## 25.3. Commit Strategy

Commit theo mục đích:

```text
feat(api): add student task endpoints
test(api): cover study task ownership
feat(web): implement study task screen
fix(api): preserve plan state transactionally
```

Tránh commit message không mô tả nội dung như `update`, `final`, `fix things`.

---

# 26. Deployment Position

## 26.1. Chưa khóa deployment provider

SRS v1.7 / CP-005 khóa AI Runtime Local GPU cho development/demo; các hosting provider khác vẫn chưa được chọn cho:

- Next.js;
- NestJS;
- PostgreSQL.

Tài liệu v1.0 không tự chọn provider production/demo cụ thể.

## 26.2. Constraint cho deployment sau này

Provider được chọn phải hỗ trợ:

- Next.js;
- NestJS process;
- PostgreSQL connection;
- environment secrets;
- HTTPS;
- timeout phù hợp AI orchestration;
- frontend → backend CORS/networking;
- backend Linux → Tailscale Serve HTTPS; backend Windows → WSL loopback.

Việc chọn provider là downstream deployment decision và có thể tạo ADR riêng.

---

# 27. Technology Decisions Summary

| ID | Decision | Status |
|---|---|---|
| ARCH-DD-001 | Dùng modular monolith, không microservices cho MVP | Chốt v1.0 |
| ARCH-DD-002 | Dùng monorepo pnpm workspace | Chốt v1.0 |
| ARCH-DD-003 | Dùng Turborepo cho task orchestration | Chốt v1.0 |
| ARCH-DD-004 | Dùng Prisma ORM giữa NestJS và PostgreSQL | Chốt v1.0 |
| ARCH-DD-005 | Dùng Tailwind CSS để hiện thực Design System | Chốt v1.0 |
| ARCH-DD-006 | Dùng TanStack Query cho frontend server-state | Chốt v1.0 |
| ARCH-DD-007 | Dùng React Hook Form cho form state | Chốt v1.0 |
| ARCH-DD-008 | Dùng `class-validator`/`class-transformer` cho HTTP DTO | Chốt v1.0 |
| ARCH-DD-009 | Dùng PostgreSQL-backed technical context; không thêm Redis | Chốt v1.0 |
| ARCH-DD-010 | Dùng Jest backend, Vitest frontend, Playwright E2E | Chốt v1.0 |
| ARCH-DD-011 | Không thêm global frontend state library mặc định | Chốt v1.0 |
| ARCH-DD-012 | Không khóa deployment provider ở v1.0 | Chốt v1.0 |
| ARCH-DD-013 | Dependency version cụ thể được pin bằng lockfile khi bootstrap | Chốt v1.0 |
| ARCH-DD-014 | AI endpoint URL/secret chỉ qua backend environment | Baseline-derived / Chốt triển khai |
| ARCH-DD-015 | Bearer access token được hiện thực bằng JWT trong NestJS | Chốt v1.0 |
| ARCH-DD-016 | Browser-side Next.js gọi trực tiếp NestJS REST API; không dùng BFF mặc định | Chốt Rev.1 |
| ARCH-DD-017 | Node.js LTS là runtime; exact runtime/package versions được pin khi bootstrap | Chốt Rev.1 |
| ARCH-DD-018 | Không giữ database transaction mở khi chờ AI/external network | Chốt Rev.1 |
| ARCH-DD-019 | TemporaryContext claim + mutation + consume + replay metadata phải atomic | Chốt Rev.1 |
| ARCH-DD-020 | Swagger/OpenAPI development setup và startup env validation là bắt buộc | Chốt Rev.1 |
| ARCH-DD-021 | Frozen baseline trong repo là read-only với implementation agents và nên có integrity check | Chốt Rev.1 |
| ARCH-DD-022 | Access token JWT lưu trong browser `sessionStorage`; protected business fetch thực hiện client-side | Chốt Rev.2 |
| ARCH-DD-023 | MVP không thêm refresh-token endpoint/token blacklist/multi-session management ngoài API baseline | Chốt Rev.2 |
| ARCH-DD-024 | Non-AI API có query/index/performance-verification direction để hướng tới NFR-PERF-001 | Chốt Rev.2 |
| ARCH-DD-025 | TemporaryContext cleanup dùng `retentionUntil`, bảo toàn replay mapping theo API-DD-002 | Chốt Rev.2 |
| ARCH-DD-026 | Repository dùng `BASELINE_MANIFEST.sha256` để bảo vệ baseline R3 và các downstream frozen artifacts không nằm trong Freeze Record requirements/use-case | Chốt Rev.2 |

---

# 28. Traceability Matrix — Architecture to Baseline

| Architecture topic | Baseline anchor chính |
|---|---|
| Next.js frontend | SRS CON-01, Operating Environment |
| NestJS backend | SRS CON-02, Operating Environment |
| PostgreSQL | SRS CON-03 |
| Local GPU / WSL2 + Tailscale Serve | SRS v1.7 CON-04, AI-REQ-020..022 |
| Frontend không DB direct | SRS CON-05 |
| Frontend không AI direct | SRS CON-06 |
| NestJS làm AI intermediary | SRS CON-07, AI-REQ-004 |
| AI không truy cập DB | SRS CON-08, AI-REQ-003, BR-011 |
| Backend tính metric | SRS CON-09, BR-004/009, NFR-PERF-002 |
| Structured AI output | SRS CON-10, AI-REQ-009/010 |
| Human confirmation | SRS CON-11, AI-REQ-011..014 |
| Security | NFR-SEC-001..009 |
| Reliability/transaction | NFR-REL-001..003 + relevant BR/API contract |
| UTC/ISO 8601 | DATA-REQ-003 / BR-031 / API Spec |
| Temporary context | DATA-REQ-015 / BR-044 / API-DD-002 |
| Idempotent replay | API-DD-002 |
| AI timeout | NFR-PERF-004 / API-DD-003 |
| Design System | Global UI Design System — Editorial Tech |
| UI loading/error distinction | Wireframe global states + NFR-PERF-003 |
| Module/responsibility separation | NFR-MNT-001, NFR-MNT-004 |
| Business logic outside AI prompt | NFR-MNT-002 |
| Configurable AI endpoint | NFR-MNT-003, AI-INT-006/007 |
| Application/AI logging | NFR-LOG-001..004, AI-REQ-018/019 |
| Database transaction atomicity | DB-REQ-002, NFR-REL-002, API-DD-002 |
| Non-AI API performance | NFR-PERF-001/002 + API pagination contract |
| Browser token handling | API-DD-001, FR-COM-002, NFR-SEC-002/005/009 |
| Temporary-context retention | API-DD-002 |
| Baseline integrity | Freeze Record R3 + Governance Index v1.2 |

---

# 29. Technical Decisions Not Requiring Change Request

Các thay đổi sau thông thường chỉ cần Architecture/ADR review nếu không làm đổi observable behavior/API contract:

- thay ORM implementation nhưng giữ semantics/data integrity;
- đổi frontend form library;
- đổi query/cache library;
- đổi lint/format tooling;
- đổi CI provider;
- đổi local Docker setup;
- đổi AI model sau benchmark nếu contract/behavior vẫn giữ;
- đổi deployment provider;
- tối ưu query/index;
- refactor module/file structure.

Với tài liệu frozen, không sửa trực tiếp bản cũ; nếu cần cập nhật artifact kiến trúc thì phát hành revision/version mới.

---

# 30. Changes Requiring Upstream Review / Change Control

Phải đánh giá change control nếu đề xuất làm thay đổi ví dụ:

- thêm role;
- thêm Use Case actor-facing;
- thay business rule;
- thay state transition;
- thay quyền truy cập;
- frontend gọi AI trực tiếp;
- AI được mutation database;
- thay Admin two-stage inference thành behavior khác;
- thay history read-only thành editable/rerun;
- thay REST API contract đã freeze theo cách observable;
- thêm behavior ngoài MVP như chatbot/RAG;
- bỏ human confirmation cho plan/adjustment;
- thay semantics AIRequestLog.

---

# 31. Open Technical Items

Các điểm sau được cố ý **không khóa** trong v1.0 vì baseline không yêu cầu và chưa cần cho bootstrap:

| ID | Item | Hướng xử lý |
|---|---|---|
| OPEN-ARCH-001 | Exact JWT expiry, signing algorithm/key strategy và minimal claims | Chốt trong Auth ADR; không tạo refresh-token API/blacklist ngoài baseline |
| OPEN-ARCH-002 | Exact DB ID strategy (UUID/CUID/other opaque ID) | Chốt trong Database Design |
| OPEN-ARCH-003 | Exact AI model | Benchmark theo AI-REQ-020 |
| OPEN-ARCH-004 | Detailed AI structured schemas/prompts | **CLOSED by AI Contract v1.0 Baseline Final** |
| OPEN-ARCH-005 | Deployment provider | Deployment ADR khi chuẩn bị demo deploy |
| OPEN-ARCH-006 | Exact temporary-context atomic-claim primitive | Context module design + concurrency integration test |
| OPEN-ARCH-007 | OpenAPI codegen vs manually maintained shared transport types | Chốt khi bootstrap API client workflow |
| OPEN-ARCH-008 | Exact AI structured-output schema validator | **CLOSED: JSON Schema Draft 2020-12 + Ajv 8/Ajv2020** |
| FOLLOWUP-GOV-001 | Version/freeze governance cho Global UI Design System | Governance follow-up độc lập; không chặn Architecture v1.1 Baseline |

Không agent nào được tự biến open item thành business behavior mới.

---

# 32. Repository Bootstrap Acceptance Checklist

Khi bootstrap project theo tài liệu này, tối thiểu phải đạt:

- [ ] Node.js LTS runtime được pin bằng `.nvmrc` hoặc `.node-version`;
- [ ] root `package.json` khai báo `engines.node` và `packageManager`;
- [ ] pnpm workspace hoạt động;
- [ ] Turborepo root tasks hoạt động;
- [ ] `apps/web` là Next.js + TypeScript;
- [ ] `apps/api` là NestJS + TypeScript;
- [ ] PostgreSQL development instance kết nối được;
- [ ] Prisma schema/migration workflow hoạt động;
- [ ] root lint/typecheck/test/build scripts tồn tại;
- [ ] Tailwind map đúng design tokens cốt lõi;
- [ ] TanStack Query provider/data layer skeleton tồn tại;
- [ ] React Hook Form có pattern dùng chung;
- [ ] NestJS global validation được cấu hình;
- [ ] Config module validate env cơ bản;
- [ ] `.env.example` tồn tại, không commit secret;
- [ ] frontend đọc `NEXT_PUBLIC_API_BASE_URL` từ environment;
- [ ] auth API client đọc JWT từ `sessionStorage` và gắn Bearer header cho protected request;
- [ ] logout clear token + user state + query cache;
- [ ] không có refresh-token endpoint/blacklist ngoài API baseline;
- [ ] AI base URL đọc từ env, không hard-code;
- [ ] Swagger/OpenAPI development setup tồn tại;
- [ ] test database tách khỏi development database;
- [ ] `AGENTS.md` tham chiếu baseline + tài liệu kiến trúc này;
- [ ] `docs/baseline` được đánh dấu read-only trong agent instructions;
- [ ] `docs/baseline/BASELINE_MANIFEST.sha256` tồn tại cho các artifact immutable đã được approve;
- [ ] `pnpm verify:baseline` fail khi hash/missing file không khớp và không auto-rewrite manifest;
- [ ] có pattern/query guidance để tránh N+1 và giữ pagination theo API baseline;
- [ ] có chỗ chạy performance smoke test cho non-AI API khi seed dataset sẵn sàng;
- [ ] không có product feature ngoài bootstrap được tự thêm.

---

# 33. Review Checklist của tài liệu

- [x] Không thay đổi 27 Use Case baseline.
- [x] Không tạo requirement/business rule mới.
- [x] Giữ Next.js/NestJS/PostgreSQL; dùng Local GPU/WSL2 theo SRS v1.7/CP-005 cho development/demo.
- [x] Prisma được định nghĩa là implementation decision, không phải upstream requirement.
- [x] Không cho frontend truy cập DB/AI trực tiếp.
- [x] AI vẫn là supporting component không có mutation authority.
- [x] Backend vẫn là nguồn metric/business validation chính xác.
- [x] Giữ human-in-the-loop.
- [x] Giữ API Specification là contract authority.
- [x] Temporary context storage cụ thể hóa đúng semantics API, không tạo business entity mới.
- [x] Không thêm Redis/queue/microservices không cần thiết.
- [x] Tách system data và AI output ở frontend.
- [x] Giữ Design System Editorial Tech.
- [x] Có test/quality-gate direction phù hợp implementation.
- [x] Có open-item registry để Codex không tự suy đoán các điểm chưa khóa.
- [x] Request topology browser-side Next.js → NestJS được chốt rõ.
- [x] TemporaryContext atomic transaction boundary được khóa đủ để tránh crash/replay window.
- [x] Không giữ database transaction mở trong lúc chờ external AI/network.
- [x] Toolchain runtime/version policy đủ để bootstrap reproducible.
- [x] AI structured-output validation không bị đồng nhất với JSON parse/HTTP DTO validation.
- [x] End-to-end timeout rule bao phủ Admin, Teacher và client/proxy layer.
- [x] Frozen baseline có repo-governance read-only/integrity direction.
- [x] Token storage/topology đã khép kín cho MVP direct-browser architecture.
- [x] Không bổ sung refresh-token API/blacklist ngoài API baseline.
- [x] Có architecture direction cho NFR-PERF-001 non-AI API.
- [x] TemporaryContext cleanup bảo toàn replay mapping bằng `retentionUntil`.
- [x] Repo-level baseline manifest bao phủ baseline R3 và các downstream frozen artifacts được release ngoài Freeze Record requirements/use-case.
- [x] UI Design System governance được ghi rõ là prerequisite trước Architecture Baseline.
- [x] Logging wording đồng bộ NFR-LOG-001.

---

# 34. Baseline Release Record

**Kết quả review:** `9.4/10` — APPROVED FOR BASELINE.

Điều kiện phát hành đã đạt:

- [x] Không còn BLOCKER/MAJOR technical finding.
- [x] Technology stack và implementation boundaries đã được chốt ở mức đủ cho downstream design.
- [x] Auth topology/token storage, transaction/context semantics, AI timeout và performance direction đã nhất quán.
- [x] Repo-level baseline manifest strategy đã được định nghĩa.
- [x] Architecture không tự tuyên bố Design System đã frozen.
- [x] Design System governance được tách thành follow-up độc lập và không được phép ghi đè upstream/UI behavior baseline.
- [x] Metadata/status của Architecture hiện hành được phát hành thành `v1.1 Baseline`.

Sau khi repository được bootstrap, hash của file Architecture baseline này phải được thêm vào repo-level `docs/baseline/BASELINE_MANIFEST.sha256`.

`FOLLOWUP-GOV-001` vẫn cần xử lý khi chuẩn hóa governance cho Design System, nhưng không làm mất hiệu lực của Architecture v1.1 Baseline và không cần Change Request nghiệp vụ nếu chỉ thay đổi versioning/governance.

---

# 35. Handoff tiếp theo

Sau khi Architecture v1.1 Baseline được phát hành, các bước phù hợp là:

1. tạo ADR cho các technical decision cần giải thích độc lập, ưu tiên Auth ADR;
2. phát triển `Database_Design_and_Prisma_Schema_v1.0.md`;
3. phát triển AI Contract;
4. phát triển Test Strategy;
5. tạo root `AGENTS.md` và subdirectory `AGENTS.md`;
6. tạo Codex multi-agent config;
7. viết Superpowers implementation plan cho **Phase 0 — Repository Bootstrap**;
8. bootstrap repository và tạo repo-level baseline manifest;
9. thêm hash của Architecture v1.1 Baseline vào `BASELINE_MANIFEST.sha256`;
10. verify lint/typecheck/test/build trước feature đầu tiên;
11. xử lý `FOLLOWUP-GOV-001` cho Global UI Design System như governance follow-up độc lập.

Không bắt đầu implement toàn bộ product từ một prompt lớn.

---

# 36. Revision History

| Version | Date | Status | Nội dung |
|---|---|---|---|
| 1.0 Draft | 24/10/2026 | Draft for Review | Khởi tạo System Architecture & Technology Stack từ frozen baseline; chốt modular monolith, pnpm/Turborepo monorepo, Prisma ORM, Tailwind, TanStack Query, React Hook Form, validation/testing stack và PostgreSQL-backed temporary context. |
| 1.0 Draft Rev.1 | 24/10/2026 | Draft for Review | Architecture hardening sau review: chốt direct browser→NestJS topology, Node.js/runtime pinning, atomic TemporaryContext transaction boundary, no-network-inside-DB-transaction rule, end-to-end AI timeout, AI schema-validation open item, env/OpenAPI requirements, baseline read-only/integrity governance và traceability maintainability/logging. |
| 1.0 Draft Rev.2 | 24/10/2026 | Draft for Review | Khép kín auth topology bằng `sessionStorage` + client-side protected fetch; cấm tự thêm refresh-token flow; bổ sung non-AI performance architecture; khóa `retentionUntil` cho TemporaryContext cleanup; bổ sung repo-level baseline manifest cho downstream frozen artifact; làm rõ UI Design System governance prerequisite; siết logging wording và Auth ADR scope. |
| 1.0 Draft Rev.3 | 24/10/2026 | Pre-Baseline Candidate | Pre-baseline cleanup: chuẩn hóa numbering tuần tự; làm rõ `sessionStorage` theo browser tab; ghi nhận Design System governance là vấn đề còn lại cần quyết định trước release; không thay đổi technology stack, API contract hoặc observable business behavior. |
| 1.0 Baseline | 24/10/2026 | APPROVED | Phát hành chính thức sau pre-baseline review đạt 9.4/10; không còn BLOCKER/MAJOR technical finding. Architecture baseline hóa độc lập với Design System; Design System governance được chuyển thành `FOLLOWUP-GOV-001`, không làm thay đổi technology stack, API contract hoặc observable business behavior. |
| 1.1 Baseline | 26/10/2026 | APPROVED | CR-002/R3 sync: capacity-profile architecture, `AI_INPUT_TOO_LARGE`/`AI_RUNTIME_FAILURE`, runtime technical failure boundary; đóng OPEN-ARCH-004/008 bằng AI Contract v1.0; giữ OPEN-ARCH-003 cho benchmark |

---

# 37. Kết luận

Kiến trúc MVP được chốt theo hướng thực dụng:

```text
Next.js + TypeScript + Tailwind (browser)
          ↓ REST + Bearer JWT from sessionStorage
NestJS + TypeScript
    ├── Prisma → PostgreSQL
    └── HTTP → Self-managed AI Runtime / Windows 11 + WSL2 GPU; Linux peer via Tailscale Serve
```

Monorepo sử dụng:

```text
pnpm workspace + Turborepo
```

Nguyên tắc cốt lõi:

```text
Frozen business baseline
        ↓
Backend-controlled business logic
        ↓
AI hỗ trợ qua boundary rõ ràng
        ↓
User quyết định tại các điểm human-in-the-loop
        ↓
Transaction + validated persistence
        ↓
Review + verification trước khi coi task hoàn thành
```

Tài liệu này đóng vai trò cầu nối từ **“hệ thống phải làm gì”** sang **“source code sẽ được tổ chức và triển khai như thế nào”**, nhưng không có quyền tự thay đổi requirement đã freeze.

**Trạng thái phát hành:** `System_Architecture_and_Technology_Stack_v1.1_baseline.md` là Architecture & Technology Baseline chính thức cho implementation downstream của MVP.
