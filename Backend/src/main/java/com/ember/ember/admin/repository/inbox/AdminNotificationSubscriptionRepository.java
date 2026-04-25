package com.ember.ember.admin.repository.inbox;

import com.ember.ember.admin.domain.inbox.AdminNotificationSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AdminNotificationSubscriptionRepository
        extends JpaRepository<AdminNotificationSubscription, Long> {

    List<AdminNotificationSubscription> findAllByAdminId(Long adminId);

    Optional<AdminNotificationSubscription> findByAdminIdAndCategory(Long adminId, String category);

    void deleteAllByAdminId(Long adminId);
}
