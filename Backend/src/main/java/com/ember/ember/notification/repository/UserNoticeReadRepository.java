package com.ember.ember.notification.repository;

import com.ember.ember.notification.domain.UserNoticeRead;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserNoticeReadRepository extends JpaRepository<UserNoticeRead, Long> {
}
