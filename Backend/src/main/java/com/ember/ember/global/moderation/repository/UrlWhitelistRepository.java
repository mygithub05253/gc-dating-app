package com.ember.ember.global.moderation.repository;

import com.ember.ember.global.moderation.domain.UrlWhitelist;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

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

    /** domain 유니크 중복 체크 용. */
    Optional<UrlWhitelist> findByDomain(String domain);

    /** 관리자 CRUD 페이징 검색 — 활성/도메인 키워드 필터. */
    @Query("""
            SELECT u FROM UrlWhitelist u
            WHERE (:isActive IS NULL OR u.isActive = :isActive)
              AND (:q IS NULL OR LOWER(u.domain) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')))
            """)
    Page<UrlWhitelist> search(@Param("isActive") Boolean isActive,
                              @Param("q") String q,
                              Pageable pageable);
}
