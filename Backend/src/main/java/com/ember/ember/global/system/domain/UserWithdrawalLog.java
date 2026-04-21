package com.ember.ember.global.system.domain;

import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_withdrawal_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserWithdrawalLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 30)
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String detail;

    @Column(name = "withdrawn_at", nullable = false)
    private LocalDateTime withdrawnAt;

    @Column(name = "permanent_delete_at", nullable = false)
    private LocalDateTime permanentDeleteAt;

    /** 탈퇴 로그 생성 */
    public static UserWithdrawalLog create(User user, String reason, String detail) {
        UserWithdrawalLog log = new UserWithdrawalLog();
        log.user = user;
        log.reason = reason;
        log.detail = detail;
        log.withdrawnAt = LocalDateTime.now();
        log.permanentDeleteAt = log.withdrawnAt.plusDays(30);
        return log;
    }
}
