# ADR 001: Python + FastAPI Backend

## Status
Accepted

## Context
We need a backend framework for DevAgent that supports async I/O, WebSocket, and integrates well with the Python ML/AI ecosystem.

## Decision
Use **Python 3.12+ with FastAPI** as the backend framework.

## Rationale
- FastAPI provides native async support, automatic OpenAPI docs, and Pydantic validation
- Python ecosystem has the best libraries for AI/ML integration (anthropic SDK, langchain/langgraph)
- Type hints throughout improve maintainability
- High performance via uvicorn + uvloop

## Consequences
- Team needs Python expertise
- Async/await must be used consistently (no blocking calls in async handlers)
