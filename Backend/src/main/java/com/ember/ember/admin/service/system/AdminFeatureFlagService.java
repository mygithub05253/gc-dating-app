package com.ember.ember.admin.service.system;

import com.ember.ember.admin.domain.system.FeatureFlag;
import com.ember.ember.admin.domain.system.FeatureFlag.FlagCategory;
import com.ember.ember.admin.domain.system.FeatureFlagHistory;
import com.ember.ember.admin.dto.system.FeatureFlagHistoryResponse;
import com.ember.ember.admin.dto.system.FeatureFlagResponse;
import com.ember.ember.admin.dto.system.FeatureFlagRollbackRequest;
import com.ember.ember.admin.dto.system.FeatureFlagUpdateRequest;
import com.ember.ember.admin.repository.system.FeatureFlagHistoryRepository;
import com.ember.ember.admin.repository.system.FeatureFlagRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminFeatureFlagService {

    private final FeatureFlagRepository featureFlagRepository;
    private final FeatureFlagHistoryRepository featureFlagHistoryRepository;
    private final StringRedisTemplate stringRedisTemplate;

    private static final String FF_CACHE_PREFIX = "FF:";

    /**
     * 기능 플래그 목록 조회 (카테고리 필터 선택)
     */
    public List<FeatureFlagResponse> getFeatureFlags(FlagCategory category) {
        List<FeatureFlag> flags = (category != null)
                ? featureFlagRepository.findByCategory(category)
                : featureFlagRepository.findAll();
        return flags.stream().map(FeatureFlagResponse::from).toList();
    }

    /**
     * 기능 플래그 토글 — 이력 기록 + Redis 캐시 무효화
     */
    @Transactional
    public FeatureFlagResponse updateFlag(String flagKey, FeatureFlagUpdateRequest request, Long adminId) {
        FeatureFlag flag = featureFlagRepository.findByFlagKey(flagKey)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_FEATURE_FLAG_NOT_FOUND));

        boolean previousValue = flag.isEnabled();
        flag.updateEnabled(request.enabled(), adminId);

        // 변경 이력 기록
        FeatureFlagHistory history = FeatureFlagHistory.record(
                flagKey, previousValue, request.enabled(), request.reason(), adminId);
        featureFlagHistoryRepository.save(history);

        // Redis 캐시 무효화
        stringRedisTemplate.delete(FF_CACHE_PREFIX + flagKey);

        return FeatureFlagResponse.from(flag);
    }

    /**
     * 기능 플래그 변경 이력 조회 (페이징)
     */
    public Page<FeatureFlagHistoryResponse> getFlagHistory(String flagKey, Pageable pageable) {
        // flagKey 존재 검증
        featureFlagRepository.findByFlagKey(flagKey)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_FEATURE_FLAG_NOT_FOUND));

        return featureFlagHistoryRepository.findByFlagKeyOrderByCreatedAtDesc(flagKey, pageable)
                .map(FeatureFlagHistoryResponse::from);
    }

    /**
     * 기능 플래그 롤백 — 이력의 이전 값으로 복원
     */
    @Transactional
    public FeatureFlagResponse rollbackFlag(String flagKey, FeatureFlagRollbackRequest request, Long adminId) {
        FeatureFlag flag = featureFlagRepository.findByFlagKey(flagKey)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_FEATURE_FLAG_NOT_FOUND));

        FeatureFlagHistory history = featureFlagHistoryRepository.findById(request.historyId())
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_FEATURE_FLAG_HISTORY_NOT_FOUND));

        boolean previousValue = flag.isEnabled();
        boolean rollbackValue = history.isPreviousValue();
        flag.updateEnabled(rollbackValue, adminId);

        // 롤백 이력 기록
        FeatureFlagHistory rollbackHistory = FeatureFlagHistory.record(
                flagKey, previousValue, rollbackValue,
                "롤백 (이력 ID: " + request.historyId() + ")", adminId);
        featureFlagHistoryRepository.save(rollbackHistory);

        // Redis 캐시 무효화
        stringRedisTemplate.delete(FF_CACHE_PREFIX + flagKey);

        return FeatureFlagResponse.from(flag);
    }
}
