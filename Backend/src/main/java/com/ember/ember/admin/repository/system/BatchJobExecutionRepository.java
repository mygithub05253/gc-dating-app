package com.ember.ember.admin.repository.system;

import com.ember.ember.admin.domain.system.BatchJobExecution;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BatchJobExecutionRepository extends JpaRepository<BatchJobExecution, Long> {

    Page<BatchJobExecution> findByJobIdOrderByStartedAtDesc(Long jobId, Pageable pageable);

    Optional<BatchJobExecution> findFirstByJobIdAndCompletedAtIsNull(Long jobId);
}
