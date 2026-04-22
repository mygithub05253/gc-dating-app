package com.ember.ember.admin.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "admin_password_change_logs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AdminPasswordChangeLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id", nullable = false)
    private AdminAccount admin;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    /** 비밀번호 변경 이력 팩토리 (관리자 API 통합명세서 v2.1 §1.4) */
    public static AdminPasswordChangeLog of(AdminAccount admin, String ipAddress) {
        AdminPasswordChangeLog log = new AdminPasswordChangeLog();
        log.admin = admin;
        log.ipAddress = ipAddress;
        log.changedAt = LocalDateTime.now();
        return log;
    }
}
