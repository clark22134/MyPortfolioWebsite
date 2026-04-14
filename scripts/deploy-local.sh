#!/bin/bash
set -e

# Local development using Docker Compose
# Usage: ./deploy-local.sh [up|down|build|logs|status]

COMMAND="${1:-up}"

case "$COMMAND" in
  up)
    echo "Starting local development environment..."
    docker compose up -d
    echo ""
    echo "Services started:"
    echo "  Portfolio:   http://localhost:4200  (frontend)  http://localhost:8080  (backend)"
    echo "  E-Commerce:  http://localhost:8082  (frontend)  http://localhost:8081  (backend)"
    echo "  ATS:         http://localhost:8084  (frontend)  http://localhost:8083  (backend)"
    ;;
  down)
    echo "Stopping services..."
    docker compose down
    ;;
  build)
    echo "Rebuilding and starting services..."
    docker compose up --build -d
    echo ""
    echo "Services started:"
    echo "  Portfolio:   http://localhost:4200  (frontend)  http://localhost:8080  (backend)"
    echo "  E-Commerce:  http://localhost:8082  (frontend)  http://localhost:8081  (backend)"
    echo "  ATS:         http://localhost:8084  (frontend)  http://localhost:8083  (backend)"
    ;;
  logs)
    docker compose logs -f "${@:2}"
    ;;
  status)
    docker compose ps
    ;;
  *)
    echo "Usage: $0 [up|down|build|logs|status]"
    echo ""
    echo "Commands:"
    echo "  up      Start all services in background (default)"
    echo "  down    Stop all services"
    echo "  build   Rebuild images and start services"
    echo "  logs    Follow service logs (optionally specify service name)"
    echo "  status  Show running services"
    exit 1
    ;;
esac
