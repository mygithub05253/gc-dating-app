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

    /** 기본 설정으로 생성 (모두 ON) */
    public static UserNotificationSetting createDefault(User user) {
        UserNotificationSetting s = new UserNotificationSetting();
        s.user = user;
        return s;
    }

    /** 선택적 필드 업데이트 (null이 아닌 필드만 변경) */
    public void updateIfPresent(Boolean matching, Boolean diaryTurn, Boolean chat,
                                Boolean aiAnalysis, Boolean couple, Boolean system) {
        if (matching != null) this.matchingEnabled = matching;
        if (diaryTurn != null) this.diaryTurnEnabled = diaryTurn;
        if (chat != null) this.chatEnabled = chat;
        if (aiAnalysis != null) this.aiAnalysisEnabled = aiAnalysis;
        if (couple != null) this.coupleEnabled = couple;
        if (system != null) this.systemEnabled = system;
    }
}
