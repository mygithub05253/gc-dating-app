package com.ember.ember.diary.repository;

import com.ember.ember.diary.domain.DiaryEditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiaryEditLogRepository extends JpaRepository<DiaryEditLog, Long> {
}
