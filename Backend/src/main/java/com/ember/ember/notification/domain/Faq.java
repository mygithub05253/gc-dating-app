package com.ember.ember.notification.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "faqs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Faq extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String category;

    @Column(nullable = false, length = 200)
    private String question;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String answer;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "view_count", nullable = false)
    private Integer viewCount = 0;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    /** FAQ 생성 팩터리 */
    public static Faq create(String category, String question, String answer,
                             Integer sortOrder, Boolean isActive) {
        Faq f = new Faq();
        f.category = category;
        f.question = question;
        f.answer = answer;
        f.sortOrder = sortOrder != null ? sortOrder : 0;
        f.isActive = isActive != null ? isActive : true;
        return f;
    }

    /** FAQ 수정 */
    public void update(String category, String question, String answer,
                       Integer sortOrder, Boolean isActive) {
        this.category = category;
        this.question = question;
        this.answer = answer;
        if (sortOrder != null) this.sortOrder = sortOrder;
        if (isActive != null) this.isActive = isActive;
    }

    /** 정렬 순서 변경 */
    public void updateSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    /** 소프트 삭제 */
    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }
}
