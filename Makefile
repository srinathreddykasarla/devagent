.PHONY: setup dev dev-backend dev-frontend test lint migrate new-migration docker-up docker-down clean

# Setup
setup:
	./scripts/setup-dev-data.sh
	cd backend && uv sync
	cd frontend && npm install
	@echo "Done. Copy .env.example to .env and configure, then run: make migrate && make dev"

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
	rm -f dev_data/db/devagent.db dev_data/db/devagent.db-journal
	rm -f backend/test.db

# Reset all dev data (destructive)
clean-data:
	rm -rf dev_data/repos/* dev_data/db/* dev_data/redis/* dev_data/logs/* dev_data/attachments/*
	@echo "Dev data cleared. Run 'make setup' to re-create directories."
