/**
 * k6 부하 테스트: 일기 생성 → AI 분석 트리거 (동기 응답 구간)
 *
 * 목표:
 *   - POST /api/diaries 의 동기 응답 (Outbox 저장 완료) p95 < 2s
 *   - 에러율 < 1%
 *
 * 주의:
 *   비동기 AI 분석(MQ → FastAPI → KcELECTRA) 완료 시간은 이 테스트로 측정 불가.
 *   Prometheus 메트릭 ai_diary_analyze_duration_seconds 를 직접 확인한다.
 *
 * 실행 예시:
 *   k6 run -e BASE_URL=http://localhost:8080 -e JWT=<토큰> diary-analyze.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    // 워밍업: 30초간 5 VU로 점진적 증가
    { duration: '30s', target: 5 },
    // 부하: 60초간 10 VU 유지 (약 10 RPS)
    { duration: '60s', target: 10 },
    // 쿨다운: 30초간 0으로 감소
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    // 일기 생성 엔드포인트 태그 기준 p95 < 2000ms
    'http_req_duration{endpoint:diary_create}': ['p(95)<2000'],
    // 전체 에러율 < 1%
    'http_req_failed': ['rate<0.01'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:8080';
const TOKEN = __ENV.JWT || 'placeholder-jwt';

export default function () {
  // 최소 100자 이상 일기 본문 (API 요구사항)
  const content =
    '오늘은 카페에서 책을 읽었다. ' +
    '조용한 오후를 보내며 감사함을 느꼈다. '.repeat(5);

  const payload = JSON.stringify({
    content: content,
    visibility: 'PRIVATE',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    tags: { endpoint: 'diary_create' },
    timeout: '10s',
  };

  const res = http.post(`${BASE}/api/diaries`, payload, params);

  check(res, {
    'status 201': (r) => r.status === 201,
    'has diaryId': (r) => {
      try {
        return r.json().data && r.json().data.diaryId != null;
      } catch (_) {
        return false;
      }
    },
  });

  // 1초 대기 — 실제 사용 패턴 모사 (사용자가 일기를 작성하고 저장하는 간격)
  sleep(1);
}
