from __future__ import annotations

import base64
import json
from dataclasses import dataclass

import httpx


@dataclass(frozen=True)
class DedalusConfig:
    api_key: str
    api_url: str = "https://api.dedaluslabs.ai"
    model: str = "openai/gpt-5-nano"


def _data_url_from_image_bytes(image_bytes: bytes, mime: str) -> str:
    b64 = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{mime};base64,{b64}"


def _extract_first_json_object(text: str) -> str:
    # Mirror the edge-function behavior: tolerate wrappers, grab the first JSON object.
    start = text.find("{")
    if start < 0:
        raise ValueError("Model response did not contain JSON")

    depth = 0
    in_string = False
    escaped = False

    for i in range(start, len(text)):
        ch = text[i]
        if in_string:
            if escaped:
                escaped = False
                continue
            if ch == "\\":
                escaped = True
                continue
            if ch == '"':
                in_string = False
            continue

        if ch == '"':
            in_string = True
            continue

        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]

    raise ValueError("Model response contained '{' but no complete JSON object")


async def extract_receipt_json(
    cfg: DedalusConfig,
    *,
    image_bytes: bytes,
    image_mime: str,
    system_prompt: str,
    user_prompt: str,
    max_completion_tokens: int = 3200,
) -> dict:
    base_url = cfg.api_url.rstrip("/")
    image_url = _data_url_from_image_bytes(image_bytes, image_mime)

    payload = {
        "model": cfg.model,
        "temperature": 0,
        "max_completion_tokens": max_completion_tokens,
        "messages": [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_prompt},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            },
        ],
    }

    headers = {"Authorization": f"Bearer {cfg.api_key}", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=75.0) as client:
        resp = await client.post(f"{base_url}/v1/chat/completions", headers=headers, json=payload)
        data = resp.json()
        if resp.status_code >= 400:
            msg = (data.get("error") or {}).get("message") or f"Dedalus error {resp.status_code}"
            raise RuntimeError(msg)

    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError("No choices returned from Dedalus")

    content = (((choices[0] or {}).get("message") or {}).get("content")) or ""
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("Empty message content from Dedalus")

    try:
        return json.loads(content)
    except Exception:
        return json.loads(_extract_first_json_object(content))

