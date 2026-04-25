package com.ember.ember.admin.service.faq;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.dto.faq.AdminFaqDto.CreateRequest;
import com.ember.ember.admin.dto.faq.AdminFaqDto.FaqResponse;
import com.ember.ember.admin.dto.faq.AdminFaqDto.ReorderRequest;
import com.ember.ember.admin.dto.faq.AdminFaqDto.UpdateRequest;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.notification.domain.Faq;
import com.ember.ember.notification.repository.FaqRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 관리자 FAQ 서비스 — 관리자 API v2.1 §22.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminFaqService {

    private static final int MAX_PAGE_SIZE = 100;

    private final FaqRepository faqRepository;

    // ── §22 목록 ─────────────────────────────────────────────

    public Page<FaqResponse> list(String category, Boolean isActive, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize);
        return faqRepository.searchForAdmin(category, isActive, pageable)
                .map(FaqResponse::from);
    }

    // ── §22 생성 ─────────────────────────────────────────────

    @Transactional
    @AdminAction(action = "FAQ_CREATE", targetType = "FAQ")
    public FaqResponse create(CreateRequest request) {
        Faq faq = Faq.create(
                request.category(), request.question(), request.answer(),
                request.sortOrder(), request.isActive());
        faqRepository.save(faq);
        log.info("[FAQ_CREATE] faqId={} category={}", faq.getId(), faq.getCategory());
        return FaqResponse.from(faq);
    }

    // ── §22 수정 ─────────────────────────────────────────────

    @Transactional
    @AdminAction(action = "FAQ_UPDATE", targetType = "FAQ", targetIdParam = "faqId")
    public FaqResponse update(Long faqId, UpdateRequest request) {
        Faq faq = load(faqId);
        faq.update(request.category(), request.question(), request.answer(),
                request.sortOrder(), request.isActive());
        log.info("[FAQ_UPDATE] faqId={}", faqId);
        return FaqResponse.from(faq);
    }

    // ── §22 삭제 (소프트) ────────────────────────────────────

    @Transactional
    @AdminAction(action = "FAQ_DELETE", targetType = "FAQ", targetIdParam = "faqId")
    public void delete(Long faqId) {
        Faq faq = load(faqId);
        faq.softDelete();
        log.info("[FAQ_DELETE] faqId={}", faqId);
    }

    // ── §22 순서 변경 ────────────────────────────────────────

    @Transactional
    @AdminAction(action = "FAQ_REORDER", targetType = "FAQ")
    public void reorder(ReorderRequest request) {
        List<Long> orderedIds = request.orderedIds();
        for (int i = 0; i < orderedIds.size(); i++) {
            Faq faq = load(orderedIds.get(i));
            faq.updateSortOrder(i);
        }
        log.info("[FAQ_REORDER] count={}", orderedIds.size());
    }

    // ── private helpers ──────────────────────────────────────

    private Faq load(Long faqId) {
        return faqRepository.findById(faqId)
                .filter(f -> f.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_FAQ_NOT_FOUND));
    }
}
