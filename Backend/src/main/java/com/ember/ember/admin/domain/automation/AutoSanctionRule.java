package com.ember.ember.admin.domain.automation;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 자동 제재 규칙 — 관리자 자동화 모듈.
 * 조건(JSON)에 부합하는 사용자에게 자동으로 제재를 적용한다.
 */
@Entity
@Table(name = "auto_sanction_rules")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AutoSanctionRule extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(name = "condition_json", columnDefinition = "TEXT")
    private String conditionJson;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SanctionAction action;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "execution_count", nullable = false)
    private int executionCount;

    @Column(name = "last_triggered_at")
    private LocalDateTime lastTriggeredAt;

    public enum SanctionAction {
        SUSPEND_7D, SUSPEND_30D, BANNED
    }

    /** 자동 제재 규칙 생성 팩터리 */
    public static AutoSanctionRule create(String name, String description,
                                          String conditionJson, SanctionAction action) {
        AutoSanctionRule rule = new AutoSanctionRule();
        rule.name = name;
        rule.description = description;
        rule.conditionJson = conditionJson;
        rule.action = action;
        rule.enabled = true;
        rule.executionCount = 0;
        return rule;
    }

    /** 활성/비활성 토글 */
    public void toggle() {
        this.enabled = !this.enabled;
    }

    /** 실행 횟수 증가 + 마지막 트리거 시각 갱신 */
    public void incrementExecution() {
        this.executionCount++;
        this.lastTriggeredAt = LocalDateTime.now();
    }
}
