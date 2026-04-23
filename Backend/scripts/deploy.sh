#!/usr/bin/env bash
# Backend/scripts/deploy.sh — 변경 감지 + 선택적 빌드/재시작
set -euo pipefail

cd "$(dirname "$0")/../.."

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
# 1. 변경 감지 (직전 커밋 대비)
# ─────────────────────────────────────────────
BACKEND_CHANGED=$(git diff HEAD~1 --name-only -- Backend/ | wc -l)
AI_CHANGED=$(git diff HEAD~1 --name-only -- ai/ | wc -l)
COMPOSE_CHANGED=$(git diff HEAD~1 --name-only -- docker-compose.yml | wc -l)

log "변경 감지: Backend=$BACKEND_CHANGED, AI=$AI_CHANGED, Compose=$COMPOSE_CHANGED"

# docker-compose.yml 변경 시 전체 리빌드
if [ "$COMPOSE_CHANGED" -gt 0 ]; then
  BACKEND_CHANGED=1
  AI_CHANGED=1
  log "docker-compose.yml 변경 → 전체 리빌드"
fi

# 아무것도 안 바뀌었으면 (workflow 파일만 변경 등) 전체 리빌드
if [ "$BACKEND_CHANGED" -eq 0 ] && [ "$AI_CHANGED" -eq 0 ]; then
  BACKEND_CHANGED=1
  AI_CHANGED=1
  log "특정 변경 없음 → 안전하게 전체 리빌드"
fi

# ─────────────────────────────────────────────
# 2. 인프라 서비스 확인 (redis, rabbitmq) — 항상 유지
# ─────────────────────────────────────────────
log "인프라 서비스 확인 (redis, rabbitmq)..."
docker compose up -d redis rabbitmq

# rabbitmq가 아직 healthy 아니면 대기
if ! docker inspect --format='{{.State.Health.Status}}' ember-rabbitmq 2>/dev/null | grep -q healthy; then
  log "Waiting for rabbitmq healthy (최대 60초)..."
  for i in $(seq 1 30); do
    if docker inspect --format='{{.State.Health.Status}}' ember-rabbitmq 2>/dev/null | grep -q healthy; then
      log "  ✅ rabbitmq healthy"
      break
    fi
    sleep 2
  done
fi

# ─────────────────────────────────────────────
# 3. AI — 변경 시에만 리빌드
# ─────────────────────────────────────────────
if [ "$AI_CHANGED" -gt 0 ]; then
  log "AI 변경 감지 → 리빌드..."
  docker compose stop ai
  docker compose build ai
  docker compose up -d ai

  log "Waiting for ai /health (최대 60초)..."
  for i in $(seq 1 30); do
    if docker compose exec -T ai curl -sf http://localhost:8000/health >/dev/null 2>&1; then
      log "  ✅ ai /health ok"
      break
    fi
    sleep 2
  done

  log "Warming up AI models..."
  if docker compose exec -T ai curl -sf --max-time 1200 -X POST http://localhost:8000/warmup; then
    log "  ✅ ai warmup complete"
  else
    log "  ⚠️  warmup 실패 또는 타임아웃 — 로그 확인 필요"
    docker compose logs ai --tail 50
  fi
else
  log "AI 변경 없음 → 스킵 (기존 컨테이너 유지)"
  docker compose up -d ai
fi

# ─────────────────────────────────────────────
# 4. Backend — 변경 시에만 리빌드
# ─────────────────────────────────────────────
if [ "$BACKEND_CHANGED" -gt 0 ]; then
  log "Backend 변경 감지 → 리빌드..."
  docker compose stop backend
  docker compose build backend
  docker compose up -d backend
else
  log "Backend 변경 없음 → 스킵 (기존 컨테이너 유지)"
  docker compose up -d backend
fi

log "Waiting for backend 내부 기동 (최대 90초)..."
for i in $(seq 1 18); do
  if docker compose exec -T backend sh -c "command -v nc >/dev/null && nc -z localhost 8080" 2>/dev/null; then
    log "  ✅ backend port 8080 listening"
    break
  fi
  sleep 5
done

# ─────────────────────────────────────────────
# 5. Nginx — Backend 재생성 시 restart (IP 변경 감지)
# ─────────────────────────────────────────────
if [ "$BACKEND_CHANGED" -gt 0 ]; then
  log "Backend 재생성됨 → Nginx restart (upstream DNS 갱신)..."
  docker compose restart nginx
else
  log "Starting nginx..."
  docker compose up -d nginx
fi

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
