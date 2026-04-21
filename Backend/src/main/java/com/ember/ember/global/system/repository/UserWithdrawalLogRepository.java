package com.ember.ember.global.system.repository;

import com.ember.ember.global.system.domain.UserWithdrawalLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserWithdrawalLogRepository extends JpaRepository<UserWithdrawalLog, Long> {
}
