package com.ember.ember.notification.repository;

import com.ember.ember.notification.domain.NotificationSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * 알림 설정 Repository
 */
public interface NotificationSettingRepository extends JpaRepository<NotificationSetting, Long> {

    Optional<NotificationSetting> findByUserId(Long userId);
}
