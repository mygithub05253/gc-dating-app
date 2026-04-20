package com.ember.ember.exchange.event;

/**
 * 교환일기 방 완주 도메인 이벤트
 *
 * ExchangeRoom 상태가 COMPLETED로 전이되는 시점에 발행.
 * ExchangeReportService가 @TransactionalEventListener(phase=AFTER_COMMIT)로 수신하여
 * 2-party 동의 검증 → 교환일기 리포트 생성 파이프라인을 시작한다.
 *
 * 연결 지점 (TODO):
 *   현재 ExchangeRoom 완주 처리 로직이 별도로 없으므로,
 *   향후 ExchangeRoomService 또는 ExchangeRoom.complete() 메서드에서
 *   ApplicationEventPublisher.publishEvent(new ExchangeRoomCompletedEvent(...)) 를 호출해야 한다.
 *
 * @param roomId  exchange_rooms PK
 * @param userAId 교환방 userA PK
 * @param userBId 교환방 userB PK
 */
public record ExchangeRoomCompletedEvent(
        Long roomId,
        Long userAId,
        Long userBId
) {}
