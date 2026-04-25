package com.ember.ember.admin.controller.rbac;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.annotation.SuperAdminOnly;
import com.ember.ember.admin.dto.rbac.PermissionResponse;
import com.ember.ember.admin.dto.rbac.RolePermissionsResponse;
import com.ember.ember.admin.dto.rbac.UpdateRolePermissionsRequest;
import com.ember.ember.admin.service.rbac.AdminRbacService;
import com.ember.ember.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 관리자 RBAC API — 권한 목록, 역할별 권한 조회/수정.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/rbac")
@SuperAdminOnly
@Tag(name = "관리자 RBAC")
@SecurityRequirement(name = "bearerAuth")
public class AdminRbacController {

    private final AdminRbacService adminRbacService;

    @GetMapping("/permissions")
    @Operation(summary = "전체 권한 목록 조회")
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getPermissions() {
        return ResponseEntity.ok(ApiResponse.success(adminRbacService.getAllPermissions()));
    }

    @GetMapping("/roles")
    @Operation(summary = "역할별 권한 목록 조회")
    public ResponseEntity<ApiResponse<List<RolePermissionsResponse>>> getRolePermissions() {
        return ResponseEntity.ok(ApiResponse.success(adminRbacService.getAllRolePermissions()));
    }

    @PutMapping("/roles/{role}")
    @Operation(summary = "역할 권한 수정")
    @AdminAction(action = "RBAC_UPDATE", targetType = "ROLE", targetIdParam = "role")
    public ResponseEntity<ApiResponse<RolePermissionsResponse>> updateRolePermissions(
            @PathVariable String role,
            @RequestBody @Valid UpdateRolePermissionsRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                adminRbacService.updateRolePermissions(role, request.permissions())));
    }
}
