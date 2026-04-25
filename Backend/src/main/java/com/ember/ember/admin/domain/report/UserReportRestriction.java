package com.ember.ember.admin.domain.report;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 사용자 신고 제한 (중복 신고 방지 등) — 관리자 신고 관리 모듈.
 */
@Entity
@Table(name = "user_report_restrictions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserReportRestriction extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "restricted_until", nullable = false)
    private LocalDateTime restrictedUntil;

    @Column(name = "admin_id")
    private Long adminId;

    @Column(length = 500)
    private String memo;

    /** 신고 제한 생성 팩터리 */
    public static UserReportRestriction create(Long userId, LocalDateTime until,
                                               Long adminId, String memo) {
        UserReportRestriction restriction = new UserReportRestriction();
        restriction.userId = userId;
        restriction.restrictedUntil = until;
        restriction.adminId = adminId;
        restriction.memo = memo;
        return restriction;
    }

    /** 제한이 현재 유효한지 확인 */
    public boolean isActive() {
        return restrictedUntil.isAfter(LocalDateTime.now());
    }
}
