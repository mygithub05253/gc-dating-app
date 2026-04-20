package com.ember.ember.content.client;

import com.ember.ember.content.exception.ContentScanRemoteException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;

/**
 * FastAPI 콘텐츠 스캔 API 클라이언트.
 *
 * 설계 사항:
 *   - aiWebClient (AiClientConfig 빈) 사용: X-Internal-Key 헤더 자동 포함
 *   - POST /api/content/scan, body: {"content": "..."}
 *   - 3초 타임아웃 (responseTimeout 오버라이드)
 *   - 타임아웃 / 5xx 발생 시 ContentScanRemoteException 던짐
 *     → ContentScanService에서 catch 후 Silent Fail (로컬 정규식 검사)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ContentScanClient {

    private static final Duration SCAN_TIMEOUT = Duration.ofSeconds(3);
    private static final String SCAN_ENDPOINT = "/api/content/scan";

    private final WebClient aiWebClient;

    /**
     * FastAPI 콘텐츠 스캔 API 호출.
     *
     * @param content 검열할 텍스트
     * @return FastAPI 응답 DTO
     * @throws ContentScanRemoteException 타임아웃 또는 5xx 오류 발생 시
     */
    public ContentScanResponse scan(String content) {
        try {
            return aiWebClient.post()
                .uri(SCAN_ENDPOINT)
                .bodyValue(Map.of("content", content))
                .retrieve()
                .onStatus(
                    // 5xx 응답은 예외로 변환
                    status -> status.is5xxServerError(),
                    response -> response.bodyToMono(String.class)
                        .flatMap(body -> Mono.error(
                            new ContentScanRemoteException(
                                "FastAPI 5xx 오류 — status=" + response.statusCode() + ", body=" + body
                            )
                        ))
                )
                .bodyToMono(ContentScanResponse.class)
                .timeout(
                    SCAN_TIMEOUT,
                    // 타임아웃 시 ContentScanRemoteException 발생
                    Mono.error(new ContentScanRemoteException(
                        "FastAPI 콘텐츠 스캔 타임아웃 (" + SCAN_TIMEOUT.getSeconds() + "s 초과)"
                    ))
                )
                .block(); // 동기 호출 (설계서 3.4절: 동기 HTTP)
        } catch (ContentScanRemoteException e) {
            // 이미 래핑된 예외 — 그대로 재전파
            throw e;
        } catch (WebClientResponseException e) {
            throw new ContentScanRemoteException(
                "FastAPI HTTP 오류 — status=" + e.getStatusCode(), e
            );
        } catch (Exception e) {
            // 네트워크 오류, ConnectException 등
            throw new ContentScanRemoteException(
                "FastAPI 연결 실패 — " + e.getMessage(), e
            );
        }
    }
}
