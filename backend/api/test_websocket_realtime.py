import json
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.db.session import init_db
from backend.core.config import settings

init_db(settings.database_url or "sqlite:///./codementor.db")
client = TestClient(app)


def test_websocket_connection_and_heartbeat():
    with client.websocket_connect("/api/ws") as ws:
        # Handshake
        msg = ws.receive_json()
        assert msg["type"] == "CONNECTION_ESTABLISHED"

        # Ping-Pong
        ws.send_json({"type": "PING"})
        pong = ws.receive_json()
        assert pong["type"] == "PONG"


def test_websocket_broadcast_on_question_and_submission_events():
    with client.websocket_connect("/api/ws") as ws:
        handshake = ws.receive_json()
        assert handshake["type"] == "CONNECTION_ESTABLISHED"

        # 1. Create a question via POST /api/questions
        create_payload = {
            "title": "Realtime Test Question",
            "description": "Compute absolute sum of two integers",
            "language": "python"
        }
        res_create = client.post("/api/questions", json=create_payload)
        assert res_create.status_code == 200
        q_data = res_create.json()
        q_id = q_data["id"]

        # Verify WebSocket received ASSIGNMENT_CREATED event
        event = ws.receive_json()
        assert event["type"] == "ASSIGNMENT_CREATED"
        assert event["data"]["id"] == q_id
        assert event["data"]["title"] == "Realtime Test Question"

        # 2. Approve question via POST /api/questions/{id}/approve
        res_approve = client.post(f"/api/questions/{q_id}/approve")
        assert res_approve.status_code == 200

        # Verify WebSocket received ASSIGNMENT_APPROVED event
        event_approved = ws.receive_json()
        assert event_approved["type"] == "ASSIGNMENT_APPROVED"
        assert event_approved["data"]["id"] == q_id
        assert event_approved["data"]["is_approved"] is True

        # 3. Update question via PUT /api/questions/{id}
        res_update = client.put(f"/api/questions/{q_id}", json={"title": "Updated Realtime Question"})
        assert res_update.status_code == 200

        event_updated = ws.receive_json()
        assert event_updated["type"] == "ASSIGNMENT_UPDATED"
        assert event_updated["data"]["id"] == q_id
        assert event_updated["data"]["title"] == "Updated Realtime Question"

        # 4. Delete question via DELETE /api/questions/{id}
        res_delete = client.delete(f"/api/questions/{q_id}")
        assert res_delete.status_code == 200

        event_deleted = ws.receive_json()
        assert event_deleted["type"] == "ASSIGNMENT_DELETED"
        assert event_deleted["data"]["id"] == q_id
