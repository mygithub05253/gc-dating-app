package com.ember.ember.user.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_settings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserSetting extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(length = 10)
    @Enumerated(EnumType.STRING)
    private Theme theme = Theme.SYSTEM;

    @Column(length = 5)
    private String language = "ko";

    @Column(name = "age_filter_range", nullable = false)
    private Integer ageFilterRange = 5;

    public enum Theme {
        LIGHT, DARK, SYSTEM
    }

    /** 기본 설정으로 생성 */
    public static UserSetting createDefault(User user) {
        UserSetting setting = new UserSetting();
        setting.user = user;
        return setting;
    }

    /** 선택적 필드 업데이트 (null이 아닌 필드만 변경) */
    public void updateIfPresent(Boolean darkMode, String language, Integer ageFilterRange) {
        if (darkMode != null) this.theme = darkMode ? Theme.DARK : Theme.LIGHT;
        if (language != null) this.language = language;
        if (ageFilterRange != null) this.ageFilterRange = ageFilterRange;
    }
}
