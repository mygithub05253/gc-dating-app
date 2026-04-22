package com.ember.ember.admin.repository;

import com.ember.ember.admin.domain.AdminAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AdminAccountRepository extends JpaRepository<AdminAccount, Long> {

    /** 이메일로 미삭제 관리자 계정 조회 */
    Optional<AdminAccount> findByEmailAndDeletedAtIsNull(String email);
}
