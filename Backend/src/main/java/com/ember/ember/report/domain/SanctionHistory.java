package com.ember.ember.report.domain;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "sanction_history")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SanctionHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id")
    private AdminAccount admin;

    @Column(name = "sanction_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private SanctionType sanctionType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "reason_category", length = 30)
    private String reasonCategory;

    @Column(name = "previous_status", length = 20)
    private String previousStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id")
    private Report report;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    public enum SanctionType {
        WARNING, SUSPEND_7D, SUSPEND_30D, SUSPEND_PERMANENT, FORCE_WITHDRAW, UNBLOCK
    }

    /**
     * 제재 이력 생성 팩터리 — 관리자 API §3.3~3.5에서 사용.
     * @param user          대상 사용자 (필수)
     * @param admin         집행 관리자 (필수)
     * @param sanctionType  제재 유형
     * @param reason        사유 (필수)
     * @param reasonCategory  사유 분류 (선택)
     * @param previousStatus  이전 UserStatus (문자열)
     * @param report        연관 신고 (선택, null 가능)
     * @param startedAt     제재 시작 시각 (now 또는 now-base)
     * @param endedAt       제재 종료 시각 (SUSPEND_7D 는 startedAt + 7일, SUSPEND_PERMANENT 는 null)
     */
    public static SanctionHistory create(User user,
                                         AdminAccount admin,
                                         SanctionType sanctionType,
                                         String reason,
                                         String reasonCategory,
                                         String previousStatus,
                                         Report report,
                                         LocalDateTime startedAt,
                                         LocalDateTime endedAt) {
        SanctionHistory h = new SanctionHistory();
        h.user = user;
        h.admin = admin;
        h.sanctionType = sanctionType;
        h.reason = reason;
        h.reasonCategory = reasonCategory;
        h.previousStatus = previousStatus;
        h.report = report;
        h.startedAt = startedAt;
        h.endedAt = endedAt;
        return h;
    }
}
