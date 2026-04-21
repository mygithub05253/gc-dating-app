package com.ember.ember.user.service;

import com.ember.ember.user.domain.User;
import com.ember.ember.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 탈퇴 유예 만료 배치 스케줄러.
 * 매일 자정(00:00)에 실행하여 permanentDeleteAt이 지난 DEACTIVATED 유저를 영구 처리.
 *
 * 설계서 6.2.15 기준:
 * - 개인정보(닉네임, 실명, 연락처 등) 삭제
 * - 일기 텍스트 보존, authorId=NULL (익명화)
 * - 소셜 연동 해제
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AccountCleanupScheduler {

    private final EntityManager entityManager;

    /** 매일 자정 실행 */
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void cleanupExpiredAccounts() {
        LocalDateTime now = LocalDateTime.now();

        // DEACTIVATED + permanentDeleteAt 초과 유저 조회 (네이티브 쿼리 — @SQLRestriction 우회)
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(
                "SELECT id, nickname FROM users WHERE status = 'DEACTIVATED' AND permanent_delete_at < :now AND deleted_at IS NULL")
                .setParameter("now", now)
                .getResultList();

        if (rows.isEmpty()) {
            log.debug("[탈퇴 배치] 만료된 유예 계정 없음");
            return;
        }

        log.info("[탈퇴 배치] 만료 유예 계정 {}건 처리 시작", rows.size());

        for (Object[] row : rows) {
            Long userId = ((Number) row[0]).longValue();
            String nickname = (String) row[1];

            try {
                // 1. 일기 익명화 (authorId=NULL, 텍스트 보존)
                int anonymized = entityManager.createNativeQuery(
                        "UPDATE diaries SET user_id = NULL WHERE user_id = :userId")
                        .setParameter("userId", userId)
                        .executeUpdate();

                // 2. 개인정보 삭제 (닉네임, 실명, 생년월일 등 NULL 처리)
                entityManager.createNativeQuery(
                        "UPDATE users SET nickname = NULL, real_name = '삭제됨', " +
                        "birth_date = '1900-01-01', sido = NULL, sigungu = NULL, school = NULL, " +
                        "deleted_at = :now, status = 'BANNED' WHERE id = :userId")
                        .setParameter("now", now)
                        .setParameter("userId", userId)
                        .executeUpdate();

                // 3. FCM 토큰 삭제
                entityManager.createNativeQuery(
                        "DELETE FROM fcm_tokens WHERE user_id = :userId")
                        .setParameter("userId", userId)
                        .executeUpdate();

                // 4. 소셜 계정 연동 해제
                entityManager.createNativeQuery(
                        "DELETE FROM social_accounts WHERE user_id = :userId")
                        .setParameter("userId", userId)
                        .executeUpdate();

                log.info("[탈퇴 배치] 영구 삭제 완료 — userId={}, nickname={}, 일기 {}건 익명화",
                        userId, nickname, anonymized);
            } catch (Exception e) {
                log.error("[탈퇴 배치] 처리 실패 — userId={}, error={}", userId, e.getMessage());
            }
        }

        log.info("[탈퇴 배치] 완료 — {}건 처리", rows.size());
    }
}
