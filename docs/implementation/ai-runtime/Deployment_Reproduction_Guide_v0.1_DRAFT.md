# DACN — Deployment & Reproduction Guide (DRAFT)

**Ngày:** 07/11/2026  
**Trạng thái:** DRAFT / Task 7 runbook candidate — package paths updated; clean CPU installation has not been witnessed.
**Mục đích:** Người chấm có thể dựng lại toàn bộ mã nguồn + dữ liệu + AI runtime, không phụ thuộc tài khoản riêng nhóm.

## 1. Phạm vi cam kết

- **Installation reproducibility:** tài liệu hướng tới cài được Next.js, NestJS, PostgreSQL, FastAPI và Ollama CPU cùng dữ liệu seed trên laptop Linux x86_64.
- **Functional conformance:** chưa chứng minh mọi AI flow đáp ứng 60 giây trên CPU. Không dùng dấu `PASS` cho full app inference nếu chưa chạy live và validation; trong benchmark hiện có SP-02 10 Topic fail.
- **Optional GPU:** `ai/compose.gpu.yaml` adds NVIDIA GPU reservation for a local operator; this installation mode requires its own hardware evidence and does not certify capacity.

## 2. Model/runtime candidate (not a capacity profile)

- Máy thử CPU: Dell Latitude 5330, Intel Core i7-1265U, RAM 16 GiB, Linux Mint 22.3/Ubuntu 24.04 base, integrated Iris Xe, NVMe.
- Không khẳng định đây là cấu hình tối thiểu đủ chạy mọi AI fixture; chưa có benchmark xác nhận ngưỡng CPU/RAM tối thiểu.
- CPU-local model: `qwen2.5:1.5b`, digest `65ec06548149b04c096a120e4a6da9d4017ea809c91734ea5631e89f96ddc57b`, Q4_K_M, Apache-2.0. Manifest pins runtime options and Ollama image version. This is install metadata only; no capacity profile is created.

## 3. Runtime package in this checkout

```text
repo/
  apps/web/                  # Next.js (đề xuất; đối chiếu repo thật)
  apps/api/                  # NestJS (đề xuất)
  ai/app/                    # FastAPI adapter, task/prompt registry, Ollama engine
  ai/tests/                  # fixture/mock contract tests, not live capacity evidence
  ai/compose.yaml            # CPU default
  ai/compose.gpu.yaml        # optional NVIDIA overlay
  ai/scripts/                # setup/start/stop/smoke/test-contract
  ai/pyproject.toml          # Python dependencies and uv.lock
  ai/requirements.lock       # container dependency lock
  deployment/
    model-manifest.json      # model identity + digest/quantization/settings; not a capacity profile
  docs/
    baseline/                # frozen docs retained
    releases/                # approved supplements
```

**Lưu ý:** Runtime source and scripts are present. This DRAFT does not claim a clean installation has passed.

## 4. Cài đặt runtime

1. Install Docker Engine/Compose v2, Python 3.12, `uv`, and `curl`; use the application root runbook separately for Node.js/pnpm/PostgreSQL.
2. Run `./ai/scripts/setup.sh`. It creates `.env` if absent and fills a blank runtime token with a random local value.
3. Setup downloads the pinned Ollama image/model, checks model digest prefix, builds FastAPI, and waits for readiness that verifies the full digest.
4. Run `./ai/scripts/smoke.sh`, then `./ai/scripts/test-contract.sh`. Contract tests use fixtures/mock engine and are not live inference evidence.
5. Optional NVIDIA GPU: `AI_RUNTIME_GPU=1 ./ai/scripts/setup.sh`; requires NVIDIA Container Toolkit and separate hardware evidence.
6. Start NestJS and verify non-AI routes remain available. Application AI invocation remains fail-closed until a matching approved capacity profile exists.

## 5. Lệnh runtime

```bash
./ai/scripts/setup.sh
./ai/scripts/smoke.sh
./ai/scripts/test-contract.sh
./ai/scripts/stop.sh
```

These commands are implemented but remain unverified on a separate clean CPU-only machine.

## 6. Các biến môi trường hướng tới

```dotenv
# Root `.env.example` contains the NestJS adapter URL and an empty token placeholder.
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3001
AI_RUNTIME_BASE_URL=http://127.0.0.1:8001
AI_RUNTIME_TOKEN=<generated-local-secret>
AI_RUNTIME_PORT=8001
```

FastAPI-to-Ollama uses Compose service DNS (`http://ollama:11434`) and does not publish the Ollama port. `AI_RUNTIME_TOKEN` is shared only between local NestJS config and the adapter, never sent to the browser.

## 7. Yêu cầu bảo mật khi bàn giao

- `.env` thật, JWT signing key, AI Runtime token, Google credential, SSH private key không có trong ZIP/git.
- `.env.example` chỉ có placeholder; seed dùng dữ liệu mẫu/đã ẩn danh, mật khẩu demo được thay khi nộp nếu cần.
- Ollama port 11434 không public; adapter remote cần TLS+token/private tunnel; CORS chỉ cho allowed origins.
- Không lưu raw prompt/response chứa thông tin thật theo mặc định; các tệp benchmark exploratory chỉ dùng synthetic fixtures.

## 8. Checklist nghiệm thu cài đặt

- [ ] Clean install trên máy khác/recreated container từ source, ghi ngày và phiên bản.
- [ ] DB migrate/seed idempotent.
- [ ] Đăng nhập/authorization 3 vai trò và non-AI flows PASS.
- [ ] Model tải theo manifest có checksum/digest xác thực.
- [ ] FastAPI `/v1/infer` contract tests PASS on a clean host; fixture/mock tests are labeled separately from live inference evidence.
- [ ] Capacity profile hợp lệ gắn đúng model/tokenizer/prompt/task; nếu thiếu thì AI feature báo lỗi đúng baseline, không bypass.
- [ ] Chạy live các AI flows với latency/result được ghi minh bạch; với CPU-only chưa đạt 60 giây phải ghi FAIL/limitation.
- [ ] Bảo đảm không có secrets và dữ liệu nhạy cảm trong bộ nộp.
- [ ] README phân biệt rõ: "cài đặt được" vs "đạt performance/quality".

**Trạng thái:** Runtime package and mock contract tests are implemented; clean installability is still UNVERIFIED. Real inference and CPU/GPU capacity are separate gates. No capacity profile has been created.
