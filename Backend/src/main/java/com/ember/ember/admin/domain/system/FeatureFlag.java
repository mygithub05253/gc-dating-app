package com.ember.ember.admin.domain.system;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "feature_flags")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FeatureFlag extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "flag_key", nullable = false, unique = true, length = 100)
    private String flagKey;

    @Column(length = 500)
    private String description;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private FlagCategory category;

    @Column(nullable = false)
    private boolean enabled = false;

    @Column(name = "updated_by")
    private Long updatedBy;

    public enum FlagCategory {
        AI, UI, FEATURE, NOTIFICATION, SAFETY, PAYMENT
    }

    public static FeatureFlag create(String flagKey, String description,
                                     FlagCategory category, boolean enabled) {
        FeatureFlag flag = new FeatureFlag();
        flag.flagKey = flagKey;
        flag.description = description;
        flag.category = category;
        flag.enabled = enabled;
        return flag;
    }

    /** 토글 (현재 값 반전) */
    public void toggle() {
        this.enabled = !this.enabled;
    }

    /** 활성/비활성 설정 + 변경자 기록 */
    public void updateEnabled(boolean enabled, Long adminId) {
        this.enabled = enabled;
        this.updatedBy = adminId;
    }
}
