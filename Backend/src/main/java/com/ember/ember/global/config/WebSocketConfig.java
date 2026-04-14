package com.ember.ember.global.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final CorsProperties corsProperties;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // 구독 경로 (서버 → 클라이언트)
        registry.enableSimpleBroker("/topic", "/queue");
        // 발행 경로 (클라이언트 → 서버)
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = corsProperties.getAllowedOrigins().stream()
                .filter(o -> o != null && !o.isBlank())
                .toArray(String[]::new);

        registry.addEndpoint("/ws/chat")
                .setAllowedOrigins(origins)
                .withSockJS();
    }
}
