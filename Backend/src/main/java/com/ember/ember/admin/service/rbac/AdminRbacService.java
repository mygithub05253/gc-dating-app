package com.ember.ember.admin.service.rbac;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.admin.domain.rbac.Permission;
import com.ember.ember.admin.domain.rbac.RolePermission;
import com.ember.ember.admin.dto.rbac.PermissionResponse;
import com.ember.ember.admin.dto.rbac.RolePermissionsResponse;
import com.ember.ember.admin.repository.rbac.PermissionRepository;
import com.ember.ember.admin.repository.rbac.RolePermissionRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminRbacService {

    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final StringRedisTemplate redisTemplate;

    /**
     * 전체 권한 목록 조회
     */
    public List<PermissionResponse> getAllPermissions() {
        return permissionRepository.findAll().stream()
                .map(PermissionResponse::from)
                .toList();
    }

    /**
     * 모든 역할별 권한 목록 조회
     */
    public List<RolePermissionsResponse> getAllRolePermissions() {
        Map<Long, Permission> permissionMap = permissionRepository.findAll().stream()
                .collect(Collectors.toMap(Permission::getId, p -> p));

        List<RolePermissionsResponse> result = new ArrayList<>();
        for (AdminAccount.AdminRole role : AdminAccount.AdminRole.values()) {
            List<RolePermission> rolePerms = rolePermissionRepository.findByRole(role);
            List<PermissionResponse> permissions = rolePerms.stream()
                    .map(rp -> permissionMap.get(rp.getPermissionId()))
                    .filter(Objects::nonNull)
                    .map(PermissionResponse::from)
                    .toList();
            result.add(new RolePermissionsResponse(role.name(), permissions));
        }
        return result;
    }

    /**
     * 특정 역할의 권한 갱신 (DELETE-then-INSERT)
     */
    @Transactional
    public RolePermissionsResponse updateRolePermissions(String roleName, List<Long> permissionIds) {
        AdminAccount.AdminRole role = AdminAccount.AdminRole.valueOf(roleName.toUpperCase());

        // SUPER_ADMIN 필수 권한 검증
        if (role == AdminAccount.AdminRole.SUPER_ADMIN) {
            validateSuperAdminRequiredPermissions(permissionIds);
        }

        // 유효한 permissionId인지 확인
        List<Permission> validPermissions = permissionRepository.findAllById(permissionIds);
        Set<Long> validIds = validPermissions.stream()
                .map(Permission::getId)
                .collect(Collectors.toSet());

        // 기존 권한 삭제 후 새 권한 삽입
        rolePermissionRepository.deleteByRole(role);
        rolePermissionRepository.flush();

        List<RolePermission> newRolePermissions = validIds.stream()
                .map(permId -> RolePermission.create(role, permId))
                .toList();
        rolePermissionRepository.saveAll(newRolePermissions);

        // Redis 캐시 무효화
        redisTemplate.delete("role:" + role.name() + ":permissions");

        // 응답 생성
        Map<Long, Permission> permissionMap = validPermissions.stream()
                .collect(Collectors.toMap(Permission::getId, p -> p));
        List<PermissionResponse> permResponses = validIds.stream()
                .map(permissionMap::get)
                .filter(Objects::nonNull)
                .map(PermissionResponse::from)
                .toList();

        return new RolePermissionsResponse(role.name(), permResponses);
    }

    /**
     * SUPER_ADMIN 역할에서 필수 권한을 제거하려 하면 에러
     * (모든 기존 권한을 필수로 간주하진 않지만, 최소한 전체 권한을 보유해야 함)
     */
    private void validateSuperAdminRequiredPermissions(List<Long> newPermissionIds) {
        // SUPER_ADMIN의 현재 권한 목록 조회
        List<RolePermission> currentPerms = rolePermissionRepository.findByRole(AdminAccount.AdminRole.SUPER_ADMIN);
        Set<Long> currentPermIds = currentPerms.stream()
                .map(RolePermission::getPermissionId)
                .collect(Collectors.toSet());

        Set<Long> newPermIdSet = new HashSet<>(newPermissionIds);

        // 기존에 있던 권한 중 새 목록에 없는 게 있으면 차단
        for (Long existingId : currentPermIds) {
            if (!newPermIdSet.contains(existingId)) {
                throw new BusinessException(ErrorCode.ADM_RBAC_REQUIRED_PERMISSION);
            }
        }
    }
}
