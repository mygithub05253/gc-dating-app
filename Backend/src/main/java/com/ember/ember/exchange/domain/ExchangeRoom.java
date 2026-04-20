package com.ember.ember.exchange.domain;

import com.ember.ember.chat.domain.ChatRoom;
import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.matching.domain.Matching;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "exchange_rooms")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ExchangeRoom extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_uuid", nullable = false, unique = true, updatable = false)
    private UUID roomUuid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_a_id", nullable = false)
    private User userA;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_b_id", nullable = false)
    private User userB;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matching_id", nullable = false)
    private Matching matching;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_turn_user_id", nullable = false)
    private User currentTurnUser;

    @Column(name = "turn_count", nullable = false)
    private Integer turnCount = 0;

    @Column(name = "round_count", nullable = false)
    private Integer roundCount = 1;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private RoomStatus status = RoomStatus.ACTIVE;

    @Column(name = "deadline_at", nullable = false)
    private LocalDateTime deadlineAt;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id")
    private ChatRoom chatRoom;

    @PrePersist
    private void generateUuid() {
        if (this.roomUuid == null) {
            this.roomUuid = UUID.randomUUID();
        }
    }

    public enum RoomStatus {
        ACTIVE, EXPIRED, COMPLETED, TERMINATED, ARCHIVED, CHAT_CONNECTED, ENDED
    }

    /** 매칭 성사 시 교환일기 방 생성 */
    public static ExchangeRoom create(User userA, User userB, Matching matching) {
        ExchangeRoom room = new ExchangeRoom();
        room.userA = userA;
        room.userB = userB;
        room.matching = matching;
        room.currentTurnUser = userA;
        room.turnCount = 0;
        room.roundCount = 1;
        room.status = RoomStatus.ACTIVE;
        room.deadlineAt = LocalDateTime.now().plusHours(48);
        return room;
    }
}
