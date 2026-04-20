package com.ember.ember.matching.client;

import com.ember.ember.matching.exception.MatchingRemoteException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;

/**
 * FastAPI 매칭 계산 API 클라이언트.
 *
 * POST /api/matching/calculate
 *   - AiClientConfig의 WebClient Bean 재사용 (baseUrl, X-Internal-Key 헤더 포함)
 *   - 10초 응답 타임아웃 (설계서 3.2§)
 *   - 타임아웃 / 5xx → MatchingRemoteException (MatchingService가 stale 폴백)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MatchingClient {

    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    /** AiClientConfig.aiWebClient() 빈 주입 */
    private final WebClient aiWebClient;

    /**
     * FastAPI POST /api/matching/calculate 동기 호출.
     *
     * @param request 매칭 계산 요청 (기준 사용자 임베딩 + 후보 목록)
     * @return FastAPI가 계산한 후보별 점수 결과
     * @throws MatchingRemoteException 타임아웃 또는 5xx 오류 발생 시
     */
    public MatchingCalculateResponse calculate(MatchingCalculateRequest request) {
        try {
            MatchingCalculateResponse response = aiWebClient.post()
                    .uri("/api/matching/calculate")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(MatchingCalculateResponse.class)
                    .timeout(TIMEOUT)
                    .block();

            if (response == null) {
                throw new MatchingRemoteException("[MatchingClient] FastAPI 응답이 null입니다.");
            }
            return response;

        } catch (WebClientResponseException e) {
            // 4xx/5xx HTTP 오류
            log.warn("[MatchingClient] FastAPI 오류 응답 — status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new MatchingRemoteException(
                    String.format("[MatchingClient] AI 서버 오류 — HTTP %s", e.getStatusCode()), e);

        } catch (MatchingRemoteException e) {
            throw e;

        } catch (Exception e) {
            // 타임아웃 포함 기타 예외
            log.warn("[MatchingClient] FastAPI 호출 실패 — 이유={}", e.getMessage());
            throw new MatchingRemoteException("[MatchingClient] AI 서버 호출 실패: " + e.getMessage(), e);
        }
    }
}
