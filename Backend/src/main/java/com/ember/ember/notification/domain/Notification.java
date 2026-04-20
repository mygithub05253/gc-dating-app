package com.ember.ember.notification.domain;

import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications",
        indexes = @Index(name = "idx_notification_user_read", columnList = "user_id, is_read"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 30)
    private String type;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, length = 300)
    private String body;

    @Column(name = "deeplink_url", length = 300)
    private String deeplinkUrl;

    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    /** 알림 생성 */
    public static Notification create(User user, String type, String title, String body, String deeplinkUrl) {
        Notification notification = new Notification();
        notification.user = user;
        notification.type = type;
        notification.title = title;
        notification.body = body;
        notification.deeplinkUrl = deeplinkUrl;
        notification.isRead = false;
        notification.sentAt = LocalDateTime.now();
        return notification;
    }
}
