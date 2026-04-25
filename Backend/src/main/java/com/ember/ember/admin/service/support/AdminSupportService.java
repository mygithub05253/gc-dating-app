package com.ember.ember.admin.service.support;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.admin.dto.support.AdminSupportDto.AppealResolveRequest;
import com.ember.ember.admin.dto.support.AdminSupportDto.AppealResponse;
import com.ember.ember.admin.dto.support.AdminSupportDto.InquiryReplyRequest;
import com.ember.ember.admin.dto.support.AdminSupportDto.InquiryResponse;
import com.ember.ember.admin.repository.AdminAccountRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.notification.domain.Inquiry;
import com.ember.ember.notification.repository.InquiryRepository;
import com.ember.ember.report.domain.Appeal;
import com.ember.ember.report.repository.AppealRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 관리자 고객지원 서비스 — 관리자 API v2.1 §17.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminSupportService {

    private static final int MAX_PAGE_SIZE = 100;

    private final InquiryRepository inquiryRepository;
    private final AppealRepository appealRepository;
    private final AdminAccountRepository adminAccountRepository;

    // ── §17.1 문의 목록 ─────────────────────────────────────

    public Page<InquiryResponse> listInquiries(Inquiry.InquiryStatus status,
                                               String category,
                                               int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize);
        return inquiryRepository.searchForAdmin(status, category, pageable)
                .map(InquiryResponse::from);
    }

    // ── §17.1 문의 상세 ─────────────────────────────────────

    public InquiryResponse getInquiry(Long inquiryId) {
        return InquiryResponse.from(loadInquiry(inquiryId));
    }

    // ── §17.1 문의 답변 ─────────────────────────────────────

    @Transactional
    @AdminAction(action = "INQUIRY_REPLY", targetType = "INQUIRY", targetIdParam = "inquiryId")
    public InquiryResponse replyInquiry(Long inquiryId, InquiryReplyRequest request, Long adminId) {
        Inquiry inquiry = loadInquiry(inquiryId);

        if (inquiry.getStatus() == Inquiry.InquiryStatus.RESOLVED
                || inquiry.getStatus() == Inquiry.InquiryStatus.CLOSED) {
            throw new BusinessException(ErrorCode.ADM_INQUIRY_ALREADY_RESOLVED);
        }

        AdminAccount admin = loadAdmin(adminId);
        inquiry.reply(request.answer(), admin);
        log.info("[INQUIRY_REPLY] inquiryId={} adminId={}", inquiryId, adminId);
        return InquiryResponse.from(inquiry);
    }

    // ── §17.1 문의 종료 ─────────────────────────────────────

    @Transactional
    @AdminAction(action = "INQUIRY_CLOSE", targetType = "INQUIRY", targetIdParam = "inquiryId")
    public InquiryResponse closeInquiry(Long inquiryId, Long adminId) {
        Inquiry inquiry = loadInquiry(inquiryId);
        inquiry.close();
        log.info("[INQUIRY_CLOSE] inquiryId={} adminId={}", inquiryId, adminId);
        return InquiryResponse.from(inquiry);
    }

    // ── §17.2 이의신청 목록 ─────────────────────────────────

    public Page<AppealResponse> listAppeals(Appeal.AppealStatus status,
                                            int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize);
        return appealRepository.searchForAdmin(status, pageable)
                .map(AppealResponse::from);
    }

    // ── §17.2 이의신청 상세 ─────────────────────────────────

    public AppealResponse getAppeal(Long appealId) {
        return AppealResponse.from(loadAppeal(appealId));
    }

    // ── §17.2 이의신청 결정 ─────────────────────────────────

    @Transactional
    @AdminAction(action = "APPEAL_RESOLVE", targetType = "APPEAL", targetIdParam = "appealId")
    public AppealResponse resolveAppeal(Long appealId, AppealResolveRequest request, Long adminId) {
        Appeal appeal = loadAppeal(appealId);

        if (appeal.getStatus() == Appeal.AppealStatus.DECIDED) {
            throw new BusinessException(ErrorCode.ADM_APPEAL_ALREADY_DECIDED);
        }

        AdminAccount admin = loadAdmin(adminId);
        appeal.decide(request.decision(), request.decisionReason(), admin);
        log.info("[APPEAL_RESOLVE] appealId={} decision={} adminId={}", appealId, request.decision(), adminId);
        return AppealResponse.from(appeal);
    }

    // ── private helpers ──────────────────────────────────────

    private Inquiry loadInquiry(Long inquiryId) {
        return inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_INQUIRY_NOT_FOUND));
    }

    private Appeal loadAppeal(Long appealId) {
        return appealRepository.findById(appealId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_APPEAL_NOT_FOUND));
    }

    private AdminAccount loadAdmin(Long adminId) {
        return adminAccountRepository.findById(adminId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_ADMIN_NOT_FOUND));
    }
}
