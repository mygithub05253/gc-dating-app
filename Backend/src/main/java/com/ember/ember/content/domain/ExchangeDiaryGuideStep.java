package com.ember.ember.content.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 교환일기 흐름 가이드 단계 — ERD v2.1 §2.40 exchange_diary_guide_steps.
 */
@Entity
@Table(name = "exchange_diary_guide_steps")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ExchangeDiaryGuideStep extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "step_order", nullable = false, unique = true)
    private Integer stepOrder;

    @Column(name = "step_title", nullable = false, length = 100)
    private String stepTitle;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    public static ExchangeDiaryGuideStep create(Integer stepOrder, String stepTitle, String description,
                                                 String imageUrl, Boolean isActive) {
        ExchangeDiaryGuideStep s = new ExchangeDiaryGuideStep();
        s.stepOrder = stepOrder;
        s.stepTitle = stepTitle;
        s.description = description;
        s.imageUrl = imageUrl;
        s.isActive = isActive == null ? Boolean.TRUE : isActive;
        return s;
    }
}
