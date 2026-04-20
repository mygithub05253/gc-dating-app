"""
환경 변수 로더 및 앱 설정 상수
docker-compose.yml / docker-compose.local.yml 에서 주입됨
"""
import os

# ── RabbitMQ ─────────────────────────────────────────────────────────────────
_MQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
_MQ_PORT = os.getenv("RABBITMQ_PORT", "5672")
_MQ_USER = os.getenv("RABBITMQ_USER", "guest")
_MQ_PASS = os.getenv("RABBITMQ_PASS", "guest")

RABBITMQ_URL: str = f"amqp://{_MQ_USER}:{_MQ_PASS}@{_MQ_HOST}:{_MQ_PORT}/"

AI_EXCHANGE: str = "ai.exchange"
DIARY_ANALYZE_QUEUE: str = "diary.analyze.q"
EXCHANGE_REPORT_QUEUE: str = "exchange.report.q"
LIFESTYLE_ANALYZE_QUEUE: str = "lifestyle.analyze.q"         # M6 신규
USER_VECTOR_GENERATE_QUEUE: str = "user.vector.generate.q"   # M6 신규
AI_RESULT_ROUTING_KEY: str = "ai.result.v1"

# ── 추론 설정 ─────────────────────────────────────────────────────────────────
KCELECTRA_MAX_LENGTH: int = 512
MIN_CONTENT_LENGTH: int = 100

# ── Consumer 동시성 ───────────────────────────────────────────────────────────
# CPU 추론 기준 안전값. 필요 시 환경 변수로 오버라이드 가능.
MQ_PREFETCH_COUNT: int = int(os.getenv("MQ_PREFETCH_COUNT", "2"))

# ── 내부 API 키 ───────────────────────────────────────────────────────────────
# Spring → FastAPI 호출 시 X-Internal-Key 헤더 검증에 사용.
# 미설정 시 로컬 개발 기본값 사용 (운영 환경에서는 반드시 환경 변수로 주입).
INTERNAL_API_KEY: str = os.getenv("INTERNAL_API_KEY", "local-dev-key")
