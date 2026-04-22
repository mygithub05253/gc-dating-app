package com.ember.ember.admin.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "admin_login_logs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AdminLoginLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id", nullable = false)
    private AdminAccount admin;

    @Column(nullable = false, length = 10)
    private String action;

    @Column(name = "is_success", nullable = false)
    private Boolean isSuccess;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "performed_at", nullable = false)
    private LocalDateTime performedAt;

    /** 로그인/로그아웃 이벤트 로그 팩토리 (관리자 API 통합명세서 v2.1 §1.1) */
    public static AdminLoginLog of(AdminAccount admin, String action, boolean isSuccess,
                                    String ipAddress, String userAgent) {
        AdminLoginLog log = new AdminLoginLog();
        log.admin = admin;
        log.action = action;
        log.isSuccess = isSuccess;
        log.ipAddress = ipAddress;
        log.userAgent = userAgent;
        log.performedAt = LocalDateTime.now();
        return log;
    }
}
