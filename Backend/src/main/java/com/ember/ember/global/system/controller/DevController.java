package com.ember.ember.global.system.controller;

import com.ember.ember.global.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 로컬 개발 전용 — 테스트 토큰 발급 엔드포인트.
 * prod에서는 비활성화됨.
 */
@RestController
@RequiredArgsConstructor
public class DevController {

    private final JwtTokenProvider jwtTokenProvider;

    @GetMapping("/api/dev/token")
    public Map<String, String> issueTestToken(@RequestParam Long userId) {
        String accessToken = jwtTokenProvider.createAccessToken(userId, "ROLE_USER");
        return Map.of("accessToken", accessToken);
    }
}
