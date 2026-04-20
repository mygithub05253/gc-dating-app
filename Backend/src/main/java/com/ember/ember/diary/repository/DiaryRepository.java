package com.ember.ember.diary.repository;

import com.ember.ember.diary.domain.Diary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 일기 Repository
 */
public interface DiaryRepository extends JpaRepository<Diary, Long> {

    /**
     * 특정 사용자의 특정 날짜 일기 존재 여부 확인 (하루 1개 중복 방지).
     */
    boolean existsByUserIdAndDate(Long userId, LocalDate date);

    /**
     * 특정 사용자의 일기 건수 조회 (라이프스타일 분석 트리거 판단용).
     */
    @Query("SELECT COUNT(d) FROM Diary d WHERE d.user.id = :userId")
    long countByUserId(@Param("userId") Long userId);

    /**
     * 특정 사용자의 COMPLETED 상태 일기 건수 조회.
     * 라이프스타일 분석 트리거 조건(≥5) 판단용.
     *
     * @param userId         사용자 PK
     * @param analysisStatus 분석 상태 필터 (COMPLETED)
     * @return COMPLETED 일기 건수
     */
    @Query("SELECT COUNT(d) FROM Diary d WHERE d.user.id = :userId AND d.analysisStatus = :analysisStatus")
    long countByUserIdAndAnalysisStatus(@Param("userId") Long userId,
                                        @Param("analysisStatus") Diary.AnalysisStatus analysisStatus);

    /**
     * 특정 사용자의 최근 COMPLETED 일기 N편 조회.
     * 라이프스타일 분석 payload 구성 시 사용.
     *
     * @param userId         사용자 PK
     * @param analysisStatus 분석 상태 필터 (COMPLETED)
     * @param pageable       Pageable.ofSize(n)으로 상위 N건 제한
     * @return 날짜 내림차순 최근 완료 일기 목록
     */
    @Query("SELECT d FROM Diary d WHERE d.user.id = :userId AND d.analysisStatus = :analysisStatus ORDER BY d.date DESC")
    List<Diary> findTopByUserIdAndAnalysisStatusOrderByDateDesc(
            @Param("userId") Long userId,
            @Param("analysisStatus") Diary.AnalysisStatus analysisStatus,
            Pageable pageable);

    /**
     * 사용자의 최근 일기 N편 조회.
     * user_vector lazy 생성 시 임베딩 소스로 사용 (일기 본문 이어붙이기).
     *
     * @param userId   사용자 PK
     * @param pageable Pageable.ofSize(n)으로 상위 N건 제한
     * @return 날짜 내림차순 최근 일기 목록
     */
    @Query("SELECT d FROM Diary d WHERE d.user.id = :userId ORDER BY d.date DESC")
    List<Diary> findRecentByUserId(@Param("userId") Long userId, Pageable pageable);
}
