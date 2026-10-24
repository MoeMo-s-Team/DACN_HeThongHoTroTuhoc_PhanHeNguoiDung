## File: `docs/proposals/technical/README.md`

# Technical Proposals

Thư mục này chứa các đề xuất kỹ thuật **không làm thay đổi observable business behavior hoặc frozen API contract**.

## Khi sử dụng

Tạo Technical Proposal khi cần quyết định hoặc đề xuất về:

- refactor cấu trúc code/module;
- lựa chọn hoặc thay đổi library/tooling;
- query/index optimization;
- internal implementation pattern;
- local development/tooling;
- test infrastructure;
- deployment/CI decision;
- technical implementation của một open architecture item;
- thay đổi kỹ thuật tương đương nhưng giữ nguyên behavior/API semantics.

Không sử dụng thư mục này để thay đổi:

- requirement;
- Use Case;
- role hoặc permission;
- business rule;
- state transition;
- frozen API contract;
- observable UI behavior;
- AI business behavior hoặc human-confirmation requirement.

Các trường hợp trên phải dùng `docs/proposals/change-requests/`.

## Quy tắc cho Codex

Codex được phép:

1. phát hiện một technical decision cần review;
2. tạo proposal mới từ `TEMPLATE.md`;
3. phân tích alternatives và impact;
4. đề xuất một phương án.

Codex không được:

- tự đánh dấu proposal là APPROVED;
- tự sửa frozen baseline dựa trên proposal;
- coi proposal chưa duyệt là architecture authority;
- mở rộng proposal thành business behavior mới.

Proposal mới luôn bắt đầu với:

`Status: DRAFT`

Chỉ người dùng/reviewer có thẩm quyền mới được chuyển trạng thái proposal hoặc tạo ADR chính thức.

## Đặt tên

```text
TP-001-short-description.md
TP-002-short-description.md
```

Tăng số thứ tự theo proposal hiện có.

Sau khi được duyệt, quyết định kỹ thuật ổn định có thể được ghi nhận thành ADR trong `docs/decisions/` nếu cần.

---

## File: `docs/proposals/technical/TEMPLATE.md`

# TP-XXX — <Technical Proposal Title>

**Status:** DRAFT  
**Created:** YYYY-MM-DD  
**Author:** Codex / Human  
**Related Task:** <task/issue/plan or N/A>

## 1. Context

Mô tả ngắn vấn đề kỹ thuật cần quyết định.

Nêu rõ vì sao implementation hiện tại cần proposal này.

## 2. Baseline / Architecture References

Liệt kê các nguồn liên quan nếu có:

- `UC-*`:
- `FR-*`:
- `BR-*`:
- API endpoint / `API-DD-*`:
- Screen ID:
- Architecture section / `ARCH-DD-*`:
- ADR liên quan:

Nếu mục nào không liên quan, ghi `N/A`.

## 3. Constraint

Proposal này phải giữ nguyên:

- observable business behavior;
- frozen API contract;
- authorization/business-rule semantics;
- Use Case và acceptance behavior hiện hành.

Nếu không thể giữ các điều kiện trên, dừng Technical Proposal và chuyển sang Change Proposal.

## 4. Problem

Mô tả vấn đề hiện tại và tác động kỹ thuật của nó.

## 5. Options Considered

### Option A — <name>

Mô tả ngắn.

**Ưu điểm**
- ...

**Nhược điểm**
- ...

### Option B — <name>

Mô tả ngắn.

**Ưu điểm**
- ...

**Nhược điểm**
- ...

## 6. Recommended Option

**Recommendation:** <Option A/B/...>

Lý do lựa chọn:

- ...
- ...

## 7. Implementation Impact

Các khu vực có thể bị ảnh hưởng:

- Frontend:
- Backend:
- Database:
- AI:
- Tests:
- Configuration/Deployment:

## 8. Verification Required

Nếu proposal được duyệt, cần kiểm tra tối thiểu:

- [ ] Frozen behavior/API không thay đổi.
- [ ] Relevant tests vẫn pass.
- [ ] Không tạo requirement/business rule mới.
- [ ] Architecture/ADR được cập nhật nếu cần.

## 9. Decision

**Decision:** PENDING HUMAN REVIEW

Không thay đổi phần này thành APPROVED nếu chưa có quyết định rõ ràng từ người review có thẩm quyền.