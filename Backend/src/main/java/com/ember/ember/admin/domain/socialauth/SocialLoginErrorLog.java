package com.ember.ember.admin.domain.socialauth;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 소셜 로그인 오류 이벤트 로그 (명세 v2.3 §7.6).
 *
 * <p>토큰 원본값은 절대 저장하지 않으며, provider 코드와 메시지만 기록한다.
 * Phase B에서 일별 파티션 + 90일 자동 아카이브 적용 예정.</p>
 */
@Entity
@Table(name = "social_login_error_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SocialLoginErrorLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String provider;

    @Column(name = "error_type", nullable = false, length = 40)
    @Enumerated(EnumType.STRING)
    private ErrorType errorType;

    @Column(name = "error_code", length = 60)
    private String errorCode;

    @Column(name = "resolution_status", nullable = false, length = 40)
    @Enumerated(EnumType.STRING)
    private ResolutionStatus resolutionStatus;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "request_ip", length = 45)
    private String requestIp;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Builder
    private SocialLoginErrorLog(String provider, ErrorType errorType, String errorCode,
                                ResolutionStatus resolutionStatus, Long userId,
                                String requestIp, String errorMessage) {
        this.provider = provider != null ? provider : "KAKAO";
        this.errorType = errorType;
        this.errorCode = errorCode;
        this.resolutionStatus = resolutionStatus != null ? resolutionStatus : ResolutionStatus.MANUAL_INTERVENTION_REQUIRED;
        this.userId = userId;
        this.requestIp = requestIp;
        this.errorMessage = errorMessage;
        this.occurredAt = LocalDateTime.now();
    }

    /** 명세 §7.6 Step 4 — 오류 유형 4분류. */
    public enum ErrorType {
        TOKEN_EXPIRED,                   // 액세스 토큰 만료 (정상 상황 — 리프레시로 갱신)
        PROVIDER_SERVER_ERROR,           // provider 측 서버 장애
        USER_SOCIAL_ACCOUNT_DELETED,     // 사용자 소셜 계정 자체 탈퇴
        APP_PERMISSION_REVOKED           // 사용자가 앱 연동 권한 회수
    }

    /** 해결 상태 분류 — 자동복구 / 사용자 재로그인 / 수동 조치. */
    public enum ResolutionStatus {
        AUTO_RECOVERED,
        USER_RELOGIN_REQUIRED,
        MANUAL_INTERVENTION_REQUIRED
    }
}
