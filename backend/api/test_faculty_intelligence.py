import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.db.session import init_db
from backend.db import models

init_db("sqlite:///./codementor.db")
client = TestClient(app)


def test_faculty_intelligence_and_override_flow():
    # 1. Create Question
    q_res = client.post("/api/questions", json={
        "title": "Test Analytics Question",
        "description": "Calculate sum of list",
        "language": "python"
    })
    assert q_res.status_code == 200
    q_data = q_res.json()
    q_id = q_data["id"]

    # 2. Approve Question
    appr_res = client.post(f"/api/questions/{q_id}/approve")
    assert appr_res.status_code == 200

    # 3. Create 2 Submissions
    sub1 = client.post("/api/submissions", json={
        "assignment_id": q_id,
        "student_id": 101,
        "source_code": "def solution(nums):\n    return sum(nums)\n",
        "language": "python"
    })
    assert sub1.status_code == 200
    sub1_id = sub1.json()["id"]

    sub2 = client.post("/api/submissions", json={
        "assignment_id": q_id,
        "student_id": 102,
        "source_code": "def solution(nums):\n    total = 0\n    for x in nums:\n        total += x\n    return total\n",
        "language": "python"
    })
    assert sub2.status_code == 200

    # 4. Fetch Faculty Intelligence Report
    intel_res = client.get(f"/api/questions/{q_id}/intelligence")
    assert intel_res.status_code == 200
    intel_data = intel_res.json()

    assert intel_data["assignment_id"] == q_id
    assert intel_data["total_submissions"] == 2
    assert "class_averages" in intel_data
    assert "grade_distribution" in intel_data
    assert len(intel_data["consolidated_submissions"]) == 2

    # 5. Execute Instructor Grade Override on submission 1
    override_res = client.post(f"/api/submissions/{sub1_id}/override", json={
        "faculty_score": 95,
        "final_grade": "excellent",
        "faculty_notes": "Verified in oral viva examination"
    })
    assert override_res.status_code == 200

    # 6. Re-fetch Intelligence & verify override recorded
    intel_res_updated = client.get(f"/api/questions/{q_id}/intelligence")
    assert intel_res_updated.status_code == 200
    updated_subs = intel_res_updated.json()["consolidated_submissions"]
    sub1_item = next(s for s in updated_subs if s["id"] == sub1_id)
    assert sub1_item["final_grade"] == "excellent"
    assert sub1_item["faculty_score"] == 95
    assert sub1_item["faculty_notes"] == "Verified in oral viva examination"

    # Teardown: Clean up test artifacts to keep database pristine
    import backend.db.session as session_module
    db = session_module.SessionLocal()
    try:
        sub_ids = [sub1_id, sub2.json()["id"]]
        db.query(models.Report).filter(models.Report.submission_id.in_(sub_ids)).delete(synchronize_session=False)
        db.query(models.Submission).filter(models.Submission.assignment_id == q_id).delete(synchronize_session=False)
        db.query(models.TestCase).filter(models.TestCase.assignment_id == q_id).delete(synchronize_session=False)
        db.query(models.VivaQuestion).filter(models.VivaQuestion.assignment_id == q_id).delete(synchronize_session=False)
        db.query(models.Assignment).filter(models.Assignment.id == q_id).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()

