#!/usr/bin/env bash
# Backend/scripts/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."

log() { echo "[$(date +%H:%M:%S)] $*"; }

# ─────────────────────────────────────────────
# 0. 사전 체크
# ─────────────────────────────────────────────
[ -f .env ] || { echo "❌ .env missing"; exit 1; }
[ -f Backend/src/main/resources/firebase-service-account.json ] || \
  { echo "❌ firebase-service-account.json missing"; exit 1; }
[ -f Backend/nginx/nginx.conf ] || { echo "❌ Backend/nginx/nginx.conf missing"; exit 1; }
[ -f ai/Dockerfile ] || { echo "❌ ai/Dockerfile missing"; exit 1; }

# ─────────────────────────────────────────────
# 1. 전체 stop
# ─────────────────────────────────────────────
log "Stopping all containers..."
docker compose down

# ─────────────────────────────────────────────
# 2. 이미지 빌드 — 순차 (동시 빌드 시 메모리 스파이크 방지)
# ─────────────────────────────────────────────
log "Building ai image (torch + transformers)..."
docker compose build ai

log "Building backend image (Gradle bootJar)..."
docker compose build backend

# ─────────────────────────────────────────────
# 3. 인프라 서비스 먼저 (redis, rabbitmq)
# ─────────────────────────────────────────────
log "Starting redis + rabbitmq..."
docker compose up -d redis rabbitmq

log "Waiting for rabbitmq healthy (최대 60초)..."
for i in $(seq 1 30); do
  if docker inspect --format='{{.State.Health.Status}}' ember-rabbitmq 2>/dev/null | grep -q healthy; then
    log "  ✅ rabbitmq healthy"
    break
  fi
  sleep 2
done

# ─────────────────────────────────────────────
# 4. AI 컨테이너 기동 + 워밍업 대기
# ─────────────────────────────────────────────
log "Starting ai..."
docker compose up -d ai

log "Waiting for ai /health (최대 60초)..."
for i in $(seq 1 30); do
  if docker compose exec -T ai curl -sf http://localhost:8000/health >/dev/null 2>&1; then
    log "  ✅ ai /health ok"
    break
  fi
  sleep 2
done

log "Warming up AI models (첫 실행 시 다운로드에 5~15분 소요)..."
if docker compose exec -T ai curl -sf --max-time 1200 -X POST http://localhost:8000/warmup; then
  log "  ✅ ai warmup complete"
else
  log "  ⚠️  warmup 실패 또는 타임아웃 — 로그 확인 필요"
  docker compose logs ai --tail 50
fi

# ─────────────────────────────────────────────
# 5. Backend + Nginx
# ─────────────────────────────────────────────
log "Starting backend..."
docker compose up -d backend

log "Waiting for backend 내부 기동 (최대 90초)..."
for i in $(seq 1 18); do
  if docker compose exec -T backend sh -c "command -v nc >/dev/null && nc -z localhost 8080" 2>/dev/null; then
    log "  ✅ backend port 8080 listening"
    break
  fi
  sleep 5
done

log "Starting nginx..."
docker compose up -d nginx

# ─────────────────────────────────────────────
# 6. 최종 헬스체크
# ─────────────────────────────────────────────
log "Final healthcheck via nginx..."
for i in $(seq 1 20); do
  if curl -sf http://localhost/health >/dev/null; then
    log "  ✅ nginx /health ok"

    UP=$(docker compose ps --format '{{.State}}' | grep -c running || true)
    log "  Running containers: $UP / 5"
    docker compose ps

    log "Memory snapshot:"
    free -h
    docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}" \
      | grep ember || true

    log "🎉 Deploy complete."
    exit 0
  fi
  sleep 3
done

log "❌ Nginx healthcheck failed"
docker compose ps
docker compose logs nginx backend --tail 50
exit 1
