# Hệ thống hỗ trợ tự học ứng dụng AI

MVP hỗ trợ quá trình tự học bằng dữ liệu học tập và AI. Backend NestJS là ranh giới API, nghiệp vụ và PostgreSQL; AI runtime dự kiến tự quản lý riêng. Repository hiện ở **Phase 0 — Bootstrap**, chưa có business feature hoặc AI feature.

## Tech stack

- pnpm 10.12.1 + Turborepo
- Web: Next.js, TypeScript, Tailwind CSS, TanStack Query, React Hook Form
- API: NestJS, TypeScript, Prisma
- Database: PostgreSQL 16 (Docker Compose)
- Tests: Jest, Vitest/Testing Library, Playwright

## Yêu cầu môi trường

- Node.js `>=24.18.0 <25`
- Corepack và pnpm 10.12.1
- Docker Engine và Docker Compose

## Cấu trúc repository

```text
apps/web/       Next.js frontend
apps/api/       NestJS API, Prisma schema/migrations/seed
packages/contracts/  OpenAPI-generated TypeScript transport types
docker/         PostgreSQL initialization scripts
docs/baseline/  Tài liệu baseline đóng băng và manifest kiểm tra
ai/             Quy tắc cho AI runtime; chưa có AI feature
```

## Cài đặt và cấu hình

Cần pnpm `10.12.1`. Nếu máy chưa có đúng phiên bản, có thể dùng Corepack để kích hoạt:

```bash
corepack enable
corepack prepare pnpm@10.12.1 --activate
```

Cài dependencies và tạo file cấu hình local:

```bash
pnpm install
cp .env.example .env
```

Điều chỉnh `.env` nếu cần. Các biến chính:


| Biến                       | Mặc định                       | Dùng cho                  |
| -------------------------- | ------------------------------ | ------------------------- |
| `POSTGRES_USER`            | `dacn`                         | PostgreSQL                |
| `POSTGRES_PASSWORD`        | `dacn_dev_password`            | Mật khẩu local PostgreSQL |
| `POSTGRES_DB`              | `dacn`                         | Database phát triển       |
| `POSTGRES_PORT`            | `5433`                         | Port PostgreSQL trên host |
| `DATABASE_URL`             | `localhost:5433/dacn`          | Prisma/API                |
| `TEST_DATABASE_URL`        | `localhost:5433/dacn_test`     | Integration tests         |
| `API_PORT`                 | `3101`                         | NestJS                    |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3101/api/v1` | Web → API                 |
| `SEED_PASSWORD`            | local-only value               | Tài khoản seed            |


`JWT_ACCESS_SECRET` để trống trong `.env.example`; Phase 0 chưa triển khai xác thực. Không dùng giá trị mẫu cho môi trường chia sẻ hoặc production.

## PostgreSQL, migration và seed

PostgreSQL chạy trong Docker Compose; Web và API chạy trực tiếp trên máy dev.

```bash
pnpm db:up
docker compose ps       # đợi trạng thái healthy
pnpm db:migrate
pnpm db:seed
```

Compose publish PostgreSQL trên `127.0.0.1:5433` (mặc định), dùng named volume `postgres_data`. Nếu port 5433 đã bận, đổi `POSTGRES_PORT` trong `.env` và cập nhật port tương ứng trong `DATABASE_URL` và `TEST_DATABASE_URL`.

```bash
pnpm db:down            # dừng container, giữ volume dữ liệu
```

## Chạy ứng dụng

```bash
pnpm dev
```

- Web: [http://localhost:3100](http://localhost:3100)
- API base: [http://localhost:3101/api/v1](http://localhost:3101/api/v1)
- Health check: [http://localhost:3101/api/v1/health](http://localhost:3101/api/v1/health)
- Swagger (khi bật trong môi trường không phải production): [http://localhost:3101/api/v1/docs](http://localhost:3101/api/v1/docs)

## Kiểm tra và build

## Shared API contracts

NestJS DTO and Swagger metadata produce the OpenAPI snapshot and the generated TypeScript transport types in `packages/contracts`. After changing an API DTO or Swagger metadata, run `pnpm contracts:generate` and review both generated files. Do not edit generated files manually. `pnpm contracts:check` regenerates into a temporary directory and fails if either committed artifact is stale; it checks generation drift, not conformance to the frozen API specification.

```bash
pnpm contracts:generate
pnpm contracts:check
pnpm lint
pnpm typecheck
pnpm test               # Jest API + Vitest Web
pnpm test:integration   # PostgreSQL test DB riêng
pnpm test:e2e           # Playwright
pnpm build
pnpm verify:baseline    # kiểm tra SHA-256 tài liệu baseline
```

Các tài liệu baseline trong `docs/baseline/` là nguồn yêu cầu đóng băng; không sửa trực tiếp. Thay đổi yêu cầu phải đi theo quy trình proposal tương ứng.



