package com.ember.ember.diary.dto;

import com.ember.ember.diary.domain.Diary.AnalysisStatus;
import com.ember.ember.diary.domain.Diary.DiaryStatus;

/**
 * 일기 생성 응답 DTO.
 *
 * @param diaryId        생성된 일기 PK
 * @param status         일기 워크플로우 상태 (SUBMITTED)
 * @param analysisStatus AI 분석 파이프라인 상태 (PENDING)
 */
public record DiaryCreateResponse(
        Long diaryId,
        DiaryStatus status,
        AnalysisStatus analysisStatus
) {
    public static DiaryCreateResponse of(Long diaryId, DiaryStatus status, AnalysisStatus analysisStatus) {
        return new DiaryCreateResponse(diaryId, status, analysisStatus);
    }
}
