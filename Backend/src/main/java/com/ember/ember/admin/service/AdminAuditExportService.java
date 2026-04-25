package com.ember.ember.admin.service;

import com.ember.ember.admin.domain.AdminAuditLog;
import com.ember.ember.admin.repository.AdminAuditLogRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * 관리자 감사 로그 CSV 내보내기 서비스 — §13.9.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminAuditExportService {

    private static final int MAX_EXPORT_ROWS = 10_000;
    private static final DateTimeFormatter ISO_FMT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final AdminAuditLogRepository adminAuditLogRepository;

    /**
     * 감사 로그를 CSV byte[]로 내보낸다. 최대 10,000건 제한.
     */
    public byte[] exportCsv(Long adminId, String action, String targetType,
                            LocalDate startDate, LocalDate endDate) {
        // 기간 기본값: 최근 30일
        LocalDate today = LocalDate.now();
        LocalDate effectiveStart = (startDate != null) ? startDate : today.minusDays(30);
        LocalDate effectiveEnd = (endDate != null) ? endDate : today;

        LocalDateTime startAt = effectiveStart.atStartOfDay();
        LocalDateTime endAt = effectiveEnd.plusDays(1).atStartOfDay();

        String normalizedAction = (action == null || action.isBlank()) ? null : action.trim();
        String normalizedTarget = (targetType == null || targetType.isBlank()) ? null : targetType.trim();

        // 건수 확인 (10,000건 초과 시 ���러)
        Page<AdminAuditLog> page = adminAuditLogRepository.searchAuditLogs(
                adminId, normalizedAction, normalizedTarget,
                startAt, endAt, null,
                PageRequest.of(0, 1));

        if (page.getTotalElements() > MAX_EXPORT_ROWS) {
            throw new BusinessException(ErrorCode.ADM_EXPORT_LIMIT_EXCEEDED);
        }

        // 전체 데이터 조회
        Page<AdminAuditLog> all = adminAuditLogRepository.searchAuditLogs(
                adminId, normalizedAction, normalizedTarget,
                startAt, endAt, null,
                PageRequest.of(0, MAX_EXPORT_ROWS));

        // CSV 생성
        StringBuilder sb = new StringBuilder();
        // BOM for Excel UTF-8
        sb.append('\uFEFF');
        sb.append("ID,관리자ID,관리자명,액션,대상타입,대상ID,상세,IP,수행시각\n");

        for (AdminAuditLog logEntry : all.getContent()) {
            sb.append(logEntry.getId()).append(',');
            sb.append(logEntry.getAdmin().getId()).append(',');
            sb.append(escapeCsv(logEntry.getAdmin().getName())).append(',');
            sb.append(escapeCsv(logEntry.getAction())).append(',');
            sb.append(escapeCsv(logEntry.getTargetType())).append(',');
            sb.append(logEntry.getTargetId() != null ? logEntry.getTargetId() : "").append(',');
            sb.append(escapeCsv(logEntry.getDetail())).append(',');
            sb.append(escapeCsv(logEntry.getIpAddress())).append(',');
            sb.append(logEntry.getPerformedAt() != null ? logEntry.getPerformedAt().format(ISO_FMT) : "");
            sb.append('\n');
        }

        log.info("[AUDIT_EXPORT] 총 {}건 CSV 내보내기 완료", all.getTotalElements());
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
