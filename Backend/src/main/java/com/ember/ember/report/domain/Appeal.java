package com.ember.ember.report.domain;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "appeals")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Appeal extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sanction_id", nullable = false, unique = true)
    private SanctionHistory sanction;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private AppealStatus status = AppealStatus.PENDING;

    @Column(length = 10)
    @Enumerated(EnumType.STRING)
    private AppealDecision decision;

    @Column(name = "decision_reason", columnDefinition = "TEXT")
    private String decisionReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decided_by")
    private AdminAccount decidedBy;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    public enum AppealStatus {
        PENDING, DECIDED
    }

    public enum AppealDecision {
        MAINTAIN, REDUCE, RELEASE
    }

    /** 이의신청 생성 */
    public static Appeal create(User user, SanctionHistory sanction, String reason) {
        Appeal appeal = new Appeal();
        appeal.user = user;
        appeal.sanction = sanction;
        appeal.reason = reason;
        appeal.status = AppealStatus.PENDING;
        return appeal;
    }
}
