package com.ember.ember.matching.exception;

/**
 * FastAPI 매칭 서버 호출 실패 예외.
 * 타임아웃, 5xx 오류 등 AI 서버 장애 상황에서 발생.
 * MatchingService가 catch 후 stale 캐시 폴백을 시도한다.
 */
public class MatchingRemoteException extends RuntimeException {

    public MatchingRemoteException(String message) {
        super(message);
    }

    public MatchingRemoteException(String message, Throwable cause) {
        super(message, cause);
    }
}
