package com.ember.ember.admin.repository.system;

import com.ember.ember.admin.domain.system.FeatureFlagHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeatureFlagHistoryRepository extends JpaRepository<FeatureFlagHistory, Long> {

    Page<FeatureFlagHistory> findByFlagKeyOrderByCreatedAtDesc(String flagKey, Pageable pageable);
}
