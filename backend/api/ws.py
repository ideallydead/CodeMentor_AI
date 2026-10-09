import json
import asyncio
import logging
from typing import Set, Dict, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

ws_router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        try:
            self._loop = asyncio.get_running_loop()
        except RuntimeError:
            pass
        logger.info(f"WebSocket client connected. Active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Active connections: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        if not self.active_connections:
            return
        
        payload_str = json.dumps(message)
        dead_connections = set()
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload_str)
            except Exception as exc:
                logger.debug(f"Failed to send to WebSocket client: {exc}")
                dead_connections.add(connection)
        
        for dead in dead_connections:
            self.active_connections.discard(dead)


manager = ConnectionManager()


import time


def broadcast_event(event_type: str, data: Optional[Dict[str, Any]] = None):
    """
    Broadcasts a JSON event to all connected WebSocket clients across frontends.
    Thread-safe and async-safe: works seamlessly from both async and sync FastAPI routes.
    """
    try:
        payload = {
            "type": event_type,
            "data": data or {},
            "timestamp": time.time()
        }
        
        # 1. Try current running loop first if we're in an async context
        try:
            loop = asyncio.get_running_loop()
            if loop.is_running():
                loop.create_task(manager.broadcast(payload))
                return
        except RuntimeError:
            pass

        # 2. If called from a sync thread pool (e.g. AnyIO worker thread), dispatch to stored main loop
        if manager._loop and manager._loop.is_running():
            try:
                asyncio.run_coroutine_threadsafe(manager.broadcast(payload), manager._loop)
                return
            except Exception as exc:
                logger.warning(f"Could not dispatch broadcast via main loop: {exc}")
    except Exception as exc:
        logger.error(f"Error in broadcast_event for '{event_type}': {exc}", exc_info=True)


@ws_router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial connection handshake
        await websocket.send_text(json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to CodeMentor AI real-time event bus"
        }))
        while True:
            # Keep connection alive, listen for ping or client events
            text_data = await websocket.receive_text()
            try:
                msg = json.loads(text_data)
                if msg.get("type") == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as exc:
        logger.debug(f"WebSocket error: {exc}")
        manager.disconnect(websocket)
