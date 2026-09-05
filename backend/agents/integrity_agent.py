from typing import List, Dict, Any, Optional
from backend.core.schemas import ParsedSubmission, AgentOutput
from backend.core.ast_normalizer import normalize_ast
from backend.core.llm_client import LLMClient, get_agent_llm_client
from backend.agents.schemas import IntegrityReport, IntegrityMatchDetails, RefactoringPattern


def _calculate_jaccard_similarity(set_a: set, set_b: set) -> float:
    """Calculate Jaccard similarity between two sets of k-gram hashes."""
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a.intersection(set_b))
    union = len(set_a.union(set_b))
    if union == 0:
        return 0.0
    return (intersection / union) * 100.0


def _detect_refactoring(target_norm: Dict[str, Any], hist_norm: Dict[str, Any], target_source: str, hist_source: str, sim_score: float) -> List[RefactoringPattern]:
    """Identify structural refactoring patterns such as variable renaming or loop conversion."""
    patterns = []
    
    # 1. Identifier Renaming: High AST similarity but low raw string similarity
    if sim_score >= 80.0:
        # Check if raw text matches or if variable names differ
        target_words = set(target_source.split())
        hist_words = set(hist_source.split())
        text_sim = len(target_words.intersection(hist_words)) / max(len(target_words.union(hist_words)), 1) * 100.0
        
        if text_sim < 70.0:
            patterns.append(RefactoringPattern(
                pattern_type="identifier_renaming",
                description="High AST structural match with renamed variables/identifiers",
                confidence=round(min(1.0, (sim_score - text_sim) / 100.0 + 0.6), 2)
            ))
            
    # 2. Control Structure Alignment
    target_loops = [t for t in target_norm.get('canonical_tokens', []) if 'FOR' in t or 'WHILE' in t or 'For' in t or 'While' in t]
    hist_loops = [t for t in hist_norm.get('canonical_tokens', []) if 'FOR' in t or 'WHILE' in t or 'For' in t or 'While' in t]
    if target_loops and hist_loops and len(target_loops) == len(hist_loops):
        patterns.append(RefactoringPattern(
            pattern_type="control_flow_equivalence",
            description="Equivalent control flow structure (loop count and nesting depth align)",
            confidence=0.85
        ))
        
    return patterns


def integrity_agent(
    parsed_submission: ParsedSubmission,
    historical_submissions: Optional[List[Dict[str, Any]]] = None,
    llm_client: Optional[LLMClient] = None
) -> AgentOutput:
    """
    Academic Integrity Agent: Performs AST-level structural similarity comparison,
    refactoring detection, and generates an explainable integrity report.
    """
    client = llm_client or get_agent_llm_client("integrity_agent")
    target_norm = normalize_ast(parsed_submission.source, parsed_submission.language)
    target_kgrams = set(target_norm['k_grams'])
    
    matches: List[IntegrityMatchDetails] = []
    max_similarity = 0.0

    if historical_submissions:
        for hist in historical_submissions:
            hist_sub_id = str(hist.get('id') or hist.get('submission_id') or 'hist_sub')
            
            # Skip comparing submission to itself
            if hist_sub_id == parsed_submission.submission_id:
                continue
                
            hist_source = hist.get('source_code') or hist.get('source') or ''
            hist_lang = hist.get('language') or parsed_submission.language
            hist_norm = normalize_ast(hist_source, hist_lang)
            hist_kgrams = set(hist_norm['k_grams'])
            
            sim_score = _calculate_jaccard_similarity(target_kgrams, hist_kgrams)
            matching_count = len(target_kgrams.intersection(hist_kgrams))
            
            refactoring = _detect_refactoring(target_norm, hist_norm, parsed_submission.source, hist_source, sim_score)
            
            if sim_score > max_similarity:
                max_similarity = sim_score
                
            if sim_score > 15.0: # Track meaningful structural overlaps
                matches.append(IntegrityMatchDetails(
                    matched_submission_id=hist_sub_id,
                    matched_student_id=str(hist.get('student_id')) if hist.get('student_id') else None,
                    similarity_score=round(sim_score, 1),
                    matching_kgram_count=matching_count,
                    total_kgram_count=len(target_kgrams),
                    refactoring_patterns=refactoring
                ))

    # Sort matches by similarity score descending
    matches.sort(key=lambda m: m.similarity_score, reverse=True)
    
    # Determine risk level
    if max_similarity >= 75.0:
        risk_level = 'high'
        summary_msg = f"High structural similarity ({max_similarity:.1f}%) detected with prior submission(s). AST inspection indicates structural duplication."
        recommendations = [
            "Faculty review recommended for potential academic dishonesty",
            "Conduct personalized viva oral examination to verify code authorship"
        ]
    elif max_similarity >= 45.0:
        risk_level = 'moderate'
        summary_msg = f"Moderate structural similarity ({max_similarity:.1f}%) detected. Standard algorithmic structure overlap."
        recommendations = [
            "Review detected refactoring patterns in Faculty Dashboard",
            "Verify whether student utilized standard template code"
        ]
    else:
        risk_level = 'low'
        summary_msg = f"Low structural similarity ({max_similarity:.1f}% max). Submission demonstrates distinct AST node structure."
        recommendations = [
            "No academic integrity concerns flagged."
        ]

    report = IntegrityReport(
        submission_id=parsed_submission.submission_id,
        risk_level=risk_level,
        max_similarity_score=round(max_similarity, 1),
        matches=matches[:5], # Keep top 5 matches
        explainable_summary=summary_msg
    )

    return AgentOutput(
        agent_name='integrity_agent',
        summary=summary_msg,
        recommendations=recommendations,
        details=report.dict()
    )
