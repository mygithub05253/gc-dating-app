package com.ember.ember.diary.repository;

import com.ember.ember.diary.domain.DiaryKeyword;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * 일기 AI 분석 키워드 Repository
 * DiaryAnalysisResultHandler에서 saveAll()로 배치 저장.
 */
public interface DiaryKeywordRepository extends JpaRepository<DiaryKeyword, Long> {

    /** 특정 일기의 키워드 목록 */
    List<DiaryKeyword> findByDiaryId(Long diaryId);

    /** 여러 일기의 키워드 배치 조회 (N+1 방지) */
    List<DiaryKeyword> findByDiaryIdIn(List<Long> diaryIds);

    /** 특정 일기의 ���워드 전체 삭제 */
    void deleteByDiaryId(Long diaryId);

    /** 특정 사용자의 전체 분석 키워드 조회 (AI 프로필용) */
    @Query("SELECT dk FROM DiaryKeyword dk WHERE dk.diary.user.id = :userId")
    List<DiaryKeyword> findByUserId(@Param("userId") Long userId);
}
