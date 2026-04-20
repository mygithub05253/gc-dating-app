package com.ember.ember.diary.repository;

import com.ember.ember.diary.domain.DiaryKeyword;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 일기 AI 분석 키워드 Repository
 * DiaryAnalysisResultHandler에서 saveAll()로 배치 저장.
 */
public interface DiaryKeywordRepository extends JpaRepository<DiaryKeyword, Long> {
}
