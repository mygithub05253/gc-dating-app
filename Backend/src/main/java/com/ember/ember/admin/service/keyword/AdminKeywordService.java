package com.ember.ember.admin.service.keyword;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.dto.keyword.AdminKeywordDto.CreateRequest;
import com.ember.ember.admin.dto.keyword.AdminKeywordDto.KeywordResponse;
import com.ember.ember.admin.dto.keyword.AdminKeywordDto.UpdateRequest;
import com.ember.ember.admin.dto.keyword.AdminKeywordDto.WeightUpdateRequest;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.idealtype.domain.Keyword;
import com.ember.ember.idealtype.repository.KeywordRepository;
import com.ember.ember.idealtype.repository.UserIdealKeywordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 관리자 이상형 키워드 서비스 — 관리자 API v2.1 §24.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminKeywordService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int MIN_CATEGORY_KEYWORDS = 3;

    private final KeywordRepository keywordRepository;
    private final UserIdealKeywordRepository userIdealKeywordRepository;

    // ── §24 목록 ─────────────────────────────────────────────

    public Page<KeywordResponse> list(String category, Boolean isActive, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize);
        return keywordRepository.searchForAdmin(category, isActive, pageable)
                .map(k -> KeywordResponse.from(k, countUsers(k.getId())));
    }

    // ── §24 생성 ─────────────────────────────────────────────

    @Transactional
    @AdminAction(action = "KEYWORD_CREATE", targetType = "KEYWORD")
    public KeywordResponse create(CreateRequest request) {
        if (keywordRepository.existsByLabel(request.label())) {
            throw new BusinessException(ErrorCode.ADM_KEYWORD_LABEL_DUPLICATE);
        }
        Keyword keyword = Keyword.create(
                request.label(), request.category(), request.weight(),
                request.displayOrder(), request.isActive());
        keywordRepository.save(keyword);
        log.info("[KEYWORD_CREATE] keywordId={} label={}", keyword.getId(), keyword.getLabel());
        return KeywordResponse.from(keyword, 0L);
    }

    // ── §24 수정 ─────────────────────────────────────────────

    @Transactional
    @AdminAction(action = "KEYWORD_UPDATE", targetType = "KEYWORD", targetIdParam = "keywordId")
    public KeywordResponse update(Long keywordId, UpdateRequest request) {
        Keyword keyword = load(keywordId);
        // 라벨 변경 시 중복 확인 (자기 자신 제외)
        if (!keyword.getLabel().equals(request.label())
                && keywordRepository.existsByLabel(request.label())) {
            throw new BusinessException(ErrorCode.ADM_KEYWORD_LABEL_DUPLICATE);
        }
        keyword.update(request.label(), request.category(), request.weight(),
                request.displayOrder(), request.isActive());
        log.info("[KEYWORD_UPDATE] keywordId={}", keywordId);
        return KeywordResponse.from(keyword, countUsers(keywordId));
    }

    // ── §24 활성/비활성 토글 ─────────────────────────────────

    @Transactional
    @AdminAction(action = "KEYWORD_TOGGLE", targetType = "KEYWORD", targetIdParam = "keywordId")
    public KeywordResponse toggleActive(Long keywordId) {
        Keyword keyword = load(keywordId);
        // 비활성화 시 카테고리 최소 키워드 수 검사
        if (Boolean.TRUE.equals(keyword.getIsActive())) {
            int activeCount = keywordRepository.countByCategoryAndIsActiveTrue(keyword.getCategory());
            if (activeCount <= MIN_CATEGORY_KEYWORDS) {
                throw new BusinessException(ErrorCode.ADM_KEYWORD_MIN_CATEGORY);
            }
        }
        keyword.toggleActive();
        log.info("[KEYWORD_TOGGLE] keywordId={} isActive={}", keywordId, keyword.getIsActive());
        return KeywordResponse.from(keyword, countUsers(keywordId));
    }

    // ── §24 가중치 일괄 수정 ─────────────────────────────────

    @Transactional
    @AdminAction(action = "KEYWORD_WEIGHT_UPDATE", targetType = "KEYWORD")
    public void updateWeights(WeightUpdateRequest request) {
        for (var item : request.items()) {
            Keyword keyword = load(item.id());
            keyword.updateWeight(item.weight());
        }
        log.info("[KEYWORD_WEIGHT_UPDATE] count={}", request.items().size());
    }

    // ── private helpers ──────────────────────────────────────

    private Keyword load(Long keywordId) {
        return keywordRepository.findById(keywordId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_KEYWORD_NOT_FOUND));
    }

    private Long countUsers(Long keywordId) {
        return userIdealKeywordRepository.countByKeywordId(keywordId);
    }
}
