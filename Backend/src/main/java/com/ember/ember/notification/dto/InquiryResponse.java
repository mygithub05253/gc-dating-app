package com.ember.ember.notification.dto;

import com.ember.ember.notification.domain.Inquiry;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "문의 응답")
public record InquiryResponse(
        Long inquiryId,
        String category,
        String title,
        String content,
        String status,
        String answer,
        LocalDateTime answeredAt,
        LocalDateTime createdAt
) {
    public static InquiryResponse from(Inquiry inquiry) {
        return new InquiryResponse(
                inquiry.getId(), inquiry.getCategory(), inquiry.getTitle(),
                inquiry.getContent(), inquiry.getStatus().name(),
                inquiry.getAnswer(), inquiry.getAnsweredAt(), inquiry.getCreatedAt()
        );
    }
}
