package com.ember.ember.user.service;

import com.ember.ember.chat.repository.ChatRoomRepository;
import com.ember.ember.consent.repository.AiConsentLogRepository;
import com.ember.ember.consent.service.AiConsentService;
import com.ember.ember.diary.repository.DiaryRepository;
import com.ember.ember.exchange.repository.ExchangeRoomRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.global.system.domain.AiConsentLog;
import com.ember.ember.global.system.domain.UserWithdrawalLog;
import com.ember.ember.global.system.repository.UserWithdrawalLogRepository;
import com.ember.ember.report.domain.Appeal;
import com.ember.ember.report.domain.SanctionHistory;
import com.ember.ember.report.dto.AppealRequest;
import com.ember.ember.report.dto.AppealResponse;
import com.ember.ember.report.repository.AppealRepository;
import com.ember.ember.report.repository.SanctionHistoryRepository;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.dto.*;
import com.ember.ember.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AccountService {

    private final UserRepository userRepository;
    private final UserWithdrawalLogRepository withdrawalLogRepository;
    private final ExchangeRoomRepository exchangeRoomRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final AiConsentLogRepository aiConsentLogRepository;
    private final SanctionHistoryRepository sanctionHistoryRepository;
    private final AppealRepository appealRepository;
    private final DiaryRepository diaryRepository;
    private final AiConsentService aiConsentService;
    private final RedisTemplate<String, String> redisTemplate;

    /** 회원 탈퇴 (30일 유예) */
    @Transactional
    public DeactivateResponse deactivate(Long userId, DeactivateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        // 소프트 딜리트 처리
        user.deactivate();

        // 탈퇴 로그 기록
        UserWithdrawalLog withdrawalLog = UserWithdrawalLog.create(
                user, request.reason(), request.detail());
        withdrawalLogRepository.save(withdrawalLog);

        // 활성 교환일기/채팅 종료
        exchangeRoomRepository.findByParticipant(userId)
                .forEach(room -> room.terminate());
        chatRoomRepository.findByParticipant(userId)
                .forEach(room -> room.terminate());

        // Redis 키 정리
        cleanupRedisKeys(userId);

        log.info("[회원 탈퇴] 유예 처리 완료 — userId={}, permanentDeleteAt={}",
                userId, user.getPermanentDeleteAt());

        return new DeactivateResponse(user.getDeactivatedAt(), user.getPermanentDeleteAt());
    }

    /** 계정 복구 (마이페이지 경로) */
    @Transactional
    public RestoreResponse restore(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        if (user.getStatus() != User.UserStatus.DEACTIVATED) {
            throw new BusinessException(ErrorCode.RESTORE_TOKEN_INVALID);
        }

        if (user.getPermanentDeleteAt() != null && user.getPermanentDeleteAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.RESTORE_PERIOD_EXPIRED);
        }

        user.restore();

        log.info("[계정 복구] 완료 — userId={}", userId);

        return new RestoreResponse(user.getId(), LocalDateTime.now(), "ACTIVE");
    }

    /** AI 동의 철회 */
    @Transactional
    public void revokeConsent(Long userId, String ipAddress) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        // AI_ANALYSIS 동의 이력 확인
        boolean hasAnalysis = aiConsentLogRepository
                .findLatestByUserIdAndConsentType(userId, "AI_ANALYSIS")
                .map(log -> "GRANTED".equals(log.getAction()))
                .orElse(false);

        boolean hasDataUsage = aiConsentLogRepository
                .findLatestByUserIdAndConsentType(userId, "AI_DATA_USAGE")
                .map(log -> "GRANTED".equals(log.getAction()))
                .orElse(false);

        if (!hasAnalysis && !hasDataUsage) {
            throw new BusinessException(ErrorCode.CONSENT_NOT_FOUND);
        }

        // REVOKED 이력 INSERT (Append-Only)
        if (hasAnalysis) {
            aiConsentLogRepository.save(AiConsentLog.builder()
                    .user(user).action("REVOKED").consentType("AI_ANALYSIS").ipAddress(ipAddress).build());
        }
        if (hasDataUsage) {
            aiConsentLogRepository.save(AiConsentLog.builder()
                    .user(user).action("REVOKED").consentType("AI_DATA_USAGE").ipAddress(ipAddress).build());
        }

        // Redis AI 캐시 + 동의 캐시 삭제
        cleanupAiCache(userId);
        aiConsentService.invalidateConsent(userId, "AI_ANALYSIS");
        aiConsentService.invalidateConsent(userId, "AI_DATA_USAGE");

        log.info("[AI 동의 철회] 완료 — userId={}", userId);
    }

    /** AI 프로필 조회 */
    public AiProfileResponse getAiProfile(Long userId) {
        long diaryCount = diaryRepository.countByUserId(userId);

        if (diaryCount < 3) {
            return AiProfileResponse.notAvailable((int) diaryCount);
        }

        // TODO: Redis AI:LIFESTYLE:{userId} 캐시 조회 + DB 조회 연동
        // 현재는 캐시/분석 결과 미연동 상태이므로 빈 태그 반환
        return new AiProfileResponse(
                true, (int) diaryCount,
                List.of(), List.of(), List.of(), List.of(),
                null
        );
    }

    /** 제재 이의신청 */
    @Transactional
    public AppealResponse createAppeal(Long userId, AppealRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        // 정지 상태 확인
        if (user.getStatus() != User.UserStatus.SUSPEND_7D
                && user.getStatus() != User.UserStatus.SUSPEND_30D) {
            throw new BusinessException(ErrorCode.APPEAL_NOT_SUSPENDED);
        }

        // 영구 정지 확인
        if (user.getStatus() == User.UserStatus.BANNED) {
            throw new BusinessException(ErrorCode.APPEAL_PERMANENT_BAN);
        }

        SanctionHistory sanction = sanctionHistoryRepository.findById(request.sanctionId())
                .orElseThrow(() -> new BusinessException(ErrorCode.APPEAL_NOT_SUSPENDED));

        // 중복 이의신청 확인
        if (appealRepository.existsBySanctionIdAndStatus(request.sanctionId(), Appeal.AppealStatus.PENDING)) {
            throw new BusinessException(ErrorCode.APPEAL_ALREADY_PENDING);
        }

        Appeal appeal = Appeal.create(user, sanction, request.reason());
        appealRepository.save(appeal);

        log.info("[이의신청] 접수 — userId={}, sanctionId={}, appealId={}",
                userId, request.sanctionId(), appeal.getId());

        return AppealResponse.from(appeal);
    }

    /** Redis 키 정리 (탈퇴 시) */
    private void cleanupRedisKeys(Long userId) {
        try {
            redisTemplate.delete("RT:" + userId);
            redisTemplate.delete("MATCHING:RECO:" + userId);
            redisTemplate.delete("AI:LIFESTYLE:" + userId);
        } catch (Exception e) {
            log.warn("[탈퇴] Redis 정리 실패 (무시) — {}", e.getMessage());
        }
    }

    /** AI 관련 Redis 캐시 삭제 */
    private void cleanupAiCache(Long userId) {
        try {
            redisTemplate.delete("AI:LIFESTYLE:" + userId);
        } catch (Exception e) {
            log.warn("[동의 철회] Redis 캐시 삭제 실패 (무시) — {}", e.getMessage());
        }
    }
}
