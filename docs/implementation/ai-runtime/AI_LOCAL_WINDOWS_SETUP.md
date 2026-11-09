# Windows Local AI Runtime Setup — Windows 11 + WSL2

**Mục đích:** Dựng lại AI runtime local trên Windows 11 bằng Ubuntu/WSL2 và Docker Desktop. Ollama CPU là mặc định; GPU là tùy chọn.

**Trạng thái:** Đã đối chiếu source và scripts trên Linux. Chưa chạy trên máy Windows sạch; Windows Installability vẫn **UNVERIFIED**.

**Giới hạn nghiệm thu:** Installability và AI Conformance/Capacity là hai gate riêng. Hiện không có capacity profile được phê duyệt; NestJS preflight tiếp tục fail-closed. Không gọi AI business flow để chứng minh cài đặt.

## Trước khi bắt đầu

- Chạy lệnh PowerShell trên Windows; chạy `bash`, `docker compose`, `pnpm` và `./ai/scripts/...` trong Ubuntu Terminal tại repo nằm trong filesystem Linux (`~/...`). Không clone vào `/mnt/c/...`: scripts cần quyền thực thi và quyền Unix ổn định.
- Runtime README hiện nêu Linux `x86_64`; ghi `OsArchitecture` và `uname -m`. Hướng dẫn này chỉ đánh giá target AMD64/x86_64; nếu máy/distro là ARM64, đánh dấu Installability UNVERIFIED và xin xác nhận hỗ trợ trước khi tiếp tục.
- Các script có thật: `ai/scripts/{setup,start,stop,smoke,test-contract,lint}.sh`; chúng là Bash, không phải PowerShell.
- Ghi kết quả vào [checklist installability](AI_LOCAL_WINDOWS_INSTALLABILITY_CHECKLIST.md). Không ghi secret, token hoặc dữ liệu người dùng.
- Cần Git revision bàn giao và URL clone từ nhóm. Model weights hiện khoảng 1 GB cộng image/cache. Repo chưa công bố ngưỡng CPU/RAM/disk tối thiểu đã chứng nhận; ghi cấu hình thực tế thay vì suy ra năng lực.

## 1. Ghi cấu hình Windows và phần cứng

**Chạy ở đâu:** PowerShell.

```powershell
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OsBuildNumber, OsArchitecture
Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors
Get-CimInstance Win32_ComputerSystem | Select-Object @{Name='RAM_GiB';Expression={[math]::Round($_.TotalPhysicalMemory/1GB,1)}}
Get-PSDrive -PSProvider FileSystem | Select-Object Name, @{Name='Free_GiB';Expression={[math]::Round($_.Free/1GB,1)}}
Get-CimInstance Win32_VideoController | Select-Object Name, DriverVersion
```

**Mong đợi:** Windows 11 64-bit; ghi CPU, RAM, dung lượng trống, GPU/driver (nếu có) vào checklist. GPU không bắt buộc.

**Nếu thất bại:** Chạy `winver` và xem Task Manager → Performance để ghi Windows build, RAM, CPU và trạng thái **Virtualization**. Nếu virtualization Disabled, bật Intel VT-x/AMD-V trong UEFI/BIOS rồi khởi động lại. Chưa có cấu hình tối thiểu được phê duyệt.

## 2. Cài WSL2 và Ubuntu

**Chạy ở đâu:** PowerShell **Run as administrator**.

```powershell
wsl --install -d Ubuntu-24.04
```

Khởi động lại nếu được yêu cầu. Mở Ubuntu từ Start menu, tạo Linux username/password, sau đó trong PowerShell:

```powershell
wsl --update
wsl --set-default-version 2
wsl --list --verbose
wsl --status
```

**Mong đợi:** Ubuntu được liệt kê với `VERSION 2`; WSL kernel đã cập nhật. Nếu distro không có trong nguồn hiện tại, dùng `wsl --list --online` và chọn bản Ubuntu khả dụng.

**Nếu thất bại:** Cập nhật Windows/WSL, kiểm tra Task Manager → Performance → CPU → Virtualization = Enabled và restart sau khi bật optional features. Không dùng WSL1. Xem [hướng dẫn cài WSL](https://learn.microsoft.com/windows/wsl/install/) và [troubleshooting](https://learn.microsoft.com/windows/wsl/troubleshooting).

## 3. Cài Docker Desktop và bật WSL integration

**Chạy ở đâu:** Docker Desktop trên Windows; kiểm tra sau đó trong Ubuntu Terminal.

1. Cài Docker Desktop theo [hướng dẫn chính thức](https://docs.docker.com/desktop/setup/install/windows-install/) và chọn WSL 2 backend.
2. Mở **Settings → Resources → WSL Integration**, bật integration cho Ubuntu. Đợi Engine chạy.
3. Trong Ubuntu Terminal:

```bash
docker version
docker compose version
docker info --format '{{.OSType}}'
uname -m
```

**Mong đợi:** Docker client/server hiện phiên bản, Compose v2 có sẵn, OSType là `linux` và `uname -m` là `x86_64`.

**Nếu thất bại:** Đảm bảo Docker Desktop đang chạy, chọn WSL 2 backend và bật Ubuntu integration. Sau khi đổi cấu hình, chạy `wsl --shutdown` trong PowerShell rồi mở lại Ubuntu. Không cài Docker Engine riêng trong Ubuntu khi dùng integration này. Tham khảo [Docker Desktop WSL 2](https://docs.docker.com/desktop/features/wsl/).

## 4. Cài Git và clone trong Ubuntu filesystem

**Chạy ở đâu:** Ubuntu Terminal.

```bash
sudo apt update
sudo apt install -y git curl python3 python3-venv
git --version
mkdir -p ~/src
cd ~/src
read -r -p 'Repository URL from the team: ' REPOSITORY_URL
read -r -p 'Local folder name for this repository: ' REPOSITORY_DIR
git clone "$REPOSITORY_URL" "$REPOSITORY_DIR"
cd "$REPOSITORY_DIR"
```

Nhập URL/tên repo do nhóm cung cấp khi terminal hỏi. Không nhúng access token vào URL; dùng credential method được nhóm chấp thuận.

**Mong đợi:** Repo ở `/home/<linux-user>/src/...`, không nằm dưới `/mnt/c/`.

**Nếu thất bại:** Kiểm tra URL/quyền truy cập mà không gửi credential trong log/chat. Nếu clone trên ổ Windows gây lỗi permission/chậm, clone vào `~/src` trong Ubuntu.

## 5. Checkout và ghi revision bàn giao

**Chạy ở đâu:** Ubuntu Terminal, root repo.

```bash
git fetch --all --tags
read -r -p 'Handoff revision (commit/tag) from the team: ' HANDOFF_REVISION
git checkout "$HANDOFF_REVISION"
git rev-parse HEAD
git status --short
```

**Mong đợi:** Commit khớp revision được bàn giao; working tree sạch. Ghi SHA vào checklist.

**Nếu thất bại:** Không tự thay bằng `main` hay revision mới hơn. Hỏi nhóm xác nhận ref/quyền truy cập. Xử lý mọi thay đổi sẵn có trước khi bắt đầu cài.

## 6. Cài Node/pnpm và tạo môi trường local

**Chạy ở đâu:** Ubuntu Terminal, root repo.

Repo yêu cầu Node.js `>=24.18.0 <25` và pnpm `10.12.1`. Trong Ubuntu, cài Node 24.18.0 bằng nvm theo [hướng dẫn nvm](https://github.com/nvm-sh/nvm), rồi cài dependencies:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 24.18.0
nvm use 24.18.0
node --version
corepack enable
corepack prepare pnpm@10.12.1 --activate
pnpm --version
pnpm install --frozen-lockfile
cp .env.example .env
chmod 600 .env
```

**Mong đợi:** Node 24.x từ 24.18 trở lên, pnpm `10.12.1`; `.env` chỉ lưu local, không commit/chia sẻ.

AuthModule cần JWT secret Base64 từ ít nhất 32 byte ngẫu nhiên. Chạy một lần tại root repo; giá trị không được in ra:

```bash
python3 - <<'PY'
import base64, secrets
from pathlib import Path

path = Path('.env')
lines = path.read_text().splitlines()
value = base64.b64encode(secrets.token_bytes(32)).decode('ascii')
for index, line in enumerate(lines):
    if line.startswith('JWT_ACCESS_SECRET='):
        lines[index] = f'JWT_ACCESS_SECRET={value}'
        break
else:
    lines.append(f'JWT_ACCESS_SECRET={value}')
path.write_text('\n'.join(lines) + '\n')
path.chmod(0o600)
print('Local JWT secret generated; value not displayed.')
PY
```

Giữ DB credentials trong `.env` ở phạm vi máy local; nếu đổi password/port, cập nhật `DATABASE_URL` tương ứng. Giá trị mẫu trong `.env.example` chỉ dành cho development local, không dùng/shared như secret production. Runtime setup sẽ tạo AI token local khi token để trống.

**Nếu thất bại:** Nếu thiếu `corepack`, kiểm tra Node 24.x và mở terminal mới. Nếu pnpm version sai, đối chiếu `package.json`. Nếu install báo lỗi, ghi lại lỗi nhưng không đổi lockfile.

## 7. Khởi động PostgreSQL, migration, seed và app

**Chạy ở đâu:** Ubuntu Terminal tại root repo.

```bash
pnpm db:up
docker compose ps
pnpm db:migrate
pnpm db:seed
```

**Mong đợi:** PostgreSQL `healthy`, migration và seed kết thúc thành công. Trong terminal Ubuntu thứ hai, đến `~/src`, vào thư mục repo đã chọn ở bước 4 (thay `<tên-thư-mục-thật>` bằng tên đã ghi; không gõ dấu `< >`), rồi chạy:

```bash
pnpm dev
```

Mở `http://localhost:3101/api/v1/health` và `http://localhost:3100` trong browser Windows.

**Mong đợi:** API health trả HTTP 200; Next.js mở được. NestJS và non-AI routes vẫn khởi động khi AI chưa cấu hình.

**Nếu thất bại:** Kiểm tra `.env`, `docker compose ps`, port 5433/3101/3100, output migration/seed và terminal `pnpm dev`. Không chạy integration tests với development database.

## 8. Cài Ollama CPU và FastAPI Adapter

**Chạy ở đâu:** Ubuntu Terminal tại root repo.

```bash
./ai/scripts/setup.sh
./ai/scripts/smoke.sh
docker compose --env-file .env -f ai/compose.yaml ps
```

`setup.sh` dùng `.env` local (được tạo từ `.env.example` ở bước 6), tạo token nếu đang trống, tải model pinned, kiểm tra digest, build adapter và đợi readiness. Cùng `.env` được NestJS dùng; không in hoặc chia sẻ token. Compose CPU không publish cổng Ollama; FastAPI bind `127.0.0.1`.

Nếu `pnpm dev` đang chạy từ bước 7, dừng bằng `Ctrl+C` rồi khởi động lại sau khi script cập nhật `.env`, để NestJS đọc token mới; kiểm tra lại `http://localhost:3101/api/v1/health`.

**Mong đợi:** Ollama và runtime running/healthy; `smoke.sh` kiểm tra `/health/live` và `/health/ready`. Đây chưa phải inference smoke.

**Nếu thất bại:** Kiểm tra `docker compose --env-file .env -f ai/compose.yaml logs --tail=50 ollama runtime`; không paste `.env`. Khi digest sai, dừng và đối chiếu manifest, không đổi model/tag. Khi not-ready, kiểm tra tải model và dung lượng đĩa.

## 9. Xác minh Ollama version, model/digest và cài đặt đã pin

**Chạy ở đâu:** Ubuntu Terminal, root repo.

```bash
docker compose --env-file .env -f ai/compose.yaml config --images
docker compose --env-file .env -f ai/compose.yaml exec -T ollama ollama --version
docker compose --env-file .env -f ai/compose.yaml exec -T ollama ollama list
python3 - <<'PY'
import json
from pathlib import Path
m = json.loads(Path('deployment/model-manifest.json').read_text())
print('model:', m['ollama']['runtimeModel'])
print('modelId:', f"{m['modelName']}@sha256:{m['modelDigest']}")
print('digest:', m['modelDigest'])
print('quantization:', m['quantization'])
print('ollama settings:', m['ollama']['options'])
print('capacity certification:', m['capacityCertification'])
PY
```

**Mong đợi:** Image `ollama/ollama:0.40.15`; model `qwen2.5:1.5b`; digest `65ec06548149b04c096a120e4a6da9d4017ea809c91734ea5631e89f96ddc57b`; quantization `Q4_K_M`; `num_ctx=32768`, `num_predict=-1`, `temperature=0`, `top_p=1`; `capacityCertification=NONE`. `ollama list` chỉ hiện digest rút gọn; readiness adapter kiểm tra full digest.

**Nếu thất bại:** Dừng runtime nếu image/model/digest khác. Không pull tag khác hoặc sửa manifest để làm readiness thành công.

## 10. Kiểm tra health và auth adapter

**Chạy ở đâu:** Ubuntu Terminal.

```bash
curl --fail --silent --show-error http://127.0.0.1:8001/health/live
curl --fail --silent --show-error http://127.0.0.1:8001/health/ready
curl --include --request POST http://127.0.0.1:8001/v1/infer \
  --header 'Content-Type: application/json' \
  --data '{}'
```

**Mong đợi:** Health trả `alive`/`ready`; request không Bearer token trả HTTP 401 và không gọi inference. Contract tests cũng kiểm tra token sai bị từ chối trước generation. Không thử token thật bằng cách gõ vào command line.

**Nếu thất bại:** 503 readiness nghĩa là Ollama/model chưa sẵn sàng; 401 cho request không token là kết quả đúng. Nếu request không token không trả 401, dừng acceptance và báo lỗi.

## 11. Python unit/contract tests

**Chạy ở đâu:** Ubuntu Terminal, root repo.

```bash
if ! command -v uv >/dev/null 2>&1; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
  source "$HOME/.local/bin/env"
fi
python3 --version
uv --version
./ai/scripts/test-contract.sh
./ai/scripts/lint.sh
```

**Mong đợi:** `python3 --version` là Python 3.12; pytest và Ruff PASS. Tests dùng fake engine/fixtures, bao phủ sáu task keys, 15 schemas, checksums/byte equality NestJS, auth/correlation, malformed inputs/outputs, E5/E6, timeout, readiness và digest mismatch. Không gọi Ollama; không chứng nhận model quality/latency.

**Nếu thất bại:** Ghi command, exit code, lỗi đầu tiên. Không sửa schema/timeout/fixture để vượt test. Cài `uv` theo [hướng dẫn chính thức](https://docs.astral.sh/uv/getting-started/installation/) nếu chưa có.

## 12. Real Ollama inference smoke — riêng với contract tests

**Chạy ở đâu:** Ubuntu Terminal, root repo. Lệnh dùng fixture synthetic chính thức và gọi FastAPI trực tiếp; không đi qua NestJS, không tạo business state. Nó chỉ in HTTP/error code và elapsed time, không in token hay raw output.

```bash
python3 - <<'PY'
import json, time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

env = {}
for line in Path('.env').read_text().splitlines():
    if line and not line.lstrip().startswith('#') and '=' in line:
        key, _, value = line.partition('=')
        env[key] = value
token = env.get('AI_RUNTIME_TOKEN', '')
base = env.get('AI_RUNTIME_BASE_URL', 'http://127.0.0.1:8001').rstrip('/')
if not token:
    raise SystemExit('AI_RUNTIME_TOKEN is empty; run ./ai/scripts/setup.sh first')
fixture = Path('apps/api/src/ai/__fixtures__/release1/valid/student-learning-analysis.input.json')
payload = {
    'contractVersion': '1.0',
    'requestId': 'windows-local-smoke',
    'task': 'STUDENT_LEARNING_ANALYSIS',
    'locale': 'vi-VN',
    'input': json.loads(fixture.read_text()),
}
request = Request(
    f'{base}/v1/infer',
    data=json.dumps(payload, ensure_ascii=False).encode(),
    headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
    method='POST',
)
started = time.perf_counter()
try:
    with urlopen(request, timeout=65) as response:
        body = json.loads(response.read())
        elapsed = time.perf_counter() - started
        if response.status != 200 or body.get('requestId') != payload['requestId'] or not isinstance(body.get('output'), dict):
            raise SystemExit(f'Unexpected response; HTTP {response.status}; elapsed={elapsed:.2f}s')
        print(f'HTTP {response.status}; task={payload["task"]}; elapsed={elapsed:.2f}s; output object received')
except HTTPError as error:
    detail = {}
    try:
        detail = json.loads(error.read())
    except (ValueError, OSError):
        pass
    print(f'HTTP {error.code}; errorCode={detail.get("error", {}).get("code", "unknown")}; elapsed={time.perf_counter()-started:.2f}s')
    raise SystemExit(1)
except (URLError, TimeoutError) as error:
    print(f'Connection/timeout failure ({type(error).__name__}); elapsed={time.perf_counter()-started:.2f}s')
    raise SystemExit(1)
PY
```

**Mong đợi:** HTTP 200, matching request ID, JSON object. Ghi model/digest, hardware, ngày, task và elapsed time vào checklist. Một smoke pass không chứng minh các task khác đạt 60 giây hoặc quality/schema thresholds.

**Nếu thất bại:** 401: kiểm tra token local nhưng không in token. 503: readiness/model digest. 504/`INFERENCE_FAILED` hoặc client timeout: ghi lỗi/latency; không retry inference để biến lần đầu thành PASS. Không gửi dữ liệu người dùng thật.

## 13. Xác minh NestJS preflight vẫn fail-closed

**Chạy ở đâu:** Ubuntu Terminal, root repo.

```bash
pnpm --filter @dacn/api test -- ai-capacity-preflight.spec.ts
```

**Mong đợi:** Focused test xác nhận thiếu profile trả `502 AI_RUNTIME_FAILURE` trước transport/logging. Checkout hiện chưa có AiGateway/AI business dispatch endpoint (Task 6 và Task 8–11 chưa triển khai), nên không có HTTP AI business request để gửi. Không tạo profile, bỏ qua preflight hay lấy gọi trực tiếp FastAPI làm bằng chứng backend dispatch.

**Nếu thất bại:** Dừng acceptance, lưu output và báo nhóm; không thay preflight/profile để mở inference.

## 14. Dừng, khởi động lại và khắc phục lỗi phổ biến

**Chạy ở đâu:** Ubuntu Terminal, root repo.

```bash
./ai/scripts/stop.sh
./ai/scripts/start.sh
./ai/scripts/smoke.sh
```

Stop giữ named volume chứa model. GPU tùy chọn dùng `AI_RUNTIME_GPU=1` cho `setup.sh`/`start.sh`; cần driver/backend tương thích và không tạo capacity certification. Không cần GPU để hoàn tất CPU installability.

| Triệu chứng | Kiểm tra/khắc phục |
|---|---|
| `docker: command not found` trong Ubuntu | Bật Ubuntu WSL Integration trong Docker Desktop; chạy `wsl --shutdown` ở PowerShell, mở lại distro. |
| WSL báo virtualization/VM platform | Bật virtualization trong UEFI/BIOS, cập nhật Windows/WSL và restart. |
| Setup từ chối token | `.env` giữ token non-empty sai sẽ không tự thay; cấu hình local lại an toàn, không gửi giá trị. |
| Digest mismatch hoặc readiness 503 | Đối chiếu image/model/manifest và Compose logs; không đổi pinned model/digest để vượt check. |
| Port 8001/5433/3100/3101 bận | Xác định tiến trình; đổi đúng biến `.env` được hỗ trợ và URL phụ thuộc, rồi ghi lại. |
| Real smoke chậm/timeout | Ghi đúng latency/error; không tăng timeout 60 giây và không coi repeated smoke là capacity. |

Dừng app bằng `Ctrl+C`; dừng PostgreSQL bằng `pnpm db:down` (giữ volume). Đóng Ubuntu không thay thế `./ai/scripts/stop.sh` nếu muốn dừng container rõ ràng.

## 15. Authority tham chiếu

- [Microsoft: Install WSL](https://learn.microsoft.com/windows/wsl/install/) · [Docker Desktop WSL 2](https://docs.docker.com/desktop/features/wsl/).
- [AI runtime README](../../../ai/README.md) · [Deployment Reproduction Guide](Deployment_Reproduction_Guide_v0.1_DRAFT.md) · [CR-005 v1.0](../../implementation/releases/CR-005/Change_Request_CR-005_v1.0_approved.md) · [ADR-AI-001 Accepted](../../implementation/releases/CR-005/ADR_AI_001_Local_First_Runtime_Portability_v0.2_accepted.md) · [Runtime Portability Supplement v1.0](../../implementation/releases/CR-005/AI_Contract_Runtime_Portability_Supplement_v1.0_approved.md) · [Phase 2B Plan](../../superpowers/plans/2026-11-07-ai-foundation-implementation.md).
- Sáu task keys, 15 Release 1 schemas, timeout 60 giây, no-retry, full-input preflight, NestJS output validation, CR-006 policy và R3 baseline không đổi.
