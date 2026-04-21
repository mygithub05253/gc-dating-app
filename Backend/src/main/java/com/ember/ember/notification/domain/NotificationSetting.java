package com.ember.ember.notification.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_notification_settings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NotificationSetting extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private Boolean matching = true;

    @Column(name = "diary_turn", nullable = false)
    private Boolean diaryTurn = true;

    @Column(nullable = false)
    private Boolean chat = true;

    @Column(name = "ai_analysis", nullable = false)
    private Boolean aiAnalysis = true;

    @Column(nullable = false)
    private Boolean couple = true;

    @Column(name = "system_notice", nullable = false)
    private Boolean system = true;

    /** 기본 설정으로 생성 (모두 ON) */
    public static NotificationSetting createDefault(User user) {
        NotificationSetting setting = new NotificationSetting();
        setting.user = user;
        return setting;
    }

    /** 선택적 필드 업데이트 (null이 아닌 필드만 변경) */
    public void updateIfPresent(Boolean matching, Boolean diaryTurn, Boolean chat,
                                Boolean aiAnalysis, Boolean couple, Boolean system) {
        if (matching != null) this.matching = matching;
        if (diaryTurn != null) this.diaryTurn = diaryTurn;
        if (chat != null) this.chat = chat;
        if (aiAnalysis != null) this.aiAnalysis = aiAnalysis;
        if (couple != null) this.couple = couple;
        if (system != null) this.system = system;
    }
}
