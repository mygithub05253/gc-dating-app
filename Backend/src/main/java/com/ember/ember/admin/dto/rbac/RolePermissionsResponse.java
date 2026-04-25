package com.ember.ember.admin.dto.rbac;

import java.util.List;

public record RolePermissionsResponse(
        String role,
        List<PermissionResponse> permissions
) {
}
