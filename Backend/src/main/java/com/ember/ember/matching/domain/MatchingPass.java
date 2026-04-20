package com.ember.ember.matching.domain;

import com.ember.ember.diary.domain.Diary;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "matching_passes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MatchingPass {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "diary_id", nullable = false)
    private Diary diary;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_user_id", nullable = false)
    private User targetUser;

    @Column(name = "passed_at", nullable = false)
    private LocalDateTime passedAt;

    /** skip 기록 생성 */
    public static MatchingPass create(User user, Diary diary, User targetUser) {
        MatchingPass pass = new MatchingPass();
        pass.user = user;
        pass.diary = diary;
        pass.targetUser = targetUser;
        pass.passedAt = LocalDateTime.now();
        return pass;
    }
}
