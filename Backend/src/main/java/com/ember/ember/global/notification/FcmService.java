package com.ember.ember.global.notification;

import com.ember.ember.user.domain.FcmToken;
import com.ember.ember.user.repository.FcmTokenRepository;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * FCM 푸시 알림 발송 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FcmService {

    private final FcmTokenRepository fcmTokenRepository;

    /** 단일 디바이스에 푸시 알림 발송 */
    public void sendPush(String deviceToken, String title, String body, Map<String, String> data) {
        Message message = Message.builder()
                .setToken(deviceToken)
                .setNotification(Notification.builder()
                        .setTitle(title)
                        .setBody(body)
                        .build())
                .putAllData(data != null ? data : Map.of())
                .build();

        try {
            String response = FirebaseMessaging.getInstance().send(message);
            log.info("FCM 발송 성공: {}", response);
        } catch (FirebaseMessagingException e) {
            log.error("FCM 발송 실패: token={}, error={}", deviceToken, e.getMessage());

            // 만료된 토큰 자동 삭제
            if (e.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED) {
                log.warn("만료된 FCM 토큰 삭제: {}", deviceToken);
                fcmTokenRepository.deleteByFcmToken(deviceToken);
            }
        } catch (IllegalStateException e) {
            log.warn("Firebase가 초기화되지 않았습니다: {}", e.getMessage());
        }
    }

    /** 데이터 없이 푸시 알림 발송 */
    public void sendPush(String deviceToken, String title, String body) {
        sendPush(deviceToken, title, body, null);
    }

    /** 특정 유저의 모든 디바이스에 푸시 발송 */
    @Transactional(readOnly = true)
    public void sendPushToUser(Long userId, String title, String body, Map<String, String> data) {
        List<FcmToken> tokens = fcmTokenRepository.findByUserId(userId);
        if (tokens.isEmpty()) {
            log.debug("FCM 토큰 없음 — userId={}", userId);
            return;
        }
        for (FcmToken token : tokens) {
            sendPush(token.getFcmToken(), title, body, data);
        }
    }

    /** 특정 유저의 모든 디바이스에 푸시 발송 (데이터 없이) */
    public void sendPushToUser(Long userId, String title, String body) {
        sendPushToUser(userId, title, body, null);
    }
}
