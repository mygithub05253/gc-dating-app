package com.ember.ember.notification.service;

import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.notification.domain.Notification;
import com.ember.ember.notification.dto.*;
import com.ember.ember.notification.repository.NotificationRepository;
import com.ember.ember.user.repository.UserNotificationSettingRepository;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.domain.UserNotificationSetting;
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
public class NotificationService {

    private static final int RETENTION_DAYS = 30;

    private final NotificationRepository notificationRepository;
    private final UserNotificationSettingRepository notificationSettingRepository;
    private final UserRepository userRepository;

    /** 알림 목록 조회 (최근 30일) */
    public NotificationListResponse getNotifications(Long userId) {
        LocalDateTime since = LocalDateTime.now().minusDays(RETENTION_DAYS);
        List<Notification> notifications = notificationRepository.findByUserId(userId, since);
        int unreadCount = notificationRepository.countUnread(userId);

        return NotificationListResponse.of(notifications, unreadCount);
    }

    /** 특정 알림 읽음 처리 (멱등성 보장) */
    @Transactional
    public NotificationReadResponse markAsRead(Long userId, Long notificationId) {
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOTIFICATION_NOT_FOUND));

        notification.markRead();

        return new NotificationReadResponse(notification.getId(), true, notification.getReadAt());
    }

    /** 전체 미읽음 알림 읽음 처리 */
    @Transactional
    public ReadAllResponse markAllAsRead(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        int updatedCount = notificationRepository.markAllAsRead(userId, now);

        log.info("[알림] 전체 읽음 처리 — userId={}, count={}", userId, updatedCount);

        return new ReadAllResponse(updatedCount, now);
    }

    /** 알림 설정 조회 */
    public NotificationSettingResponse getNotificationSettings(Long userId) {
        UserNotificationSetting setting = notificationSettingRepository.findByUserId(userId)
                .orElseGet(() -> createDefaultSetting(userId));

        return NotificationSettingResponse.from(setting);
    }

    /** 알림 설정 수정 (Upsert, null이 아닌 필드만 변경) */
    @Transactional
    public NotificationSettingResponse updateNotificationSettings(Long userId, NotificationSettingRequest request) {
        UserNotificationSetting setting = notificationSettingRepository.findByUserId(userId)
                .orElseGet(() -> createAndSaveDefaultSetting(userId));

        setting.updateIfPresent(
                request.matching(), request.diaryTurn(), request.chat(),
                request.aiAnalysis(), request.couple(), request.system()
        );

        log.info("[알림 설정] 변경 — userId={}", userId);

        return NotificationSettingResponse.from(setting);
    }

    /** 기본 설정 생성 (저장 없이 반환, 조회 전용) */
    private UserNotificationSetting createDefaultSetting(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));
        return UserNotificationSetting.createDefault(user);
    }

    /** 기본 설정 생성 + DB 저장 */
    private UserNotificationSetting createAndSaveDefaultSetting(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));
        UserNotificationSetting setting = UserNotificationSetting.createDefault(user);
        return notificationSettingRepository.save(setting);
    }
}
