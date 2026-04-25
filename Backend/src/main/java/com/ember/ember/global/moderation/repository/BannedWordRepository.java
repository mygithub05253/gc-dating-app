package com.ember.ember.global.moderation.repository;

import com.ember.ember.global.moderation.domain.BannedWord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * 금칙어 JPA Repository.
 * 활성 상태인 금칙어만 조회하여 캐시에 적재한다.
 */
public interface BannedWordRepository extends JpaRepository<BannedWord, Long> {

    /**
     * 활성(isActive=true) 금칙어 전체 조회.
     * Redis 캐시 미스 시 호출하여 BANNED_WORDS:ALL 키에 저장한다.
     */
    @Query("SELECT b FROM BannedWord b WHERE b.isActive = true")
    List<BannedWord> findAllActive();

    /** (word, match_mode) 유니크 중복 체크 용. */
    Optional<BannedWord> findByWordAndMatchMode(String word, BannedWord.MatchMode matchMode);

    /**
     * 관리자 CRUD 페이징 검색 — 카테고리/매치모드/활성/키워드 필터.
     * null 은 해당 조건 생략.
     */
    @Query("""
            SELECT b FROM BannedWord b
            WHERE (:category IS NULL OR b.category = :category)
              AND (:matchMode IS NULL OR b.matchMode = :matchMode)
              AND (:isActive IS NULL OR b.isActive = :isActive)
              AND (:q IS NULL OR LOWER(b.word) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')))
            """)
    Page<BannedWord> search(@Param("category") BannedWord.BannedWordCategory category,
                            @Param("matchMode") BannedWord.MatchMode matchMode,
                            @Param("isActive") Boolean isActive,
                            @Param("q") String q,
                            Pageable pageable);
}
