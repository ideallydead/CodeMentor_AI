import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.db.session import init_db
from backend.db import models

init_db("sqlite:///./codementor.db")
client = TestClient(app)


def test_resubmission_bypass_and_latest_submission_endpoint():
    # 1. Create Question
    q_res = client.post("/api/questions", json={
        "title": "Fibonacci Numbers",
        "description": "Compute the nth Fibonacci number",
        "language": "python"
    })
    assert q_res.status_code == 200
    q_id = q_res.json()["id"]

    # 2. Approve Question
    appr = client.post(f"/api/questions/{q_id}/approve")
    assert appr.status_code == 200

    # 3. Student 201 submits first attempt
    code_v1 = "def fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)\n"
    sub1_res = client.post("/api/submissions", json={
        "assignment_id": q_id,
        "student_id": 201,
        "source_code": code_v1,
        "language": "python"
    })
    assert sub1_res.status_code == 200
    sub1_id = sub1_res.json()["id"]

    # 4. Check latest submission for Student 201
    latest1 = client.get(f"/api/assignments/{q_id}/submissions/latest?student_id=201")
    assert latest1.status_code == 200
    assert latest1.json() is not None
    assert latest1.json()["id"] == sub1_id
    assert latest1.json()["source_code"] == code_v1

    # Check latest submission for non-existent Student 999
    latest_none = client.get(f"/api/assignments/{q_id}/submissions/latest?student_id=999")
    assert latest_none.status_code == 200
    assert latest_none.json() is None

    # 5. Student 201 resubmits improved code
    code_v2 = "def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n"
    sub2_res = client.post("/api/submissions", json={
        "assignment_id": q_id,
        "student_id": 201,
        "source_code": code_v2,
        "language": "python"
    })
    assert sub2_res.status_code == 200
    sub2_id = sub2_res.json()["id"]

    # Verify latest submission updated to v2
    latest2 = client.get(f"/api/assignments/{q_id}/submissions/latest?student_id=201")
    assert latest2.status_code == 200
    assert latest2.json()["id"] == sub2_id
    assert latest2.json()["source_code"] == code_v2

    # Verify report bypassed similarity for sub2 (resubmission)
    rep2 = client.get(f"/api/submissions/{sub2_id}/status")
    assert rep2.status_code == 200
    details = rep2.json().get("details", {})
    agents = details.get("agents", [])
    integrity_agent = next((a for a in agents if a["agent_name"] == "integrity_agent"), None)
    assert integrity_agent is not None
    assert "Resubmission" in integrity_agent["summary"] or integrity_agent["details"].get("risk_level") == "low"

    # 6. Student 202 submits first attempt
    sub3_res = client.post("/api/submissions", json={
        "assignment_id": q_id,
        "student_id": 202,
        "source_code": "def fib(n):\n    return n\n",
        "language": "python"
    })
    assert sub3_res.status_code == 200
    sub3_id = sub3_res.json()["id"]

    # 7. Check Faculty Intelligence Report consistency
    intel_res = client.get(f"/api/questions/{q_id}/intelligence")
    assert intel_res.status_code == 200
    intel = intel_res.json()

    assert intel["total_submissions"] == 3
    subs = intel["consolidated_submissions"]
    assert len(subs) == 3

    # Check attempt numbers and resubmission flags
    s1_item = next(s for s in subs if s["id"] == sub1_id)
    s2_item = next(s for s in subs if s["id"] == sub2_id)
    s3_item = next(s for s in subs if s["id"] == sub3_id)

    assert s1_item["is_resubmission"] is False
    assert s1_item["attempt_number"] == 1

    assert s2_item["is_resubmission"] is True
    assert s2_item["attempt_number"] == 2

    assert s3_item["is_resubmission"] is False
    assert s3_item["attempt_number"] == 1

    # Verify extended data consistency fields
    assert "efficiency_score" in s2_item
    assert "standards_score" in s2_item
    assert "justification_text" in s2_item
    assert "all_test_results" in s2_item
    assert "flagged_issues" in s2_item

    # Teardown
    import backend.db.session as session_module
    db = session_module.SessionLocal()
    try:
        sub_ids = [sub1_id, sub2_id, sub3_id]
        db.query(models.Report).filter(models.Report.submission_id.in_(sub_ids)).delete(synchronize_session=False)
        db.query(models.Submission).filter(models.Submission.assignment_id == q_id).delete(synchronize_session=False)
        db.query(models.TestCase).filter(models.TestCase.assignment_id == q_id).delete(synchronize_session=False)
        db.query(models.VivaQuestion).filter(models.VivaQuestion.assignment_id == q_id).delete(synchronize_session=False)
        db.query(models.Assignment).filter(models.Assignment.id == q_id).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()
