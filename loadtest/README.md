# Ember 부하 테스트 (k6)

M7 마일스톤 — 관측성 + 성능 목표 검증용 k6 스크립트.

## 설치

```bash
# Windows (Chocolatey)
choco install k6

# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

## 스크립트 목록

| 파일 | 대상 | VU | 시간 |
|------|------|----|------|
| `diary-analyze.js` | Spring POST /api/diaries | 10 | 2분 |
| `matching-recommendations.js` | Spring GET /api/matching/recommendations | 20 | 60초 |
| `content-scan.js` | FastAPI POST /api/content/scan | 10 | 30초 |

## 실행 예시

### 일기 생성 (Spring)

```bash
k6 run \
  -e BASE_URL=http://localhost:8080 \
  -e JWT=eyJhbGciOiJIUzI1NiJ9... \
  diary-analyze.js
```

### 매칭 추천 (Spring)

```bash
k6 run \
  -e BASE_URL=http://localhost:8080 \
  -e JWT=eyJhbGciOiJIUzI1NiJ9... \
  matching-recommendations.js
```

### 콘텐츠 스캔 (FastAPI 직접)

```bash
k6 run \
  -e BASE_URL=http://localhost:8000 \
  -e INTERNAL_KEY=local-dev-key \
  content-scan.js
```

### 결과를 JSON으로 저장

```bash
k6 run --out json=results.json diary-analyze.js
```

## 임계값 목표

| 엔드포인트 | 지표 | 목표 |
|------------|------|------|
| POST /api/diaries | p95 응답시간 | < 2s |
| GET /api/matching/recommendations (캐시 히트) | p95 응답시간 | < 2s |
| GET /api/matching/recommendations (캐시 미스) | p95 응답시간 | < 4s |
| POST /api/content/scan | p95 응답시간 | < 1s |
| 전체 | 에러율 | < 1% |

## 비동기 분석 시간 측정

일기 생성 API는 **Outbox 저장까지의 동기 구간**만 측정한다.
MQ → FastAPI → KcELECTRA 추론 → 결과 저장까지의 **비동기 완료 시간**은
HTTP 응답으로 측정할 수 없다.

비동기 분석 소요 시간은 Prometheus 메트릭을 직접 확인한다:

```
# FastAPI /metrics 엔드포인트
curl http://localhost:8000/metrics | grep ai_diary_analyze_duration

# Prometheus 쿼리 예시
histogram_quantile(0.95, rate(ai_diary_analyze_duration_seconds_bucket[5m]))
```

## TODO

- [ ] Grafana 대시보드 JSON (ember-observability.json)
- [ ] toxiproxy 카오스 테스트 (네트워크 지연 + 패킷 손실)
- [ ] OTEL SDK FastAPI 완전 통합 (span 자동 계측)
