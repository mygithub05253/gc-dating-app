package com.ember.ember.admin.repository.system;

import com.ember.ember.admin.domain.system.FeatureFlag;
import com.ember.ember.admin.domain.system.FeatureFlag.FlagCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FeatureFlagRepository extends JpaRepository<FeatureFlag, Long> {

    Optional<FeatureFlag> findByFlagKey(String flagKey);

    List<FeatureFlag> findByCategory(FlagCategory category);
}
