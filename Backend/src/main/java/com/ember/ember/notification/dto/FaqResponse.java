package com.ember.ember.notification.dto;

import com.ember.ember.notification.domain.Faq;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "FAQ 응답")
public record FaqResponse(
        Long id,
        String category,
        String question,
        String answer
) {
    public static FaqResponse from(Faq faq) {
        return new FaqResponse(faq.getId(), faq.getCategory(), faq.getQuestion(), faq.getAnswer());
    }
}
