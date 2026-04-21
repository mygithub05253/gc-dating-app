package com.ember.ember.report.repository;

import com.ember.ember.report.domain.Appeal;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 이의신청 Repository
 */
public interface AppealRepository extends JpaRepository<Appeal, Long> {

    /** 특정 제재건에 대해 PENDING 이의신청 존재 여부 */
    boolean existsBySanctionIdAndStatus(Long sanctionId, Appeal.AppealStatus status);
}
