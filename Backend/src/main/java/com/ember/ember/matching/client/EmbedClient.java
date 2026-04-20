package com.ember.ember.matching.client;

import com.ember.ember.matching.exception.MatchingRemoteException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.List;

/**
 * FastAPI KoSimCSE 임베딩 API 클라이언트.
 *
 * POST /api/matching/embed
 *   - 텍스트를 KoSimCSE로 임베딩해 Base64 float16 반환
 *   - 기준 사용자 user_vector가 없을 때 이상형 키워드 텍스트 임베딩에 사용
 *   - 10초 타임아웃 적용
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmbedClient {

    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    private final WebClient aiWebClient;

    /**
     * 텍스트 목록을 KoSimCSE로 임베딩한다.
     *
     * @param texts 임베딩할 텍스트 목록
     * @return Base64 인코딩 float16 임베딩 목록 (texts와 1:1 대응)
     * @throws MatchingRemoteException 타임아웃 또는 서버 오류 시
     */
    public List<String> embed(List<String> texts) {
        EmbedRequest request = EmbedRequest.builder().texts(texts).build();
        try {
            EmbedResponse response = aiWebClient.post()
                    .uri("/api/matching/embed")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(EmbedResponse.class)
                    .timeout(TIMEOUT)
                    .block();

            if (response == null || response.getEmbeddings() == null) {
                throw new MatchingRemoteException("[EmbedClient] FastAPI 임베딩 응답이 null입니다.");
            }
            return response.getEmbeddings();

        } catch (WebClientResponseException e) {
            log.warn("[EmbedClient] FastAPI 임베딩 오류 — status={}", e.getStatusCode());
            throw new MatchingRemoteException("[EmbedClient] AI 임베딩 서버 오류: HTTP " + e.getStatusCode(), e);
        } catch (MatchingRemoteException e) {
            throw e;
        } catch (Exception e) {
            log.warn("[EmbedClient] FastAPI 임베딩 호출 실패 — 이유={}", e.getMessage());
            throw new MatchingRemoteException("[EmbedClient] AI 임베딩 서버 호출 실패: " + e.getMessage(), e);
        }
    }
}
