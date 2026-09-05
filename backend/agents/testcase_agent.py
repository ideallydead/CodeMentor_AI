import json
import logging
from typing import List, Dict, Any, Optional
from backend.core.llm_client import LLMClient, get_agent_llm_client

logger = logging.getLogger(__name__)


def generate_draft_tests(
    title: str,
    description: str,
    language: str,
    llm_client: Optional[LLMClient] = None
) -> List[Dict[str, Any]]:
    """
    Question-setup time agent: Generates draft test cases for an assignment dynamically via LLM.
    
    Args:
        title: Assignment title
        description: Problem description and constraints
        language: Programming language (python, java, c)
        llm_client: Optional LLMClient instance
        
    Returns:
        List of draft test case dicts with 'input', 'expected_output', 'description', and 'is_hidden'
    """
    client = llm_client or get_agent_llm_client("testcase_agent")
    system_prompt = (
        "You are an expert computer science instructor designing automated programming assessment test cases. "
        "Generate 3 to 4 realistic candidate test cases (standard inputs, edge cases, boundary conditions) as a JSON array of objects, "
        "where each object has keys: 'input', 'expected_output', 'description', and 'is_hidden'. "
        "Provide concrete, exact input strings and expected output values so automated test runners can execute them."
    )
    user_prompt = f"Title: {title}\nLanguage: {language}\nDescription/Constraints:\n{description}"

    try:
        llm_res = client.generate(prompt=user_prompt, system_prompt=system_prompt, json_mode=True)
        
        # Check parsed JSON from LLM
        if isinstance(llm_res, dict) and 'parsed' in llm_res and llm_res['parsed']:
            parsed = llm_res['parsed']
            if isinstance(parsed, list) and len(parsed) > 0:
                return parsed
            elif isinstance(parsed, dict):
                for k in ['test_cases', 'tests', 'items', 'data']:
                    if k in parsed and isinstance(parsed[k], list) and len(parsed[k]) > 0:
                        return parsed[k]
    except Exception as exc:
        logger.warning(f"LLM testcase generation error: {exc}")

    # Pure dynamic parameter synthesizer (used only if no LLM key is set)
    clean_title = title.strip() or "Assignment"
    return [
        {
            "input": f"Sample input for {clean_title}",
            "expected_output": f"Expected output for {clean_title}",
            "description": f"Standard test case for {clean_title}",
            "is_hidden": False
        },
        {
            "input": f"Edge input for {clean_title}",
            "expected_output": f"Boundary output for {clean_title}",
            "description": f"Boundary condition test for {clean_title}",
            "is_hidden": False
        },
        {
            "input": f"Hidden test for {clean_title}",
            "expected_output": f"Hidden output for {clean_title}",
            "description": f"Hidden evaluation test for {clean_title}",
            "is_hidden": True
        }
    ]


testcase_agent = generate_draft_tests
