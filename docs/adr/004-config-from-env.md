# ADR 004: All Configuration from Environment Variables

## Status
Accepted

## Context
DevAgent needs to manage secrets (API tokens), connection strings, and feature flags across development, staging, and production environments.

## Decision
**All** configuration comes from `.env` files via **Pydantic Settings**. No hardcoded values, no `os.environ` reads outside the config module.

## Rationale
- Single source of truth for all configuration
- Pydantic validates types and constraints at startup (fail fast)
- `.env.example` documents all available settings
- Docker Compose passes `.env` to all services automatically
- Per-integration settings classes with env_prefix prevent naming collisions

## Consequences
- Developers must copy `.env.example` to `.env` on first setup
- All new features that need configuration must add to config.py and .env.example
- Integration tests may need to set environment variables
