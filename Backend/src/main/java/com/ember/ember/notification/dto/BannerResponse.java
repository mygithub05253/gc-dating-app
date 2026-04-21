package com.ember.ember.notification.dto;

import com.ember.ember.notification.domain.Banner;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "배너 응답")
public record BannerResponse(
        Long id,
        String title,
        String imageUrl,
        String linkType,
        String linkUrl
) {
    public static BannerResponse from(Banner banner) {
        return new BannerResponse(
                banner.getId(), banner.getTitle(), banner.getImageUrl(),
                banner.getLinkType().name(), banner.getLinkUrl()
        );
    }
}
