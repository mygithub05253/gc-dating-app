package com.ember.ember.user.service;

import com.ember.ember.chat.domain.ChatRoom;
import com.ember.ember.chat.repository.ChatRoomRepository;
import com.ember.ember.exchange.domain.ExchangeRoom;
import com.ember.ember.exchange.repository.ExchangeRoomRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.idealtype.domain.Keyword;
import com.ember.ember.idealtype.domain.UserIdealKeyword;
import com.ember.ember.idealtype.repository.KeywordRepository;
import com.ember.ember.idealtype.repository.UserIdealKeywordRepository;
import com.ember.ember.cache.service.CacheService;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.domain.UserSetting;
import com.ember.ember.user.dto.*;
import com.ember.ember.user.repository.UserRepository;
import com.ember.ember.user.repository.UserSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MyPageService {

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 30;

    private final UserRepository userRepository;
    private final UserIdealKeywordRepository userIdealKeywordRepository;
    private final KeywordRepository keywordRepository;
    private final ExchangeRoomRepository exchangeRoomRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final UserSettingRepository userSettingRepository;
    private final CacheService cacheService;

    /** 이상형 키워드 조회 (마이페이지) */
    public IdealTypeDetailResponse getIdealType(Long userId) {
        List<UserIdealKeyword> userKeywords = userIdealKeywordRepository.findByUserIdWithKeyword(userId);

        List<IdealTypeDetailResponse.KeywordItem> items = userKeywords.stream()
                .map(uik -> new IdealTypeDetailResponse.KeywordItem(
                        uik.getKeyword().getId(),
                        uik.getKeyword().getLabel(),
                        "PERSONALITY"
                ))
                .toList();

        return new IdealTypeDetailResponse(items, 3, null);
    }

    /** 이상형 키워드 수정 (마이페이지, DELETE-then-INSERT) */
    @Transactional
    public IdealTypeDetailResponse updateIdealType(Long userId, List<Long> keywordIds) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        // 키워드 존�� 여부 검증
        List<Keyword> keywords = keywordRepository.findAllById(keywordIds);
        if (keywords.size() != keywordIds.size()) {
            throw new BusinessException(ErrorCode.KEYWORD_NOT_FOUND);
        }

        if (keywordIds.size() > 3) {
            throw new BusinessException(ErrorCode.KEYWORD_COUNT_INVALID);
        }

        // 기존 삭제 → 새로 저장
        userIdealKeywordRepository.deleteByUserId(userId);
        List<UserIdealKeyword> idealKeywords = keywords.stream()
                .map(keyword -> UserIdealKeyword.builder().user(user).keyword(keyword).build())
                .toList();
        userIdealKeywordRepository.saveAll(idealKeywords);

        // 매칭 추천 캐시 무효화 (명세서 §9.5: 이상형 수정 시 추천 목록 재생성)
        cacheService.invalidate("MATCHING:RECO:" + userId);

        log.info("[이상형 수정] userId={}, keywords={}, 매칭 캐시 무효화", userId, keywordIds);

        List<IdealTypeDetailResponse.KeywordItem> items = keywords.stream()
                .map(k -> new IdealTypeDetailResponse.KeywordItem(k.getId(), k.getLabel(), "PERSONALITY"))
                .toList();

        return new IdealTypeDetailResponse(items, 3, null);
    }

    /** 교환일기 히스토리 조회 */
    public ExchangeHistoryResponse getExchangeHistory(Long userId, Long cursor, Integer size) {
        int pageSize = clampSize(size);
        List<ExchangeRoom> rooms = exchangeRoomRepository.findHistoryByParticipant(userId, cursor, pageSize);
        return ExchangeHistoryResponse.of(rooms, userId, pageSize);
    }

    /** 채팅 히스토리 조회 */
    public ChatHistoryResponse getChatHistory(Long userId, Long cursor, Integer size) {
        int pageSize = clampSize(size);
        List<ChatRoom> rooms = chatRoomRepository.findHistoryByParticipant(userId, cursor, pageSize);
        return ChatHistoryResponse.of(rooms, userId, pageSize);
    }

    /** 앱 설정 조회 */
    public UserSettingResponse getSettings(Long userId) {
        UserSetting setting = userSettingRepository.findByUserId(userId)
                .orElseGet(() -> UserSetting.createDefault(
                        userRepository.findById(userId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND))));
        return UserSettingResponse.from(setting);
    }

    /** 앱 설정 수정 (Upsert) */
    @Transactional
    public UserSettingResponse updateSettings(Long userId, UserSettingRequest request) {
        UserSetting setting = userSettingRepository.findByUserId(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));
                    return userSettingRepository.save(UserSetting.createDefault(user));
                });

        setting.updateIfPresent(request.darkMode(), request.language(), request.ageFilterRange());

        return UserSettingResponse.from(setting);
    }

    private int clampSize(Integer size) {
        return (size == null || size <= 0) ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);
    }
}
