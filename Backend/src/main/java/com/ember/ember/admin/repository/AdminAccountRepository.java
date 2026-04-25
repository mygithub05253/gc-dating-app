package com.ember.ember.admin.repository;

import com.ember.ember.admin.domain.AdminAccount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AdminAccountRepository extends JpaRepository<AdminAccount, Long> {

    /** 이메일로 미삭제 관리자 계정 조회 */
    Optional<AdminAccount> findByEmailAndDeletedAtIsNull(String email);

    /** ID로 미삭제 관리자 계정 조회 — 관리자 API §13.2/5/6 */
    Optional<AdminAccount> findByIdAndDeletedAtIsNull(Long id);

    /** 이메일 존재 여부 (삭제되지 않은 계정 기준) — 관리자 API §13.4 */
    boolean existsByEmailAndDeletedAtIsNull(String email);

    /**
     * 역할+상태로 COUNT — 관리자 API §13.7 (SUPER_ADMIN 활성 개수).
     */
    long countByRoleAndStatus(AdminAccount.AdminRole role, AdminAccount.AdminStatus status);

    /**
     * 관리자 API §13.1 — 페이징 + 검색(email/name) + 역할/상태 필터.
     * DELETED 상태는 기본적으로 제외. 파라미터가 null 이면 해당 조건을 생략한다.
     */
    @Query("""
            SELECT a
              FROM AdminAccount a
             WHERE a.status <> com.ember.ember.admin.domain.AdminAccount$AdminStatus.DELETED
               AND (:search IS NULL OR LOWER(a.email) LIKE LOWER(CONCAT('%', :search, '%'))
                                    OR LOWER(a.name)  LIKE LOWER(CONCAT('%', :search, '%')))
               AND (:role IS NULL OR a.role = :role)
               AND (:status IS NULL OR a.status = :status)
            """)
    Page<AdminAccount> searchAdmins(@Param("search") String search,
                                    @Param("role") AdminAccount.AdminRole role,
                                    @Param("status") AdminAccount.AdminStatus status,
                                    Pageable pageable);

    /** ACTIVE SUPER_ADMIN 목록 — Phase 1B-3 에스컬레이션 알림 자동 할당 대상. */
    List<AdminAccount> findAllByRoleAndStatus(AdminAccount.AdminRole role,
                                              AdminAccount.AdminStatus status);
}
