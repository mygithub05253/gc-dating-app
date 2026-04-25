package com.ember.ember.admin.repository.rbac;

import com.ember.ember.admin.domain.rbac.Permission;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermissionRepository extends JpaRepository<Permission, Long> {
}
