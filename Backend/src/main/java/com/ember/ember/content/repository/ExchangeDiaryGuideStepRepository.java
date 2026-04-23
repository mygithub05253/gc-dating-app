package com.ember.ember.content.repository;

import com.ember.ember.content.domain.ExchangeDiaryGuideStep;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExchangeDiaryGuideStepRepository extends JpaRepository<ExchangeDiaryGuideStep, Long> {
    List<ExchangeDiaryGuideStep> findAllByOrderByStepOrderAsc();
}
