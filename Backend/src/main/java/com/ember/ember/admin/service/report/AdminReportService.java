package com.ember.ember.admin.service.report;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.annotation.PiiAccess;
import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.admin.dto.report.*;
import com.ember.ember.admin.repository.AdminAccountRepository;
import com.ember.ember.auth.service.TokenService;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.report.domain.Report;
import com.ember.ember.report.domain.SanctionHistory;
import com.ember.ember.report.repository.ReportRepository;
import com.ember.ember.report.repository.SanctionHistoryRepository;
import com.ember.ember.report.service.ReportPriorityCalculator;
import com.ember.ember.report.service.ReportPriorityCalculator.SlaStatus;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * 관리자 신고 서비스 — 관리자 API v2.1 §5.1~§5.12 / Phase A-3.
 *
 * 담당 범위:
 *  - §5.1 목록, §5.2 요약, §5.3 상세, §5.4 처리, §5.5 기각,
 *    §5.6 맥락(1차 스켈레톤), §5.7 담당자 할당, §5.12 패턴 분석.
 *  - §5.13 허위 신고 반복자 제재는 별도 메서드로 제공.
 *
 * 미포함 (후속 PR):
 *  - §5.10~5.11 외부 연락처 감지 — ERD 내 contact_detections 테이블 부재.
 *    AI 파이프라인 연계가 선행되어야 함 (Phase B).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminReportService {

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final AdminAccountRepository adminAccountRepository;
    private final SanctionHistoryRepository sanctionHistoryRepository;
    private final ReportPriorityCalculator priorityCalculator;
    private final TokenService tokenService;

    // ── §5.1 목록 ───────────────────────────────────────────────────────────
    public Page<AdminReportListItemResponse> list(Report.ReportStatus status,
                                                   Report.ReportReason reason,
                                                   String assignedToFilter,
                                                   Long selfAdminId,
                                                   Integer minPriority,
                                                   boolean slaOverdue,
                                                   Pageable pageable) {
        String filter;
        Long assigneeId;
        if (assignedToFilter == null || assignedToFilter.isBlank()) {
            filter = "ANY";
            assigneeId = null;
        } else if ("me".equalsIgnoreCase(assignedToFilter)) {
            filter = "ME";
            assigneeId = selfAdminId;
        } else if ("unassigned".equalsIgnoreCase(assignedToFilter)) {
            filter = "UNASSIGNED";
            assigneeId = null;
        } else {
            try {
                assigneeId = Long.parseLong(assignedToFilter);
                filter = "SPECIFIC";
            } catch (NumberFormatException e) {
                filter = "ANY";
                assigneeId = null;
            }
        }

        LocalDateTime now = LocalDateTime.now();
        Page<Report> page = reportRepository.searchReports(
                status, reason, minPriority, filter, assigneeId, slaOverdue, now, pageable);

        return page.map(r -> AdminReportListItemResponse.from(
                r, priorityCalculator.evaluateSlaStatus(r, now)));
    }

    // ── §5.2 요약 ───────────────────────────────────────────────────────────
    public AdminReportSummaryResponse summary() {
        List<Report> pending = reportRepository.findAllPendingForSlaSummary();
        LocalDateTime now = LocalDateTime.now();

        long pendingCount = pending.size();
        long warningCount = pending.stream()
                .filter(r -> priorityCalculator.evaluateSlaStatus(r, now) == SlaStatus.WARNING)
                .count();
        long exceededCount = pending.stream()
                .filter(r -> priorityCalculator.evaluateSlaStatus(r, now) == SlaStatus.OVERDUE)
                .count();

        return new AdminReportSummaryResponse(pendingCount, warningCount, exceededCount);
    }

    // ── §5.3 상세 ───────────────────────────────────────────────────────────
    public AdminReportDetailResponse getDetail(Long reportId) {
        Report report = loadReport(reportId);
        List<Report> previous = reportRepository.findPreviousReportsOfTarget(
                report.getTargetUser().getId(), reportId, PageRequest.of(0, 5));

        SlaStatus slaStatus = priorityCalculator.evaluateSlaStatus(report, LocalDateTime.now());
        return AdminReportDetailResponse.from(report, slaStatus, previous);
    }

    // ── §5.4 처리 ───────────────────────────────────────────────────────────
    @Transactional
    @AdminAction(action = "REPORT_RESOLVE", targetType = "REPORT", targetIdParam = "reportId")
    public void resolveReport(Long reportId,
                              AdminReportResolveRequest request,
                              CustomUserDetails admin) {
        Report report = loadReport(reportId);
        if (report.getStatus() == Report.ReportStatus.RESOLVED
                || report.getStatus() == Report.ReportStatus.DISMISSED) {
            throw new BusinessException(ErrorCode.ADM_REPORT_ALREADY_PROCESSED);
        }

        AdminAccount adminAccount = adminAccountRepository.getReferenceById(admin.getUserId());
        report.resolve(adminAccount, request.note());

        // 제재 액션 실행
        applySanction(report, request.action(), request.note(), adminAccount);
    }

    private void applySanction(Report report,
                                AdminReportResolveRequest.ResolveAction action,
                                String note,
                                AdminAccount adminAccount) {
        User target = report.getTargetUser();
        LocalDateTime now = LocalDateTime.now();
        User.UserStatus previous = target.getStatus();

        switch (action) {
            case WARNING -> {
                // 상태 변경 없이 이력만 기록 (WARNING)
                sanctionHistoryRepository.save(SanctionHistory.create(
                        target, adminAccount, SanctionHistory.SanctionType.WARNING,
                        note, null, previous.name(), report, now, null));
            }
            case SUSPEND_7D -> {
                target.suspendFor7Days(note, now);
                sanctionHistoryRepository.save(SanctionHistory.create(
                        target, adminAccount, SanctionHistory.SanctionType.SUSPEND_7D,
                        note, null, previous.name(), report, now, now.plusDays(7)));
                tokenService.deleteRefreshToken(target.getId());
            }
            case SUSPEND_PERMANENT -> {
                target.banPermanently(note, now);
                sanctionHistoryRepository.save(SanctionHistory.create(
                        target, adminAccount, SanctionHistory.SanctionType.SUSPEND_PERMANENT,
                        note, null, previous.name(), report, now, null));
                tokenService.deleteRefreshToken(target.getId());
            }
        }
    }

    // ── §5.5 기각 ───────────────────────────────────────────────────────────
    @Transactional
    @AdminAction(action = "REPORT_DISMISS", targetType = "REPORT", targetIdParam = "reportId")
    public void dismissReport(Long reportId,
                              AdminReportDismissRequest request,
                              CustomUserDetails admin) {
        Report report = loadReport(reportId);
        if (report.getStatus() == Report.ReportStatus.RESOLVED
                || report.getStatus() == Report.ReportStatus.DISMISSED) {
            throw new BusinessException(ErrorCode.ADM_REPORT_ALREADY_PROCESSED);
        }

        AdminAccount adminAccount = adminAccountRepository.getReferenceById(admin.getUserId());
        report.dismiss(adminAccount, request.reason());
    }

    // ── §5.6 맥락 조회 (스켈레톤) ────────────────────────────────────────────
    /**
     * 신고 맥락 조회 — v1 은 콘텐츠 타입 + detail 만 반환.
     * 실제 원문(일기/채팅 메시지)은 각 도메인 Repository 연계 필요 (후속 PR).
     * PiiAccess 로깅은 적용해 둠 — 개인정보 열람 추적.
     */
    @PiiAccess(accessType = "REPORT_CONTEXT_VIEW", targetUserIdParam = "reportId")
    public AdminReportContextResponse getContext(Long reportId) {
        Report report = loadReport(reportId);
        return new AdminReportContextResponse(
                reportId,
                report.getContextType(),
                report.getContextId(),
                report.getDetail(),
                "Phase A-3 1차: 원문 조회 미연동. 후속 PR 에서 diary/chat 연계."
        );
    }

    // ── §5.7 담당자 할당 ────────────────────────────────────────────────────
    @Transactional
    @AdminAction(action = "REPORT_ASSIGN", targetType = "REPORT", targetIdParam = "reportId")
    public void assignReport(Long reportId,
                             AdminReportAssignRequest request,
                             CustomUserDetails admin) {
        Report report = loadReport(reportId);
        AdminAccount assignee = adminAccountRepository.findById(request.assigneeId())
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_ADMIN_NOT_FOUND));
        report.assignTo(assignee);
    }

    // ── §5.12 패턴 분석 ─────────────────────────────────────────────────────
    /**
     * 기간 내 신고를 집계해 사유/콘텐츠유형 분포 + 집중 대상/잦은 신고자 상위 N을 반환한다.
     * 메모리 집계 — 조회 건수가 과도할 경우 후속 PR 에서 SQL GROUP BY 로 전환.
     */
    public AdminReportPatternResponse patternAnalysis(int periodDays, int topN) {
        int safePeriod = Math.max(1, Math.min(periodDays, 365));
        int safeTop = Math.max(3, Math.min(topN, 20));

        LocalDateTime now = LocalDateTime.now();
        List<Report> scope = reportRepository.findBetween(now.minusDays(safePeriod), now);

        Map<Report.ReportReason, Long> byReason = new EnumMap<>(Report.ReportReason.class);
        Map<Report.ContextType, Long> byContext = new EnumMap<>(Report.ContextType.class);
        Map<Long, long[]> targetCounts = new java.util.HashMap<>();       // userId -> {count}
        Map<Long, long[]> reporterCounts = new java.util.HashMap<>();
        Map<Long, String> nicknameCache = new java.util.HashMap<>();

        long overdue = 0;
        long totalPriority = 0;
        for (Report r : scope) {
            byReason.merge(r.getReason(), 1L, Long::sum);
            if (r.getContextType() != null) byContext.merge(r.getContextType(), 1L, Long::sum);

            Long tUid = r.getTargetUser().getId();
            nicknameCache.putIfAbsent(tUid, r.getTargetUser().getNickname());
            targetCounts.computeIfAbsent(tUid, k -> new long[]{0})[0]++;

            Long rUid = r.getReporter().getId();
            nicknameCache.putIfAbsent(rUid, r.getReporter().getNickname());
            reporterCounts.computeIfAbsent(rUid, k -> new long[]{0})[0]++;

            totalPriority += r.getPriorityScore() == null ? 0 : r.getPriorityScore();
            if (priorityCalculator.evaluateSlaStatus(r, now) == SlaStatus.OVERDUE) overdue++;
        }

        List<AdminReportPatternResponse.UserReportCount> topTargets = targetCounts.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue()[0], a.getValue()[0]))
                .limit(safeTop)
                .map(e -> new AdminReportPatternResponse.UserReportCount(
                        e.getKey(), nicknameCache.get(e.getKey()), e.getValue()[0]))
                .toList();

        List<AdminReportPatternResponse.UserReportCount> topReporters = reporterCounts.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue()[0], a.getValue()[0]))
                .limit(safeTop)
                .map(e -> new AdminReportPatternResponse.UserReportCount(
                        e.getKey(), nicknameCache.get(e.getKey()), e.getValue()[0]))
                .toList();

        long total = scope.size();
        double avg = total == 0 ? 0d : (double) totalPriority / total;
        double overdueRate = total == 0 ? 0d : (double) overdue / total;

        return new AdminReportPatternResponse(
                safePeriod, total, byReason, byContext,
                topTargets, topReporters, avg, overdue, overdueRate);
    }

    // ── 내부 유틸 ───────────────────────────────────────────────────────────
    private Report loadReport(Long reportId) {
        return reportRepository.findById(reportId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_REPORT_NOT_FOUND));
    }
}
