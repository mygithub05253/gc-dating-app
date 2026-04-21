package com.ember.ember.report.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "blocks",
        uniqueConstraints = @UniqueConstraint(columnNames = {"blocker_user_id", "blocked_user_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Block extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blocker_user_id", nullable = false)
    private User blockerUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blocked_user_id", nullable = false)
    private User blockedUser;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private BlockStatus status = BlockStatus.ACTIVE;

    public enum BlockStatus {
        ACTIVE, UNBLOCKED, ADMIN_CANCELLED
    }

    /** 차단 생성 */
    public static Block create(User blocker, User blocked) {
        Block block = new Block();
        block.blockerUser = blocker;
        block.blockedUser = blocked;
        block.status = BlockStatus.ACTIVE;
        return block;
    }

    /** 차단 해제 */
    public void unblock() {
        this.status = BlockStatus.UNBLOCKED;
    }

    /** 재차단 (해제 후 다시 차단) */
    public void reblock() {
        this.status = BlockStatus.ACTIVE;
    }
}
