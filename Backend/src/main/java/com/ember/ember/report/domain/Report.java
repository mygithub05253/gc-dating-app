package com.ember.ember.report.domain;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 신고 엔티티 — ERD v2.1 §2.28 reports.
 * v2.1 신규 컬럼: priority_score, sla_deadline, assigned_to (Phase A-3 반영).
 */
@Entity
@Table(name = "reports",
        indexes = {
                @Index(name = "idx_reports_status_priority_sla",
                        columnList = "status,priority_score DESC,sla_deadline ASC"),
                @Index(name = "idx_reports_assigned_status",
                        columnList = "assigned_to,status")
        })
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

    /** v2.1 신규: 자동 산출 우선순위 점수 (0~100). */
    @Column(name = "priority_score", nullable = false)
    private Integer priorityScore = 0;

    /** v2.1 신규: 처리 SLA 마감 시각. priorityScore 에 따라 24h/72h/7d. */
    @Column(name = "sla_deadline")
    private LocalDateTime slaDeadline;

    /** v2.1 신규: 담당 관리자 (resolved_by 와 별개). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    private AdminAccount assignedTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    private AdminAccount resolvedBy;

    @Column(name = "resolve_note", columnDefinition = "TEXT")
    private String resolveNote;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    public enum ReportReason {
        // ERD v2.1 §2.28 기준 7종. 기존 OBSCENE/FAKE_PROFILE 은 SEXUAL/IMPERSONATION 으로 통일.
        PROFANITY, SEXUAL, PERSONAL_INFO, SPAM, IMPERSONATION, HARASSMENT, OTHER
    }

    public enum ReportStatus {
        PENDING, IN_REVIEW, RESOLVED, DISMISSED
    }

    public enum ContextType {
        DIARY, EXCHANGE_DIARY, CHAT_MESSAGE, PROFILE
    }

    /**
     * 신고 생성 — 우선순위/SLA 는 ReportService 에서 산출해 주입한다.
     */
    public static Report create(User reporter, User targetUser, ReportReason reason,
                                ContextType contextType, Long contextId, String detail,
                                int priorityScore, LocalDateTime slaDeadline) {
        Report report = new Report();
        report.reporter = reporter;
        report.targetUser = targetUser;
        report.reason = reason;
        report.contextType = contextType;
        report.contextId = contextId;
        report.detail = detail;
        report.status = ReportStatus.PENDING;
        report.priorityScore = priorityScore;
        report.slaDeadline = slaDeadline;
        return report;
    }

    /** 담당자 배정 (미배정 → 배정 전환, 재배정 모두 허용). */
    public void assignTo(AdminAccount admin) {
        if (this.status == ReportStatus.RESOLVED || this.status == ReportStatus.DISMISSED) {
            throw new IllegalStateException("이미 처리된 신고는 담당자를 변경할 수 없습니다.");
        }
        this.assignedTo = admin;
        // PENDING 상태에서 최초 배정 시 IN_REVIEW 로 전이
        if (this.status == ReportStatus.PENDING) {
            this.status = ReportStatus.IN_REVIEW;
        }
    }

    /** 신고 처리 (RESOLVED). */
    public void resolve(AdminAccount admin, String note) {
        if (this.status == ReportStatus.RESOLVED || this.status == ReportStatus.DISMISSED) {
            throw new IllegalStateException("이미 처리된 신고입니다.");
        }
        this.status = ReportStatus.RESOLVED;
        this.resolvedBy = admin;
        this.resolveNote = note;
        this.resolvedAt = LocalDateTime.now();
    }

    /** 신고 기각 (DISMISSED). */
    public void dismiss(AdminAccount admin, String reason) {
        if (this.status == ReportStatus.RESOLVED || this.status == ReportStatus.DISMISSED) {
            throw new IllegalStateException("이미 처리된 신고입니다.");
        }
        this.status = ReportStatus.DISMISSED;
        this.resolvedBy = admin;
        this.resolveNote = reason;
        this.resolvedAt = LocalDateTime.now();
    }
}
