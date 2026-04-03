# ADR 002: Plugin Architecture for Integrations

## Status
Accepted

## Context
DevAgent needs to integrate with multiple external services (Jira, GitHub, Teams, Outlook) with the ability to add more in the future.

## Decision
Use an **abstract base class (BasePlugin)** with a **PluginRegistry** that auto-discovers and initializes plugins based on environment variables.

## Rationale
- Clear interface contract via ABC (initialize, health_check, execute, shutdown)
- New integrations require no changes to core code
- Plugin health is visible via the /api/plugins endpoint
- Settings isolation via per-plugin Pydantic Settings classes with env_prefix
- Graceful degradation: disabled or failing plugins don't crash the app

## Consequences
- Each plugin must implement the full interface even for simple integrations
- Plugin discovery is explicit (registered in app.py), not automatic
