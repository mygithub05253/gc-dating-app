package com.ember.ember.user.repository;

import com.ember.ember.user.domain.FcmToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FcmTokenRepository extends JpaRepository<FcmToken, Long> {

    Optional<FcmToken> findByUserIdAndDeviceType(Long userId, FcmToken.DeviceType deviceType);

    Optional<FcmToken> findByFcmToken(String fcmToken);
}
