package com.ember.ember.notification.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "1:1 문의 접수 요청")
public record InquiryRequest(

        @Schema(description = "문의 카테고리", example = "ACCOUNT")
        @NotBlank(message = "카테고리는 필수입니다.")
        String category,

        @Schema(description = "문의 제목 (5~100자)")
        @NotBlank(message = "제목은 필수입니다.")
        @Size(min = 5, max = 100, message = "제목은 5자 이상 100자 이하여야 합니다.")
        String title,

        @Schema(description = "문의 내용 (10~2000자)")
        @NotBlank(message = "내용은 필수입니다.")
        @Size(min = 10, max = 2000, message = "내용은 10자 이상 2000자 이하여야 합니다.")
        String content
) {
}
