package com.ember.ember.consent.repository;

import com.ember.ember.global.system.domain.AiConsentLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/**
 * AI 동의 이력 Repository
 * 결정 4: ConsentType Enum → String 기반으로 변경
 * 최신 동의 상태 조회: (user_id, consent_type, acted_at DESC) 인덱스 활용
 */
public interface AiConsentLogRepository extends JpaRepository<AiConsentLog, Long> {

    /**
     * 특정 사용자의 특정 동의 유형에 대한 가장 최근 이력 조회.
     * OutboxRelay에서 동의 여부 확인 시 사용.
     *
     * @param userId      사용자 PK
     * @param consentType 동의 유형 문자열 ("AI_ANALYSIS" / "AI_DATA_USAGE")
     * @return 가장 최근 동의 이력 (없으면 Optional.empty)
     */
    @Query("""
            SELECT a FROM AiConsentLog a
            WHERE a.user.id = :userId
              AND a.consentType = :consentType
            ORDER BY a.actedAt DESC
            LIMIT 1
            """)
    Optional<AiConsentLog> findLatestByUserIdAndConsentType(
            @Param("userId") Long userId,
            @Param("consentType") String consentType
    );
}
