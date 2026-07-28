import ast
import re
import hashlib
from typing import List, Dict, Any, Tuple

def _python_canonical_ast_tokens(source: str) -> List[str]:
    """
    Parse Python code into AST and return a list of canonical AST node types,
    stripping variable names, literal values, docstrings, and comments.
    """
    tokens: List[str] = []
    try:
        tree = ast.parse(source)
        for node in ast.walk(tree):
            node_type = type(node).__name__
            # Skip pure metadata nodes
            if node_type in ('Load', 'Store', 'Del', 'Param', 'Ctx'):
                continue
            tokens.append(node_type)
    except SyntaxError:
        # Fallback to regex-based structural token extraction if syntax error
        tokens = _fallback_structural_tokens(source)
    return tokens


def _fallback_structural_tokens(source: str) -> List[str]:
    """
    Language-agnostic fallback tokenizer that extracts control structures, operators,
    and keywords while discarding identifiers, string literals, and comments.
    """
    # Remove single line comments
    clean_code = re.sub(r'//.*|#.*', '', source)
    # Remove multi-line comments
    clean_code = re.sub(r'/\*[\s\S]*?\*/|\'\'\'[\s\S]*?\'\'\'|"""[\s\S]*?"""', '', clean_code)
    # Remove string literals
    clean_code = re.sub(r'"([^"\\]|\\.)*"|\'([^\'\\]|\\.)*\'', 'STR_LIT', clean_code)
    # Remove numeric literals
    clean_code = re.sub(r'\b\d+(\.\d+)?\b', 'NUM_LIT', clean_code)

    keywords_pattern = r'\b(for|while|if|else|elif|switch|case|return|try|catch|finally|def|class|public|private|protected|static|void|int|float|double|char|struct|import|include|from)\b'
    keywords = re.findall(keywords_pattern, clean_code)
    
    # Also extract punctuation/operators that reflect structural logic
    structure_tokens = re.findall(r'(\{|\}|\(|\)|\[\]|\+=|-=|\*=|\/=|==|!=|<=|>=|<|>|\&\&|\|\||\+|-|\*|\/|=)', clean_code)
    
    combined = []
    # Interleave keywords and structural symbols as encountered
    for word in re.findall(r'\b[A-Za-z_]\w*\b|[\{\}\(\)\[\]\+\-\*\/\=\<\>\!\&\|]+', clean_code):
        if re.match(keywords_pattern, word):
            combined.append(f"KW_{word.upper()}")
        elif word in ('{', '}', '(', ')', '[', ']', '+', '-', '*', '/', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||'):
            combined.append(f"OP_{word}")

    return combined if combined else ['EMPTY_NODE']


def generate_k_grams(tokens: List[str], k: int = 5) -> List[str]:
    """Generate k-gram hashes from a list of canonical tokens."""
    if len(tokens) < k:
        k_gram_str = "_".join(tokens)
        return [hashlib.md5(k_gram_str.encode('utf-8')).hexdigest()[:12]]
    
    k_grams = []
    for i in range(len(tokens) - k + 1):
        window = "_".join(tokens[i:i+k])
        h = hashlib.md5(window.encode('utf-8')).hexdigest()[:12]
        k_grams.append(h)
    return k_grams


def normalize_ast(source: str, language: str) -> Dict[str, Any]:
    """
    Convert source code into a canonical, identifier-stripped AST token representation.
    
    Returns a dictionary containing:
        - canonical_tokens: List[str]
        - k_grams: List[str]
        - node_count: int
        - fingerprint_hash: str
    """
    lang = language.lower()
    if lang == 'python':
        canonical_tokens = _python_canonical_ast_tokens(source)
    else:
        canonical_tokens = _fallback_structural_tokens(source)

    if not canonical_tokens:
        canonical_tokens = ['EMPTY_NODE']

    k_grams = generate_k_grams(canonical_tokens, k=4)
    fingerprint = hashlib.sha256("_".join(canonical_tokens).encode('utf-8')).hexdigest()[:16]

    return {
        "language": language,
        "canonical_tokens": canonical_tokens,
        "k_grams": k_grams,
        "node_count": len(canonical_tokens),
        "fingerprint_hash": fingerprint
    }
