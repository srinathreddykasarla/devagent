from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


@router.websocket("/logs/{run_id}")
async def stream_logs(websocket: WebSocket, run_id: str) -> None:
    await websocket.accept()
    await websocket.send_json({"type": "info", "message": f"Connected to run {run_id} logs"})
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
