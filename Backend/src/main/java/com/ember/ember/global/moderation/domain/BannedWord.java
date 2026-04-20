package com.ember.ember.global.moderation.domain;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

// TODO: 관리자 CRUD 서비스(BannedWordAdminService 등) 구현 시, save/update/delete 후 아래 코드 추가:
//   applicationEventPublisher.publishEvent(
//       new BannedWordChangedEvent(BannedWordChangedEvent.ChangeType.CREATED, saved.getId())
//   );
//   → Redis 키 BANNED_WORDS:ALL 즉시 무효화. 상세 구현 가이드는 BannedWordChangedEvent Javadoc 참조.
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
