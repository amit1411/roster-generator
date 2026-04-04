#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
ENV_FILE="$SCRIPT_DIR/.env"

if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DC=(docker-compose)
else
  echo "Docker Compose is required but was not found." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  echo "Copy oci-deployment/.env.example to oci-deployment/.env and update the values." >&2
  exit 1
fi

run_compose() {
  "${DC[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

usage() {
  cat <<'EOF'
Usage: ./manage.sh <command>

Commands:
  start     Build and start proxy + backend + Postgres
  stop      Stop and remove proxy + backend + Postgres containers
  restart   Restart the full stack
  logs      Tail logs for the full stack
  status    Show container status
EOF
}

case "${1:-}" in
  start)
    run_compose up -d --build
    ;;
  stop)
    run_compose down
    ;;
  restart)
    run_compose down
    run_compose up -d --build
    ;;
  logs)
    run_compose logs -f
    ;;
  status)
    run_compose ps
    ;;
  *)
    usage
    exit 1
    ;;
esac
