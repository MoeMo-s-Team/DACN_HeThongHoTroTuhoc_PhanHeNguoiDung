## File: `docs/proposals/change-requests/README.md`

# Change Proposals

Thư mục này chứa các đề xuất có khả năng **thay đổi frozen/observable behavior** của hệ thống.

Đây là khu vực đề xuất và review, không phải nơi lưu Change Request đã được phê duyệt.

## Khi sử dụng

Tạo Change Proposal khi task có thể yêu cầu thay đổi:

- requirement hoặc scope;
- actor/role;
- Use Case;
- permission hoặc authorization behavior;
- business rule;
- validation/threshold có ý nghĩa nghiệp vụ;
- state transition;
- frozen REST API contract;
- observable UI behavior;
- AI business behavior;
- human-in-the-loop requirement;
- lịch sử/read-only semantics;
- chức năng ngoài MVP hiện tại.

Nếu thay đổi chỉ là implementation detail và giữ nguyên behavior/API, sử dụng `docs/proposals/technical/`.

## Quy tắc cho Codex

Khi phát hiện conflict với frozen baseline, Codex phải:

1. dừng phần implementation gây conflict;
2. không sửa frozen baseline;
3. không tự diễn giải requirement theo hướng mới;
4. xác định các `UC-*`, `FR-*`, `BR-*`, API hoặc Screen bị ảnh hưởng;
5. tạo Change Proposal từ `TEMPLATE.md`;
6. báo cho người dùng rằng cần human review trước khi tiếp tục phần bị ảnh hưởng.

Codex được phép phân tích và đề xuất nhưng không được:

- tự approve proposal;
- tự chuyển proposal thành Change Request chính thức;
- tự phát hành revision baseline;
- tiếp tục code behavior mới khi proposal chưa được duyệt.

Proposal mới luôn có:

`Status: DRAFT`

## Đặt tên

```text
CP-001-short-description.md
CP-002-short-description.md
```

Dùng prefix `CP` để phân biệt với Change Request chính thức `CR-*`.

Nếu proposal được chấp thuận, người có thẩm quyền quyết định việc tạo `CR-*`, phát hành revision/version mới và cập nhật governance/baseline liên quan.

---

## File: `docs/proposals/change-requests/TEMPLATE.md`

# CP-XXX — <Change Proposal Title>

**Status:** DRAFT  
**Created:** YYYY-MM-DD  
**Author:** Codex / Human  
**Trigger:** <task/request/conflict>

## 1. Summary

Mô tả ngắn thay đổi đang được đề xuất.

## 2. Reason for Proposal

Chọn nguyên nhân phù hợp:

- [ ] Requested behavior không tồn tại trong baseline.
- [ ] Implementation phát hiện conflict giữa requirement và nhu cầu mới.
- [ ] Existing baseline behavior cần thay đổi.
- [ ] API/UI/AI behavior cần thay đổi.
- [ ] Khác: ...

Giải thích:

...

## 3. Affected Baseline

Liệt kê chính xác các artifact/ID bị ảnh hưởng.

| Type          | Reference             | Current meaning |
| ------------- | --------------------- | --------------- |
| Use Case      | `UC-*`                |                 |
| Requirement   | `FR-*` / other        |                 |
| Business Rule | `BR-*`                |                 |
| API           | endpoint / `API-DD-*` |                 |
| Screen        | Screen ID / route     |                 |
| AI            | `AI-REQ-*` / contract |                 |
| Architecture  | `ARCH-DD-*`           |                 |

Xóa các dòng không liên quan hoặc ghi `N/A`.

## 4. Current Baseline Behavior

Mô tả behavior hiện đang được frozen quy định.

Không mô tả implementation hiện tại như source of truth nếu nó khác baseline.

## 5. Proposed Behavior

Mô tả chính xác behavior mới được đề xuất.

Nêu rõ user/system sẽ quan sát thấy điều gì thay đổi.

## 6. Why Existing Baseline Cannot Satisfy the Request

Giải thích vì sao không thể giải quyết chỉ bằng:

- refactor;
- implementation detail;
- ADR;
- UI-only adjustment;
- internal optimization.

## 7. Impact Analysis

### Requirements / Use Cases

- ...

### Business Rules

- ...

### API

- ...

### UI / Wireframe

- ...

### Database

- ...

### AI

- ...

### Tests

- ...

### Existing Documentation

- ...

## 8. Risks

Các rủi ro nếu chấp thuận:

- ...
- ...

Các rủi ro nếu không chấp thuận:

- ...
- ...

## 9. Proposed Downstream Updates

Nếu được duyệt, liệt kê các artifact có thể cần revision:

- [ ] SRS
- [ ] Business Rules
- [ ] Use Case Diagram
- [ ] Use Case Specification
- [ ] Activity Diagram
- [ ] API Specification
- [ ] UI Sitemap
- [ ] Wireframe Specification
- [ ] Architecture
- [ ] AI Contract
- [ ] Database Design
- [ ] Test artifacts
- [ ] Khác: ...

Danh sách này chỉ là impact analysis; proposal không tự sửa các artifact trên.

## 10. Implementation Hold

**Affected implementation status:** BLOCKED PENDING HUMAN REVIEW

Không implement behavior mới thuộc proposal này cho đến khi có quyết định rõ ràng.

Các phần task không phụ thuộc vào thay đổi này vẫn có thể tiếp tục nếu không làm sai baseline.

## 11. Decision

**Decision:** PENDING HUMAN REVIEW

**Reviewer:**  
**Decision Date:**  
**Notes:**

Codex không được tự điền `APPROVED` hoặc tự tạo `CR-*` từ proposal này.
