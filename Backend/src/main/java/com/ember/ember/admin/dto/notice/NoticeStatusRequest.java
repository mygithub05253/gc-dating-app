package com.ember.ember.admin.dto.notice;

import com.ember.ember.notification.domain.Notice;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/**
 * 공지사항 상태 변경 요청 — §11 공지사항 관리.
 */
@Schema(description = "공지사항 상태 변경 요청")
public record NoticeStatusRequest(
        @NotNull @Schema(description = "변경할 상태 (PUBLISHED / DRAFT)") Notice.NoticeStatus status
) {}
