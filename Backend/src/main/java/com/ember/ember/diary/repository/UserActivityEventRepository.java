package com.ember.ember.diary.repository;

import com.ember.ember.diary.domain.UserActivityEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserActivityEventRepository extends JpaRepository<UserActivityEvent, Long> {
}
