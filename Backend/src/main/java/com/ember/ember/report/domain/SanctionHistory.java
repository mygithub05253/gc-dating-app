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
}
