package com.ember.ember.global.moderation.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

// TODO: 관리자 CRUD 서비스(UrlWhitelistAdminService 등) 구현 시, save/update/delete 후 아래 코드 추가:
//   applicationEventPublisher.publishEvent(
//       new UrlWhitelistChangedEvent(UrlWhitelistChangedEvent.ChangeType.CREATED, saved.getId())
//   );
//   → Redis 키 URL_WHITELIST 즉시 무효화. 상세 구현 가이드는 UrlWhitelistChangedEvent Javadoc 참조.
@Entity
@Table(name = "url_whitelist")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UrlWhitelist extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 200)
    private String domain;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
