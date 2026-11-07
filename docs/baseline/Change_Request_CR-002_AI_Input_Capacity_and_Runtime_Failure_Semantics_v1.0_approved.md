# CHANGE REQUEST CR-002
## AI Input Capacity & Runtime Failure Semantics

**Phiên bản:** 1.0  
**Ngày:** 26/10/2026  
**Trạng thái:** APPROVED  
**Baseline nguồn trước thay đổi:** `DACN-REQ-UC-BL-2026-10-21-R2`  
**Baseline sau thay đổi:** `DACN-REQ-UC-BL-2026-10-26-R3`  
**Loại thay đổi:** Cross-cutting AI contract/error semantics; không thêm role hoặc Use Case actor-facing

---

# 1. Bối cảnh

AI Contract v1.0 cần một behavior công khai rõ ràng cho hai khoảng trống không thể giải quyết chỉ ở implementation:

1. authoritative AI input vượt context/capacity của model deployment dù dữ liệu nghiệp vụ vẫn hợp lệ;
2. runtime/provider/integration failure không thuộc connection/timeout/empty/invalid-output semantics hiện hữu.

Nếu không khóa upstream, implementation có thể tự truncate/chunk dữ liệu, map lỗi sai nghĩa hoặc làm lệch `AIRequestLog`.

# 2. Quyết định được phê duyệt

## XAI-001 — AI input capacity/public overflow behavior

Public error:

```text
HTTP 422
code = AI_INPUT_TOO_LARGE
```

Chỉ trigger khi capacity profile đã resolve/bind hợp lệ và toàn bộ authoritative input của external attempt bắt buộc vượt `validatedInputBudget(task)`. Backend dừng trước dispatch; không tạo `AIRequestLog`; không truncate, sample, page-limit, pre-summarize hoặc hidden chunking.

Admin Stage 1 success nhưng Stage 2 capacity fail: giữ đúng một SUCCESS log của Stage 1; không Stage 2 attempt/log; không `analysisRef`.

## XAI-002 — Runtime/provider/integration technical failure

Public error:

```text
HTTP 502
code = AI_RUNTIME_FAILURE
```

Áp dụng cho capacity-profile configuration mismatch trước dispatch và protocol/auth/inference/unclassified technical provider failure. Pre-dispatch mismatch không tạo `AIRequestLog`; post-dispatch failure tạo FAILED log với internal diagnostic phù hợp.

Các semantics cũ giữ nguyên: connection/unavailable → `AI_CONNECTION_FAILURE`; timeout → `AI_TIMEOUT`; empty body → `AI_EMPTY_RESPONSE`; output parse/schema/correlation invalid → `AI_INVALID_STRUCTURE`; required content thiếu → `AI_INCOMPLETE_DATA`.

# 3. Capacity profile governance

Capacity profile phải version/bind với tối thiểu `contractVersion + modelId + tokenizerId + task/promptVersion + context window + reserved output + prompt/schema overhead + safety margin`. Đổi model/tokenizer/prompt yêu cầu profile mới được benchmark/release và deploy đồng bộ.

# 4. Impact analysis

| Artifact | Action |
|---|---|
| SRS | v1.6 — public/error/capacity semantics |
| Business Rules | v1.4 Rev.1 — capacity/no-truncation/logging rules |
| Use Case Specification | v1.2 Rev.1 — cross-cutting alternate/error flow |
| Use Case Diagram | Không đổi — vẫn 27 UC |
| Activity Diagram | v1.3 — capacity preflight + Teacher one-attempt sync |
| API Specification | v1.5 — thêm `AI_INPUT_TOO_LARGE`, `AI_RUNTIME_FAILURE` |
| Wireframe/Screen Spec | v1.1 — UI states/messages |
| Architecture | v1.1 — capacity profile + runtime failure boundary |
| Database Design | Không đổi schema |
| AI Contract | v1.0 Baseline Final áp dụng CR-002 |

# 5. Không thay đổi

- không thêm role/Use Case;
- không đổi Human-in-the-loop;
- không cho AI truy cập PostgreSQL;
- không đổi Admin two-stage inference;
- không thêm queue/async job/RAG;
- không đặt static business maxLength/maxItems chỉ để né context limit;
- không đổi AIRequestLog thành log cho request chưa dispatch.

# 6. Approval

**Kết quả:** APPROVED. XAI-001 và XAI-002 trở thành normative behavior của baseline R3.
