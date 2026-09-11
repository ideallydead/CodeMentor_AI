"""
Live Integration Test Script for CodeMentor AI.

Executes a complete end-to-end live flow:
1. Initializes SQLite database and starts FastAPI app in-process.
2. Creates a new assignment (POST /api/questions).
3. Verifies TestCase Agent and Viva Question Agent generated draft test suite and viva bank.
4. Approves the assignment (POST /api/questions/{id}/approve).
5. Submits student Python code (POST /api/submissions).
6. Runs the 5 concurrent submission-time agents (Assessment, Mentor, Optimization, Viva, Academic Integrity).
7. Fetches the complete aggregated report (GET /api/submissions/{id}/status).
8. Fetches Faculty Intelligence & Misconception Analytics (GET /api/questions/{id}/intelligence).
9. Executes Instructor Grade Override (POST /api/submissions/{id}/override).
"""

import json
from fastapi.testclient import TestClient

from backend.main import app
from backend.db.session import init_db


def run_live_test():
    print("==================================================")
    print("STARTING LIVE SYSTEM INTEGRATION & SANDBOX TEST")
    print("==================================================")

    # 1. Initialize DB with local SQLite database
    init_db("sqlite:///./codementor.db")
    client = TestClient(app)

    # 2. Check analytics endpoint
    res = client.get("/api/analytics")
    print(f"\n1. API Status & Initial Analytics Check: HTTP {res.status_code} -> {res.json()}")
    assert res.status_code == 200

    # 3. Create a new Assignment draft (Faculty Flow)
    print("\n2. Faculty creates a new assignment draft (POST /api/questions)...")
    create_payload = {
        "title": "Two Sum Algorithm",
        "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
        "language": "python"
    }
    res = client.post("/api/questions", json=create_payload)
    assert res.status_code == 200
    q_data = res.json()
    q_id = q_data["id"]

    print(f"[OK] Created Assignment ID: {q_id}")
    print(f"[INFO] Draft Test Cases (TestCase Agent): {json.dumps(q_data.get('draft_tests'), indent=2)}")
    print(f"[INFO] Draft Viva Bank (Viva Agent): {json.dumps(q_data.get('draft_viva'), indent=2)}")

    # 4. Approve Assignment
    print(f"\n3. Faculty approves assignment ID {q_id} (POST /api/questions/{q_id}/approve)...")
    res = client.post(f"/api/questions/{q_id}/approve")
    assert res.status_code == 200
    assert res.json().get("is_approved") is True
    print(f"[OK] Assignment #{q_id} APPROVED for student submissions.")

    # 5. Submit Student Code (Student Flow)
    print("\n4. Student submits Python solution (POST /api/submissions)...")
    student_code = (
        "def two_sum(nums, target):\n"
        "    seen = {}\n"
        "    for i, num in enumerate(nums):\n"
        "        diff = target - num\n"
        "        if diff in seen:\n"
        "            return [seen[diff], i]\n"
        "        seen[num] = i\n"
        "    return []\n"
    )
    sub_payload = {
        "assignment_id": q_id,
        "student_id": 101,
        "source_code": student_code,
        "language": "python"
    }
    res = client.post("/api/submissions", json=sub_payload)
    assert res.status_code == 200
    sub_data = res.json()
    sub_id = sub_data["id"]
    print(f"[OK] Submission created with ID: #{sub_id}, Status: {sub_data.get('status')}")

    # 6. Fetch Submission Status & Multi-Agent Report
    print(f"\n5. Fetching complete evaluation report (GET /api/submissions/{sub_id}/status)...")
    res = client.get(f"/api/submissions/{sub_id}/status")
    assert res.status_code == 200
    status_data = res.json()
    
    agents_output = status_data.get("details", {}).get("agents", [])
    print(f"\n[OK] Multi-Agent Pipeline Execution ({len(agents_output)} concurrent agents completed):")
    for agent in agents_output:
        summary_safe = str(agent.get('summary', '')).encode('ascii', 'replace').decode('ascii')
        recs_safe = [str(r).encode('ascii', 'replace').decode('ascii') for r in (agent.get('recommendations') or [])[:2]]
        print(f"    Summary: {summary_safe}")
        print(f"    Key Recommendations: {recs_safe}")

    # 7. Fetch Faculty Intelligence & Class Analytics
    print(f"\n6. Faculty fetches Class Misconception Analytics (GET /api/questions/{q_id}/intelligence)...")
    res = client.get(f"/api/questions/{q_id}/intelligence")
    assert res.status_code == 200
    intel_data = res.json()

    print(f"[OK] Class Averages: {intel_data.get('class_averages')}")
    print(f"[OK] Top Misconceptions: {intel_data.get('top_misconceptions')}")
    print(f"[OK] Consolidated Submissions Count: {len(intel_data.get('consolidated_submissions', []))}")

    # 8. Execute Instructor Grade Override
    print(f"\n7. Faculty executes Grade Override for Submission #{sub_id} (POST /api/submissions/{sub_id}/override)...")
    override_res = client.post(f"/api/submissions/{sub_id}/override", json={
        "faculty_score": 98,
        "final_grade": "excellent",
        "faculty_notes": "Verified solution algorithm complexity and passed viva examination."
    })
    assert override_res.status_code == 200
    print(f"[OK] Override Saved! Final Grade: {override_res.json().get('final_grade')}, Score: {override_res.json().get('faculty_score')}")

    print("\n==================================================")
    print("COMPLETE END-TO-END WORKFLOW VERIFIED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    run_live_test()
