package com.ember.ember.admin.domain.rbac;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "permissions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Permission extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "permission_key", nullable = false, unique = true, length = 100)
    private String permissionKey;

    @Column(length = 255)
    private String description;

    public static Permission create(String permissionKey, String description) {
        Permission permission = new Permission();
        permission.permissionKey = permissionKey;
        permission.description = description;
        return permission;
    }
}
