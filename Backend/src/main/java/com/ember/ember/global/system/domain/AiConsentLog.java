package com.ember.ember.global.system.domain;

import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * AI 동의 이력 엔티티
 * 사용자의 AI 분석 동의/철회 이력을 시계열로 기록.
 * 최신 동의 상태는 (user_id, consent_type, agreed_at DESC) 인덱스로 조회.
 */
@Entity
@Table(
    name = "ai_consent_log",
    indexes = {
        // 최신 동의 상태 조회 최적화: OutboxRelay에서 동의 확인 시 사용
        @Index(name = "idx_ai_consent_log_user_type_at", columnList = "user_id, consent_type, agreed_at DESC")
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiConsentLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "consent_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ConsentType consentType;

    @Column(nullable = false, length = 10)
    @Enumerated(EnumType.STRING)
    private ConsentAction action;

    @Column(name = "agreed_at", nullable = false)
    private LocalDateTime agreedAt;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    /**
     * AI 동의 유형
     * AI_ANALYSIS: 일기 AI 분석 동의
     * AI_DATA_USAGE: AI 학습 데이터 활용 동의
     */
    public enum ConsentType {
        AI_ANALYSIS, AI_DATA_USAGE
    }

    /**
     * 동의 액션 (ERD v1.2 기준: GRANTED/REVOKED)
     */
    public enum ConsentAction {
        GRANTED, REVOKED
    }

    public static AiConsentLog of(User user, ConsentType consentType, ConsentAction action, String ipAddress) {
        AiConsentLog log = new AiConsentLog();
        log.user = user;
        log.consentType = consentType;
        log.action = action;
        log.agreedAt = LocalDateTime.now();
        log.ipAddress = ipAddress;
        return log;
    }
}
