package com.ember.ember.notification.domain;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "notices")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notice extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private NoticeCategory category;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private NoticeStatus status = NoticeStatus.DRAFT;

    @Column(nullable = false, length = 10)
    @Enumerated(EnumType.STRING)
    private NoticePriority priority = NoticePriority.NORMAL;

    @Column(name = "is_pinned", nullable = false)
    private Boolean isPinned = false;

    @Column(name = "target_audience", nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private TargetAudience targetAudience = TargetAudience.ALL;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "view_count", nullable = false)
    private Integer viewCount = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id", nullable = false)
    private AdminAccount admin;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public enum NoticeCategory {
        GENERAL, MAINTENANCE, EVENT, UPDATE, TERMS
    }

    public enum NoticeStatus {
        DRAFT, PUBLISHED, SCHEDULED
    }

    public enum NoticePriority {
        HIGH, NORMAL
    }

    public enum TargetAudience {
        ALL, NEW_USER, ACTIVE_USER, PREMIUM, DORMANT
    }

    /** 공지사항 생성 팩터리 */
    public static Notice create(String title, String content, NoticeCategory category,
                                NoticeStatus status, NoticePriority priority,
                                Boolean isPinned, TargetAudience targetAudience,
                                LocalDateTime publishedAt, AdminAccount admin) {
        Notice n = new Notice();
        n.title = title;
        n.content = content;
        n.category = category;
        n.status = status != null ? status : NoticeStatus.DRAFT;
        n.priority = priority != null ? priority : NoticePriority.NORMAL;
        n.isPinned = isPinned != null ? isPinned : false;
        n.targetAudience = targetAudience != null ? targetAudience : TargetAudience.ALL;
        n.publishedAt = publishedAt;
        n.admin = admin;
        return n;
    }

    /** 공지사항 수정 */
    public void update(String title, String content, NoticeCategory category,
                       NoticeStatus status, NoticePriority priority,
                       Boolean isPinned, TargetAudience targetAudience,
                       LocalDateTime publishedAt) {
        this.title = title;
        this.content = content;
        this.category = category;
        if (status != null) this.status = status;
        if (priority != null) this.priority = priority;
        if (isPinned != null) this.isPinned = isPinned;
        if (targetAudience != null) this.targetAudience = targetAudience;
        this.publishedAt = publishedAt;
    }

    /** 소프트 삭제 */
    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }
}
