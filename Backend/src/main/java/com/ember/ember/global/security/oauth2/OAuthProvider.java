package com.ember.ember.global.security.oauth2;

/**
 * 소셜 OAuth Provider 인터페이스 (Strategy 패턴)
 */
public interface OAuthProvider {

    /** 소셜 토큰으로 사용자 정보 조회 */
    OAuthUserInfo getUserInfo(String socialToken);

    /** 지원하는 provider 이름 */
    String getProviderName();
}
