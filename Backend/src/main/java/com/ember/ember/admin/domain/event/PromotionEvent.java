package com.ember.ember.admin.domain.event;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "promotion_events")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PromotionEvent extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(length = 2000)
    private String description;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private EventType type;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private EventStatus status;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private EventTarget target;

    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "end_date")
    private LocalDateTime endDate;

    @Column(columnDefinition = "TEXT")
    private String config;

    @Column(name = "created_by")
    private Long createdBy;

    public enum EventType {
        EVENT, PROMOTION, CAMPAIGN
    }

    public enum EventStatus {
        SCHEDULED, ACTIVE, PAUSED, ENDED
    }

    public enum EventTarget {
        ALL, NEW_USERS, PREMIUM, INACTIVE
    }

    public static PromotionEvent create(String title, String description,
                                        EventType type, EventStatus status, EventTarget target,
                                        LocalDateTime startDate, LocalDateTime endDate,
                                        String config, Long createdBy) {
        PromotionEvent event = new PromotionEvent();
        event.title = title;
        event.description = description;
        event.type = type;
        event.status = (status != null) ? status : EventStatus.SCHEDULED;
        event.target = target;
        event.startDate = startDate;
        event.endDate = endDate;
        event.config = config;
        event.createdBy = createdBy;
        return event;
    }

    /** 이벤트 상태 변경 */
    public void changeStatus(EventStatus newStatus) {
        this.status = newStatus;
    }
}
