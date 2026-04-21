package com.ember.ember.notification.repository;

import com.ember.ember.notification.domain.Inquiry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * 고객 문의 Repository
 */
public interface InquiryRepository extends JpaRepository<Inquiry, Long> {

    /** 내 문의 목록 (최신순) */
    List<Inquiry> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** 내 문의 상세 (소유권 검증) */
    Optional<Inquiry> findByIdAndUserId(Long id, Long userId);

    /** 진행 중인 문의 수 (OPEN + IN_PROGRESS) */
    long countByUserIdAndStatusIn(Long userId, List<Inquiry.InquiryStatus> statuses);
}
