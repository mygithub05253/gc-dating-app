package com.ember.ember.admin.dto.content;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 관리자 일기 목록 응답 DTO.
 */
public record AdminDiaryListResponse(
        Long diaryId,
        Long userId,
        String nickname,
        String title,
        String contentPreview,
        LocalDate date,
        String status,
        String analysisStatus,
        String visibility,
        LocalDateTime createdAt,
        LocalDateTime deletedAt
) {}
