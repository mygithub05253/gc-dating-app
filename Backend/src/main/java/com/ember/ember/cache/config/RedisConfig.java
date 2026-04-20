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
 *
 * Bean 2종:
 *   - stringRedisTemplate : 단순 문자열 값 저장 (캐시 키 관리, TTL 조작)
 *   - objectRedisTemplate : JSON 직렬화 객체 저장 (AI 분석 결과, 매칭 추천 목록 등)
 */
@Configuration
public class RedisConfig {

    /**
     * 문자열 전용 RedisTemplate
     * Key: StringRedisSerializer, Value: StringRedisSerializer
     */
    @Bean(name = "stringRedisTemplate")
    public RedisTemplate<String, String> stringRedisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, String> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new StringRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }

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
