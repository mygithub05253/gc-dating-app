package com.ember.ember.admin.repository;

import com.ember.ember.admin.domain.AdminLoginLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AdminLoginLogRepository extends JpaRepository<AdminLoginLog, Long> {

    // ── Phase 3B §1 확장: 본인 활동 로그 조회 + 최근 로그인 1건 ────────────────

    /** 특정 관리자의 최근 로그인/로그아웃 기록 (performed_at 내림차순). */
    @Query("""
            SELECT l FROM AdminLoginLog l
            WHERE l.admin.id = :adminId
            ORDER BY l.performedAt DESC
            """)
    List<AdminLoginLog> findRecentByAdmin(@Param("adminId") Long adminId, Pageable pageable);

    /** 특정 관리자의 성공한 최근 LOGIN 1건 (세션 시작 시각·IP·UA 표시용). */
    @Query("""
            SELECT l FROM AdminLoginLog l
            WHERE l.admin.id = :adminId
              AND l.action = 'LOGIN'
              AND l.isSuccess = true
            ORDER BY l.performedAt DESC
            """)
    List<AdminLoginLog> findRecentSuccessLogin(@Param("adminId") Long adminId, Pageable pageable);
}
