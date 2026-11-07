# Phase 2A — Local Database Verification (2026-11-07)

## Kết luận

**Database development đã sẵn sàng làm nền cho tích hợp AI.** PostgreSQL chạy local trên `127.0.0.1:5433`; Prisma kết nối đúng DB `dacn`; migration hiện hành đã áp dụng; seed thành công; các bài API integration cho Assessment, StudyPlan/StudyTask và Feedback pass; toàn bộ E2E pass trên database E2E sạch.

Kết luận này chỉ xác nhận PostgreSQL/Prisma và luồng API hiện có. Nó **không** xác nhận AI Gateway/runtime, schema AI, capacity preflight hay bất kỳ chức năng AI nào đã sẵn sàng.

## Cấu hình và cách ly môi trường

- `docker-compose.yml:4-17` chạy `postgres:16-alpine`, bind cổng host vào loopback `127.0.0.1:5433`, có healthcheck và named volume riêng theo project. Service báo `healthy` sau khi khởi động.
- Cấu hình hiệu lực đã được kiểm tra theo identity đã che credential: `DATABASE_URL` → `localhost:5433/dacn?schema=public`; `TEST_DATABASE_URL` → `localhost:5433/dacn_test?schema=public`. Username kết nối là `dacn`; không in password.
- PostgreSQL trả về `current_database=dacn`, `current_user=dacn`. Volume có Compose labels khớp đúng project DACN. Không có dấu hiệu kết nối tới host/database production.
- `apps/api/prisma/test-database-url.ts:11-20` từ chối integration test nếu DB test trùng DB development. E2E config và `apps/api/scripts/prepare-e2e.ts:4-16` cũng chuyển API/test setup sang `TEST_DATABASE_URL`.
- Người dùng đã cho phép chạy integration/E2E trên DB test đã xác minh và sau đó cho phép tạo DB E2E sạch. Không chạy `migrate reset`, không xóa volume hoặc database.

## Prisma, migration và seed

- Prisma đọc `apps/api/prisma/schema.prisma` qua `apps/api/prisma.config.ts:7-10`; migration duy nhất là `20261026000000_init`.
- Migration chỉ tạo schema, enum, bảng, index, constraint; không có `DROP`, `TRUNCATE` hay `DELETE`.
- `prisma migrate status` trên development DB `dacn`: **PASS — 1 migration found, database schema is up to date**. Không có migration mới cần áp dụng.
- `pnpm --filter @dacn/api db:seed` trên `dacn`: **PASS**. Seed preflight/transaction ở `apps/api/prisma/seed.ts:240-323,442-467` dùng kiểm tra xung đột trước, rồi `createMany(skipDuplicates)`; không xóa dữ liệu.
- Sau seed, development DB có 14 users, 127 AssessmentResult, 9 StudyPlan, 28 StudyTask và 8 Feedback. Student One có 6 AssessmentResult và 1 StudyPlan hiện tại. Tổng số row trước và sau seed không đổi.
- `dacn_test` đã có migration và chứa dữ liệu test cũ: 5 users, 4 assessments, 2 plans, 3 tasks, 5 feedback. Seed hiện tại từ chối ghi đè an toàn vì ba AssessmentResult IDs `50000000-…-001` đến `…-003` gắn sai Topic so với định nghĩa seed (`apps/api/prisma/seed.ts:86-93`; kiểm tra ở `:266-269`). Các row đó được giữ nguyên.
- Để không xóa dữ liệu test cũ, đã tạo database local mới `dacn_phase2a_e2e`, xác minh ban đầu có 0 bảng, rồi E2E setup áp dụng migration và seed vào đó. Sau E2E còn 14 users, 127 assessments, 9 plans, 28 tasks và 5 feedback; fixture Admin riêng đã được dọn theo script.

## API và dữ liệu được xác minh

| Luồng | Bằng chứng | Kết quả |
|---|---|---|
| Assessment | `GET /api/v1/student/dashboard` và `/assessment-results` trong `apps/api/src/student/student-dashboard.controller.ts:22-53`; PostgreSQL integration tests kiểm tra đọc kết quả/phân loại và ràng buộc score. | Integration **PASS**; dữ liệu seed hiện diện. |
| StudyPlan / StudyTask | Seed có current plan và tasks; `GET /api/v1/student/study-tasks` và `PATCH .../:taskId/status` trong `apps/api/src/student/student-tasks.controller.ts:25-54`; integration xác minh transaction/status, E2E hoàn tất rồi mở lại task. | Integration **PASS**; E2E **PASS**. |
| Feedback | `POST /api/v1/feedback` tại `apps/api/src/feedback/feedback.controller.ts:19-36`; PostgreSQL integration test xác minh record được lưu và từ chối input/role sai. | Integration **PASS**. E2E form test chặn request bằng Playwright route mock, nên không dùng riêng nó làm bằng chứng persistence. |

## Kiểm thử

| Lệnh / thao tác | Trạng thái | Kết quả |
|---|---|---|
| `docker compose up -d --wait` | `PASS` | PostgreSQL started; healthcheck `healthy`. |
| `pnpm --filter @dacn/api exec prisma migrate status` | `PASS` | Development database `dacn`; schema up to date. |
| `pnpm --filter @dacn/api db:seed` | `PASS` | Development seed chạy thành công; số row chính giữ nguyên. |
| `pnpm test:integration` | `PASS` | Test DB được nhận diện là `dacn_test`; migration up to date; 7 suites / 52 tests passed. |
| `pnpm test:e2e` với cấu hình `TEST_DATABASE_URL=dacn_test` | `FAIL` | Dừng ở E2E prepare trước khi mở browser: seed báo `Seed preflight failed: an AssessmentResult ID belongs to another Student or Topic`. Lỗi được tái hiện từ dữ liệu seed cũ trong `dacn_test`; không có dòng nào bị xóa bởi bước seed. |
| E2E trên `dacn_phase2a_e2e` mới, qua one-off launcher đặt `TEST_DATABASE_URL` | `PASS` | Migration + seed thành công; Playwright 8/8 tests passed (auth, Student task, feedback UI, Admin, home). |
| `pnpm verify:baseline` | `PASS` | Tất cả 14 file trong baseline manifest báo `OK`. |

Cảnh báo không làm test fail: Node phát `DEP0190` do integration runner dùng `spawnSync` với `shell: true`; Next dev phát cảnh báo `NO_COLOR`/`FORCE_COLOR` và cross-origin request từ `127.0.0.1`.

## File thay đổi và dữ liệu

- File được tạo: `docs/proposals/technical/local-database-verification-2026-11-07.md`.
- Không sửa source code, test, Prisma schema/migration, Docker config, `.env`, baseline hay AI Contract.
- Database được khởi động và giữ chạy theo yêu cầu. Seed development đã chạy. Database `dacn_phase2a_e2e` được tạo riêng và giữ lại để có thể chạy lại E2E bằng cách đặt `TEST_DATABASE_URL` sang DB này.
- `dacn_test` không bị reset; integration tests chỉ dọn fixture IDs cố định của chính chúng. Không thao tác database production.

## Lỗi còn tồn tại / việc cần làm

1. Mặc định `TEST_DATABASE_URL` vẫn trỏ tới `dacn_test`, nơi seed preflight phát hiện fixture Assessment cũ không tương thích. Vì vậy `pnpm test:e2e` mặc định tiếp tục fail cho tới khi người vận hành chọn DB sạch hoặc cho phép dọn các fixture xung đột. Không tự xóa hoặc reset `dacn_test` trong Phase 2A.
2. Integration runner phát cảnh báo Node `DEP0190` vì `shell: true`; hiện chưa chặn test. Không sửa script vì không ảnh hưởng xác minh dữ liệu/API lần này.
3. E2E Feedback form hiện mock request POST; persistence đã được xác minh riêng bằng API integration test.

**Phase 2A: PASS có điều kiện về E2E test database mặc định.** Development DB, kết nối Prisma, migration, seed và PostgreSQL API integration đều PASS. E2E PASS trên DB sạch; DB test mặc định còn stale fixture. Database development sẵn sàng cho bước tích hợp AI ở tầng dữ liệu, nhưng bản thân AI integration chưa được thực hiện trong task này.
