package com.ember.ember.user.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_notification_settings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserNotificationSetting extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "matching_enabled", nullable = false)
    private Boolean matchingEnabled = true;

    @Column(name = "diary_turn_enabled", nullable = false)
    private Boolean diaryTurnEnabled = true;

    @Column(name = "chat_enabled", nullable = false)
    private Boolean chatEnabled = true;

    @Column(name = "ai_analysis_enabled", nullable = false)
    private Boolean aiAnalysisEnabled = true;

    @Column(name = "couple_enabled", nullable = false)
    private Boolean coupleEnabled = true;

    @Column(name = "system_enabled", nullable = false)
    private Boolean systemEnabled = true;
}
