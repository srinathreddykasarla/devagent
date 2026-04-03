from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class DevAgentError(Exception):
    """Base exception for DevAgent."""

    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(DevAgentError):
    def __init__(self, resource: str, id: str):
        super().__init__(f"{resource} '{id}' not found", status_code=404)


class ValidationError(DevAgentError):
    def __init__(self, message: str):
        super().__init__(message, status_code=422)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DevAgentError)
    async def devagent_error_handler(request: Request, exc: DevAgentError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.message},
        )

    @app.exception_handler(Exception)
    async def general_error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error("Unhandled error: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"},
        )
