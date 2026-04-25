package com.ember.ember.admin.service.tutorial;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.admin.dto.tutorial.AdminTutorialDto.CreateRequest;
import com.ember.ember.admin.dto.tutorial.AdminTutorialDto.ReorderRequest;
import com.ember.ember.admin.dto.tutorial.AdminTutorialDto.TutorialResponse;
import com.ember.ember.admin.dto.tutorial.AdminTutorialDto.UpdateRequest;
import com.ember.ember.admin.repository.AdminAccountRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.notification.domain.TutorialPage;
import com.ember.ember.notification.repository.TutorialPageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 관리자 튜토리얼 서비스 — 관리자 API v2.1 §23.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminTutorialService {

    private static final int MAX_PAGE_SIZE = 100;

    private final TutorialPageRepository tutorialPageRepository;
    private final AdminAccountRepository adminAccountRepository;

    // ── §23 목록 ─────────────────────────────────────────────

    public Page<TutorialResponse> list(Boolean isActive, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize);
        return tutorialPageRepository.searchForAdmin(isActive, pageable)
                .map(TutorialResponse::from);
    }

    // ── §23 생성 ─────────────────────────────────────────────

    @Transactional
    @AdminAction(action = "TUTORIAL_CREATE", targetType = "TUTORIAL")
    public TutorialResponse create(CreateRequest request, Long adminId) {
        AdminAccount admin = adminAccountRepository.findById(adminId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_ADMIN_NOT_FOUND));
        TutorialPage page = TutorialPage.create(
                request.title(), request.body(), request.imageUrl(),
                request.pageOrder(), request.isActive(), admin);
        tutorialPageRepository.save(page);
        log.info("[TUTORIAL_CREATE] pageId={} title={}", page.getId(), page.getTitle());
        return TutorialResponse.from(page);
    }

    // ── §23 수정 ─────────────────────────────────────────────

    @Transactional
    @AdminAction(action = "TUTORIAL_UPDATE", targetType = "TUTORIAL", targetIdParam = "pageId")
    public TutorialResponse update(Long pageId, UpdateRequest request) {
        TutorialPage page = load(pageId);
        page.update(request.title(), request.body(), request.imageUrl(),
                request.pageOrder(), request.isActive());
        log.info("[TUTORIAL_UPDATE] pageId={}", pageId);
        return TutorialResponse.from(page);
    }

    // ── §23 삭제 ─────────────────────────────────────────────

    @Transactional
    @AdminAction(action = "TUTORIAL_DELETE", targetType = "TUTORIAL", targetIdParam = "pageId")
    public void delete(Long pageId) {
        TutorialPage page = load(pageId);
        tutorialPageRepository.delete(page);
        log.info("[TUTORIAL_DELETE] pageId={}", pageId);
    }

    // ── §23 순서 변경 ────────────────────────────────────────

    @Transactional
    @AdminAction(action = "TUTORIAL_REORDER", targetType = "TUTORIAL")
    public void reorder(ReorderRequest request) {
        List<Long> orderedIds = request.orderedIds();
        for (int i = 0; i < orderedIds.size(); i++) {
            TutorialPage page = load(orderedIds.get(i));
            page.updatePageOrder(i);
        }
        log.info("[TUTORIAL_REORDER] count={}", orderedIds.size());
    }

    // ── private helpers ──────────────────────────────────────

    private TutorialPage load(Long pageId) {
        return tutorialPageRepository.findById(pageId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_TUTORIAL_PAGE_NOT_FOUND));
    }
}
