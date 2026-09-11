from typing import Dict, Any, List
from collections import Counter, defaultdict
from sqlalchemy.orm import Session
from backend.db import models


def generate_faculty_intelligence(assignment_id: int, db: Session) -> Dict[str, Any]:
    """
    Generate class-wide analytics, misconception frequency breakdown, and
    consolidated student grading recommendation summary for an assignment.
    """
    assignment = db.get(models.Assignment, assignment_id)
    if not assignment:
        return {
            "error": "Assignment not found",
            "assignment_id": assignment_id,
            "total_submissions": 0
        }

    raw_submissions = db.query(models.Submission).filter(
        models.Submission.assignment_id == assignment_id
    ).all()

    total_submissions = len(raw_submissions)
    if total_submissions == 0:
        return {
            "assignment_id": assignment_id,
            "title": assignment.title,
            "language": assignment.language,
            "total_submissions": 0,
            "class_averages": {"correctness": 0.0, "standards": 0.0, "efficiency": 0.0},
            "grade_distribution": {"excellent": 0, "good": 0, "fair": 0, "needs_improvement": 0},
            "top_misconceptions": [],
            "consolidated_submissions": []
        }

    # Sort submissions by id ascending to determine student attempt numbers
    submissions = sorted(raw_submissions, key=lambda s: s.id)
    student_attempt_counts = {}
    submission_attempts = {}
    for sub in submissions:
        count = student_attempt_counts.get(sub.student_id, 0) + 1
        student_attempt_counts[sub.student_id] = count
        submission_attempts[sub.id] = {
            "attempt_number": count,
            "is_resubmission": count > 1
        }

    correctness_scores = []
    standards_scores = []
    efficiency_scores = []
    grade_counts = Counter()
    misconception_students = defaultdict(set)
    consolidated = []

    for sub in submissions:
        attempt_info = submission_attempts.get(sub.id, {"attempt_number": 1, "is_resubmission": False})
        sub_info = {
            "id": sub.id,
            "student_id": sub.student_id,
            "status": sub.status,
            "language": sub.language,
            "correctness_score": None,
            "standards_score": None,
            "efficiency_score": None,
            "overall_recommendation": "pending",
            "integrity_risk": "low",
            "is_resubmission": attempt_info["is_resubmission"],
            "attempt_number": attempt_info["attempt_number"],
            "final_grade": sub.final_grade,
            "faculty_score": sub.faculty_score,
            "faculty_notes": sub.faculty_notes,
            "viva_answers": sub.viva_answers or [],
            "viva_verified": sub.viva_verified or False,
            "viva_score": sub.viva_score,
            "viva_feedback": sub.viva_feedback,
            "created_at": sub.created_at.isoformat() if sub.created_at else None,
            "source_code": sub.source_code,
            "justification_text": None,
            "all_test_results": [],
            "flagged_issues": [],
            "integrity_details": None
        }

        if sub.report and sub.report.aggregated_output:
            agents = sub.report.aggregated_output.get("agents", [])
            for agent in agents:
                agent_name = agent.get("agent_name")
                details = agent.get("details", {})

                if agent_name == "assessment_agent":
                    corr = details.get("correctness_score")
                    std = details.get("standards_score")
                    eff = details.get("efficiency_score")
                    rec = details.get("overall_recommendation", "fair")

                    if corr is not None:
                        correctness_scores.append(corr)
                        sub_info["correctness_score"] = corr
                    if std is not None:
                        standards_scores.append(std)
                        sub_info["standards_score"] = std
                    if eff is not None:
                        efficiency_scores.append(eff)
                        sub_info["efficiency_score"] = eff
                    if rec:
                        sub_info["overall_recommendation"] = rec

                    sub_info["justification_text"] = details.get("justification_text")
                    sub_info["all_test_results"] = details.get("all_test_results") or []
                    sub_info["flagged_issues"] = details.get("flagged_issues") or []

                    # Collect flagged issues with unique student tracking
                    for issue in details.get("flagged_issues", []):
                        desc = issue.get("description") or issue.get("category", "General Error")
                        misconception_students[desc].add(sub.student_id)

                elif agent_name == "mentor_agent":
                    # Collect Socratic hint topics with unique student tracking
                    for hint in details.get("hints", []):
                        topic = hint.get("topic") or hint.get("concept_to_review", "Concept Review")
                        misconception_students[f"Concept: {topic}"].add(sub.student_id)

                elif agent_name == "viva_agent":
                    if not sub_info["viva_answers"] and details.get("evaluated_answers"):
                        sub_info["viva_answers"] = details.get("evaluated_answers")
                    if sub_info["viva_score"] is None and details.get("avg_viva_score") is not None:
                        sub_info["viva_score"] = details.get("avg_viva_score")

                elif agent_name == "integrity_agent":
                    risk = details.get("risk_level", "low")
                    sub_info["integrity_risk"] = risk
                    sub_info["integrity_details"] = {
                        "risk_level": risk,
                        "max_similarity_score": details.get("max_similarity_score", 0.0),
                        "matches": details.get("matches") or [],
                        "explainable_summary": details.get("explainable_summary") or agent.get("summary")
                    }

        # Tally effective grade: prioritize instructor override if present, else AI recommendation
        effective_grade = sub.final_grade or sub_info["overall_recommendation"]
        if effective_grade and effective_grade != "pending":
            grade_counts[effective_grade] += 1

        consolidated.append(sub_info)

    avg_corr = round(sum(correctness_scores) / len(correctness_scores), 1) if correctness_scores else 0.0
    avg_std = round(sum(standards_scores) / len(standards_scores), 1) if standards_scores else 0.0
    avg_eff = round(sum(efficiency_scores) / len(efficiency_scores), 1) if efficiency_scores else 0.0

    # Class viva metrics
    viva_scores = [s["viva_score"] for s in consolidated if s["viva_score"] is not None]
    viva_submitted = sum(1 for s in consolidated if s["viva_answers"] and len(s["viva_answers"]) > 0)
    viva_verified = sum(1 for s in consolidated if s["viva_verified"])
    avg_viva = round(sum(viva_scores) / len(viva_scores), 1) if viva_scores else 0.0

    viva_summary = {
        "total_with_viva": viva_submitted,
        "verified_count": viva_verified,
        "avg_viva_score": avg_viva,
        "completion_percentage": round((viva_submitted / total_submissions) * 100.0, 1) if total_submissions else 0.0
    }

    # Top class misconceptions tracking unique affected students
    total_unique_students = len({s.student_id for s in submissions})
    top_misconceptions = []
    sorted_misconceptions = sorted(misconception_students.items(), key=lambda x: len(x[1]), reverse=True)
    for issue_name, student_set in sorted_misconceptions[:5]:
        student_count = len(student_set)
        percentage = round((student_count / max(1, total_unique_students)) * 100.0, 1)
        top_misconceptions.append({
            "misconception": issue_name,
            "affected_students_count": student_count,
            "percentage_of_class": percentage
        })

    return {
        "assignment_id": assignment_id,
        "title": assignment.title,
        "language": assignment.language,
        "total_submissions": total_submissions,
        "class_averages": {
            "correctness": avg_corr,
            "standards": avg_std,
            "efficiency": avg_eff
        },
        "grade_distribution": {
            "excellent": grade_counts.get("excellent", 0),
            "good": grade_counts.get("good", 0),
            "fair": grade_counts.get("fair", 0),
            "needs_improvement": grade_counts.get("needs_improvement", 0)
        },
        "top_misconceptions": top_misconceptions,
        "consolidated_submissions": consolidated,
        "viva_summary": viva_summary
    }
