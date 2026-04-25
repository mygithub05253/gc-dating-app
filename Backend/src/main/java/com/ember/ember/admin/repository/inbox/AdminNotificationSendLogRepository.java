package com.ember.ember.admin.repository.inbox;

import com.ember.ember.admin.domain.inbox.AdminNotificationSendLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AdminNotificationSendLogRepository extends JpaRepository<AdminNotificationSendLog, Long> {

    /** 특정 알림의 채널별 발송 이력 조회 (상세 화면에서 사용). */
    List<AdminNotificationSendLog> findAllByNotificationIdOrderBySentAtDesc(Long notificationId);
}
