package com.ember.ember.topic.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * 주간 주제 — ERD v2.1 §2.10 weekly_topics.
 * 수요일 한정 랜덤 주제 일기 이벤트용.
 */
@Entity
@Table(name = "weekly_topics")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WeeklyTopic extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String topic;

    @Column(name = "week_start_date", nullable = false, unique = true)
    private LocalDate weekStartDate;

    /**
     * 카테고리 — ERD v2.1 §2.10. 6종 중 하나 (GRATITUDE / GROWTH / DAILY / EMOTION / RELATIONSHIP / SEASONAL).
     * 기존 코드와의 호환을 위해 String 으로 저장. 관리자 입력 검증은 {@link Category#valueOf}.
     */
    @Column(nullable = false, length = 20)
    private String category;

    @Column(name = "usage_count", nullable = false)
    private Integer usageCount = 0;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    public enum Category {
        GRATITUDE, GROWTH, DAILY, EMOTION, RELATIONSHIP, SEASONAL
    }

    public static WeeklyTopic create(String topic, LocalDate weekStartDate,
                                      Category category, boolean isActive) {
        WeeklyTopic t = new WeeklyTopic();
        t.topic = topic;
        t.weekStartDate = weekStartDate;
        t.category = category.name();
        t.isActive = isActive;
        t.usageCount = 0;
        return t;
    }

    public void update(String topic, Category category, Boolean isActive) {
        if (topic != null) this.topic = topic;
        if (category != null) this.category = category.name();
        if (isActive != null) this.isActive = isActive;
    }

    /** §6.5 주제 스케줄 override — week_start_date 재배정. */
    public void rescheduleTo(LocalDate newWeekStartDate) {
        this.weekStartDate = newWeekStartDate;
    }
}
