package com.ember.ember.admin.dto.rbac;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record UpdateRolePermissionsRequest(
        @NotNull List<Long> permissions
) {
}
