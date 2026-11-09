# Windows Local AI Runtime — Installability Checklist

> Dùng một bản cho mỗi máy Windows sạch/lần cài. Không ghi secret, token, URL có credential, dữ liệu người dùng hoặc raw model output; chỉ đính kèm log đã làm sạch.

## Kết quả

- Ngày/giờ và timezone:
- Người thực hiện/nhóm:
- Revision bàn giao dự kiến:
- `git rev-parse HEAD`:
- Repo path trong WSL (`/home/...`, không có secret):
- Installability: **UNVERIFIED / PASS / FAIL** (chọn một):
- Nơi lưu bằng chứng đã làm sạch:

PASS chỉ áp dụng cho host/revision đã ghi. PASS không chứng nhận AI Conformance/Capacity và không bật application dispatch.

## Windows và WSL2

- Windows edition/version/build/architecture:
- CPU/model/cores/threads:
- RAM (GiB):
- Disk free trước cài (GiB)/drive:
- GPU/model/driver hoặc none:
- Virtualization firmware status:
- WSL version/kernel (`wsl --status`):
- Ubuntu version và `wsl --list --verbose` VERSION:
- Repo nằm trong WSL Linux filesystem: Yes / No:

## Versions

- Git:
- Node.js:
- pnpm (expected 10.12.1):
- Docker Desktop:
- Docker Engine:
- Docker Compose (v2):
- Docker OSType (`linux`):
- Ollama image (`ollama/ollama:0.40.15`):
- Ollama CLI version:
- Python:
- uv:

## Source, cấu hình và lệnh đã chạy

- Branch/tag/commit được nhóm bàn giao:
- Commit đã checkout:
- Working tree sạch trước cài: Yes / No:
- Repo ở `/home/...`, không phải `/mnt/c`: Yes / No:
- `.env.example` copied to local `.env`: Yes / No:
- `.env` owner-only permissions: Yes / No:
- Local JWT secret generated, value omitted: Yes / No:
- AI token configured, value omitted: Yes / No:
- `DATABASE_URL` là local dev DB: Yes / No:

| Command/step (redact values) | Ngày/giờ | Result/exit code | Evidence reference |
|---|---|---|---|
| WSL/Ubuntu install/update | | | |
| Docker Desktop WSL integration | | | |
| Git clone + handoff checkout | | | |
| Node/pnpm + `pnpm install --frozen-lockfile` | | | |
| `pnpm db:up`, migrate, seed | | | |
| `./ai/scripts/setup.sh` | | | |
| `./ai/scripts/test-contract.sh` | | | |
| `./ai/scripts/lint.sh` | | | |

## Model identity and settings

- Ollama image tag:
- Model ID:
- Full expected manifest digest:
- Digest prefix from `ollama list`:
- Quantization:
- Context/prediction/sampling settings:
- `capacityCertification` (expected `NONE`):
- Optional GPU exploratory hardware (if used):

## Service and test evidence

- PostgreSQL healthy: PASS / FAIL / NOT RUN; evidence:
- NestJS `/api/v1/health`: PASS / FAIL / NOT RUN; HTTP status:
- Next.js `localhost:3100`: PASS / FAIL / NOT RUN:
- Runtime `/health/live`: PASS / FAIL / NOT RUN; status:
- Runtime `/health/ready`: PASS / FAIL / NOT RUN; status:
- No-token `/v1/infer`: expected HTTP 401; observed:
- Contract tests: PASS / FAIL / NOT RUN; summary and exit code:
- All six task keys and 15 Release 1 schemas covered: Yes / No; evidence:
- Ruff lint: PASS / FAIL / NOT RUN; summary and exit code:
- `ai-capacity-preflight.spec.ts`: PASS / FAIL / NOT RUN; summary:
- Missing-profile preflight remains fail-closed: Confirmed / NOT VERIFIED:
- Current checkout has no NestJS AI dispatch endpoint; direct FastAPI smoke is not evidence of application dispatch: Confirmed / No:

## Real model smoke (separate from tests)

- Run: PASS / FAIL / NOT RUN:
- Date/time:
- Task key:
- Host OS/hardware:
- Model ID/full digest:
- HTTP status and requestId correlation:
- Elapsed seconds:
- JSON object received (do not paste it): Yes / No:
- Error/timeout if any:
- Recorded as exploratory smoke only, not capacity evidence: Confirmed / No:

## Errors and remediation

| Step/command | Sanitized error + exit code | Remediation | Result |
|---|---|---|---|
| | | | |
| | | | |
| | | | |

## Installability disposition

- [ ] **PASS** — clean install from recorded revision; runtime health and six-task contract tests pass; model identity verified; NestJS starts and non-AI health works; no-profile preflight remains fail-closed.
- [ ] **FAIL** — a required installability check failed; identify it below.
- [ ] **UNVERIFIED** — clean Windows install was not completed or evidence is incomplete.

Reason/evidence:

Remaining blockers:

AI Conformance/Capacity: **UNVERIFIED** until separately benchmarked, approved and bound to this exact model/runtime/hardware profile.
