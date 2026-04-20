package com.ember.ember.content.exception;

/**
 * FastAPI 콘텐츠 스캔 API 호출 실패 시 던지는 런타임 예외.
 *
 * 발생 조건:
 *   - 3초 타임아웃 초과 (ReadTimeoutException)
 *   - FastAPI 5xx 응답
 *   - 네트워크 오류 (ConnectException 등)
 *
 * ContentScanService가 이 예외를 catch하여 Silent Fail(로컬 정규식 검사) 처리한다.
 */
public class ContentScanRemoteException extends RuntimeException {

    public ContentScanRemoteException(String message) {
        super(message);
    }

    public ContentScanRemoteException(String message, Throwable cause) {
        super(message, cause);
    }
}
