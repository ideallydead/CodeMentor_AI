from typing import Dict, Any, List
from collections import Counter
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

    submissions = db.query(models.Submission).filter(
        models.Submission.assignment_id == assignment_id
    ).all()

    total_submissions = len(submissions)
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

    correctness_scores = []
    standards_scores = []
    efficiency_scores = []
    grade_counts = Counter()
    misconception_counts = Counter()
    consolidated = []

    for sub in submissions:
        sub_info = {
            "id": sub.id,
            "student_id": sub.student_id,
            "status": sub.status,
            "language": sub.language,
            "correctness_score": None,
            "overall_recommendation": "pending",
            "integrity_risk": "low",
            "final_grade": sub.final_grade,
            "faculty_score": sub.faculty_score,
            "faculty_notes": sub.faculty_notes,
            "created_at": sub.created_at.isoformat() if sub.created_at else None
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
                    if eff is not None:
                        efficiency_scores.append(eff)
                    if rec:
                        grade_counts[rec] += 1
                        sub_info["overall_recommendation"] = rec

                    # Collect flagged issues as misconceptions
                    for issue in details.get("flagged_issues", []):
                        desc = issue.get("description") or issue.get("category", "General Error")
                        misconception_counts[desc] += 1

                elif agent_name == "mentor_agent":
                    # Collect Socratic hint topics
                    for hint in details.get("hints", []):
                        topic = hint.get("topic") or hint.get("concept_to_review", "Concept Review")
                        misconception_counts[f"Concept: {topic}"] += 1

                elif agent_name == "integrity_agent":
                    risk = details.get("risk_level", "low")
                    sub_info["integrity_risk"] = risk

        consolidated.append(sub_info)

    avg_corr = round(sum(correctness_scores) / len(correctness_scores), 1) if correctness_scores else 0.0
    avg_std = round(sum(standards_scores) / len(standards_scores), 1) if standards_scores else 0.0
    avg_eff = round(sum(efficiency_scores) / len(efficiency_scores), 1) if efficiency_scores else 0.0

    # Top class misconceptions
    top_misconceptions = []
    for issue_name, count in misconception_counts.most_common(5):
        percentage = round((count / total_submissions) * 100.0, 1)
        top_misconceptions.append({
            "misconception": issue_name,
            "affected_students_count": count,
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
        "consolidated_submissions": consolidated
    }
