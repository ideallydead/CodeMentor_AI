import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.db.session import init_db
from backend.db import models
import backend.db.session as session_module

init_db("sqlite:///./codementor.db")
client = TestClient(app)


def test_assignment_draft_isolation_and_viva_editing():
    db = session_module.SessionLocal()
    try:
        # 1. Create Question A
        res_a = client.post("/api/questions", json={
            "title": "Assignment A Two Sum",
            "description": "Find pairs that sum to target",
            "language": "python"
        })
        assert res_a.status_code == 200, res_a.text
        q_a = res_a.json()
        assert q_a["title"] == "Assignment A Two Sum"
        assert len(q_a["draft_tests"]) > 0
        assert len(q_a["draft_viva"]) > 0

        # 2. Create Question B
        res_b = client.post("/api/questions", json={
            "title": "Assignment B Palindrome",
            "description": "Check if string is palindrome",
            "language": "python"
        })
        assert res_b.status_code == 200, res_b.text
        q_b = res_b.json()
        assert q_b["title"] == "Assignment B Palindrome"
        assert q_b["id"] != q_a["id"]
        # Verify Question B has distinct draft tests and draft viva
        assert q_b["draft_tests"] != q_a["draft_tests"]

        # 3. Test editing draft viva questions for Question B
        custom_viva = [
            {
                "prompt": "Explain the two-pointer approach for palindrome checking.",
                "expected_concepts": ["Two pointers", "Time complexity O(n)", "Space complexity O(1)"],
                "sample_answer": "Start with left at 0 and right at len - 1, compare characters moving inward."
            },
            {
                "prompt": "How does case sensitivity or whitespace affect palindromes?",
                "expected_concepts": ["Preprocessing", "Normalization", "Regex or filtering"],
                "sample_answer": "Strip non-alphanumeric characters and lowercase before checking."
            }
        ]

        update_res = client.put(f"/api/questions/{q_b['id']}", json={
            "draft_viva": custom_viva
        })
        assert update_res.status_code == 200, update_res.text
        updated_b = update_res.json()
        assert len(updated_b["draft_viva"]) == 2
        assert updated_b["draft_viva"][0]["prompt"] == "Explain the two-pointer approach for palindrome checking."

        # Verify Question A was NOT affected by Question B's update
        get_a = client.get(f"/api/questions/{q_a['id']}")
        assert get_a.status_code == 200
        assert get_a.json()["draft_viva"] != updated_b["draft_viva"]

        # 4. Approve Question B and verify relational models sync
        approve_res = client.post(f"/api/questions/{q_b['id']}/approve")
        assert approve_res.status_code == 200
        assert approve_res.json()["is_approved"] is True

        vqs_in_db = db.query(models.VivaQuestion).filter_by(assignment_id=q_b["id"]).all()
        assert len(vqs_in_db) == 2
        assert "two-pointer" in vqs_in_db[0].prompt

        # Clean up created assignments
        client.delete(f"/api/questions/{q_a['id']}")
        client.delete(f"/api/questions/{q_b['id']}")
    finally:
        db.close()
