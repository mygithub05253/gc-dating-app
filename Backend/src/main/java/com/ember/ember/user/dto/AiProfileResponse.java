package com.ember.ember.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "AI 성격 분석 결과 응답")
public record AiProfileResponse(

        @Schema(description = "분석 가능 여부 (일기 3편 이상)")
        boolean analysisAvailable,

        @Schema(description = "분석에 사용된 일기 수")
        int diaryCount,

        @Schema(description = "상위 성격 태그")
        List<String> dominantPersonalityTags,

        @Schema(description = "상위 감정 태그")
        List<String> dominantEmotionTags,

        @Schema(description = "상위 라이프스타일 태그")
        List<String> dominantLifestyleTags,

        @Schema(description = "상위 글쓰기 톤 태그")
        List<String> dominantToneTags,

        @Schema(description = "분석 불가 시 안내 메시지")
        String message
) {
    /** 분석 불가 응답 */
    public static AiProfileResponse notAvailable(int diaryCount) {
        return new AiProfileResponse(
                false, diaryCount,
                List.of(), List.of(), List.of(), List.of(),
                "일기를 3편 이상 작성하면 AI 성격 분석을 받을 수 있어요."
        );
    }
}
