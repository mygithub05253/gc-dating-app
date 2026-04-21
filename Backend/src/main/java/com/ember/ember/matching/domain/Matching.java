package com.ember.ember.matching.domain;

import com.ember.ember.diary.domain.Diary;
import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "matchings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Matching extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_user_id", nullable = false)
    private User fromUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_user_id", nullable = false)
    private User toUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "diary_id", nullable = false)
    private Diary diary;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private MatchingStatus status = MatchingStatus.PENDING;

    @Column(name = "matched_at")
    private LocalDateTime matchedAt;

    public enum MatchingStatus {
        PENDING, MATCHED, CANCELLED, EXPIRED
    }

    /** 매칭 요청 생성 (PENDING) */
    public static Matching create(User fromUser, User toUser, Diary diary) {
        Matching matching = new Matching();
        matching.fromUser = fromUser;
        matching.toUser = toUser;
        matching.diary = diary;
        matching.status = MatchingStatus.PENDING;
        return matching;
    }

    /** 매칭 성사 처리 */
    public void markMatched() {
        this.status = MatchingStatus.MATCHED;
        this.matchedAt = LocalDateTime.now();
    }

    /** 매칭 취소 (차단/탈퇴 시) */
    public void cancel() {
        this.status = MatchingStatus.CANCELLED;
    }
}
