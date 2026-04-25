package com.ember.ember.admin.service;

import com.ember.ember.admin.dto.PasswordChangeLogResponse;
import com.ember.ember.admin.dto.PiiAccessLogResponse;
import com.ember.ember.admin.repository.AdminPasswordChangeLogRepository;
import com.ember.ember.admin.repository.AdminPiiAccessLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * PII 접근 로그 + 비밀번호 변경 로그 조회 서비스 — §13 감사 로그 관리.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminAuditLogService {

    private static final int MAX_PAGE_SIZE = 100;

    private final AdminPiiAccessLogRepository piiAccessLogRepository;
    private final AdminPasswordChangeLogRepository passwordChangeLogRepository;

    /**
     * PII 접근 로그 검색.
     */
    public Page<PiiAccessLogResponse> searchPiiAccessLogs(int page, int size,
                                                           Long adminId, Long targetUserId,
                                                           String accessType,
                                                           LocalDate startDate, LocalDate endDate) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize);

        LocalDateTime startAt = (startDate != null) ? startDate.atStartOfDay() : null;
        LocalDateTime endAt = (endDate != null) ? endDate.plusDays(1).atStartOfDay() : null;
        String normalizedAccessType = (accessType == null || accessType.isBlank()) ? null : accessType.trim();

        return piiAccessLogRepository.searchPiiAccessLogs(
                adminId, targetUserId, normalizedAccessType, startAt, endAt, pageable)
                .map(PiiAccessLogResponse::from);
    }

    /**
     * 비밀번호 변경 로그 검색.
     */
    public Page<PasswordChangeLogResponse> searchPasswordChangeLogs(int page, int size,
                                                                      Long adminId,
                                                                      LocalDate startDate, LocalDate endDate) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize);

        LocalDateTime startAt = (startDate != null) ? startDate.atStartOfDay() : null;
        LocalDateTime endAt = (endDate != null) ? endDate.plusDays(1).atStartOfDay() : null;

        return passwordChangeLogRepository.searchPasswordChangeLogs(
                adminId, startAt, endAt, pageable)
                .map(PasswordChangeLogResponse::from);
    }
}
