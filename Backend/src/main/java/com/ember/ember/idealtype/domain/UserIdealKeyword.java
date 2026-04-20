package com.ember.ember.idealtype.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_ideal_keywords",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "keyword_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserIdealKeyword extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "keyword_id", nullable = false)
    private Keyword keyword;

    @Builder
    public UserIdealKeyword(User user, Keyword keyword) {
        this.user = user;
        this.keyword = keyword;
    }
}
