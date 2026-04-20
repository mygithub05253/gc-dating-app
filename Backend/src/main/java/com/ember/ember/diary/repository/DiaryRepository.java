package com.ember.ember.diary.repository;

import com.ember.ember.diary.domain.Diary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 일기 Repository - main + feature 메서드 합산
 */
public interface DiaryRepository extends JpaRepository<Diary, Long> {

    /** 특정 사용자의 당일 일기 조회 */
    Optional<Diary> findByUserIdAndDate(Long userId, LocalDate date);

    /** 특정 사용자의 특정 날짜 일기 존재 여부 확인 (하루 1개 중복 방지) */
    boolean existsByUserIdAndDate(Long userId, LocalDate date);

    /** 특정 사용자의 일기 목록 (최신순 페이징) */
    Page<Diary> findByUserIdOrderByDateDesc(Long userId, Pageable pageable);

    /**
     * 특정 사용자의 일기 건수 조회 (라이프스타일 분석 트리거 판단용).
     */
    @Query("SELECT COUNT(d) FROM Diary d WHERE d.user.id = :userId")
    long countByUserId(@Param("userId") Long userId);

    /**
     * 특정 사용자의 COMPLETED 상태 일기 건수 조회.
     * 라이프스타일 분석 트리거 조건(≥5) 판단용.
     */
    @Query("SELECT COUNT(d) FROM Diary d WHERE d.user.id = :userId AND d.analysisStatus = :analysisStatus")
    long countByUserIdAndAnalysisStatus(@Param("userId") Long userId,
                                        @Param("analysisStatus") Diary.AnalysisStatus analysisStatus);

    /**
     * 특정 사용자의 최근 COMPLETED 일기 N편 조회.
     * 라이프스타일 분석 payload 구성 시 사용.
     */
    @Query("SELECT d FROM Diary d WHERE d.user.id = :userId AND d.analysisStatus = :analysisStatus ORDER BY d.date DESC")
    List<Diary> findTopByUserIdAndAnalysisStatusOrderByDateDesc(
            @Param("userId") Long userId,
            @Param("analysisStatus") Diary.AnalysisStatus analysisStatus,
            Pageable pageable);

    /**
     * 사용자의 최근 일기 N편 조회.
     * user_vector lazy 생성 시 임베딩 소스로 사용.
     */
    @Query("SELECT d FROM Diary d WHERE d.user.id = :userId ORDER BY d.date DESC")
    List<Diary> findRecentByUserId(@Param("userId") Long userId, Pageable pageable);
}
