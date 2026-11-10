# Experimental Evidence — Qwen2.5 1.5B / Ollama CPU / StudyPlan

**Ngày tổng hợp:** 07/11/2026  
**Status:** Exploratory evidence summary — không phải model certification, không phải official AI Contract pass  
**Nguồn:** Các ZIP thực tế do nhóm xuất từ `study_plan_ollama_benchmark`.

## 1. Thiết bị và giới hạn test

- Dell Latitude 5330; Intel Core i7-1265U, 10 cores/12 threads; RAM 16 GiB; Linux Mint 22.3; integrated Intel Iris Xe.
- AI model được báo cáo: Ollama tag `qwen2.5:1.5b`, CPU inference 100%; model artifact digest chưa pin trong benchmark evidence.
- Test trực tiếp Ollama (provisional schema), **không** chạy toàn bộ NestJS/Ajv/capacity profile/auth/AIRequestLog.
- Tác vụ đã thử: `STUDENT_STUDY_PLAN_GENERATION` בד. Các task khác không được CPU-certified bởi bộ test này.
- Giới hạn cho phép thử: 60s/attempt, `num_predict=900`, `num_ctx=4096`, temperature=0, seed=42 ở v3; benchmark sử dụng synthetic dataset, không có PII.

## 2. Kết quả 5 fixtures cho 3 prompt versions

| Fixture | v1 status/time | v2 status/time | v3 status/time |
|---|---|---|---|
| SP-01 — 4 Topic | PASS / 48.592s | FAIL / 60.075s | PASS / 26.875s |
| SP-02 — 10 Topic | FAIL timeout / 60.087s | FAIL timeout / 60.100s | FAIL JSON bị cắt / 57.659s |
| SP-03 — Ít thời gian | PASS / 59.917s | PASS / 33.158s | PASS / 38.730s |
| SP-04 — Deadline gần | PASS / 45.108s | PASS / 41.706s | PASS / 59.628s |
| SP-05 — Phần lớn GOOD | PASS / 41.948s | PASS / 25.600s | PASS / 40.438s |

- v1: 4/5 PASS; v2: 3/5 PASS; v3: 4/5 PASS **theo provisional technical validation**.
- v3 SP-02 dừng `doneReason=length`, outputTokenCount=900 và JSON chưa hoàn chỉnh (Unterminated string).
- Không thể suy luận model v3 đáng tin cậy hơn v1 trên mọi dataset chỉ vì tổng PASS tương đương; đây là số mẫu nhỏ và khác prompt.

## 3. Stability v3

| Fixture | Run | Status | Seconds | Output tokens |
|---|---|---|---:|---:|
| SP-01 | 1 | PASS | 42.550 | 713 |
| SP-01 | 2 | PASS | 49.754 | 713 |
| SP-01 | 3 | PASS | 51.396 | 713 |
| SP-02 | 1 | FAIL (timeout) | 60.086 | N/A |
| SP-02 | 2 | FAIL (timeout) | 60.077 | N/A |
| SP-02 | 3 | FAIL (timeout) | 60.083 | N/A |

**Kết luận trọng tâm:** SP-02 10 Topic thất bại ở **4/4** lượt v3 (1 output length + 3 timeout). SP-01 4 Topic PASS 4/4 lượt v3, nhưng không chứng minh quality/capacity với input dài.

## 4. Diagnostic streaming SP-01/SP-02

| Metric | SP-01 reference | SP-02 |
|---|---:|---:|
| Time to first text | 3.668s | 16.236s |
| Total wall | 26.766s | 60.008s timeout |
| Prompt eval duration | 3.623s | Không có (chưa nhận final metadata) |
| Decode duration | 23.092s | Không có (chưa nhận final metadata) |
| Output tokens | 437 | Không có (chưa nhận final metadata) |
| Received text fragments | 436 | 774 (không tương đương token) |
| Received characters | 1397 | 2542 |

Do request SP-02 timeout, không được điền số token/prompt/decode duration từ ước đoán. `vmstat` trong archive không thể hiện swap thrashing; chưa chứng minh nút thắt do CPU duy nhất.

## 5. Quality findings — exploratory manual/heuristic

- SP-03 v1: có câu so sánh sai thứ tự 78 với 55; reviewer cảnh báo `INCORRECT_SCORE_COMPARISON`.
- SP-04 v2: hạn một số task đúng thời điểm planningStartAt, ước tính time budget bị quá tải.
- SP-05 v2: `GOOD` nhưng AI gọi là điểm yếu; có tiêu đề tiếng Anh cần đọc thủ công.
- SP-01 v3: 2 task chỉ tập trung topic_rest và bỏ topic_http yếu nhất trong một lần chạy; các run stability có output khác run chính.
- Các quality flags không mặc nhiên là lỗi Contract; review thủ công và schema/semantic official vẫn thiếu.

## 6. Tách bằng chứng demo được duyệt hiện hành

`Phase_1D3_Demo_Acceptance_Supplement.md` (Approved 30/10/2026) sử dụng `Qwen/Qwen2.5-1.5B-Instruct`, immutable revision `989aa7980e4cf806f80c7fef2b1adb7bc71aa306`, Colab Tesla T4 FP16. Lite evidence gồm real inference 6 task keys và NestJS→FastAPI wire smoke có mocked auth/preflight; được chấp thuận **demo candidate smoke**.

Bộ test CPU tại đây dùng **Ollama tag/quantization khác**, chỉ thử StudyPlan với schema provisional. Không chuyển kết quả Lite PASS sang CPU, không chuyển CPU FAIL sang Colab hoặc tự chứng nhận application flow/capacity release.

## 7. Kết luận kỹ thuật

**Đã chứng minh:** local CPU có thể chạy model và sinh JSON hợp lệ cho vài fixture StudyPlan nhỏ.  
**Chưa chứng minh:** tất cả 6 task, JSON Schema Release 1, quality gate, context/capacity release, authenticated application flow, 60s với input lớn.  
**Rủi ro:** bắt buộc nộp ứng dụng cho giảng viên chạy trên laptop CPU có thể không đồng nghĩa với *đạt đủ AI performance*; cần minh bạch/open decision.

## 8. Evidence file inventory và SHA-256

```text
ae8970be5fdd3c61b630aa6d93b3242fe3faf6ed3d97b14e55d6be6afcd84012  sp_multi.zip
30f7904c84adc03033d54fd7c962424dd0ce4ad8c955eefbdc336b1ff6427117  sp_multi_v2.zip
8b7e02ba1dda22e5dc69580e31ad94fe3224e32aef44cae4c9442e4f9ea69281  sp_multi_v3.zip
51e232757765dd4dd2ea123b64bdeffc3bdf00860a77c3b88f1645ad4e166560  sp_stability_v3.zip
7a7f6a854dc43070c6a4e76bbeb3dc33e170b03d2bcc0e46fdb82ce614531e3a  sp02_diagnostic.zip
```

**Lưu ý:** Các ZIP nguồn được người dùng cung cấp trong cuộc trò chuyện, **không** nằm sẵn trong gói tài liệu này để tránh tăng dung lượng và nhân bản evidence; khi nộp repo cần đặt vào thư mục evidence phù hợp hoặc trỏ đúng release artifact.
