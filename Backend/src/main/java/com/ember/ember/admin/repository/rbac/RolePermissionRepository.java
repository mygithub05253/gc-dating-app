package com.ember.ember.admin.repository.rbac;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.admin.domain.rbac.RolePermission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RolePermissionRepository extends JpaRepository<RolePermission, Long> {

    List<RolePermission> findByRole(AdminAccount.AdminRole role);

    void deleteByRole(AdminAccount.AdminRole role);
}
