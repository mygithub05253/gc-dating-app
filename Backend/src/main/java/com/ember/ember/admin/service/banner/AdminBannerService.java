package com.ember.ember.admin.service.banner;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.dto.banner.AdminBannerDto.BannerResponse;
import com.ember.ember.admin.dto.banner.AdminBannerDto.CreateRequest;
import com.ember.ember.admin.dto.banner.AdminBannerDto.UpdateRequest;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.notification.domain.Banner;
import com.ember.ember.notification.repository.BannerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 관리자 배너 서비스 — 관리자 API v2.1 §12.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminBannerService {

    private static final int MAX_PAGE_SIZE = 100;

    private final BannerRepository bannerRepository;

    // ── §12 목록 ─────────────────────────────────────────────

    public Page<BannerResponse> list(Boolean isActive, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize);
        return bannerRepository.searchForAdmin(isActive, pageable)
                .map(BannerResponse::from);
    }

    // ── §12 생성 ─────────────────────────────────────────────

    @Transactional
    @AdminAction(action = "BANNER_CREATE", targetType = "BANNER")
    public BannerResponse create(CreateRequest request) {
        validateDateRange(request.startAt(), request.endAt());
        Banner banner = Banner.create(
                request.title(), request.imageUrl(), request.linkType(),
                request.linkUrl(), request.priority(), request.isActive(),
                request.startAt(), request.endAt());
        bannerRepository.save(banner);
        log.info("[BANNER_CREATE] bannerId={} title={}", banner.getId(), banner.getTitle());
        return BannerResponse.from(banner);
    }

    // ── §12 수정 ─────────────────────────────────────────────

    @Transactional
    @AdminAction(action = "BANNER_UPDATE", targetType = "BANNER", targetIdParam = "bannerId")
    public BannerResponse update(Long bannerId, UpdateRequest request) {
        validateDateRange(request.startAt(), request.endAt());
        Banner banner = load(bannerId);
        banner.update(request.title(), request.imageUrl(), request.linkType(),
                request.linkUrl(), request.priority(), request.isActive(),
                request.startAt(), request.endAt());
        log.info("[BANNER_UPDATE] bannerId={}", bannerId);
        return BannerResponse.from(banner);
    }

    // ── §12 삭제 ─────────────────────────────────────────────

    @Transactional
    @AdminAction(action = "BANNER_DELETE", targetType = "BANNER", targetIdParam = "bannerId")
    public void delete(Long bannerId) {
        Banner banner = load(bannerId);
        bannerRepository.delete(banner);
        log.info("[BANNER_DELETE] bannerId={}", bannerId);
    }

    // ── private helpers ──────────────────────────────────────

    private Banner load(Long bannerId) {
        return bannerRepository.findById(bannerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_BANNER_NOT_FOUND));
    }

    private void validateDateRange(java.time.LocalDateTime startAt, java.time.LocalDateTime endAt) {
        if (startAt != null && endAt != null && !startAt.isBefore(endAt)) {
            throw new BusinessException(ErrorCode.ADM_BANNER_INVALID_PERIOD);
        }
    }
}
