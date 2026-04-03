.PHONY: dev dev-backend dev-frontend test lint migrate new-migration docker-up docker-down clean

# Development
dev:
	@echo "Starting backend and frontend dev servers..."
	@make -j2 dev-backend dev-frontend

dev-backend:
	cd backend && uv run uvicorn devagent.app:create_app --factory --host 0.0.0.0 --port 8000 --reload

dev-frontend:
	cd frontend && npm run dev

# Testing
test:
	cd backend && uv run pytest tests/ -v

# Linting
lint:
	cd backend && uv run ruff check devagent/ tests/
	cd backend && uv run ruff format --check devagent/ tests/

# Database
migrate:
	cd backend && uv run alembic upgrade head

new-migration:
	cd backend && uv run alembic revision --autogenerate -m "$(msg)"

# Docker
docker-up:
	docker compose up -d

docker-down:
	docker compose down

# Cleanup
clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -f backend/devagent.db backend/test.db
