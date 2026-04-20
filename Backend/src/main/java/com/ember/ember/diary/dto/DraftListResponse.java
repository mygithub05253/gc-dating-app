package com.ember.ember.diary.dto;

import java.util.List;

/** 임시저장 목록 응답 */
public record DraftListResponse(
        List<DraftResponse> drafts,
        int totalCount
) {}
