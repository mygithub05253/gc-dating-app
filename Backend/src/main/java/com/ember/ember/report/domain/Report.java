package com.ember.ember.report.domain;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "reports")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Report extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_user_id", nullable = false)
    private User targetUser;

    @Column(nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private ReportReason reason;

    @Column(length = 30)
    @Enumerated(EnumType.STRING)
    private ContextType contextType;

    @Column(name = "context_id")
    private Long contextId;

    @Column(columnDefinition = "TEXT")
    private String detail;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private ReportStatus status = ReportStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    private AdminAccount resolvedBy;

    @Column(name = "resolve_note", columnDefinition = "TEXT")
    private String resolveNote;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    public enum ReportReason {
        PROFANITY, OBSCENE, PERSONAL_INFO, HARASSMENT, FAKE_PROFILE, SPAM, OTHER
    }

    public enum ReportStatus {
        PENDING, IN_REVIEW, RESOLVED, DISMISSED
    }

    public enum ContextType {
        DIARY, EXCHANGE_DIARY, CHAT_MESSAGE, PROFILE
    }

    /** 신고 생성 */
    public static Report create(User reporter, User targetUser, ReportReason reason,
                                ContextType contextType, Long contextId, String detail) {
        Report report = new Report();
        report.reporter = reporter;
        report.targetUser = targetUser;
        report.reason = reason;
        report.contextType = contextType;
        report.contextId = contextId;
        report.detail = detail;
        report.status = ReportStatus.PENDING;
        return report;
    }
}
