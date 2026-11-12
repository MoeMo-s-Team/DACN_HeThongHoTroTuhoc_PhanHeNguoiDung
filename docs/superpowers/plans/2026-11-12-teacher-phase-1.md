# Kế hoạch Triển khai Giai đoạn 1 — Phân hệ Giáo viên (Teacher)

> **Mục tiêu:** Hoàn thiện toàn bộ các luồng nghiệp vụ cốt lõi của Giáo viên (Teacher) trong Giai đoạn 1 (quản lý lớp học, dashboard lớp học, danh sách sinh viên, chi tiết sinh viên read-only, lịch sử phân tích đã lưu) mà không phụ thuộc vào live AI call.

---

## 1. Bản đồ Traceability (Baseline Mapping)

| Màn hình | Tên chức năng | Use Case | Yêu cầu nghiệp vụ | API Endpoint | Ràng buộc chính (Business Rules) | Trạng thái |
|---|---|---|---|---|---|---|
| `SCR-TEA-001` | Danh sách lớp | `UC-TEA-001` | `FR-TEA-001` | `GET /api/v1/teacher/classes` (`API-TEA-CLASS-001`) | **BR-002**: Chỉ xem lớp do chính giáo viên phụ trách (`teacherId` lấy từ JWT). | ✅ Đã hoàn thành |
| `SCR-TEA-002` | Tổng quan lớp / Dashboard | `UC-TEA-003` | `FR-TEA-003`<br>`FR-TEA-004` | `GET /api/v1/teacher/classes/{classId}/dashboard` (`API-TEA-DASH-001`) | **FR-TEA-004**: Backend tự động tính toán:<br>• Weak Topic (`score < 60`)<br>• Needs Attention (`score < 60` HOẶC `completion < 50%` HOẶC `overdue >= 2`)<br>• Progress Warning (`actualProgress < expectedProgress - 20%`). | ✅ Đã hoàn thành |
| `SCR-TEA-003` | Danh sách sinh viên | `UC-TEA-002` | `FR-TEA-002` | `GET /api/v1/teacher/classes/{classId}/students` (`API-TEA-STUDENT-001`) | **BR-018, BR-026**: Chỉ hiển thị sinh viên trong lớp được phân công. Metric thiếu phải trả về `null`. | ✅ Đã hoàn thành |
| `SCR-TEA-004` | Chi tiết sinh viên | `UC-TEA-002` | `FR-TEA-002` | `GET /api/v1/teacher/classes/{classId}/students/{studentId}` (`API-TEA-STUDENT-002`) | **BR-027, OD-38**: Chế độ **Read-only**. Không được sửa điểm, sửa StudyPlan, StudyTask hay goal của sinh viên. | ✅ Đã hoàn thành |
| `SCR-TEA-006` | Lịch sử phân tích AI | `UC-TEA-008` | `FR-TEA-008` | `GET /api/v1/teacher/classes/{classId}/analysis-reports`<br>`GET .../{classId}/analysis-reports/{reportId}` (`API-TEA-HISTORY-001/002`) | **BR-045, OD-45**: Chỉ đọc lại snapshot `inputSnapshot` và `analysisResult` đã lưu trong DB; không gọi AI, không tính toán lại số liệu live. | ✅ Đã hoàn thành |

---

## 2. Các thành phần đã triển khai

### ✅ Giai đoạn 1A: Backend NestJS (`apps/api/src/teacher/`)
1. **Module & Routing:**
   - Đã tạo `TeacherModule` và đăng ký trong `AppModule`.
   - `TeacherController` với tiền tố `/api/v1/teacher` được bảo vệ bằng `AuthGuard` + kiểm tra Role `TEACHER`.
2. **DTOs & OpenAPI Metadata:**
   - `teacher.dto.ts`: `TeacherClassesResponseDto`, `ClassDashboardResponseDto`, `ClassStudentsResponseDto`, `StudentDetailResponseDto`.
   - `teacher-history.dto.ts`: `TeacherHistoryResponseDto`, `TeacherHistoryDetailDto`.
3. **Logic nghiệp vụ & Phân quyền:**
   - `TeacherService`: Kiểm tra quyền sở hữu lớp theo BR-002, tính toán các quy tắc cảnh báo theo FR-TEA-004.
   - `TeacherHistoryService`: Truy xuất danh sách và chi tiết snapshot báo cáo đã lưu.
4. **Kiểm thử:**
   - Unit tests: `teacher.service.spec.ts` (9/9 tests pass).
   - Integration tests: `apps/api/test/teacher.integration-spec.ts`.
   - OpenAPI Contract tests: `apps/api/src/openapi.spec.ts`.

---

### ✅ Giai đoạn 1B: Đồng bộ Hợp đồng API (`packages/contracts`)
1. Đã cập nhật `scripts/contracts.mjs` với `shell: true` chạy trơn tru trên Windows.
2. `pnpm contracts:generate` đã cập nhật `openapi.json` và xuất `packages/contracts/src/generated/openapi.ts`.
3. `pnpm contracts:check` kiểm tra và xác nhận 100% up-to-date.

---

### ✅ Giai đoạn 1C: Frontend Next.js (`apps/web/app/giao-vien/`)
1. **Layout & Shell:**
   - `teacher-ui.tsx`: Các components, badge, skeleton, error handling theo Design System Editorial Tech.
   - `teacher-navigation.tsx`: Thanh điều hướng phân hệ Giáo viên.
   - `teacher-shell.tsx`: Shell bảo vệ vai trò TEACHER.
   - `class-navigation.tsx`: Menu tab chuyển đổi giữa Tổng quan, Danh sách sinh viên và Lịch sử phân tích.
2. **Các màn hình chức năng:**
   - `/giao-vien/lop-hoc`: Danh sách lớp học phụ trách (`SCR-TEA-001`).
   - `/giao-vien/lop-hoc/[classId]/tong-quan`: Dashboard lớp học & phân tích chủ đề yếu, sinh viên cần chú ý (`SCR-TEA-002`).
   - `/giao-vien/lop-hoc/[classId]/sinh-vien`: Danh sách sinh viên trong lớp (`SCR-TEA-003`).
   - `/giao-vien/lop-hoc/[classId]/sinh-vien/[studentId]`: Chi tiết sinh viên chế độ chỉ đọc (`SCR-TEA-004`).
   - `/giao-vien/lop-hoc/[classId]/lich-su-phan-tich`: Lịch sử báo cáo phân tích AI đã lưu (`SCR-TEA-006`).
3. **Kiểm thử giao diện:**
   - `teacher-ui.test.tsx` (7/7 tests pass).
   - E2E Playwright: `apps/web/e2e/teacher.spec.ts`.

---

## 3. Kết quả Kiểm tra Chất lượng (Quality Gates)
- [x] `pnpm contracts:check`: Passed
- [x] `pnpm typecheck`: 3/3 packages passed (`@dacn/api`, `@dacn/contracts`, `@dacn/web`)
- [x] `pnpm lint`: Passed (0 errors, 0 warnings)
- [x] `pnpm --filter @dacn/web test`: 97/97 passed
- [x] `pnpm --filter @dacn/api test apps/api/src/teacher/teacher.service.spec.ts`: 9/9 passed
- [x] `pnpm build`: Passed (Toàn bộ API và Next.js 15 SSR/Static build thành công)
