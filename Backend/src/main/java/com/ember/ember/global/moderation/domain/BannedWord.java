package com.ember.ember.global.moderation.domain;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "banned_words",
        uniqueConstraints = @UniqueConstraint(columnNames = {"word", "match_mode"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BannedWord extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String word;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private BannedWordCategory category;

    @Column(name = "match_mode", nullable = false, length = 10)
    @Enumerated(EnumType.STRING)
    private MatchMode matchMode = MatchMode.PARTIAL;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private AdminAccount createdBy;

    public enum BannedWordCategory {
        PROFANITY, SEXUAL, DISCRIMINATION, VIOLENCE, HARASSMENT, CONTACT, ETC
    }

    public enum MatchMode {
        EXACT, PARTIAL
    }
}
