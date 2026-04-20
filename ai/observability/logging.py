"""
Ember AI 서버 구조화 JSON 로깅 설정 (M7 관측성)

configure_logging() 을 앱 시작 시점(main.py lifespan 이전)에 한 번만 호출한다.

structlog 처리 파이프라인:
  1. contextvars 병합 (traceparent 등 바인딩된 컨텍스트 포함)
  2. 로그 레벨 추가
  3. ISO-8601 타임스탬프 추가
  4. JSON 직렬화 출력

사용 예시:
  import structlog
  logger = structlog.get_logger(__name__)

  # 컨텍스트 바인딩 (MQ 메시지 수신 시)
  structlog.contextvars.bind_contextvars(
      traceparent="00-...",
      messageId="uuid",
      diaryId=123,
  )
  logger.info("일기 분석 시작")

  # 컨텍스트 해제 (처리 완료 후)
  structlog.contextvars.clear_contextvars()
"""

import logging
import sys

import structlog


def configure_logging() -> None:
    """
    structlog + stdlib logging을 JSON 포맷으로 통합 설정.
    중복 호출 시 멱등 처리됨 (structlog 내부가 이미 configure 상태 추적).
    """
    # stdlib logging: 포맷 없이 메시지만 출력 (structlog가 이미 JSON 직렬화)
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.INFO,
    )

    structlog.configure(
        processors=[
            # 1. contextvars에 바인딩된 컨텍스트 병합 (traceparent, messageId 등)
            structlog.contextvars.merge_contextvars,
            # 2. 로그 레벨 필드 추가 ("level": "info")
            structlog.processors.add_log_level,
            # 3. ISO-8601 타임스탬프 추가 ("timestamp": "2026-04-20T...")
            structlog.processors.TimeStamper(fmt="iso"),
            # 4. 스택 트레이스 처리 (exception 발생 시 exc_info → stack_trace JSON)
            structlog.processors.StackInfoRenderer(),
            structlog.processors.ExceptionRenderer(),
            # 5. JSON 직렬화 최종 출력
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
