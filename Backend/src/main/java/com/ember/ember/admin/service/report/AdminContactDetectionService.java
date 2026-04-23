package com.ember.ember.admin.service.report;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.annotation.PiiAccess;
import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.admin.dto.report.AdminContactDetectionActionRequest;
import com.ember.ember.admin.dto.report.AdminContactDetectionResponse;
import com.ember.ember.admin.dto.report.AdminContactDetectionStatsResponse;
import com.ember.ember.admin.repository.AdminAccountRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.report.domain.ContactDetection;
import com.ember.ember.report.repository.ContactDetectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.Map;

/**
 * 관리자 외부 연락처 감지 서비스 — 관리자 API v2.1 §5.10 / §5.11.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminContactDetectionService {

    private final ContactDetectionRepository contactDetectionRepository;
    private final AdminAccountRepository adminAccountRepository;

    // ── §5.10 목록 ─────────────────────────────────────────────────────────
    public Page<AdminContactDetectionResponse> list(ContactDetection.Status status,
                                                    ContactDetection.PatternType patternType,
                                                    Integer periodDays,
                                                    Pageable pageable) {
        LocalDateTime since = (periodDays == null || periodDays <= 0)
                ? null
                : LocalDateTime.now().minusDays(Math.min(periodDays, 365));
        return contactDetectionRepository.searchForAdmin(status, patternType, since, pageable)
                .map(AdminContactDetectionResponse::from);
    }

    /** 감지 상세 조회 — 원문 맥락 포함이므로 PiiAccess 로깅. */
    @PiiAccess(accessType = "CONTACT_DETECTION_VIEW", targetUserIdParam = "detectionId")
    public AdminContactDetectionResponse getDetail(Long detectionId) {
        return AdminContactDetectionResponse.from(load(detectionId));
    }

    // ── §5.11 조치 적용 ────────────────────────────────────────────────────
    @Transactional
    @AdminAction(action = "CONTACT_DETECTION_ACTION", targetType = "CONTACT_DETECTION",
            targetIdParam = "detectionId")
    public AdminContactDetectionResponse applyAction(Long detectionId,
                                                     AdminContactDetectionActionRequest request,
                                                     CustomUserDetails admin) {
        ContactDetection d = load(detectionId);
        AdminAccount adminAccount = adminAccountRepository.getReferenceById(admin.getUserId());
        try {
            d.applyAction(request.action(), request.adminMemo(), adminAccount);
        } catch (IllegalStateException e) {
            throw new BusinessException(ErrorCode.ADM_CONTACT_DETECTION_ALREADY_PROCESSED);
        }
        return AdminContactDetectionResponse.from(d);
    }

    // ── 패턴 분포 통계 (프런트 위젯용) ──────────────────────────────────────
    public AdminContactDetectionStatsResponse stats(int periodDays) {
        int safe = Math.max(1, Math.min(periodDays, 365));
        LocalDateTime since = LocalDateTime.now().minusDays(safe);

        Map<ContactDetection.PatternType, Long> byPattern = new EnumMap<>(ContactDetection.PatternType.class);
        for (ContactDetection.PatternType p : ContactDetection.PatternType.values()) byPattern.put(p, 0L);

        long[] totals = new long[3]; // [pending, confirmed, falsePositive]
        long total = 0;

        // JPQL 2쿼리: 패턴 분포 + 상태별 카운트
        for (Object[] row : contactDetectionRepository.countByPatternType(since)) {
            byPattern.put((ContactDetection.PatternType) row[0], (Long) row[1]);
            total += (Long) row[1];
        }

        // 상태별 카운트는 JPA count 로 개별 조회 — 단순화
        Page<AdminContactDetectionResponse> pendingPage = list(ContactDetection.Status.PENDING,
                null, safe, Pageable.ofSize(1));
        Page<AdminContactDetectionResponse> confirmedPage = list(ContactDetection.Status.CONFIRMED,
                null, safe, Pageable.ofSize(1));
        Page<AdminContactDetectionResponse> fpPage = list(ContactDetection.Status.FALSE_POSITIVE,
                null, safe, Pageable.ofSize(1));
        totals[0] = pendingPage.getTotalElements();
        totals[1] = confirmedPage.getTotalElements();
        totals[2] = fpPage.getTotalElements();

        return new AdminContactDetectionStatsResponse(
                safe, total, totals[0], totals[1], totals[2], byPattern);
    }

    private ContactDetection load(Long id) {
        return contactDetectionRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_CONTACT_DETECTION_NOT_FOUND));
    }
}
