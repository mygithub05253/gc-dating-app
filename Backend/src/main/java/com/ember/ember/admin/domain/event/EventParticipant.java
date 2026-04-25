package com.ember.ember.admin.domain.event;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "event_participants",
        uniqueConstraints = @UniqueConstraint(columnNames = {"event_id", "user_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EventParticipant extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "participated_at", nullable = false)
    private LocalDateTime participatedAt;

    public static EventParticipant create(Long eventId, Long userId) {
        EventParticipant participant = new EventParticipant();
        participant.eventId = eventId;
        participant.userId = userId;
        participant.participatedAt = LocalDateTime.now();
        return participant;
    }
}
