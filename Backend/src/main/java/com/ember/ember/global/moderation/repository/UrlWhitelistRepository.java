package com.ember.ember.global.moderation.repository;

import com.ember.ember.global.moderation.domain.UrlWhitelist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

/**
 * URL 화이트리스트 JPA Repository.
 * 활성 상태인 도메인만 조회하여 캐시에 적재한다.
 */
public interface UrlWhitelistRepository extends JpaRepository<UrlWhitelist, Long> {

    /**
     * 활성(isActive=true) URL 화이트리스트 전체 조회.
     * Redis 캐시 미스 시 호출하여 URL_WHITELIST 키에 저장한다.
     */
    @Query("SELECT u FROM UrlWhitelist u WHERE u.isActive = true")
    List<UrlWhitelist> findAllActive();
}
