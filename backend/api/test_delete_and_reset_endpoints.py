import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.db.session import init_db
from backend.db import models
import backend.db.session as session_module

init_db("sqlite:///./codementor.db")
client = TestClient(app)


def test_delete_question_and_reset_endpoints():
    init_db("sqlite:///./codementor.db")
    db = session_module.SessionLocal()

    try:
        # Create a test assignment
        assignment = models.Assignment(
            title="Temp Test Question",
            description="Temp description",
            language="python",
            is_approved=True
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        q_id = assignment.id

        # Add a test case and a viva question
        tc = models.TestCase(assignment_id=q_id, input_data="1", expected_output="1")
        vq = models.VivaQuestion(assignment_id=q_id, prompt="Explain your code")
        db.add_all([tc, vq])
        db.commit()

        # Add a submission and report
        sub = models.Submission(assignment_id=q_id, student_id=101, source_code="x = 1", language="python", status="completed")
        db.add(sub)
        db.commit()
        db.refresh(sub)
        sub_id = sub.id

        rep = models.Report(submission_id=sub_id, aggregated_output={"score": 100})
        db.add(rep)
        db.commit()

        # Test DELETE /api/submissions/{sub_id}
        del_sub_res = client.delete(f"/api/submissions/{sub_id}")
        assert del_sub_res.status_code == 200
        assert db.get(models.Submission, sub_id) is None
        assert db.query(models.Report).filter_by(submission_id=sub_id).first() is None

        # Create another submission under assignment
        sub2 = models.Submission(assignment_id=q_id, student_id=102, source_code="y = 2", language="python", status="completed")
        db.add(sub2)
        db.commit()
        db.refresh(sub2)
        sub2_id = sub2.id
        rep2 = models.Report(submission_id=sub2_id, aggregated_output={"score": 90})
        db.add(rep2)
        db.commit()

        # Test DELETE /api/questions/{q_id}
        del_q_res = client.delete(f"/api/questions/{q_id}")
        assert del_q_res.status_code == 200
        assert db.get(models.Assignment, q_id) is None
        assert db.query(models.TestCase).filter_by(assignment_id=q_id).count() == 0
        assert db.query(models.VivaQuestion).filter_by(assignment_id=q_id).count() == 0
        assert db.query(models.Submission).filter_by(assignment_id=q_id).count() == 0
        assert db.query(models.Report).filter_by(submission_id=sub2_id).first() is None


        # Test POST /api/reset-data
        # Create another dummy assignment to test reset_data
        dummy = models.Assignment(title="Dummy", language="python")
        db.add(dummy)
        db.commit()
        assert db.query(models.Assignment).count() > 0

        reset_res = client.post("/api/reset-data")
        assert reset_res.status_code == 200
        assert db.query(models.Assignment).count() == 0
        assert db.query(models.Submission).count() == 0
        assert db.query(models.Report).count() == 0

        # Verify that newly created assignment after reset starts at ID 1
        new_q = models.Assignment(title="Fresh Question", language="python")
        db.add(new_q)
        db.commit()
        db.refresh(new_q)
        assert new_q.id == 1, f"Expected ID 1 after sequence reset, got {new_q.id}"

        # Clean up
        client.post("/api/reset-data")
    finally:
        db.close()
