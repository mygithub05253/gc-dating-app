package com.ember.ember.matching.exception;

import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;

/**
 * AI 서버 장애 + stale 캐시도 없어 매칭 결과를 반환할 수 없을 때 발생.
 * GlobalExceptionHandler가 503 Service Unavailable로 처리.
 */
public class MatchingUnavailableException extends BusinessException {

    public MatchingUnavailableException() {
        super(ErrorCode.AI_MATCHING_ERROR);
    }
}
