import asyncio

import httpx

from app.config import INFERENCE_TIMEOUT_SECONDS, RuntimeSettings


class EngineUnavailable(Exception):
    pass


class EngineTimeout(Exception):
    pass


class EngineFailure(Exception):
    pass


class OllamaEngine:
    def __init__(self, settings: RuntimeSettings, transport: httpx.AsyncBaseTransport | None = None):
        self.settings = settings
        self.transport = transport

    async def ready(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5, transport=self.transport) as client:
                response = await client.get(f"{self.settings.ollama_base_url}/api/tags")
            if response.status_code != 200:
                return False
            models = response.json().get("models", [])
            return any(
                model.get("name") == self.settings.model and model.get("digest") == self.settings.model_digest
                for model in models
            )
        except (httpx.RequestError, ValueError):
            return False

    async def generate(self, task: str, prompt: str, _output_schema: dict) -> str:
        try:
            async with httpx.AsyncClient(timeout=INFERENCE_TIMEOUT_SECONDS, transport=self.transport) as client:
                response = await asyncio.wait_for(
                    client.post(
                        f"{self.settings.ollama_base_url}/api/generate",
                        json={
                            "model": self.settings.model,
                            "prompt": prompt,
                            "stream": False,
                            "format": "json",
                            "options": self.settings.generation_options,
                        },
                    ),
                    timeout=INFERENCE_TIMEOUT_SECONDS,
                )
            if response.status_code in (404, 503):
                raise EngineUnavailable
            if response.status_code >= 400:
                raise EngineFailure
            response.raise_for_status()
            try:
                result = response.json()
            except ValueError as error:
                raise EngineFailure from error
            text = result.get("response") if isinstance(result, dict) else None
            if not isinstance(text, str):
                raise EngineFailure
            return text
        except (TimeoutError, httpx.TimeoutException) as error:
            raise EngineTimeout from error
        except httpx.RequestError as error:
            raise EngineUnavailable from error
