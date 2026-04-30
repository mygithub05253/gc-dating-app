package com.ember.ember.global.security.xss;

import org.springframework.web.util.HtmlUtils;

/**
 * §13.5 XSS 방지 유틸리티
 * 사용자 입력 필드에 HTML 이스케이프 적용 (저장 시 이스케이프 방식)
 */
public final class XssSanitizer {

    private XssSanitizer() {}

    /**
     * HTML 특수문자 이스케이프
     * < → &lt;  > → &gt;  " → &quot;  & → &amp;
     */
    public static String sanitize(String input) {
        if (input == null || input.isEmpty()) {
            return input;
        }
        return HtmlUtils.htmlEscape(input);
    }
}
