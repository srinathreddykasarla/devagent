#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────
# DevAgent — Create local dev_data directories with correct
# permissions.  Run once after cloning:
#
#   chmod +x scripts/setup-dev-data.sh && ./scripts/setup-dev-data.sh
# ──────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEV_DATA="$PROJECT_ROOT/dev_data"

echo "Setting up dev_data directories in $DEV_DATA ..."

# Subdirectories and their purpose:
#   repos/        — cloned git repositories (WORKSPACE_DIR)
#   db/           — SQLite database files
#   redis/        — Redis data (Docker volume fallback)
#   logs/         — Application and pipeline run logs
#   attachments/  — Downloaded Jira attachments / temp files

dirs=(
  repos
  db
  db/postgres
  redis
  logs
  attachments
)

for dir in "${dirs[@]}"; do
  target="$DEV_DATA/$dir"
  mkdir -p "$target"
  chmod 755 "$target"
  echo "  ✓ $dir/"
done

# Ensure the root dev_data dir is also 755
chmod 755 "$DEV_DATA"

echo ""
echo "Done.  dev_data/ is git-ignored — only .gitkeep is tracked."
echo ""
echo "Tip: point your .env at these directories:"
echo "  WORKSPACE_DIR=$DEV_DATA/repos"
echo "  DATABASE_URL=sqlite+aiosqlite:///$DEV_DATA/db/devagent.db"
