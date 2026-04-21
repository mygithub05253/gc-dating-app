package com.ember.ember.report.service;

import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.report.domain.Report;
import com.ember.ember.report.dto.ReportRequest;
import com.ember.ember.report.dto.ReportResponse;
import com.ember.ember.report.repository.ReportRepository;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private static final int ADMIN_ALERT_THRESHOLD = 5;

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;

    /** 사용자 신고 접수 */
    @Transactional
    public ReportResponse createReport(Long reporterId, Long targetUserId, ReportRequest request) {
        // 자기 신고 방지
        if (reporterId.equals(targetUserId)) {
            throw new BusinessException(ErrorCode.REPORT_SELF);
        }

        // 동일 대상 7일 내 중복 신고 방지
        if (reportRepository.existsRecentReport(reporterId, targetUserId, LocalDateTime.now().minusDays(7))) {
            throw new BusinessException(ErrorCode.REPORT_DUPLICATE);
        }

        User reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        Report report = Report.create(
                reporter, targetUser, request.reason(),
                request.contextType(), request.contextId(), request.detail()
        );
        reportRepository.save(report);

        // 누적 5건 초과 시 관리자 검토 알림 (로그로 기록, 추후 알림 시스템 연동)
        long totalReports = reportRepository.countByTargetUserId(targetUserId);
        if (totalReports >= ADMIN_ALERT_THRESHOLD) {
            log.warn("[신고] 누적 {}건 도달 — targetUserId={}, 관리자 검토 필요", totalReports, targetUserId);
        }

        log.info("[신고] 접수 완료 — reportId={}, reporter={}, target={}, reason={}",
                report.getId(), reporterId, targetUserId, request.reason());

        return ReportResponse.from(report);
    }
}
