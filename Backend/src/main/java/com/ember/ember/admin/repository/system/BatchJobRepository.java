package com.ember.ember.admin.repository.system;

import com.ember.ember.admin.domain.system.BatchJob;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BatchJobRepository extends JpaRepository<BatchJob, Long> {
}
