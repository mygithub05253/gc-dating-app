package com.ember.ember.admin.repository.automation;

import com.ember.ember.admin.domain.automation.AutoSanctionRule;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AutoSanctionRuleRepository extends JpaRepository<AutoSanctionRule, Long> {
}
