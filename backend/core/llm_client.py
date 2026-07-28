import os
import json
import logging
from typing import Dict, Any, Optional
import httpx
from backend.core.config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    def __init__(self, provider: Optional[str] = None, model: Optional[str] = None, api_key: Optional[str] = None):
        self.provider = provider or settings.llm_provider
        self.model = model or settings.llm_model
        self.api_key = api_key or settings.llm_api_key or os.getenv("LLM_API_KEY")
        self.api_base = os.getenv("LLM_API_BASE") or "https://api.groq.com/openai/v1"

    def generate(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None,
        system_prompt: Optional[str] = None,
        json_mode: bool = True
    ) -> Dict[str, Any]:
        """
        Generate completion using LLM API with fallback handling.
        """
        if not self.api_key:
            logger.info("LLM_API_KEY not configured. Using deterministic agent fallback response.")
            return {
                'provider': self.provider,
                'model': self.model,
                'response': f"Fallback response for prompt: {prompt[:50]}...",
                'is_fallback': True
            }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        context_str = json.dumps(context, indent=2) if context else ""
        user_content = f"{prompt}\nContext:\n{context_str}" if context_str else prompt
        messages.append({"role": "user", "content": user_content})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 1024
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(f"{self.api_base}/chat/completions", headers=headers, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    content = data['choices'][0]['message']['content']
                    
                    if json_mode:
                        try:
                            json_obj = json.loads(content)
                            return {
                                'provider': self.provider,
                                'model': self.model,
                                'parsed': json_obj,
                                'raw': content,
                                'is_fallback': False
                            }
                        except json.JSONDecodeError:
                            pass

                    return {
                        'provider': self.provider,
                        'model': self.model,
                        'response': content,
                        'is_fallback': False
                    }
                else:
                    logger.warning(f"LLM API returned status {response.status_code}: {response.text}")
        except Exception as exc:
            logger.warning(f"LLM API request failed: {exc}")

        return {
            'provider': self.provider,
            'model': self.model,
            'response': f"Fallback response after API exception: {prompt[:50]}...",
            'is_fallback': True
        }

    def health_check(self) -> bool:
        return bool(self.api_key)


llm_client = LLMClient()

