package com.ember.ember.content.domain;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 예제 일기 — ERD v2.1 §2.39 example_diaries.
 * 신규 사용자 온보딩/도움말/FAQ 에 노출되는 관리자 작성 예시 본문.
 */
@Entity
@Table(name = "example_diaries",
        indexes = @Index(name = "idx_example_diaries_target_active_order",
                columnList = "display_target,is_active,display_order"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ExampleDiary extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private Category category;

    @Column(name = "display_target", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private DisplayTarget displayTarget;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private AdminAccount createdBy;

    public enum Category {
        GRATITUDE, GROWTH, DAILY, EMOTION, RELATIONSHIP, SEASONAL
    }

    public enum DisplayTarget {
        ONBOARDING, HELP, FAQ
    }

    public static ExampleDiary create(String title, String content, Category category,
                                       DisplayTarget displayTarget, Integer displayOrder,
                                       Boolean isActive, AdminAccount createdBy) {
        ExampleDiary e = new ExampleDiary();
        e.title = title;
        e.content = content;
        e.category = category;
        e.displayTarget = displayTarget;
        e.displayOrder = displayOrder == null ? 0 : displayOrder;
        e.isActive = isActive == null ? Boolean.TRUE : isActive;
        e.createdBy = createdBy;
        return e;
    }

    public void update(String title, String content, Category category, DisplayTarget target,
                       Integer displayOrder, Boolean isActive) {
        if (title != null) this.title = title;
        if (content != null) this.content = content;
        if (category != null) this.category = category;
        if (target != null) this.displayTarget = target;
        if (displayOrder != null) this.displayOrder = displayOrder;
        if (isActive != null) this.isActive = isActive;
    }
}
