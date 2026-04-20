package com.ember.ember.notification.dto;

import com.ember.ember.notification.domain.TutorialPage;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "튜토리얼 페이지 정보")
public record TutorialPageResponse(

        @Schema(description = "페이지 순서")
        int pageOrder,

        @Schema(description = "페이지 제목")
        String title,

        @Schema(description = "페이지 본문")
        String body,

        @Schema(description = "페이지 이미지 URL")
        String imageUrl
) {
    public static TutorialPageResponse from(TutorialPage page) {
        return new TutorialPageResponse(
                page.getPageOrder(),
                page.getTitle(),
                page.getBody(),
                page.getImageUrl()
        );
    }
}
