package com.ember.ember.user.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted_at IS NULL")
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 100, unique = true)
    private String email;

    @Column(name = "real_name", length = 20)
    private String realName;

    @Column(unique = true, length = 20)
    private String nickname;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(length = 10)
    @Enumerated(EnumType.STRING)
    private Gender gender;

    @Column(length = 20)
    private String sido;

    @Column(length = 30)
    private String sigungu;

    @Column(length = 50)
    private String school;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private UserStatus status = UserStatus.ACTIVE;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private UserRole role = UserRole.ROLE_GUEST;

    @Column(name = "onboarding_step", nullable = false)
    private Integer onboardingStep = 0;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "last_nickname_changed_at")
    private LocalDateTime lastNicknameChangedAt;

    @Column(name = "tutorial_completed_at")
    private LocalDateTime tutorialCompletedAt;

    @Column(name = "deactivated_at")
    private LocalDateTime deactivatedAt;

    @Column(name = "permanent_delete_at")
    private LocalDateTime permanentDeleteAt;

    @Column(name = "suspended_at")
    private LocalDateTime suspendedAt;

    @Column(name = "suspended_until")
    private LocalDateTime suspendedUntil;

    @Column(name = "suspension_reason", columnDefinition = "TEXT")
    private String suspensionReason;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public enum Gender {
        MALE, FEMALE
    }

    public enum UserStatus {
        ACTIVE, GUEST, SUSPEND_7D, SUSPEND_30D, BANNED, DEACTIVATED
    }

    public enum UserRole {
        ROLE_GUEST, ROLE_USER
    }

    @Builder
    public User(String email, UserStatus status, UserRole role) {
        this.email = email;
        this.status = status != null ? status : UserStatus.ACTIVE;
        this.role = role != null ? role : UserRole.ROLE_GUEST;
        this.onboardingStep = 0;
    }

    /** 온보딩 1단계: 프로필 등록 */
    public void completeProfile(String realName, String nickname, LocalDate birthDate,
                                Gender gender, String sido, String sigungu, String school) {
        this.realName = realName;
        this.nickname = nickname;
        this.birthDate = birthDate;
        this.gender = gender;
        this.sido = sido;
        this.sigungu = sigungu;
        this.school = school;
        this.onboardingStep = 1;
        this.lastNicknameChangedAt = LocalDateTime.now();
    }

    /** 온보딩 2단계: 이상형 키워드 설정 완료 */
    public void completeIdealType() {
        this.onboardingStep = 2;
        this.role = UserRole.ROLE_USER;
    }

    /** 프로필 부분 수정 */
    public void updateProfile(String nickname, String sido, String sigungu, String school) {
        if (nickname != null) {
            this.nickname = nickname;
            this.lastNicknameChangedAt = LocalDateTime.now();
        }
        if (sido != null) {
            this.sido = sido;
        }
        if (sigungu != null) {
            this.sigungu = sigungu;
        }
        if (school != null) {
            this.school = school;
        }
    }

    /** 로그인 시간 갱신 */
    public void updateLastLoginAt() {
        this.lastLoginAt = LocalDateTime.now();
    }

    /** 탈퇴 유예 처리 */
    public void deactivate() {
        this.status = UserStatus.DEACTIVATED;
        this.deactivatedAt = LocalDateTime.now();
        this.permanentDeleteAt = this.deactivatedAt.plusDays(30);
    }

    /** 계정 복구 */
    public void restore() {
        this.status = UserStatus.ACTIVE;
        this.deactivatedAt = null;
        this.permanentDeleteAt = null;
    }

    /** 튜토리얼 완료 */
    public void completeTutorial(LocalDateTime completedAt) {
        this.tutorialCompletedAt = completedAt;
    }

    /** 온보딩 완료 여부 */
    public boolean isOnboardingCompleted() {
        return this.onboardingStep >= 2;
    }
}
