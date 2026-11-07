# DACN — Deployment & Reproduction Guide (DRAFT)

**Ngày:** 07/11/2026  
**Trạng thái:** DRAFT / TARGET RUNBOOK — phải đối chiếu repo và chạy thử clean installation trước khi phát hành.  
**Mục đích:** Người chấm có thể dựng lại toàn bộ mã nguồn + dữ liệu + AI runtime, không phụ thuộc tài khoản riêng nhóm.

## 1. Phạm vi cam kết

- **Installation reproducibility:** tài liệu hướng tới cài được Next.js, NestJS, PostgreSQL, FastAPI và Ollama CPU cùng dữ liệu seed trên laptop Linux x86_64.
- **Functional conformance:** chưa chứng minh mọi AI flow đáp ứng 60 giây trên CPU. Không dùng dấu `PASS` cho full app inference nếu chưa chạy live và validation; trong benchmark hiện có SP-02 10 Topic fail.
- **Remote-GPU:** có thể dùng GPU VM của người chạy để tăng tốc, nhưng cần cấu hình bảo mật, model profile và evidence riêng. Không yêu cầu token/tài khoản cloud cá nhân của nhóm.

## 2. Hệ thống đã thử và hệ thống mục tiêu

- Máy thử CPU: Dell Latitude 5330, Intel Core i7-1265U, RAM 16 GiB, Linux Mint 22.3/Ubuntu 24.04 base, integrated Iris Xe, NVMe.
- Không khẳng định đây là cấu hình tối thiểu đủ chạy mọi AI fixture; chưa có benchmark xác nhận ngưỡng CPU/RAM tối thiểu.
- CPU Ollama model tag dùng để thử: `qwen2.5:1.5b`; **cần ghi model digest thật** khi release. Không chuyển model fp16 Colab benchmark sang bản Ollama này.

## 3. Đầu ra mà repository phải có trước khi công bố đã cài đặt lại thành công

```text
repo/
  apps/web/                  # Next.js (đề xuất; đối chiếu repo thật)
  apps/api/                  # NestJS (đề xuất)
  ai/                        # FastAPI adapter, prompts, runtime task registry
  prisma/                    # hoặc vị trí schema/migrations thực tế
  deployment/
    compose.cpu.yml          # CẦN TRIỂN KHAI
    compose.gpu.yml          # optional, CẦN TRIỂN KHAI
    .env.example             # CẦN TRIỂN KHAI
    model-manifest.json      # CẦN TRIỂN KHAI, tag + digest/quantization
  scripts/
    setup-local.sh           # CẦN TRIỂN KHAI
    smoke-local.sh           # CẦN TRIỂN KHAI
  docs/
    baseline/                # frozen docs retained
    releases/                # approved supplements
```

**Lưu ý:** Đây là cấu trúc mục tiêu, không phải tuyên bố các file đó đã tồn tại trong repository. Không phát hành README với lệnh giả nếu chưa viết/kiểm thử script.

## 4. Các bước cài đặt cần đưa vào runbook sau khi có implementation

1. Clone đúng commit/release SHA, kiểm tra version Node.js/pnpm/Python/Docker/Ollama từ lockfile và manifest.
2. Copy `.env.example` thành `.env` trên máy người chấm, tự sinh credentials thử nghiệm; không có mật khẩu hay secret cloud thật trong gói nộp.
3. Khởi động PostgreSQL local và chạy **migrations**; nạp **seed data** có thể tái chạy và biết rõ dataset demo.
4. Khởi động Next.js và NestJS; kiểm tra API health, auth ba vai trò và endpoints non-AI.
5. Tải/chạy đúng Ollama model digest đã ghi trong manifest; không chỉ dựa vào mutable tag. Máy CPU-only phải chọn đúng mode/profiles tương ứng.
6. Chạy FastAPI Adapter, cấu hình `OLLAMA_BASE_URL` nội bộ và token/backend endpoint. Không expose Ollama trên Internet.
7. Kiểm tra adapter `POST /v1/infer` bằng một hợp đồng thử nghiệm, rồi kiểm tra NestJS→Adapter với cùng env và correlation.
8. Kiểm tra capacity profile binding/estimator trước khi bật chức năng AI trong ứng dụng. Nếu chưa có profile hợp lệ, fail closed theo AI Contract — không sửa code để bỏ bước kiểm tra.
9. Chạy chức năng Student/Teacher/Admin bằng dữ liệu seed qua UI thật, chụp kết quả PASS/FAIL kèm latency; không dùng canned JSON giả làm live inference.
10. Kiểm tra stop/restart/reseed và khả năng khôi phục dịch vụ; dọn sạch các thông tin cá nhân và secret trước khi bàn giao.

## 5. Các lệnh kiểm tra mang tính hướng dẫn (không phải script repo đã được verify)

```bash
# Trên máy đã cài Ollama và khởi động dịch vụ
ollama --version
ollama list
ollama show qwen2.5:1.5b
curl --fail http://127.0.0.1:11434/api/tags

# Khi repo có Docker Compose thật, chạy file CPU đã được test
# docker compose -f deployment/compose.cpu.yml up -d --build
# docker compose -f deployment/compose.cpu.yml ps

# Khi repo có scripts thật, chạy từ đúng root + .env
# bash scripts/setup-local.sh
# bash scripts/smoke-local.sh
```

Dòng comment là kế hoạch triển khai, không phải lệnh đã được xác nhận chạy. Không tự lấy `ollama show` làm bằng chứng digest/checksum nếu CLI phiên bản hiện tại không thể hiện đầy đủ immutable identity; bổ sung lookup/manifest validation riêng.

## 6. Các biến môi trường hướng tới

```dotenv
# Minh họa tên biến cần đồng bộ với backend/adapter code trước release
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3001
AI_RUNTIME_BASE_URL=http://127.0.0.1:8001
AI_RUNTIME_TOKEN=<local-secret>
AI_REQUEST_TIMEOUT_MS=60000
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:1.5b
AI_DEPLOYMENT_PROFILE=local-cpu
AI_CAPACITY_PROFILE_PATH=<approved-release-profile.json>
```

Tên biến/port là **placeholder** cần khớp mã nguồn, không copy thẳng để tự nhận là cấu hình hoàn chỉnh. Nếu dùng Docker Compose networking, `127.0.0.1` bên trong container chỉ chính container đó; phải dùng service name/nội mạng phù hợp, không dùng localhost sai ngữ cảnh.

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
- [ ] FastAPI `/v1/infer` và gateway contract/errata tests PASS.
- [ ] Capacity profile hợp lệ gắn đúng model/tokenizer/prompt/task; nếu thiếu thì AI feature báo lỗi đúng baseline, không bypass.
- [ ] Chạy live các AI flows với latency/result được ghi minh bạch; với CPU-only chưa đạt 60 giây phải ghi FAIL/limitation.
- [ ] Bảo đảm không có secrets và dữ liệu nhạy cảm trong bộ nộp.
- [ ] README phân biệt rõ: "cài đặt được" vs "đạt performance/quality".

**Trạng thái:** Chưa có clean-install evidence và chưa được xem là runbook đã verification.
