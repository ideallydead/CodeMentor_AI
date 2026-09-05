import os
import pytest
from unittest.mock import patch, MagicMock
from backend.core.llm_client import LLMClient, get_agent_llm_client, _AGENT_CLIENT_CACHE, _extract_json_from_text, PROVIDER_CONFIGS


def test_extract_json_from_text_formats():
    # 1. Raw JSON string
    raw_json = '{"score": 95, "recommendation": "excellent"}'
    assert _extract_json_from_text(raw_json) == {"score": 95, "recommendation": "excellent"}

    # 2. Markdown code block
    md_json = 'Here is the result:\n```json\n{"score": 80, "recommendation": "good"}\n```\n'
    assert _extract_json_from_text(md_json) == {"score": 80, "recommendation": "good"}

    # 3. Embedded JSON object in conversational text
    conv_text = 'The assessment complete. Output: {"score": 70, "recommendation": "fair"}'
    assert _extract_json_from_text(conv_text) == {"score": 70, "recommendation": "fair"}

    # 4. Non-JSON string
    assert _extract_json_from_text("Invalid text without JSON") is None


def test_llm_client_fallback_mode():
    client = LLMClient(provider="together", api_key=None)
    with patch.dict(os.environ, {}, clear=True):
        res = client.generate("Test prompt")
        assert res["is_fallback"] is True
        assert "Fallback response" in res["response"]


def test_llm_client_provider_resolution():
    with patch.dict(os.environ, {"TOGETHER_API_KEY": "test_together_key", "GROQ_API_KEY": "test_groq_key"}):
        client = LLMClient(provider="together")
        candidates = client._resolve_provider_candidates()
        assert len(candidates) == 2
        assert candidates[0][0] == "together"
        assert candidates[1][0] == "groq"


def test_llm_client_provider_failover():
    client = LLMClient(provider="together", api_key="dummy_key")

    mock_response_fail = MagicMock()
    mock_response_fail.status_code = 404
    mock_response_fail.text = "Model not found"

    with patch("httpx.Client.post", return_value=mock_response_fail):
        res = client.generate("Test prompt")
        # Should attempt provider and fall back gracefully
        assert res["is_fallback"] is True


def test_get_agent_llm_client_resolution():
    _AGENT_CLIENT_CACHE.pop("custom_test_agent", None)
    with patch.dict(os.environ, {"CUSTOM_TEST_AGENT_MODEL": "llama-3.3-70b-versatile", "CUSTOM_TEST_AGENT_PROVIDER": "groq"}):
        client = get_agent_llm_client("custom_test_agent")
        assert client.primary_provider == "groq"
        assert client.primary_model == "llama-3.3-70b-versatile"
    _AGENT_CLIENT_CACHE.pop("custom_test_agent", None)


