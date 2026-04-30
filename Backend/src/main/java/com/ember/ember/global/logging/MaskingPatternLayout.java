package com.ember.ember.global.logging;

import ch.qos.logback.classic.PatternLayout;
import ch.qos.logback.classic.spi.ILoggingEvent;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * §13.5 로그 마스킹 PatternLayout
 * 정규식 기반 민감 정보 자동 마스킹
 */
public class MaskingPatternLayout extends PatternLayout {

    // Access Token: Bearer eyJ... → Bearer eyJhbGci...
    private static final Pattern TOKEN_PATTERN =
            Pattern.compile("(Bearer\\s+)([A-Za-z0-9_-]{8})[A-Za-z0-9_.-]+");

    // 이메일: user@example.com → us***@example.com
    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("([a-zA-Z0-9._%+-]{2})[a-zA-Z0-9._%+-]*(@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})");

    // 실명 (한글 2~5자): 김종수 → 김**
    private static final Pattern REALNAME_PATTERN =
            Pattern.compile("realName=([가-힣])[가-힣]{1,4}");

    // 전화번호: 010-1234-5678 → 010-****-****
    private static final Pattern PHONE_PATTERN =
            Pattern.compile("(01[016789])[-.]?(\\d{3,4})[-.]?(\\d{4})");

    // Refresh Token 값 (RT: 이후 값 전체 마스킹)
    private static final Pattern REFRESH_TOKEN_PATTERN =
            Pattern.compile("(RT:|refreshToken[\"=:]+\\s*)([A-Za-z0-9_.-]{8})[A-Za-z0-9_.-]+");

    // 일기 본문 (content= 뒤의 긴 텍스트)
    private static final Pattern CONTENT_PATTERN =
            Pattern.compile("(content[\"=:]+\\s*)[^,}]{50,}");

    @Override
    public String doLayout(ILoggingEvent event) {
        String message = super.doLayout(event);
        return maskSensitiveData(message);
    }

    private String maskSensitiveData(String message) {
        if (message == null || message.isEmpty()) {
            return message;
        }

        // Access Token 마스킹
        message = TOKEN_PATTERN.matcher(message)
                .replaceAll("$1$2...[MASKED]");

        // Refresh Token 마스킹
        message = REFRESH_TOKEN_PATTERN.matcher(message)
                .replaceAll("$1[REFRESH_TOKEN_MASKED]");

        // 이메일 마스킹
        message = EMAIL_PATTERN.matcher(message)
                .replaceAll("$1***$2");

        // 실명 마스킹
        message = REALNAME_PATTERN.matcher(message)
                .replaceAll("realName=$1**");

        // 전화번호 마스킹
        message = PHONE_PATTERN.matcher(message)
                .replaceAll("$1-****-****");

        // 일기/채팅 본문 마스킹
        message = CONTENT_PATTERN.matcher(message)
                .replaceAll("$1[CONTENT_MASKED]");

        return message;
    }
}
