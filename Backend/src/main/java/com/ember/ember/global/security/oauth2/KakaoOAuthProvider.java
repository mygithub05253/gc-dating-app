package com.ember.ember.global.security.oauth2;

import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

/**
 * 카카오 OAuth Provider — socialToken으로 카카오 사용자 정보 API 호출
 */
@Slf4j
@Component
public class KakaoOAuthProvider implements OAuthProvider {

    private static final String KAKAO_USER_INFO_URL = "https://kapi.kakao.com/v2/user/me";

    private final WebClient webClient;

    public KakaoOAuthProvider() {
        this.webClient = WebClient.builder().build();
    }

    @Override
    @SuppressWarnings("unchecked")
    public OAuthUserInfo getUserInfo(String socialToken) {
        try {
            Map<String, Object> response = webClient.get()
                    .uri(KAKAO_USER_INFO_URL)
                    .header("Authorization", "Bearer " + socialToken)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response == null || !response.containsKey("id")) {
                throw new BusinessException(ErrorCode.SOCIAL_AUTH_FAILED);
            }

            String providerId = String.valueOf(response.get("id"));

            String email = null;
            Map<String, Object> kakaoAccount = (Map<String, Object>) response.get("kakao_account");
            if (kakaoAccount != null && Boolean.TRUE.equals(kakaoAccount.get("has_email"))) {
                email = (String) kakaoAccount.get("email");
            }

            return new OAuthUserInfo(providerId, email);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("카카오 사용자 정보 조회 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.SOCIAL_AUTH_FAILED);
        }
    }

    @Override
    public String getProviderName() {
        return "KAKAO";
    }
}
