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

    /**
     * 일기 탐색 — 다른 사용자의 일기 목록 조회 (커서 기반 페이징).
     * 본인/차단/skip 대상 제외, SUBMITTED 이상 상태만 노출.
     */
    @Query("""
            SELECT d FROM Diary d JOIN FETCH d.user u
            WHERE d.user.id != :userId
              AND d.user.id NOT IN :excludeUserIds
              AND d.id < :cursor
            ORDER BY d.id DESC
            """)
    List<Diary> findExploreWithCursor(
            @Param("userId") Long userId,
            @Param("excludeUserIds") List<Long> excludeUserIds,
            @Param("cursor") Long cursor,
            Pageable pageable);

    /**
     * 일기 탐색 — 첫 페이지 (커서 없는 경우).
     */
    @Query("""
            SELECT d FROM Diary d JOIN FETCH d.user u
            WHERE d.user.id != :userId
              AND d.user.id NOT IN :excludeUserIds
            ORDER BY d.id DESC
            """)
    List<Diary> findExploreFirstPage(
            @Param("userId") Long userId,
            @Param("excludeUserIds") List<Long> excludeUserIds,
            Pageable pageable);
}
