#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="${TMPDIR:-/tmp}/myportfolio-preview"
PID_DIR="$STATE_DIR/pids"
LOG_DIR="$STATE_DIR/logs"
ENV_FILE="$ROOT_DIR/.env"

mkdir -p "$PID_DIR" "$LOG_DIR"

usage() {
  cat <<'EOF'
Usage: ./scripts/preview-all.sh [start|stop|status|restart]

Commands:
  start    Start full local preview stack (portfolio + ecommerce + ATS)
  stop     Stop preview stack services and supporting DB containers
  status   Show service + endpoint status
  restart  Stop then start
EOF
}

load_env() {
  if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
  fi

  export MYSQL_USER="${MYSQL_USER:-ecommerceapp}"
  export MYSQL_PASSWORD="${MYSQL_PASSWORD:-ecommerceapp}"
  export POSTGRES_USER="${POSTGRES_USER:-atsapp}"
  export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-atsapp}"
}

is_port_listening() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

pid_file_for() {
  local name="$1"
  echo "$PID_DIR/$name.pid"
}

log_file_for() {
  local name="$1"
  echo "$LOG_DIR/$name.log"
}

start_service() {
  local name="$1"
  local cwd="$2"
  local port="$3"
  local cmd="$4"
  local pid_file
  local log_file

  pid_file="$(pid_file_for "$name")"
  log_file="$(log_file_for "$name")"

  if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    echo "[$name] already running (pid $(cat "$pid_file"))."
    return
  fi

  if is_port_listening "$port"; then
    echo "[$name] already listening on port $port (external process)."
    return
  fi

  echo "[$name] starting..."
  (
    cd "$cwd"
    nohup bash -lc "$cmd" >"$log_file" 2>&1 &
    echo $! >"$pid_file"
  )

  sleep 1
  if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    echo "[$name] started (pid $(cat "$pid_file")), log: $log_file"
  else
    echo "[$name] failed to start. Check log: $log_file"
  fi
}

stop_service() {
  local name="$1"
  local port="$2"
  local pid_file
  local pid
  local port_pids

  pid_file="$(pid_file_for "$name")"
  if [[ -f "$pid_file" ]]; then
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" 2>/dev/null; then
      echo "[$name] stopping pid $pid..."
      kill "$pid" 2>/dev/null || true
      sleep 1
      if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
      fi
    fi
    rm -f "$pid_file"
  fi

  port_pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$port_pids" ]]; then
    echo "[$name] stopping process(es) on port $port..."
    # shellcheck disable=SC2086
    kill $port_pids 2>/dev/null || true
  fi
}

show_service_status() {
  local name="$1"
  local port="$2"
  local pid_file
  local pid

  pid_file="$(pid_file_for "$name")"
  if [[ -f "$pid_file" ]]; then
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" 2>/dev/null; then
      echo "  - $name: running (pid $pid, port $port)"
      return
    fi
  fi

  if is_port_listening "$port"; then
    echo "  - $name: running (external process on port $port)"
  else
    echo "  - $name: stopped"
  fi
}

start_stack() {
  load_env

  echo "Starting supporting databases with Docker Compose..."
  cd "$ROOT_DIR"
  docker compose up -d ecommerce-db ats-db >/dev/null

  start_service \
    "portfolio-backend" \
    "$ROOT_DIR/portfolio-backend" \
    "8080" \
    "JWT_SECRET='local-dev-jwt-secret-key-12345678901234567890' CHATBOT_ENABLED=false SPRING_AI_MODEL_CHAT=none SPRING_AI_MODEL_EMBEDDING=none mvn spring-boot:run"

  start_service \
    "portfolio-frontend" \
    "$ROOT_DIR/portfolio-frontend" \
    "4200" \
    "npm run start -- --host 0.0.0.0 --port 4200"

  start_service \
    "ecommerce-backend" \
    "$ROOT_DIR/ecommerce-backend" \
    "8443" \
    "SPRING_DATASOURCE_URL='jdbc:mysql://localhost:3307/full-stack-ecommerce?useSSL=false&useUnicode=yes&characterEncoding=UTF-8&allowPublicKeyRetrieval=true&serverTimezone=UTC' SPRING_DATASOURCE_USERNAME='$MYSQL_USER' SPRING_DATASOURCE_PASSWORD='$MYSQL_PASSWORD' APP_CORS_ALLOWED_ORIGINS='https://localhost:4202,http://localhost:4202,http://localhost:4200,http://localhost' mvn spring-boot:run"

  start_service \
    "ecommerce-frontend" \
    "$ROOT_DIR/ecommerce-frontend" \
    "4202" \
    "npm run start -- --host 0.0.0.0 --port 4202 --ssl false"

  start_service \
    "ats-backend" \
    "$ROOT_DIR/ats-backend" \
    "8083" \
    "SPRING_DATASOURCE_URL='jdbc:postgresql://localhost:5434/ats' SPRING_DATASOURCE_USERNAME='$POSTGRES_USER' SPRING_DATASOURCE_PASSWORD='$POSTGRES_PASSWORD' SERVER_PORT=8083 APP_CORS_ALLOWED_ORIGINS='http://localhost:4203,http://localhost:8084,http://localhost:4200' mvn spring-boot:run"

  start_service \
    "ats-frontend" \
    "$ROOT_DIR/ats-frontend" \
    "4203" \
    "npm run start -- --host 0.0.0.0 --port 4203 --proxy-config proxy.local.json"

  echo
  echo "Preview URLs:"
  echo "  Portfolio: http://localhost:4200"
  echo "  E-Commerce: http://localhost:4202"
  echo "  ATS: http://localhost:4203"
  echo
  echo "Logs directory: $LOG_DIR"
}

stop_stack() {
  echo "Stopping preview services..."
  stop_service "ats-frontend" "4203"
  stop_service "ats-backend" "8083"
  stop_service "ecommerce-frontend" "4202"
  stop_service "ecommerce-backend" "8443"
  stop_service "portfolio-frontend" "4200"
  stop_service "portfolio-backend" "8080"

  cd "$ROOT_DIR"
  docker compose stop ecommerce-db ats-db >/dev/null || true

  echo "Preview stack stopped."
}

status_stack() {
  echo "Service status:"
  show_service_status "portfolio-backend" "8080"
  show_service_status "portfolio-frontend" "4200"
  show_service_status "ecommerce-backend" "8443"
  show_service_status "ecommerce-frontend" "4202"
  show_service_status "ats-backend" "8083"
  show_service_status "ats-frontend" "4203"

  echo
  echo "Endpoint checks:"
  curl -s -o /dev/null -w "  - Portfolio frontend: %{http_code}\n" "http://localhost:4200" || true
  curl -s -o /dev/null -w "  - Portfolio API: %{http_code}\n" "http://localhost:8080/api/projects" || true
  curl -s -o /dev/null -w "  - E-Commerce frontend: %{http_code}\n" "http://localhost:4202" || true
  curl -s -o /dev/null -w "  - E-Commerce API proxy: %{http_code}\n" "http://localhost:4202/api/products" || true
  curl -k -s -o /dev/null -w "  - E-Commerce API direct: %{http_code}\n" "https://localhost:8443/api/products" || true
  curl -s -o /dev/null -w "  - ATS frontend: %{http_code}\n" "http://localhost:4203" || true
  curl -s -o /dev/null -w "  - ATS API proxy: %{http_code}\n" "http://localhost:4203/api/jobs" || true
}

COMMAND="${1:-start}"

case "$COMMAND" in
  start)
    start_stack
    ;;
  stop)
    stop_stack
    ;;
  status)
    status_stack
    ;;
  restart)
    stop_stack
    start_stack
    ;;
  *)
    usage
    exit 1
    ;;
esac
