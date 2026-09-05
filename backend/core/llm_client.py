import os
import re
import json
import time
import logging
from typing import Dict, Any, Optional, List, Tuple
import httpx
from backend.core.config import settings

logger = logging.getLogger(__name__)

PROVIDER_CONFIGS = {
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "default_model": "llama-3.3-70b-versatile",
        "env_key": "GROQ_API_KEY"
    },
    "together": {
        "base_url": "https://api.together.xyz/v1",
        "default_model": "Qwen/Qwen2.5-Coder-32B-Instruct",
        "env_key": "TOGETHER_API_KEY"
    },
    "fireworks": {
        "base_url": "https://api.fireworks.ai/inference/v1",
        "default_model": "accounts/fireworks/models/qwen2.5-coder-32b-instruct",
        "env_key": "FIREWORKS_API_KEY"
    },
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "default_model": "gpt-3.5-turbo",
        "env_key": "OPENAI_API_KEY"
    }
}


MODEL_ALIASES = {
    "groq": {
        "deepseek-coder": "llama-3.3-70b-versatile",
        "qwen2.5-coder": "llama-3.3-70b-versatile",
        "code-llama": "llama-3.3-70b-versatile"
    },
    "together": {
        "deepseek-coder": "deepseek-ai/DeepSeek-Coder-V2-Instruct",
        "qwen2.5-coder": "Qwen/Qwen2.5-Coder-32B-Instruct",
        "code-llama": "codellama/CodeLlama-34b-Instruct-hf"
    },
    "fireworks": {
        "deepseek-coder": "accounts/fireworks/models/qwen2.5-coder-32b-instruct",
        "qwen2.5-coder": "accounts/fireworks/models/qwen2.5-coder-32b-instruct"
    }
}


def _extract_json_from_text(text: str) -> Optional[Dict[str, Any]]:
    """
    Extract and parse JSON object from raw LLM text, including markdown ```json blocks.
    """
    if not text:
        return None

    # Try direct parse first
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # Try extracting markdown ```json ... ``` code blocks
    match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text, re.IGNORECASE)
    if match:
        block_text = match.group(1).strip()
        try:
            return json.loads(block_text)
        except json.JSONDecodeError:
            pass

    # Try extracting first {...} object
    match_obj = re.search(r'(\{[\s\S]*\})', text)
    if match_obj:
        try:
            return json.loads(match_obj.group(1))
        except json.JSONDecodeError:
            pass

    return None


class LLMClient:
    def __init__(
        self,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None
    ):
        self.primary_provider = (provider or settings.llm_provider or "together").lower()
        self.primary_model = model or settings.llm_model
        self.override_api_key = api_key or settings.llm_api_key or os.getenv("LLM_API_KEY")

    def _resolve_provider_candidates(self) -> List[Tuple[str, str, str, str]]:
        """
        Build an ordered list of (provider_name, base_url, model_name, api_key) candidates.
        """
        candidates = []

        # 1. Primary provider
        p_name = self.primary_provider
        p_cfg = PROVIDER_CONFIGS.get(p_name, PROVIDER_CONFIGS["together"])
        p_key = (
            self.override_api_key
            or getattr(settings, "llm_api_key", None)
            or os.getenv(p_cfg["env_key"])
            or os.getenv("LLM_API_KEY")
            or os.getenv("GROQ_API_KEY")
            or os.getenv("TOGETHER_API_KEY")
            or os.getenv("FIREWORKS_API_KEY")
        )
        p_base = os.getenv("LLM_API_BASE") or p_cfg["base_url"]
        raw_model = self.primary_model or p_cfg["default_model"]
        p_model = MODEL_ALIASES.get(p_name, {}).get(raw_model, raw_model)

        if p_key:
            candidates.append((p_name, p_base, p_model, p_key))

        # 2. Secondary fallback providers
        for name, cfg in PROVIDER_CONFIGS.items():
            if name == p_name:
                continue
            key = os.getenv(cfg["env_key"])
            if key:
                mapped = MODEL_ALIASES.get(name, {}).get(cfg["default_model"], cfg["default_model"])
                candidates.append((name, cfg["base_url"], mapped, key))

        return candidates

    def generate(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None,
        system_prompt: Optional[str] = None,
        json_mode: bool = True
    ) -> Dict[str, Any]:
        """
        Generate completion using cloud LLM APIs with automatic multi-provider failover.
        """
        candidates = self._resolve_provider_candidates()

        if not candidates:
            logger.info("No LLM API keys configured. Returning deterministic fallback response.")
            return {
                'provider': self.primary_provider,
                'model': self.primary_model or 'deterministic-fallback',
                'response': f"Fallback response for prompt: {prompt[:60]}...",
                'parsed': None,
                'is_fallback': True
            }

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        context_str = json.dumps(context, indent=2) if context else ""
        user_content = f"{prompt}\nContext:\n{context_str}" if context_str else prompt
        messages.append({"role": "user", "content": user_content})

        for p_name, p_base, p_model, p_key in candidates:
            start_time = time.time()
            headers = {
                "Authorization": f"Bearer {p_key}",
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 CodeMentor-AI/1.0"
            }
            payload = {
                "model": p_model,
                "messages": messages,
                "temperature": 0.2,
                "max_tokens": 1024
            }

            try:
                with httpx.Client(timeout=10.0) as client:
                    response = client.post(f"{p_base}/chat/completions", headers=headers, json=payload)
                    latency = round((time.time() - start_time) * 1000, 2)

                    if response.status_code == 200:
                        data = response.json()
                        content = data['choices'][0]['message']['content']
                        parsed_json = _extract_json_from_text(content) if json_mode else None

                        return {
                            'provider': p_name,
                            'model': p_model,
                            'parsed': parsed_json,
                            'response': content,
                            'latency_ms': latency,
                            'is_fallback': False
                        }
                    else:
                        logger.warning(f"LLM Provider '{p_name}' ({p_model}) returned HTTP {response.status_code}: {response.text[:120]}")
            except Exception as exc:
                logger.warning(f"LLM Provider '{p_name}' request failed: {exc}")

        # All providers attempted and failed
        return {
            'provider': self.primary_provider,
            'model': self.primary_model or 'deterministic-fallback',
            'response': f"Fallback response after API exception for prompt: {prompt[:60]}...",
            'parsed': None,
            'is_fallback': True
        }

    def health_check(self) -> bool:
        candidates = self._resolve_provider_candidates()
        return len(candidates) > 0


llm_client = LLMClient()

_AGENT_CLIENT_CACHE: Dict[str, LLMClient] = {}


def get_agent_llm_client(agent_name: str) -> LLMClient:
    """
    Retrieve or create a specialized LLMClient instance for a given agent.
    If specific environment overrides exist for the agent (e.g., MENTOR_AGENT_MODEL / MENTOR_AGENT_PROVIDER),
    it instantiates a dedicated LLMClient with those settings. Otherwise, it returns the default shared LLMClient.
    """
    clean_name = agent_name.lower().replace("-", "_")
    if clean_name in _AGENT_CLIENT_CACHE:
        return _AGENT_CLIENT_CACHE[clean_name]

    provider_attr = f"{clean_name}_provider"
    model_attr = f"{clean_name}_model"

    agent_provider = getattr(settings, provider_attr, None) or os.getenv(f"{clean_name.upper()}_PROVIDER")
    agent_model = getattr(settings, model_attr, None) or os.getenv(f"{clean_name.upper()}_MODEL")

    if agent_provider or agent_model:
        client = LLMClient(provider=agent_provider, model=agent_model)
    else:
        client = llm_client

    _AGENT_CLIENT_CACHE[clean_name] = client
    return client

