/**
 * k6 부하 테스트: 매칭 추천 API
 *
 * 목표:
 *   - 전체(캐시 히트 포함) p95 < 2000ms
 *   - 캐시 미스 구간 p95 < 4000ms (FastAPI KoSimCSE 추론 포함)
 *   - 에러율 < 1%
 *
 * 캐시 히트 비율:
 *   첫 요청은 반드시 미스(AI 계산), 이후 10분 TTL 내 재요청은 히트.
 *   단일 JWT로 60초 동안 연속 요청하면 대부분 히트.
 *   서로 다른 사용자 JWT 사용 시 미스 비율 증가.
 *
 * 실행 예시:
 *   k6 run -e BASE_URL=http://localhost:8080 -e JWT=<토큰> matching-recommendations.js
 */

import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 20,
  duration: '60s',
  thresholds: {
    // 전체 p95 < 2s (캐시 히트 기준)
    'http_req_duration': ['p(95)<2000'],
    // 캐시 미스 태그가 붙은 요청은 p95 < 4s
    'http_req_duration{cache:miss}': ['p(95)<4000'],
    // 에러율
    'http_req_failed': ['rate<0.01'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:8080';
const TOKEN = __ENV.JWT || 'placeholder-jwt';

export default function () {
  const params = {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
    timeout: '10s',
  };

  const res = http.get(`${BASE}/api/matching/recommendations`, params);

  // X-Degraded 헤더로 stale 폴백 여부 감지 (Spring MatchingController에서 추가 예정)
  const isDegraded = res.headers['X-Degraded'] === 'true';
  const source = (() => {
    try {
      return res.json().data && res.json().data.source;
    } catch (_) {
      return null;
    }
  })();

  // source 기반으로 캐시 상태 태그 구분 (메트릭 분석용)
  if (source === 'FRESH' || source == null) {
    res.request.tags = { cache: 'miss' };
  }

  check(res, {
    'status 200': (r) => r.status === 200,
    'has items array': (r) => {
      try {
        const data = r.json().data;
        return data && Array.isArray(data.items);
      } catch (_) {
        return false;
      }
    },
    'not degraded': () => !isDegraded,
  });
}
