package com.ember.ember.diary.repository;

import com.ember.ember.diary.domain.UserActivityEvent;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 사용자 활동 이벤트 Repository
 */
public interface UserActivityEventRepository extends JpaRepository<UserActivityEvent, Long> {
}
