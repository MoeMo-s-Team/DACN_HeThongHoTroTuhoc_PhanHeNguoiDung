import json
import os
import re
from dataclasses import dataclass
from pathlib import Path

from app.tasks.registry import TASKS

ROOT = Path(__file__).resolve().parents[2]
MODEL_MANIFEST = Path(os.getenv("AI_MODEL_MANIFEST", ROOT / "deployment/model-manifest.json"))
INFERENCE_TIMEOUT_SECONDS = 60


@dataclass(frozen=True)
class RuntimeSettings:
    token: str
    ollama_base_url: str
    model: str
    model_id: str
    model_digest: str
    prompt_versions: dict[str, str]
    generation_options: dict

    @classmethod
    def from_env(cls) -> "RuntimeSettings":
        token = os.getenv("AI_RUNTIME_TOKEN", "")
        if not token.strip() or not token.isascii() or token == "replace-with-a-local-secret":
            raise RuntimeError("AI_RUNTIME_TOKEN must be configured")
        manifest_path = Path(os.getenv("AI_MODEL_MANIFEST", MODEL_MANIFEST))
        manifest = json.loads(manifest_path.read_text())
        model = manifest["ollama"]["runtimeModel"]
        digest = manifest["modelDigest"]
        prompt_versions = {task: item["prompt_version"] for task, item in TASKS.items()}
        if not model or not re.fullmatch(r"[0-9a-f]{64}", digest) or manifest["promptVersions"] != prompt_versions:
            raise RuntimeError("AI model manifest is invalid")
        return cls(
            token=token,
            ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/"),
            model=model,
            model_id=f"{manifest['modelName']}@sha256:{digest}",
            model_digest=digest,
            prompt_versions=prompt_versions,
            generation_options=manifest["ollama"]["options"],
        )
