package com.ember.ember.idealtype.service;

import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.idealtype.domain.Keyword;
import com.ember.ember.idealtype.domain.UserIdealKeyword;
import com.ember.ember.idealtype.dto.*;
import com.ember.ember.idealtype.repository.KeywordRepository;
import com.ember.ember.idealtype.repository.UserIdealKeywordRepository;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class IdealTypeService {

    private final KeywordRepository keywordRepository;
    private final UserIdealKeywordRepository userIdealKeywordRepository;
    private final UserRepository userRepository;

    /** 키워드 목록 조회 (전체 또는 카테고리별) */
    public KeywordListResponse getKeywordList(String category) {
        List<Keyword> keywords;
        if (category != null && !category.isBlank()) {
            keywords = keywordRepository.findByCategoryAndIsActiveTrueOrderByDisplayOrder(category.toUpperCase());
        } else {
            keywords = keywordRepository.findByIsActiveTrueOrderByDisplayOrder();
        }

        List<KeywordResponse> responses = keywords.stream()
                .map(KeywordResponse::from)
                .toList();

        return new KeywordListResponse(responses);
    }

    /** 이상형 키워드 설정 (온보딩 2단계) */
    @Transactional
    public IdealTypeResponse saveIdealKeywords(Long userId, IdealTypeRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        // 키워드 존재 여부 검증
        List<Keyword> keywords = keywordRepository.findAllById(request.keywordIds());
        if (keywords.size() != request.keywordIds().size()) {
            throw new BusinessException(ErrorCode.KEYWORD_NOT_FOUND);
        }

        // 기존 키워드 삭제 후 새로 저장
        userIdealKeywordRepository.deleteByUserId(userId);

        List<UserIdealKeyword> idealKeywords = keywords.stream()
                .map(keyword -> UserIdealKeyword.builder().user(user).keyword(keyword).build())
                .toList();
        userIdealKeywordRepository.saveAll(idealKeywords);

        // 온보딩 2단계 완료
        user.completeIdealType();

        log.info("이상형 키워드 설정 완료: userId={}, keywords={}", userId, request.keywordIds());

        return new IdealTypeResponse(
                keywords.stream().map(Keyword::getId).toList(),
                keywords.stream().map(Keyword::getLabel).toList()
        );
    }
}
