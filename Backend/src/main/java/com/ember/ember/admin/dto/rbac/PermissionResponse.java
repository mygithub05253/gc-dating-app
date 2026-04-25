package com.ember.ember.admin.dto.rbac;

import com.ember.ember.admin.domain.rbac.Permission;

public record PermissionResponse(
        Long id,
        String permissionKey,
        String description
) {
    public static PermissionResponse from(Permission permission) {
        return new PermissionResponse(
                permission.getId(),
                permission.getPermissionKey(),
                permission.getDescription()
        );
    }
}
