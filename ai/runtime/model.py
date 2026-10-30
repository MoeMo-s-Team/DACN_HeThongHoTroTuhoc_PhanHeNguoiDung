from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import Any

from ai.runtime.prompts import PROMPT_VERSIONS, build_messages


class InputTooLarge(Exception):
    pass


class GenerationFailure(Exception):
    pass


@dataclass(frozen=True)
class GenerationResult:
    raw_text: str
    output_token_count: int
    termination_reason: str


@dataclass(frozen=True)
class ModelConfig:
    model_id: str
    revision: str
    max_new_tokens: int = 1024
    input_safety_margin_tokens: int = 128
    context_window_tokens: int | None = None
    load_mode: str = "nf4"

    def __post_init__(self):
        if not self.model_id or not re.fullmatch(r"[0-9a-f]{40}", self.revision):
            raise ValueError("immutable model ID and revision are required")
        if self.max_new_tokens <= 0 or self.input_safety_margin_tokens < 0:
            raise ValueError("invalid model generation limits")
        if self.load_mode not in {"nf4", "fp16"}:
            raise ValueError("AI_RUNTIME_LOAD_MODE must be nf4 or fp16")

    @classmethod
    def from_environment(cls) -> "ModelConfig":
        model_id = os.environ.get("AI_RUNTIME_MODEL_ID", "")
        revision = os.environ.get("AI_RUNTIME_MODEL_REVISION", "")
        if not model_id or not re.fullmatch(r"[0-9a-f]{40}", revision):
            raise ValueError("immutable model ID and revision are required")
        return cls(
            model_id=model_id,
            revision=revision,
            max_new_tokens=int(os.environ.get("AI_RUNTIME_MAX_NEW_TOKENS", "1024")),
            input_safety_margin_tokens=int(os.environ.get("AI_RUNTIME_INPUT_MARGIN_TOKENS", "128")),
            context_window_tokens=int(os.environ["AI_RUNTIME_CONTEXT_WINDOW_TOKENS"])
            if os.environ.get("AI_RUNTIME_CONTEXT_WINDOW_TOKENS") else None,
            load_mode=os.environ.get("AI_RUNTIME_LOAD_MODE", "nf4"),
        )


@dataclass
class LoadedModel:
    model: Any
    tokenizer: Any
    context_window_tokens: int
    max_new_tokens: int
    input_safety_margin_tokens: int
    model_id: str
    prompt_versions: dict[str, str] = field(default_factory=lambda: dict(PROMPT_VERSIONS))
    load_duration_seconds: float | None = None


_model: LoadedModel | None = None


def load_model(config: ModelConfig) -> LoadedModel:
    if config.max_new_tokens <= 0 or config.input_safety_margin_tokens < 0:
        raise ValueError("invalid model generation limits")
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    load_options = {"device_map": "auto"}
    if config.load_mode == "nf4":
        from transformers import BitsAndBytesConfig
        load_options["quantization_config"] = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True,
            bnb_4bit_compute_dtype=torch.float16,
        )
    else:
        load_options["torch_dtype"] = torch.float16
    tokenizer = AutoTokenizer.from_pretrained(config.model_id, revision=config.revision)
    model = AutoModelForCausalLM.from_pretrained(
        config.model_id, revision=config.revision, **load_options,
    )
    if config.load_mode == "fp16" and any(
        not str(parameter.device).startswith("cuda") or parameter.dtype is not torch.float16
        for parameter in model.parameters()
    ):
        raise RuntimeError("FP16 model parameters must be on CUDA and float16")
    model_context = getattr(model.config, "max_position_embeddings", None)
    context_window = min(config.context_window_tokens, model_context) if config.context_window_tokens else model_context
    if not isinstance(context_window, int) or context_window <= 0:
        raise RuntimeError("model context window is unavailable")
    model.eval()
    return LoadedModel(
        model=model,
        tokenizer=tokenizer,
        context_window_tokens=context_window,
        max_new_tokens=config.max_new_tokens,
        input_safety_margin_tokens=config.input_safety_margin_tokens,
        model_id=config.model_id,
    )


def configure_model(loaded_model: LoadedModel) -> None:
    global _model
    _model = loaded_model


def _token_count(input_ids: Any) -> int:
    shape = getattr(input_ids, "shape", None)
    return int(shape[-1]) if shape is not None else len(input_ids[0])


def generate(task: str, input: dict) -> GenerationResult:
    if _model is None:
        raise GenerationFailure("model is unavailable")
    try:
        messages = build_messages(task, input)
        prompt = _model.tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True,
        )
        encoded = _model.tokenizer(
            prompt, return_tensors="pt", truncation=False, add_special_tokens=False,
        )
        input_ids = encoded["input_ids"]
        input_tokens = _token_count(input_ids)
        if input_tokens + _model.max_new_tokens + _model.input_safety_margin_tokens > _model.context_window_tokens:
            raise InputTooLarge()
        device = getattr(_model.model, "device", None)
        if device is None:
            device = next(_model.model.parameters()).device
        encoded = {key: value.to(device) for key, value in encoded.items()}
        generated = _model.model.generate(
            **encoded,
            max_new_tokens=_model.max_new_tokens,
            do_sample=False,
            eos_token_id=_model.tokenizer.eos_token_id,
            pad_token_id=(
                _model.tokenizer.pad_token_id
                if _model.tokenizer.pad_token_id is not None
                else _model.tokenizer.eos_token_id
            ),
        )
        sequence = generated[0]
        output_ids = sequence[input_tokens:]
        output_tokens = output_ids.tolist() if hasattr(output_ids, "tolist") else list(output_ids)
        eos = _model.tokenizer.eos_token_id in output_tokens
        text = _model.tokenizer.decode(output_ids, skip_special_tokens=True)
        text.encode("utf-8")
        return GenerationResult(text, len(output_tokens), "eos" if eos else "length")
    except InputTooLarge:
        raise
    except Exception:
        raise GenerationFailure("inference failed") from None
