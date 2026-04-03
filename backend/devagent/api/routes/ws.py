from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


@router.websocket("/logs/{run_id}")
async def stream_logs(websocket: WebSocket, run_id: str) -> None:
    await websocket.accept()
    event_bus = getattr(websocket.app.state, "event_bus", None)

    if event_bus is None:
        await websocket.send_json({"type": "error", "message": "Event bus not available"})
        await websocket.close()
        return

    async def on_log(message: dict) -> None:
        await websocket.send_json(message)

    await event_bus.subscribe(f"run:{run_id}:logs", on_log)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await event_bus.unsubscribe(f"run:{run_id}:logs", on_log)
