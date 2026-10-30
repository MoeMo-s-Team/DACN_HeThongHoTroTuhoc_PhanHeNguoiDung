# AI Local GPU + Tailscale Handoff

This guide sets up the CP-005 development/demo topology. It does not certify production readiness or enable application AI calls while `DenyAllAiInvocationPolicy` or capacity preflight is unresolved.

## Topology

| Machine | Runs | NestJS runtime URL |
|---|---|---|
| User Linux machine | Its own Next.js/NestJS clone and Tailscale Linux client | `https://<gpu-host>.<tailnet>.ts.net` |
| Teammate Windows 11, 16 GB RAM, RTX 3050 Laptop 4 GB | Its own Next.js/NestJS clone, Tailscale Windows client, and one FastAPI/Qwen NF4 process in WSL2 | `http://127.0.0.1:8000` after Windows-to-WSL localhost forwarding is verified |

There is exactly one FastAPI/model process, hosted in WSL2. Keep FastAPI bound to `127.0.0.1:8000`; Tailscale Serve on Windows proxies to that same Windows localhost port. Do not run Tailscale inside WSL2, enable Funnel, use a public tunnel, or bind FastAPI to `0.0.0.0`.

```text
Linux NestJS ── HTTPS/Tailscale Serve ──┐
                                        ├── Windows localhost:8000 ── WSL2 FastAPI/Qwen NF4
Windows NestJS ───── loopback ─────────┘
```

## 1. Prepare the Windows GPU host

1. Install a current NVIDIA Windows driver that supports CUDA in WSL2. Install/update WSL2 and Ubuntu from an elevated PowerShell terminal, then restart if requested:

   ```powershell
   wsl --install -d Ubuntu-24.04
   wsl --update
   wsl --status
   ```

2. Install the [Tailscale Windows client](https://tailscale.com/download/windows) and sign in to the same tailnet as the Linux developer. Do not install another Tailscale client inside Ubuntu/WSL2.
3. In Ubuntu, verify GPU passthrough before installing model dependencies:

   ```bash
   nvidia-smi
   nvidia-smi --query-gpu=name,uuid,compute_cap --format=csv
   ```

   Stop if the RTX 3050 is not visible or the reported UUID is missing. Do not install a Linux NVIDIA driver in WSL2.

## 2. Install the existing runtime in WSL2

Clone the repository inside the WSL Linux filesystem (for example under `~/src`), separate from the teammate's Windows clone. Use Python 3.12 and the repository's existing runtime requirements; do not change pins or replace PyTorch:

```bash
cd ~/src/DACN_HeThongHoTroTuhoc_PhanHeNguoiDung
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r ai/requirements.in
python -m pip check
```

Verify the installed PyTorch can use CUDA and bitsandbytes imports without errors:

```bash
python -c 'import torch, bitsandbytes; print(torch.__version__, torch.version.cuda, torch.cuda.is_available()); print(torch.cuda.get_device_name(0))'
```

Do not install a different PyTorch wheel or loosen `ai/requirements.in` when this check fails. Record the error and stop for a reviewed dependency change.

## 3. Set up the WSL GPU lock and runtime environment

The worker requires the canonical `/tmp/dacn-ai-gpu-locks` directory to be root-owned, sticky mode `01777`, on an approved local `/tmp` filesystem. Its UUID lock file must be root-owned, regular, single-link and mode `0666`. Create only a missing path; inspect and stop on an existing unexpected path. The worker also checks that its WSL mount namespace matches WSL PID 1. Do not run FastAPI as root or weaken these checks.

```bash
LOCK_DIR=/tmp/dacn-ai-gpu-locks
GPU_UUID="$(nvidia-smi --query-gpu=uuid --format=csv,noheader | head -n 1)"
if [ -L "$LOCK_DIR" ]; then echo 'Unexpected GPU lock directory symlink; stop.'; exit 1; fi
if [ ! -e "$LOCK_DIR" ]; then sudo mkdir -m 1777 -- "$LOCK_DIR" || { echo 'GPU lock directory creation raced or failed; inspect and stop.'; exit 1; }; fi
if [ -L "$LOCK_DIR" ] || [ ! -d "$LOCK_DIR" ]; then echo 'Unexpected GPU lock directory type; stop.'; exit 1; fi
LOCK_DIR_STAT="$(sudo stat -c '%u:%g %a %F %d' -- "$LOCK_DIR")" || { echo 'Cannot inspect GPU lock directory; stop.'; exit 1; }
TMP_DEVICE="$(stat -c '%d' /tmp)" || { echo 'Cannot inspect /tmp; stop.'; exit 1; }
LOCK_FS="$(findmnt -n -o FSTYPE --target "$LOCK_DIR")" || { echo 'Cannot identify GPU lock filesystem; stop.'; exit 1; }
case "$LOCK_DIR_STAT" in "0:0 1777 directory $TMP_DEVICE") ;; *) echo 'GPU lock directory must be root:root 1777 on the local /tmp device; stop.'; exit 1 ;; esac
case "$LOCK_FS" in ext4|xfs|tmpfs|overlay|overlayfs) ;; *) echo "Unapproved GPU lock filesystem: $LOCK_FS; stop."; exit 1 ;; esac
LOCK_FILE="$LOCK_DIR/$GPU_UUID.lock"
if [ -L "$LOCK_FILE" ]; then echo 'Unexpected GPU lock file symlink; stop.'; exit 1; fi
if [ ! -e "$LOCK_FILE" ]; then sudo sh -c 'umask 000; set -C; : > "$1"' sh "$LOCK_FILE" || { echo 'GPU lock file creation raced or failed; inspect and stop.'; exit 1; }; fi
if [ -L "$LOCK_FILE" ] || [ ! -f "$LOCK_FILE" ]; then echo 'Unexpected GPU lock file type; stop.'; exit 1; fi
LOCK_FILE_STAT="$(sudo stat -c '%u:%g %a %h %F' -- "$LOCK_FILE")" || { echo 'Cannot inspect GPU lock file; stop.'; exit 1; }
case "$LOCK_FILE_STAT" in "0:0 666 1 regular file") ;; *) echo 'GPU lock file must be root:root 666, regular and single-link; stop.'; exit 1 ;; esac
```

Confirm the directory is `root:root 1777` and the lock file is `root:root 666` with link count 1. The runtime validates the filesystem, UUID and mount namespace at startup. If any check fails, stop; never replace an unexpected file/directory.

Store the runtime settings in a local, ignored/private environment file with mode `0600`; never put real values in the repository, command history, frontend environment, screenshots or logs. Generate the token once and deliver it to both NestJS clones through an approved private secret-sharing method. The same token must be set as WSL `AI_RUNTIME_TOKEN` and each backend's `AI_RUNTIME_API_KEY`.

```dotenv
AI_RUNTIME_TOKEN=replace_with_private_secret_before_use
AI_RUNTIME_GPU_UUID=<UUID returned by nvidia-smi>
AI_RUNTIME_MODEL_ID=Qwen/Qwen2.5-1.5B-Instruct
AI_RUNTIME_MODEL_REVISION=989aa7980e4cf806f80c7fef2b1adb7bc71aa306
AI_RUNTIME_LOAD_MODE=nf4
```

Load the private file into the WSL environment without printing it, then start the existing app from the repository root and the active virtual environment:

```bash
set -a
source ~/.config/dacn-ai-runtime.env
set +a
uvicorn ai.runtime.app:app --host 127.0.0.1 --port 8000
```

Wait for Uvicorn's `Application startup complete` message before proceeding. The runtime logs `AI model loaded in ... seconds` when worker startup returns a load duration; this and Uvicorn's startup message are startup-only readiness evidence, not a live health endpoint. An open port or `/openapi.json` proves HTTP availability only. Do not start Uvicorn with `--reload`, do not run another copy, and do not stop the process between requests.

## 4. Verify WSL-to-Windows loopback, then configure Serve

1. On Windows, confirm `http://127.0.0.1:8000/openapi.json` is reachable. Then send an authenticated synthetic request from the Windows host and confirm the worker serves it. Missing/invalid Bearer token must be rejected. Windows-to-WSL localhost forwarding is normally available but must be verified on this machine. Do not widen the WSL bind to make it work.
2. On the Windows host, install Tailscale if not already done and ensure HTTPS certificates are enabled for the tailnet. In an elevated PowerShell terminal, configure Serve to proxy to the already verified local port:

   ```powershell
   tailscale serve --bg --https=443 8000
   tailscale serve status
   ```

   Record the `https://<gpu-host>.<tailnet>.ts.net` URL shown by `tailscale serve status`. Confirm `tailscale funnel status` shows no public listener before using the endpoint. Serve is tailnet-only. It does not start a model. Never enable Funnel; if a public Funnel configuration already exists, stop and disable it before proceeding.
3. In the tailnet access policy, allow only the user's Linux identity/device to reach the GPU Windows host's Serve listener (TCP 443). Preserve existing policy and least-privilege rules; do not replace the whole tailnet policy with a broad allow rule. Verify an authorized Linux device can connect and a tailnet device not allowed by policy cannot.
4. From the user's Linux machine, check the HTTPS URL and perform the authenticated runtime wire test. Also verify missing/invalid runtime Bearer tokens are rejected. Tailscale ACL/HTTPS are additional controls; runtime bearer authentication remains mandatory.
5. Configure each backend's ignored local environment file:

   ```dotenv
   # Teammate's Windows NestJS clone:
   AI_RUNTIME_URL=http://127.0.0.1:8000
   AI_RUNTIME_API_KEY=<same private secret as WSL AI_RUNTIME_TOKEN>

   # User's Linux NestJS clone:
   AI_RUNTIME_URL=https://<gpu-host>.<tailnet>.ts.net
   AI_RUNTIME_API_KEY=<same private secret as WSL AI_RUNTIME_TOKEN>
   ```

   Set the runtime origin only; `RuntimeHttpClient` appends `/v1/infer`. Keep the key server-side; never use `NEXT_PUBLIC_` variables.

To stop sharing the runtime over Tailscale, disable Serve from an elevated Windows terminal:

```powershell
tailscale serve --https=443 8000 off
tailscale serve status
```

This leaves FastAPI running locally in WSL2. Stop FastAPI separately with Ctrl+C when the team is done. Do not delete the model cache or lock directory while the runtime is running.

## 5. Verify NestJS paths and six Lite tasks

The existing API live wire test is opt-in and makes one synthetic `STUDENT_LEARNING_ANALYSIS` request through an isolated test service. It mocks authorization, eligibility and capacity preflight; it does **not** prove production `AiModule`, authorization or capacity readiness. Run only the named live test in each clone; no Python/WSL is needed for this filtered Jest case. Do not set real secrets in shell history or print them.

For each clone, map its backend values to the test variables without echoing values:

- Teammate Windows: route `loopback`, expected/base origin `http://127.0.0.1:8000`.
- User Linux: route `tailscale-serve`, expected/base origin equal to the HTTPS `*.ts.net` origin.
- Both: `AI_RUNTIME_TOKEN` equals that clone's `AI_RUNTIME_API_KEY`; `AI_RUNTIME_PROMPT_VERSIONS` equals the current runtime registry map.
- Set `AI_RUNTIME_LIVE_SMOKE=1` only for this explicit local test. The live test always skips when `CI=true`.

Run from each independent repository clone using Node/pnpm:

```bash
pnpm --filter @dacn/api exec jest --runInBand --runTestsByPath src/ai/ai-runtime-wire.spec.ts --testNamePattern="validates one real output through the explicitly selected live Runtime route"
```

On the GPU host, run the existing six-task Lite smoke from WSL2, not from the user's Linux machine. It needs Linux `SIGALRM`, Python 3.12 and the repository's pnpm/API evaluator. First do a pre-dispatch DNS/TLS reachability check to the Serve URL from WSL. If reachable, set `AI_RUNTIME_BASE_URL` to the HTTPS Serve origin; if unreachable before any inference starts, use loopback and record the run as loopback-only. Never retry or change route after an inference attempt starts. Keep raw output private and redirect stdout:

```bash
read -rp 'Tailscale Serve origin (https://<host>.<tailnet>.ts.net): ' SERVE_ORIGIN
if [[ ! "$SERVE_ORIGIN" =~ ^https://[A-Za-z0-9.-]+\.ts\.net$ ]]; then
  echo 'Enter the HTTPS ts.net origin only; do not include a path.' >&2
  exit 1
fi
  if ! curl --connect-timeout 5 --max-time 10 -fsS "$SERVE_ORIGIN/openapi.json" -o /dev/null; then
    echo 'Serve preflight failed before inference. Stop here; verify DNS/TLS/ACL or explicitly choose the documented loopback fallback, then rerun only before any inference attempt.' >&2
    exit 1
  fi
RESULT_DIR="$(mktemp -d "$HOME/dacn-ai-lite.XXXXXX")"
chmod 700 "$RESULT_DIR"
AI_RUNTIME_BASE_URL="$SERVE_ORIGIN" \
  python ai/benchmark/lite_smoke.py --output-dir "$RESULT_DIR" \
  > "$RESULT_DIR/stdout.json" 2>&1
```

Use `AI_RUNTIME_BASE_URL=http://127.0.0.1:8000` only for the documented pre-dispatch fallback. The runner needs `AI_RUNTIME_TOKEN`; load it from the private environment file. Review results privately and report only per-task PASS/FAIL plus route, not raw prompt/output. All six existing schema, semantic and reference checks must pass before Local GPU PASS. Do not run Full Benchmark or automatic smoke tests.

## Acceptance and limits

Record the actual driver/CUDA/PyTorch/bitsandbytes versions, GPU UUID, model revision/load mode, worker READY, real device placement without CPU offload, authenticated request, repeated requests, graceful shutdown, Windows-to-WSL route, Linux Serve/ACL/Bearer checks and six Lite task results. A 4 GB card is not assumed to satisfy capacity; retain existing capacity preflight and never truncate inputs. If the existing worker cannot provide proof of full device placement without source changes, stop and request a separately reviewed diagnostics proposal.

Local GPU/Tailscale acceptance is **PENDING** until those checks run on the actual teammate GPU and tailnet. The Colab T4 FP16 Lite PASS is preserved historical evidence. This handoff does not make the service available after the WSL laptop sleeps/disconnects, does not clear `DenyAllAiInvocationPolicy` or capacity blockers, and is not production-readiness evidence.

## References

- Microsoft Learn, [Accessing network applications with WSL](https://learn.microsoft.com/en-us/windows/wsl/networking)
- Microsoft Learn, [Windows and Linux interoperability](https://learn.microsoft.com/en-us/windows/dev-environment/wsl-interop)
- Tailscale, [Install on Linux](https://tailscale.com/docs/install/linux)
- Tailscale, [Serve](https://tailscale.com/docs/features/tailscale-serve), [Serve CLI](https://tailscale.com/docs/reference/tailscale-cli/serve), and [Serve examples](https://tailscale.com/docs/reference/examples/serve)
- Tailscale, [Access controls](https://tailscale.com/docs/features/access-control)
