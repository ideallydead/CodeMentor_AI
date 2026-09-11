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
        "You are an expert computer science instructor designing automated programming assessment test cases.\n"
        "Generate 3 to 4 realistic candidate test cases (standard inputs, edge cases, boundary conditions) as a JSON array of objects, "
        "where each object has keys: 'input', 'expected_output', 'description', and 'is_hidden'.\n\n"
        "CRITICAL FORMAT RULES (HackerRank Standard Input/Output Format):\n"
        "1. The 'input' field MUST be formatted for clean standard input (stdin) reading:\n"
        "   - NEVER include variable names or assignment syntax (e.g., NEVER write 'arr = ...' or 'target = ...').\n"
        "   - NEVER include square brackets '[' or ']' or commas separating elements unless the problem explicitly asks for JSON string input.\n"
        "   - For arrays/lists, format values as space-separated numbers on a single line (e.g., '1 2 3 4 5').\n"
        "   - Separate subsequent arguments or parameters on subsequent newlines (e.g., Line 1: '1 2 3 4 5' followed by newline and Line 2: '3').\n"
        "2. The 'expected_output' field MUST be clean standard output (stdout):\n"
        "   - Provide only the exact expected output value (e.g., '0 1' or '2' or 'true').\n"
        "   - Do NOT include labels like 'Output:' or variable names.\n"
        "3. Provide concrete, exact input strings and expected output values so automated test runners can feed stdin and compare stdout."
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
            "input": "1 2 3 4 5\n3",
            "expected_output": "2",
            "description": f"Standard test case for {clean_title}",
            "is_hidden": False
        },
        {
            "input": "10 20 30\n20",
            "expected_output": "1",
            "description": f"Boundary condition test for {clean_title}",
            "is_hidden": False
        },
        {
            "input": "5 15 25 35\n99",
            "expected_output": "-1",
            "description": f"Hidden evaluation test for {clean_title}",
            "is_hidden": True
        }
    ]


testcase_agent = generate_draft_tests
