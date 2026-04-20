package com.ember.ember.diary.dto;

import com.ember.ember.diary.domain.Diary;
import com.ember.ember.diary.domain.Diary.AnalysisStatus;
import com.ember.ember.diary.domain.Diary.DiaryStatus;

/**
 * 일기 생성 응답 DTO.
 * 결정 3: diaryId + status + analysisStatus만 포함.
 * main의 summary/category/content/createdAt 즉시 반환 필드 제거.
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
    public static DiaryCreateResponse of(Diary diary) {
        return new DiaryCreateResponse(diary.getId(), diary.getStatus(), diary.getAnalysisStatus());
    }

    public static DiaryCreateResponse of(Long diaryId, DiaryStatus status, AnalysisStatus analysisStatus) {
        return new DiaryCreateResponse(diaryId, status, analysisStatus);
    }
}
