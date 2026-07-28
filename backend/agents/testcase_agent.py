from typing import List, Dict, Any
from backend.core.llm_client import llm_client


def generate_draft_tests(title: str, description: str, language: str) -> List[Dict[str, Any]]:
    """
    Question-setup time agent: Generates a draft test suite for an assignment.
    
    Args:
        title: Assignment title
        description: Problem description and constraints
        language: Programming language (python, java, c)
        
    Returns:
        List of draft test case dicts with 'input', 'expected_output', and 'description'
    """
    system_prompt = (
        "You are an expert computer science instructor designing automated programming assessment test cases. "
        "Generate 3 to 5 candidate test cases (standard inputs, edge cases, boundary conditions) as a JSON array of objects, "
        "where each object has keys: 'input', 'expected_output', 'description', and 'is_hidden'."
    )
    user_prompt = f"Title: {title}\nLanguage: {language}\nDescription/Constraints:\n{description}"

    llm_res = llm_client.generate(prompt=user_prompt, system_prompt=system_prompt, json_mode=True)

    if not llm_res.get('is_fallback') and 'parsed' in llm_res and isinstance(llm_res['parsed'], list):
        return llm_res['parsed']

    # Deterministic fallback candidate test suite
    return [
        {
            "input": f"Sample input for {title}",
            "expected_output": f"Sample expected output for {title}",
            "description": f"Standard input case for {title}",
            "is_hidden": False
        },
        {
            "input": f"Edge input for {title}",
            "expected_output": f"Boundary output for {title}",
            "description": f"Boundary edge case for {title}",
            "is_hidden": False
        },
        {
            "input": f"Hidden test for {title}",
            "expected_output": f"Hidden output for {title}",
            "description": f"Hidden test case for {title}",
            "is_hidden": True
        }
    ]



testcase_agent = generate_draft_tests



