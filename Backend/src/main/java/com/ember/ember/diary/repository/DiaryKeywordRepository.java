package com.ember.ember.diary.repository;

import com.ember.ember.diary.domain.DiaryKeyword;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 일기 AI 분석 키워드 Repository
 * DiaryAnalysisResultHandler에서 saveAll()로 배치 저장.
 */
public interface DiaryKeywordRepository extends JpaRepository<DiaryKeyword, Long> {

    /** 특정 일기의 키워드 목록 */
    List<DiaryKeyword> findByDiaryId(Long diaryId);

    /** 특정 일기의 키워드 전체 삭제 */
    void deleteByDiaryId(Long diaryId);
}
