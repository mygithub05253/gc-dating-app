package com.ember.ember.admin.dto.keyword;

/**
 * 벡터 재계산 작업 응답 -- 관리자 API v2.1 SS24.
 */
public record VectorRebuildResponse(
    String jobId,
    int estimatedDurationMinutes,
    String status,
    String message
) {}
