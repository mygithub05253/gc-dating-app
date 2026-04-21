package com.ember.ember.user.repository;

import com.ember.ember.user.domain.FcmToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FcmTokenRepository extends JpaRepository<FcmToken, Long> {

    Optional<FcmToken> findByUserIdAndDeviceType(Long userId, FcmToken.DeviceType deviceType);

    Optional<FcmToken> findByFcmToken(String fcmToken);

    /** 특정 유저의 모든 FCM 토큰 조회 */
    java.util.List<FcmToken> findByUserId(Long userId);

    /** 만료된 토큰 삭제 */
    void deleteByFcmToken(String fcmToken);
}
