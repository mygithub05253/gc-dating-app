package com.ember.ember.cache.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * Redis 설정
 * application.yml의 spring.data.redis 설정을 기반으로 Lettuce 커넥션 팩토리가 자동 생성됨.
 * StringRedisTemplate은 Spring Boot 자동설정이 제공 (TokenService 등에서 사용).
 */
@Configuration
public class RedisConfig {

    /**
     * 객체 JSON 직렬화 RedisTemplate
     * Key: StringRedisSerializer, Value: GenericJackson2JsonRedisSerializer
     * 타입 정보(@class)를 JSON에 포함하여 역직렬화 시 정확한 타입 복원.
     */
    @Bean(name = "objectRedisTemplate")
    public RedisTemplate<String, Object> objectRedisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }
}
