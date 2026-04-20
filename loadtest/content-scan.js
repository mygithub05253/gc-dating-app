/**
 * k6 부하 테스트: 콘텐츠 스캔 API (FastAPI 직접)
 *
 * 목표:
 *   - POST /api/content/scan p95 < 1000ms
 *   - 에러율 < 1%
 *
 * 인증:
 *   X-Internal-Key 헤더로 내부 서비스 인증 (Spring → FastAPI 호출과 동일 방식)
 *
 * 실행 예시:
 *   k6 run \
 *     -e BASE_URL=http://localhost:8000 \
 *     -e INTERNAL_KEY=local-dev-key \
 *     content-scan.js
 */

import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    // FastAPI 콘텐츠 스캔 p95 < 1s
    'http_req_duration': ['p(95)<1000'],
    // 에러율
    'http_req_failed': ['rate<0.01'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:8000';
const KEY = __ENV.INTERNAL_KEY || 'local-dev-key';

// 테스트용 콘텐츠 케이스 (다양한 길이의 정상 텍스트)
const SAMPLE_CONTENTS = [
  '오늘은 공원에서 산책을 했다. 봄바람이 상쾌했고 꽃향기가 가득했다.',
  '점심으로 된장찌개를 먹었다. 어머니가 끓여주신 맛과 비슷해서 기분이 좋았다.',
  '독서를 하며 하루를 마무리했다. 소설 속 주인공의 용기가 인상적이었다.',
  '친구와 오랜만에 카페에서 만났다. 이야기를 나누다 보니 시간이 금방 지나갔다.',
  '오늘 업무가 많아 피곤했지만 끝내고 나니 뿌듯했다. 내일은 더 여유롭게 하자.',
];

export default function () {
  const content = SAMPLE_CONTENTS[Math.floor(Math.random() * SAMPLE_CONTENTS.length)];

  const payload = JSON.stringify({ content: content });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Key': KEY,
    },
    timeout: '5s',
  };

  const res = http.post(`${BASE}/api/content/scan`, payload, params);

  check(res, {
    'status 200': (r) => r.status === 200,
    'has allowed field': (r) => {
      try {
        return r.json().allowed !== undefined;
      } catch (_) {
        return false;
      }
    },
  });
}
