package com.ember.ember.notification.service;

import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.notification.domain.*;
import com.ember.ember.notification.dto.*;
import com.ember.ember.notification.repository.*;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NoticeSupportService {

    private static final int MAX_OPEN_INQUIRIES = 5;

    private final NoticeRepository noticeRepository;
    private final BannerRepository bannerRepository;
    private final FaqRepository faqRepository;
    private final InquiryRepository inquiryRepository;
    private final UserRepository userRepository;
    private final NoticeRepository noticeRepo;

    /** 공지사항 목록 조회 */
    public List<NoticeResponse> getNotices() {
        return noticeRepository.findPublished().stream()
                .map(NoticeResponse::from)
                .toList();
    }

    /** 공지사항 상세 조회 */
    public NoticeDetailResponse getNoticeDetail(Long noticeId) {
        Notice notice = noticeRepository.findPublishedById(noticeId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOTICE_NOT_FOUND));
        return NoticeDetailResponse.from(notice);
    }

    /** 활성 배너 조회 (최대 5개) */
    public List<BannerResponse> getActiveBanners() {
        return bannerRepository.findActiveBanners(LocalDateTime.now()).stream()
                .map(BannerResponse::from)
                .toList();
    }

    /** 미읽음 ���지 수 조회 */
    public int getUnreadNoticeCount(Long userId) {
        return noticeRepository.countUnreadByUserId(userId);
    }

    /** FAQ 목록 조회 */
    public List<FaqResponse> getFaqs() {
        return faqRepository.findByIsActiveTrueAndDeletedAtIsNullOrderBySortOrder().stream()
                .map(FaqResponse::from)
                .toList();
    }

    /** 1:1 문의 접수 */
    @Transactional
    public InquiryResponse createInquiry(Long userId, InquiryRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        // 진행 중인 문의 수 제한
        long openCount = inquiryRepository.countByUserIdAndStatusIn(userId,
                List.of(Inquiry.InquiryStatus.OPEN, Inquiry.InquiryStatus.IN_PROGRESS));
        if (openCount >= MAX_OPEN_INQUIRIES) {
            throw new BusinessException(ErrorCode.INQUIRY_LIMIT_EXCEEDED);
        }

        Inquiry inquiry = Inquiry.create(user, request.category(), request.title(), request.content());
        inquiryRepository.save(inquiry);

        log.info("[문의] 접수 — userId={}, inquiryId={}", userId, inquiry.getId());

        return InquiryResponse.from(inquiry);
    }

    /** 내 문의 목록 조회 */
    public List<InquiryResponse> getMyInquiries(Long userId) {
        return inquiryRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(InquiryResponse::from)
                .toList();
    }

    /** 문의 상세 조회 */
    public InquiryResponse getInquiryDetail(Long userId, Long inquiryId) {
        Inquiry inquiry = inquiryRepository.findByIdAndUserId(inquiryId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.INQUIRY_NOT_FOUND));
        return InquiryResponse.from(inquiry);
    }
}
