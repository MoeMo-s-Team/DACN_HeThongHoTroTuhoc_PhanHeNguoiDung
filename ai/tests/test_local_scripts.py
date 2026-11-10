import json
import os
import stat
import subprocess
from pathlib import Path


def test_setup_creates_private_env_before_starting_runtime(tmp_path: Path) -> None:
    root = tmp_path / "repo"
    scripts = root / "ai/scripts"
    scripts.mkdir(parents=True)
    (root / ".env.example").write_text("AI_RUNTIME_TOKEN=\nAI_RUNTIME_BASE_URL=\nAI_RUNTIME_PORT=8001\n")
    manifest = root / "deployment/model-manifest.json"
    manifest.parent.mkdir()
    manifest.write_text(
        json.dumps(
            {
                "modelDigest": "65ec06548149b04c096a120e4a6da9d4017ea809c91734ea5631e89f96ddc57b",
                "ollama": {"sourceModel": "qwen2.5:1.5b"},
            }
        )
    )
    script = Path(__file__).resolve().parents[1] / "scripts/setup.sh"
    target = scripts / "setup.sh"
    target.write_bytes(script.read_bytes())
    target.chmod(0o755)
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    docker = fake_bin / "docker"
    docker.write_text(
        "#!/bin/sh\n"
        "case \"$*\" in *'ollama list'*) printf "
        "'NAME ID SIZE MODIFIED\\nqwen2.5:1.5b 65ec06548149 1 GB now\\n' ;; esac\n"
    )
    docker.chmod(0o755)

    result = subprocess.run(
        [str(target)],
        check=False,
        capture_output=True,
        text=True,
        env={**os.environ, "PATH": f"{fake_bin}:{os.environ['PATH']}"},
    )

    env_file = root / ".env"
    assert result.returncode == 0, result.stderr
    assert stat.S_IMODE(env_file.stat().st_mode) == 0o600
    assert "AI_RUNTIME_TOKEN=" in env_file.read_text()


def test_smoke_uses_runtime_url_from_root_env(tmp_path: Path) -> None:
    root = tmp_path / "repo"
    scripts = root / "ai/scripts"
    scripts.mkdir(parents=True)
    (root / ".env").write_text("AI_RUNTIME_BASE_URL=http://127.0.0.1:8123\n")
    source = Path(__file__).resolve().parents[1] / "scripts/smoke.sh"
    target = scripts / "smoke.sh"
    target.write_bytes(source.read_bytes())
    target.chmod(0o755)
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    curl = fake_bin / "curl"
    curl.write_text('#!/bin/sh\nprintf \'%s\\n\' "$*" >> "$CURL_LOG"\necho ok\n')
    curl.chmod(0o755)
    log = tmp_path / "curl.log"
    environment = {**os.environ, "PATH": f"{fake_bin}:{os.environ['PATH']}", "CURL_LOG": str(log)}
    environment.pop("AI_RUNTIME_BASE_URL", None)

    result = subprocess.run([str(target)], check=False, capture_output=True, text=True, env=environment)

    assert result.returncode == 0, result.stderr
    assert "http://127.0.0.1:8123/health/live" in log.read_text()
    assert "http://127.0.0.1:8123/health/ready" in log.read_text()
