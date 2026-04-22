package com.ember.ember.admin.repository;

import com.ember.ember.admin.domain.AdminLoginLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminLoginLogRepository extends JpaRepository<AdminLoginLog, Long> {
}
