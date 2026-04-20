package com.ember.ember.global.config;

import com.ember.ember.global.security.jwt.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CorsProperties corsProperties;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // 헬스체크
                        .requestMatchers("/api/health").permitAll()
                        // 인증 API (인증 불필요)
                        .requestMatchers("/api/auth/**").permitAll()
                        // 관리자 인증 API
                        .requestMatchers("/api/admin/auth/**").permitAll()
                        // 닉네임 생성 (인증 불필요)
                        .requestMatchers("/api/users/nickname/generate").permitAll()
                        // 키워드 목록 조회 (공개 API)
                        .requestMatchers("/api/users/ideal-type/keyword-list").permitAll()
                        // 앱 버전 체크 (인증 불필요)
                        .requestMatchers("/api/system/version").permitAll()
                        // 수요일 주제 조회 (인증 불필요)
                        .requestMatchers("/api/diaries/weekly-topic").permitAll()
                        // WebSocket
                        .requestMatchers("/ws/**").permitAll()
                        // 개발용 토큰 발급
                        .requestMatchers("/api/dev/**").permitAll()
                        // Swagger
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        // Actuator
                        .requestMatchers("/actuator/health").permitAll()
                        // Prometheus 스크레이핑 엔드포인트 — 내부망 전용 (prod에서는 네트워크 정책으로 추가 제한)
                        .requestMatchers("/actuator/prometheus").permitAll()
                        .requestMatchers("/actuator/metrics/**").permitAll()
                        // 나머지는 인증 필요
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        List<String> origins = corsProperties.getAllowedOrigins().stream()
                .filter(o -> o != null && !o.isBlank())
                .toList();
        config.setAllowedOrigins(origins);

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        source.registerCorsConfiguration("/ws/**", config);
        return source;
    }
}
