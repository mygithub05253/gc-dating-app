package com.ember.ember.report.service;

import com.ember.ember.report.domain.Report;
import com.ember.ember.report.repository.ReportRepository;
import com.ember.ember.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.Map;

/**
 * 신고 우선순위 스코어링 + SLA 산출 유틸 — 관리자 API v2.1 §5.1 / ERD v2.1 §2.28 근거.
 *
 * <h3>알고리즘 (0~100 스코어)</h3>
 *
 * <pre>
 *   score = clamp(0, 100,
 *              reasonWeight              // 30~80  (사유 중대도)
 *            + targetReportBonus         // 0~20   (피신고자 누적 신고 수)
 *            + reporterTrustBonus        // 0~10   (신고자 신고 남용 감점/가산)
 *            - abusiveReporterPenalty    // 0~30   (신고자 남용 감점)
 *          )
 * </pre>
 *
 * <h4>근거</h4>
 * <ul>
 *   <li>사유별 기본 가중치는 서비스 정책상 "위해 규모 + 법적 리스크" 순서로 배치.
 *       PERSONAL_INFO / SEXUAL / HARASSMENT 는 법적·심리적 피해 즉시성 높아 상단.</li>
 *   <li>피신고자 누적 신고 수 보너스는 로그 스케일 근사 (2/5/10/20건 기점).
 *       단일 사용자에 신고가 몰리는 케이스를 신속 상위 노출.</li>
 *   <li>신고자 남용 감점은 허위 신고 반복자(§5.13) 억제 목적. 최근 30일 내 기각 3건 이상 시
 *       -15, 5건 이상 시 -30. 신뢰도 낮은 신고는 기본 정렬 후순위로 밀어냄.</li>
 * </ul>
 *
 * <h3>SLA 마감 산출</h3>
 * priorityScore 구간별 단일 맵핑: ≥80 → 24h / ≥50 → 72h / 그 외 → 7d.
 * 산출 시점은 신고 접수 시각 기준.
 */
@Component
@RequiredArgsConstructor
public class ReportPriorityCalculator {

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;

    // 사유별 기본 가중치 (30~80)
    private static final Map<Report.ReportReason, Integer> REASON_WEIGHT;

    static {
        Map<Report.ReportReason, Integer> m = new EnumMap<>(Report.ReportReason.class);
        m.put(Report.ReportReason.PERSONAL_INFO, 80); // 개인정보 유출/요구 — 법적 리스크 최대
        m.put(Report.ReportReason.SEXUAL,        75); // 성적 콘텐츠/성희롱
        m.put(Report.ReportReason.HARASSMENT,    70); // 괴롭힘/협박
        m.put(Report.ReportReason.IMPERSONATION, 60); // 사칭/허위 프로필
        m.put(Report.ReportReason.PROFANITY,     50); // 욕설/비속어
        m.put(Report.ReportReason.SPAM,          40); // 스팸/도배
        m.put(Report.ReportReason.OTHER,         30); // 기타
        REASON_WEIGHT = Map.copyOf(m);
    }

    /** 피신고자 누적 신고 보너스 구간 (≥2/≥5/≥10/≥20). */
    private int targetBonus(long cumulativeReports) {
        if (cumulativeReports >= 20) return 20;
        if (cumulativeReports >= 10) return 15;
        if (cumulativeReports >= 5)  return 10;
        if (cumulativeReports >= 2)  return 5;
        return 0;
    }

    /** 신고자 남용 감점 — 최근 30일 내 DISMISSED 3건 이상은 감점. */
    private int abusiveReporterPenalty(long recentDismissedCount) {
        if (recentDismissedCount >= 5) return 30;
        if (recentDismissedCount >= 3) return 15;
        return 0;
    }

    /**
     * 신규 신고 접수 시 스코어/SLA 산출.
     *
     * @return  (score, slaDeadline) 튜플
     */
    @Transactional(readOnly = true)
    public PriorityResult calculate(Long reporterId, Long targetUserId, Report.ReportReason reason) {
        int base = REASON_WEIGHT.getOrDefault(reason, 30);

        long targetCumulative = reportRepository.countByTargetUserId(targetUserId);
        int targetBonus = targetBonus(targetCumulative);

        // 신고자 남용 이력: 본인이 낸 신고 중 최근 30일 이내 DISMISSED 카운트
        long dismissedRecent = reportRepository.countDismissedByReporterSince(
                reporterId, LocalDateTime.now().minusDays(30));
        int penalty = abusiveReporterPenalty(dismissedRecent);

        int raw = base + targetBonus - penalty;
        int clamped = Math.max(0, Math.min(100, raw));

        LocalDateTime slaDeadline = computeSlaDeadline(clamped, LocalDateTime.now());
        return new PriorityResult(clamped, slaDeadline);
    }

    /**
     * SLA 마감 시각 산출.
     * ≥80 → 24h / ≥50 → 72h / 그 외 → 7d.
     */
    public LocalDateTime computeSlaDeadline(int priorityScore, LocalDateTime from) {
        if (priorityScore >= 80) return from.plusHours(24);
        if (priorityScore >= 50) return from.plusHours(72);
        return from.plusDays(7);
    }

    /**
     * 현 시각 기준 SLA 상태 라벨 산출 (서버 계산).
     * ON_TRACK / WARNING (80%+ 경과) / OVERDUE (초과).
     */
    public SlaStatus evaluateSlaStatus(Report report, LocalDateTime now) {
        LocalDateTime deadline = report.getSlaDeadline();
        if (deadline == null) return SlaStatus.ON_TRACK;
        if (now.isAfter(deadline)) return SlaStatus.OVERDUE;

        // 80% 경과 판정 — 접수 시각과 deadline 사이 총 구간의 80% 지점을 기준
        LocalDateTime createdAt = report.getCreatedAt();
        if (createdAt == null) return SlaStatus.ON_TRACK;
        long totalSeconds = java.time.Duration.between(createdAt, deadline).getSeconds();
        long elapsedSeconds = java.time.Duration.between(createdAt, now).getSeconds();
        if (totalSeconds > 0 && (double) elapsedSeconds / totalSeconds >= 0.8d) {
            return SlaStatus.WARNING;
        }
        return SlaStatus.ON_TRACK;
    }

    public enum SlaStatus { ON_TRACK, WARNING, OVERDUE }

    public record PriorityResult(int score, LocalDateTime slaDeadline) {}
}
