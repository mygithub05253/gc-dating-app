package com.ember.ember.notification.repository;

import com.ember.ember.notification.domain.Faq;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * FAQ Repository
 */
public interface FaqRepository extends JpaRepository<Faq, Long> {

    /** 활성화된 FAQ 목록 (정렬순) */
    List<Faq> findByIsActiveTrueAndDeletedAtIsNullOrderBySortOrder();
}
