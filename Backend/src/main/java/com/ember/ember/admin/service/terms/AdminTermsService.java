package com.ember.ember.admin.service.terms;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.domain.terms.Terms;
import com.ember.ember.admin.dto.terms.AdminTermsDto.CreateRequest;
import com.ember.ember.admin.dto.terms.AdminTermsDto.TermsResponse;
import com.ember.ember.admin.dto.terms.AdminTermsDto.UpdateRequest;
import com.ember.ember.admin.dto.terms.TermsHistoryResponse;
import com.ember.ember.admin.repository.AdminAuditLogRepository;
import com.ember.ember.admin.repository.terms.TermsRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 관리자 약관 서비스 — 관리자 API v2.1 §10.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminTermsService {

    private static final int MAX_PAGE_SIZE = 100;

    private final TermsRepository termsRepository;
    private final AdminAuditLogRepository adminAuditLogRepository;

    // ── §10 목록 ─────────────────────────────────────────────

    public Page<TermsResponse> list(Terms.TermsType type, Terms.TermsStatus status,
                                    int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize);
        return termsRepository.searchForAdmin(type, status, pageable)
                .map(TermsResponse::from);
    }

    // ── §10 상세 ─────────────────────────────────────────────

    public TermsResponse get(Long termsId) {
        return TermsResponse.from(load(termsId));
    }

    // ── §10 생성 ─────────────────────────────────────────────

    @Transactional
    @AdminAction(action = "TERMS_CREATE", targetType = "TERMS")
    public TermsResponse create(CreateRequest request, Long adminId) {
        // ACTIVE로 생성 시 동일 유형의 기존 ACTIVE 약관 확인
        if (request.status() == Terms.TermsStatus.ACTIVE) {
            validateNoActiveExists(request.type());
        }
        Terms terms = Terms.create(
                request.type(), request.title(), request.content(), request.version(),
                request.status(), request.isRequired(), request.effectiveDate(),
                adminId, request.changeReason());
        termsRepository.save(terms);
        log.info("[TERMS_CREATE] termsId={} type={} version={}", terms.getId(), terms.getType(), terms.getVersion());
        return TermsResponse.from(terms);
    }

    // ── §10 수정/버전업 ──────────────────────────────────────

    @Transactional
    @AdminAction(action = "TERMS_UPDATE", targetType = "TERMS", targetIdParam = "termsId")
    public TermsResponse update(Long termsId, UpdateRequest request) {
        Terms terms = load(termsId);
        // ACTIVE로 변경 시 동일 유형의 기존 ACTIVE 약관 확인 (자기 자신 제외)
        if (request.status() == Terms.TermsStatus.ACTIVE
                && terms.getStatus() != Terms.TermsStatus.ACTIVE) {
            validateNoActiveExists(terms.getType());
        }
        terms.update(request.title(), request.content(), request.version(),
                request.status(), request.isRequired(),
                request.effectiveDate(), request.changeReason());
        log.info("[TERMS_UPDATE] termsId={} version={}", termsId, terms.getVersion());
        return TermsResponse.from(terms);
    }

    // ── §10 아카이브 (삭제) ──────────────────────────────────

    @Transactional
    @AdminAction(action = "TERMS_ARCHIVE", targetType = "TERMS", targetIdParam = "termsId")
    public void archive(Long termsId) {
        Terms terms = load(termsId);
        if (Boolean.TRUE.equals(terms.getIsRequired()) && terms.getStatus() == Terms.TermsStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.ADM_TERMS_REQUIRED_DELETE);
        }
        terms.updateStatus(Terms.TermsStatus.ARCHIVED);
        log.info("[TERMS_ARCHIVE] termsId={}", termsId);
    }

    // ── §10 변경 이력 ─────────────────────────────────────────

    /**
     * 약관 변경 이력 조회.
     * admin_audit_logs 에서 targetType='TERMS' 인 로그를 페이징 조회한다.
     * type 파라미터가 있으면 action 필터로 활용 (예: USER_TERMS → action LIKE '%USER_TERMS%').
     */
    public Page<TermsHistoryResponse> getHistory(String type, Long termId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize);

        // type 파라미터를 action 필터로 변환 (null이면 전체)
        String actionFilter = (type == null || type.isBlank()) ? null : type.trim();

        return adminAuditLogRepository.searchTermsHistory(termId, actionFilter, pageable)
                .map(log -> new TermsHistoryResponse(
                        log.getId(),
                        log.getAdmin().getId(),
                        log.getAdmin().getName(),
                        log.getAction(),
                        log.getTargetId(),
                        log.getDetail(),
                        log.getIpAddress(),
                        log.getPerformedAt()
                ));
    }

    // ── private helpers ──────────────────────────────────────

    private Terms load(Long termsId) {
        return termsRepository.findById(termsId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_TERMS_NOT_FOUND));
    }

    private void validateNoActiveExists(Terms.TermsType type) {
        if (termsRepository.existsByTypeAndStatus(type, Terms.TermsStatus.ACTIVE)) {
            throw new BusinessException(ErrorCode.ADM_TERMS_ACTIVE_EXISTS);
        }
    }
}
