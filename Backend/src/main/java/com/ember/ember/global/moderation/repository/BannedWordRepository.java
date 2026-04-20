package com.ember.ember.global.moderation.repository;

import com.ember.ember.global.moderation.domain.BannedWord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

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
}
