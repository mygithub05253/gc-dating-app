package com.ember.ember.admin.repository.automation;

import com.ember.ember.admin.domain.automation.AutoNotificationRule;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AutoNotificationRuleRepository extends JpaRepository<AutoNotificationRule, Long> {
}
