package com.ember.ember.exchange.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "exchange_next_step_choices",
        uniqueConstraints = @UniqueConstraint(columnNames = {"room_id", "user_id", "round_number"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NextStepChoice extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private ExchangeRoom room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "round_number", nullable = false)
    private Integer roundNumber;

    @Column(nullable = false, length = 10)
    @Enumerated(EnumType.STRING)
    private Choice choice;

    @Column(name = "chosen_at", nullable = false)
    private LocalDateTime chosenAt;

    public enum Choice {
        CHAT, CONTINUE
    }
}
