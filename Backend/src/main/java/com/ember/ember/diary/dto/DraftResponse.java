package com.ember.ember.diary.dto;

/** 임시저장 응답 */
public record DraftResponse(
        Long draftId,
        String content,
        String savedAt
) {}
