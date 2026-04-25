package com.ember.ember.notification.domain;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tutorial_pages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TutorialPage extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "page_order", nullable = false, unique = true)
    private Integer pageOrder;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private AdminAccount createdBy;

    /** 튜토리얼 페이지 생성 팩터리 */
    public static TutorialPage create(String title, String body, String imageUrl,
                                      Integer pageOrder, Boolean isActive,
                                      AdminAccount createdBy) {
        TutorialPage p = new TutorialPage();
        p.title = title;
        p.body = body;
        p.imageUrl = imageUrl;
        p.pageOrder = pageOrder != null ? pageOrder : 0;
        p.isActive = isActive != null ? isActive : true;
        p.createdBy = createdBy;
        return p;
    }

    /** 튜토리얼 페이지 수정 */
    public void update(String title, String body, String imageUrl,
                       Integer pageOrder, Boolean isActive) {
        this.title = title;
        this.body = body;
        this.imageUrl = imageUrl;
        if (pageOrder != null) this.pageOrder = pageOrder;
        if (isActive != null) this.isActive = isActive;
    }

    /** 정렬 순서 변경 */
    public void updatePageOrder(int pageOrder) {
        this.pageOrder = pageOrder;
    }
}
