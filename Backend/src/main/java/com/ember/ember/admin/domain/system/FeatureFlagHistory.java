package com.ember.ember.admin.domain.system;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "feature_flag_history")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FeatureFlagHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "flag_key", nullable = false, length = 100)
    private String flagKey;

    @Column(name = "previous_value", nullable = false)
    private boolean previousValue;

    @Column(name = "new_value", nullable = false)
    private boolean newValue;

    @Column(length = 500)
    private String reason;

    @Column(name = "changed_by", nullable = false)
    private Long changedBy;

    /** 피처 플래그 변경 이력 기록 */
    public static FeatureFlagHistory record(String flagKey, boolean prev, boolean next,
                                            String reason, Long adminId) {
        FeatureFlagHistory history = new FeatureFlagHistory();
        history.flagKey = flagKey;
        history.previousValue = prev;
        history.newValue = next;
        history.reason = reason;
        history.changedBy = adminId;
        return history;
    }
}
