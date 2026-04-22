package com.ember.ember.admin.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "admin_accounts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AdminAccount extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private AdminRole role = AdminRole.ADMIN;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private AdminStatus status = AdminStatus.ACTIVE;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    public enum AdminRole {
        VIEWER, ADMIN, SUPER_ADMIN
    }

    public enum AdminStatus {
        ACTIVE, INACTIVE, SUSPENDED, DELETED
    }

    /**
     * 관리자 계정 생성 팩터리 — 관리자 API §13.3에서 사용.
     * 비밀번호는 반드시 BCrypt 해시 상태로 전달해야 한다.
     */
    public static AdminAccount create(String email, String name, String passwordHash,
                                      AdminRole role, AdminStatus status) {
        AdminAccount account = new AdminAccount();
        account.email = email;
        account.name = name;
        account.passwordHash = passwordHash;
        account.role = role;
        account.status = (status != null) ? status : AdminStatus.ACTIVE;
        return account;
    }

    /** 마지막 로그인 시각 갱신 (로그인 성공 시 호출) */
    public void updateLastLoginAt(LocalDateTime loggedInAt) {
        this.lastLoginAt = loggedInAt;
    }

    /** 비밀번호 해시 교체 (비밀번호 변경 시 호출, BCrypt로 해시된 값 전달) */
    public void changePassword(String newPasswordHash) {
        this.passwordHash = newPasswordHash;
    }

    /** 본인 프로필(이름·이미지) 수정 — null 전달 시 해당 필드 유지. */
    public void updateProfile(String name, String profileImageUrl) {
        if (name != null && !name.isBlank()) this.name = name;
        if (profileImageUrl != null) this.profileImageUrl = profileImageUrl.isBlank() ? null : profileImageUrl;
    }

    /**
     * SUPER_ADMIN에 의한 계정 정보 수정 — 관리자 API §13.5.
     * 이름·역할·상태를 한 번에 갱신한다. 이메일/비밀번호는 별도 경로로 처리한다.
     */
    public void updateByAdmin(String name, AdminRole role, AdminStatus status) {
        this.name = name;
        this.role = role;
        this.status = status;
    }

    /**
     * 소프트 삭제 — 관리자 API §13.6.
     * status = DELETED 로 전환하고 삭제 시각을 기록한다.
     */
    public void softDelete(LocalDateTime deletedAt) {
        this.status = AdminStatus.DELETED;
        this.deletedAt = deletedAt;
    }
}
