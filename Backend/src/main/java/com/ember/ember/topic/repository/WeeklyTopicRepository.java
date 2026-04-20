package com.ember.ember.topic.repository;

import com.ember.ember.topic.domain.WeeklyTopic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface WeeklyTopicRepository extends JpaRepository<WeeklyTopic, Long> {

    /** 특정 주 시작일의 주제 조회 */
    Optional<WeeklyTopic> findByWeekStartDateAndIsActiveTrue(LocalDate weekStartDate);
}
