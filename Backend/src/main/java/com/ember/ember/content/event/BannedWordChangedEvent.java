package com.ember.ember.content.event;

/**
 * 금칙어(BannedWord) CRUD 변경 도메인 이벤트.
 *
 * 사용 방법:
 *   - 관리자 CRUD 서비스 구현 시, save/update/delete 메서드 내 트랜잭션 경계 안에서
 *     applicationEventPublisher.publishEvent(new BannedWordChangedEvent(ChangeType.CREATED, saved.getId()))
 *     형태로 호출한다.
 *   - 트랜잭션 커밋 직후 ModerationCacheEvictionListener.onBannedWordChanged()가 자동 실행된다.
 *   - @TransactionalEventListener(AFTER_COMMIT) 패턴이므로 롤백 시에는 호출되지 않는다.
 *
 * TODO: 관리자 CRUD 서비스(BannedWordAdminService 등) 구현 시 아래 코드 추가:
 *   // 서비스 클래스에 ApplicationEventPublisher 주입
 *   private final ApplicationEventPublisher eventPublisher;
 *
 *   // save 메서드 트랜잭션 내부 (커밋 전에 publish — AFTER_COMMIT 리스너가 커밋 후 처리)
 *   BannedWord saved = bannedWordRepository.save(bannedWord);
 *   eventPublisher.publishEvent(new BannedWordChangedEvent(BannedWordChangedEvent.ChangeType.CREATED, saved.getId()));
 *
 *   // update 메서드
 *   eventPublisher.publishEvent(new BannedWordChangedEvent(BannedWordChangedEvent.ChangeType.UPDATED, entity.getId()));
 *
 *   // delete 메서드
 *   eventPublisher.publishEvent(new BannedWordChangedEvent(BannedWordChangedEvent.ChangeType.DELETED, id));
 *
 * @param changeType 변경 유형 (CREATED / UPDATED / DELETED)
 * @param entityId   변경된 BannedWord PK (선택적, 로깅용)
 */
public record BannedWordChangedEvent(ChangeType changeType, Long entityId) {

  /**
   * 관리자 CRUD 변경 유형.
   */
  public enum ChangeType {
    /** 신규 금칙어 등록 */
    CREATED,
    /** 기존 금칙어 수정 (단어·카테고리·매치모드·활성여부 변경) */
    UPDATED,
    /** 금칙어 삭제 또는 비활성화 */
    DELETED
  }
}
