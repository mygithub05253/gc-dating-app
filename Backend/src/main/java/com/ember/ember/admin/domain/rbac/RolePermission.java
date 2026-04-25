package com.ember.ember.admin.domain.rbac;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "role_permissions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"role", "permission_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RolePermission extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private AdminAccount.AdminRole role;

    @Column(name = "permission_id", nullable = false)
    private Long permissionId;

    public static RolePermission create(AdminAccount.AdminRole role, Long permissionId) {
        RolePermission rp = new RolePermission();
        rp.role = role;
        rp.permissionId = permissionId;
        return rp;
    }
}
