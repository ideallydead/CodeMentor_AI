import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.db.session import init_db
from backend.db import models

init_db("sqlite:///./codementor.db")
client = TestClient(app)


def test_student_viva_submission_and_faculty_verification():
    # 1. Create Question with draft viva bank
    q_res = client.post("/api/questions", json={
        "title": "Two Sum Algorithm",
        "description": "Find two indices that sum up to target value using hash map.",
        "language": "python"
    })
    assert q_res.status_code == 200
    q_data = q_res.json()
    q_id = q_data["id"]

    # 2. Approve Question
    appr_res = client.post(f"/api/questions/{q_id}/approve")
    assert appr_res.status_code == 200

    # 3. Student Submits Code with Viva Answers
    viva_answers_payload = [
        {
            "question_id": "q1",
            "prompt": "Explain the core algorithm and data structures you used to solve Two Sum.",
            "expected_concepts": ["hash map", "time complexity", "O(N)"],
            "student_answer": "I used a hash map to store complements, achieving O(N) time complexity instead of brute force O(N^2)."
        },
        {
            "question_id": "q2",
            "prompt": "What edge cases did you consider in your implementation?",
            "expected_concepts": ["empty list", "negative numbers", "duplicate values"],
            "student_answer": "I checked for negative numbers and duplicate values in the array."
        }
    ]

    sub_res = client.post("/api/submissions", json={
        "assignment_id": q_id,
        "student_id": 101,
        "source_code": "def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        comp = target - n\n        if comp in seen:\n            return [seen[comp], i]\n        seen[n] = i\n    return []\n",
        "language": "python",
        "viva_answers": viva_answers_payload
    })
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    sub_id = sub_data["id"]

    # Verify viva answers and score stored
    assert sub_data["viva_score"] is not None
    assert sub_data["viva_score"] > 50
    assert len(sub_data["viva_answers"]) == 2
    assert "detected_concepts" in sub_data["viva_answers"][0]
    assert "hash map" in [c.lower() for c in sub_data["viva_answers"][0]["detected_concepts"]]

    # 4. Student Refines/Updates Viva Answers Post-Submission
    updated_answers = list(viva_answers_payload)
    updated_answers[1]["student_answer"] = "I checked for empty list, negative numbers, and duplicate values carefully."
    update_res = client.post(f"/api/submissions/{sub_id}/viva", json={
        "viva_answers": updated_answers
    })
    assert update_res.status_code == 200
    updated_sub_data = update_res.json()
    assert updated_sub_data["viva_score"] >= sub_data["viva_score"]
    assert len(updated_sub_data["viva_answers"][1]["detected_concepts"]) == 3

    # 5. Faculty Fetches Intelligence (checks viva section)
    intel_res = client.get(f"/api/questions/{q_id}/intelligence")
    assert intel_res.status_code == 200
    intel_data = intel_res.json()
    assert "viva_summary" in intel_data
    assert intel_data["viva_summary"]["total_with_viva"] == 1
    sub_in_intel = next(s for s in intel_data["consolidated_submissions"] if s["id"] == sub_id)
    assert len(sub_in_intel["viva_answers"]) == 2
    assert sub_in_intel["viva_verified"] is False

    # 6. Faculty Verifies Viva and Overrides Grade
    override_res = client.post(f"/api/submissions/{sub_id}/override", json={
        "faculty_score": 98,
        "final_grade": "excellent",
        "faculty_notes": "Outstanding verbal clarity and complete mastery of hash map invariants.",
        "viva_verified": True,
        "viva_score": 95,
        "viva_feedback": "Clearly articulated time-space trade-offs and edge case handling."
    })
    assert override_res.status_code == 200
    overridden = override_res.json()
    assert overridden["faculty_score"] == 98
    assert overridden["viva_verified"] is True
    assert overridden["viva_score"] == 95
    assert overridden["viva_feedback"] == "Clearly articulated time-space trade-offs and edge case handling."

    # 7. Re-fetch Intelligence to verify viva verified count is updated
    intel_res_2 = client.get(f"/api/questions/{q_id}/intelligence")
    assert intel_res_2.status_code == 200
    assert intel_res_2.json()["viva_summary"]["verified_count"] == 1

    # Cleanup test data
    import backend.db.session as session_module
    db = session_module.SessionLocal()
    try:
        db.query(models.Report).filter(models.Report.submission_id == sub_id).delete(synchronize_session=False)
        db.query(models.Submission).filter(models.Submission.assignment_id == q_id).delete(synchronize_session=False)
        db.query(models.TestCase).filter(models.TestCase.assignment_id == q_id).delete(synchronize_session=False)
        db.query(models.VivaQuestion).filter(models.VivaQuestion.assignment_id == q_id).delete(synchronize_session=False)
        db.query(models.Assignment).filter(models.Assignment.id == q_id).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()
