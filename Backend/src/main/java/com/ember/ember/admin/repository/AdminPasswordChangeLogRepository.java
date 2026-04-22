package com.ember.ember.admin.repository;

import com.ember.ember.admin.domain.AdminPasswordChangeLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminPasswordChangeLogRepository extends JpaRepository<AdminPasswordChangeLog, Long> {
}
