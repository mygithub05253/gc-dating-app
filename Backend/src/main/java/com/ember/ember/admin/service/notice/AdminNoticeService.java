package com.ember.ember.admin.service.notice;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.admin.dto.notice.AdminNoticeDto.CreateRequest;
import com.ember.ember.admin.dto.notice.AdminNoticeDto.NoticeResponse;
import com.ember.ember.admin.dto.notice.AdminNoticeDto.UpdateRequest;
import com.ember.ember.admin.repository.AdminAccountRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.notification.domain.Notice;
import com.ember.ember.notification.repository.NoticeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 관리자 공지사항 서비스 — 관리자 API v2.1 §11.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminNoticeService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_PINNED = 3;

    private final NoticeRepository noticeRepository;
    private final AdminAccountRepository adminAccountRepository;

    // ── §11 목록 ─────────────────────────────────────────────

    public Page<NoticeResponse> list(Notice.NoticeCategory category,
                                     Notice.NoticeStatus status,
                                     Boolean isPinned,
                                     int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize);
        return noticeRepository.searchForAdmin(category, status, isPinned, pageable)
                .map(NoticeResponse::from);
    }

    // ── §11 상세 ─────────────────────────────────────────────

    public NoticeResponse get(Long noticeId) {
        return NoticeResponse.from(load(noticeId));
    }

    // ── §11 생성 ─────────────────────────────────────────────

    @Transactional
    @AdminAction(action = "NOTICE_CREATE", targetType = "NOTICE")
    public NoticeResponse create(CreateRequest request, Long adminId) {
        validatePinLimit(request.isPinned());
        AdminAccount admin = adminAccountRepository.findById(adminId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_ADMIN_NOT_FOUND));

        Notice notice = Notice.create(
                request.title(), request.content(), request.category(),
                request.status(), request.priority(),
                request.isPinned(), request.targetAudience(),
                request.publishedAt(), admin);
        noticeRepository.save(notice);
        log.info("[NOTICE_CREATE] noticeId={} title={}", notice.getId(), notice.getTitle());
        return NoticeResponse.from(notice);
    }

    // ── §11 수정 ─────────────────────────────────────────────

    @Transactional
    @AdminAction(action = "NOTICE_UPDATE", targetType = "NOTICE", targetIdParam = "noticeId")
    public NoticeResponse update(Long noticeId, UpdateRequest request) {
        Notice notice = load(noticeId);
        // 고정 활성화 요청인데 현재 고정이 아닌 경우만 검사
        if (Boolean.TRUE.equals(request.isPinned()) && !Boolean.TRUE.equals(notice.getIsPinned())) {
            validatePinLimit(true);
        }
        notice.update(request.title(), request.content(), request.category(),
                request.status(), request.priority(),
                request.isPinned(), request.targetAudience(),
                request.publishedAt());
        log.info("[NOTICE_UPDATE] noticeId={}", noticeId);
        return NoticeResponse.from(notice);
    }

    // ── §11 삭제 (소프트) ────────────────────────────────────

    @Transactional
    @AdminAction(action = "NOTICE_DELETE", targetType = "NOTICE", targetIdParam = "noticeId")
    public void delete(Long noticeId) {
        Notice notice = load(noticeId);
        notice.softDelete();
        log.info("[NOTICE_DELETE] noticeId={}", noticeId);
    }

    // ── private helpers ──────────────────────────────────────

    private Notice load(Long noticeId) {
        return noticeRepository.findById(noticeId)
                .filter(n -> n.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_NOTICE_NOT_FOUND));
    }

    private void validatePinLimit(Boolean isPinned) {
        if (Boolean.TRUE.equals(isPinned)) {
            int pinnedCount = noticeRepository.countByIsPinnedTrueAndDeletedAtIsNull();
            if (pinnedCount >= MAX_PINNED) {
                throw new BusinessException(ErrorCode.ADM_NOTICE_PIN_LIMIT);
            }
        }
    }
}
