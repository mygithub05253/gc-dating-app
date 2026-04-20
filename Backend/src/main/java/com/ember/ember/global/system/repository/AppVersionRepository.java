package com.ember.ember.global.system.repository;

import com.ember.ember.global.system.domain.AppVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AppVersionRepository extends JpaRepository<AppVersion, Long> {

    Optional<AppVersion> findByPlatform(String platform);
}
