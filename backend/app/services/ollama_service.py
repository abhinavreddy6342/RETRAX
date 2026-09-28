from __future__ import annotations

from typing import Any

import httpx

from app.core.config import settings


class OllamaServiceError(RuntimeError):
    """Raised when the local Ollama service cannot complete a request."""


class OllamaService:
    """Small async client for the local Ollama HTTP API."""

    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
        timeout_seconds: float | None = None,
    ) -> None:
        self.base_url = (
            base_url or settings.OLLAMA_BASE_URL
        ).rstrip("/")

        self.model = model or settings.OLLAMA_MODEL

        self.timeout_seconds = (
            timeout_seconds
            if timeout_seconds is not None
            else settings.OLLAMA_TIMEOUT_SECONDS
        )

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.2,
        model: str | None = None,
    ) -> dict[str, Any]:
        """
        Send a non-streaming chat request to Ollama.

        Ollama endpoint:
            POST /api/chat
        """
        payload = {
            "model": model or self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
            },
            "keep_alive": "10m",
        }

        url = f"{self.base_url}/api/chat"

        try:
            async with httpx.AsyncClient(
                timeout=self.timeout_seconds
            ) as client:
                response = await client.post(
                    url,
                    json=payload,
                )

            response.raise_for_status()

            data = response.json()

            if not isinstance(data, dict):
                raise OllamaServiceError(
                    "Ollama returned an unexpected response format."
                )

            message = data.get("message")

            if not isinstance(message, dict):
                raise OllamaServiceError(
                    "Ollama response did not contain a message."
                )

            content = message.get("content")

            if not isinstance(content, str):
                raise OllamaServiceError(
                    "Ollama response did not contain text content."
                )

            return data

        except httpx.TimeoutException as exc:
            raise OllamaServiceError(
                f"Ollama request timed out after "
                f"{self.timeout_seconds:.0f} seconds."
            ) from exc

        except httpx.HTTPStatusError as exc:
            detail = exc.response.text[:500]

            raise OllamaServiceError(
                f"Ollama returned HTTP {exc.response.status_code}: {detail}"
            ) from exc

        except httpx.HTTPError as exc:
            raise OllamaServiceError(
                f"Could not connect to Ollama at {url}: {exc}"
            ) from exc

        except ValueError as exc:
            raise OllamaServiceError(
                "Ollama returned invalid JSON."
            ) from exc

    async def text(
        self,
        prompt: str,
        *,
        system: str | None = None,
        temperature: float = 0.2,
        model: str | None = None,
    ) -> str:
        """Convenience wrapper returning only assistant text."""

        messages: list[dict[str, str]] = []

        if system:
            messages.append(
                {
                    "role": "system",
                    "content": system,
                }
            )

        messages.append(
            {
                "role": "user",
                "content": prompt,
            }
        )

        data = await self.chat(
            messages,
            temperature=temperature,
            model=model,
        )

        return str(data["message"]["content"]).strip()

    async def health(self) -> bool:
        """Return True when Ollama responds to its tags endpoint."""

        url = f"{self.base_url}/api/tags"

        try:
            async with httpx.AsyncClient(
                timeout=10.0
            ) as client:
                response = await client.get(url)

            response.raise_for_status()
            return True

        except httpx.HTTPError:
            return False


ollama_service = OllamaService()