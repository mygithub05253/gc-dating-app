package com.ember.ember.notification.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "banners")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Banner extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "link_type", nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private LinkType linkType;

    @Column(name = "link_url", length = 500)
    private String linkUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "notice_id")
    private Notice notice;

    @Column(nullable = false)
    private Integer priority = 0;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Column(name = "end_at", nullable = false)
    private LocalDateTime endAt;

    public enum LinkType {
        NOTICE, WEBVIEW, NONE
    }

    /** 배너 생성 팩터리 */
    public static Banner create(String title, String imageUrl, LinkType linkType,
                                String linkUrl, Integer priority, Boolean isActive,
                                LocalDateTime startAt, LocalDateTime endAt) {
        Banner b = new Banner();
        b.title = title;
        b.imageUrl = imageUrl;
        b.linkType = linkType;
        b.linkUrl = linkUrl;
        b.priority = priority != null ? priority : 0;
        b.isActive = isActive != null ? isActive : true;
        b.startAt = startAt;
        b.endAt = endAt;
        return b;
    }

    /** 배너 수정 */
    public void update(String title, String imageUrl, LinkType linkType,
                       String linkUrl, Integer priority, Boolean isActive,
                       LocalDateTime startAt, LocalDateTime endAt) {
        this.title = title;
        this.imageUrl = imageUrl;
        this.linkType = linkType;
        this.linkUrl = linkUrl;
        if (priority != null) this.priority = priority;
        if (isActive != null) this.isActive = isActive;
        this.startAt = startAt;
        this.endAt = endAt;
    }
}
