package com.ember.ember.content.listener;

import com.ember.ember.cache.service.CacheService;
import com.ember.ember.content.event.BannedWordChangedEvent;
import com.ember.ember.content.event.UrlWhitelistChangedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * 관리자 CRUD 커밋 직후 모더레이션 캐시 무효화 리스너.
 *
 * AFTER_COMMIT 페이즈를 사용하는 이유:
 *   - 트랜잭션이 성공적으로 커밋된 후에만 캐시를 DEL한다.
 *   - 롤백 시에는 이 리스너가 호출되지 않으므로, DB와 Redis 간 정합성이 항상 유지된다.
 *   - 커밋 실패 중간 상태(dirty data)가 다른 노드에 노출되는 위험을 방지한다.
 *
 * 예외 처리 전략:
 *   - Redis 무효화 실패 시 log.error로만 기록하고 예외를 전파하지 않는다.
 *   - 이유: 캐시 무효화 실패가 관리자 CRUD 응답을 실패시켜서는 안 된다.
 *     다음 캐시 TTL 만료(1h) 시 자동으로 재적재되므로 짧은 시간 동안 구 데이터 노출은 허용 범위 내.
 *
 * TODO (분산 환경 확장 시):
 *   - 다중 Backend 인스턴스 운영 시, Redis Pub/Sub 또는 Redis Keyspace Notification을
 *     활용해 모든 인스턴스의 로컬 캐시(Caffeine 등)도 동시에 무효화해야 한다.
 *   - 예: publisher.convertAndSend("cache:evict:moderation", key) + @EventListener on each node
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ModerationCacheEvictionListener {

  /** 설계서 §5.2 금칙어 캐시 키 */
  private static final String BANNED_WORDS_CACHE_KEY = "BANNED_WORDS:ALL";
  /** 설계서 §5.2 URL 화이트리스트 캐시 키 */
  private static final String URL_WHITELIST_CACHE_KEY = "URL_WHITELIST";

  private final CacheService cacheService;

  /**
   * 관리자 CRUD 커밋 직후 금칙어 캐시 무효화.
   * 롤백 시에는 호출되지 않아 정합성 유지.
   *
   * @param event 금칙어 변경 이벤트 (변경 유형, 엔티티 PK 포함)
   */
  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void onBannedWordChanged(BannedWordChangedEvent event) {
    log.info("[CACHE_EVICT] BANNED_WORDS:ALL 무효화, 사유: {}, entityId={}",
        event.changeType(), event.entityId());
    try {
      cacheService.invalidate(BANNED_WORDS_CACHE_KEY);
    } catch (Exception e) {
      // 캐시 무효화 실패는 관리자 CRUD 응답에 영향을 주지 않음.
      // TTL 만료(1h) 시 자동 재적재되므로 에러 로그만 남긴다.
      log.error("[CACHE_EVICT] BANNED_WORDS:ALL 무효화 실패 — Redis 오류. entityId={}, 이유={}",
          event.entityId(), e.getMessage(), e);
    }
  }

  /**
   * 관리자 CRUD 커밋 직후 URL 화이트리스트 캐시 무효화.
   * 롤백 시에는 호출되지 않아 정합성 유지.
   *
   * @param event URL 화이트리스트 변경 이벤트 (변경 유형, 엔티티 PK 포함)
   */
  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void onUrlWhitelistChanged(UrlWhitelistChangedEvent event) {
    log.info("[CACHE_EVICT] URL_WHITELIST 무효화, 사유: {}, entityId={}",
        event.changeType(), event.entityId());
    try {
      cacheService.invalidate(URL_WHITELIST_CACHE_KEY);
    } catch (Exception e) {
      // 캐시 무효화 실패는 관리자 CRUD 응답에 영향을 주지 않음.
      // TTL 만료(1h) 시 자동 재적재되므로 에러 로그만 남긴다.
      log.error("[CACHE_EVICT] URL_WHITELIST 무효화 실패 — Redis 오류. entityId={}, 이유={}",
          event.entityId(), e.getMessage(), e);
    }
  }
}
