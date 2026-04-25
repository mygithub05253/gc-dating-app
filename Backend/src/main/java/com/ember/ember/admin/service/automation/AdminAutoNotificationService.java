package com.ember.ember.admin.service.automation;

import com.ember.ember.admin.domain.automation.AutoNotificationRule;
import com.ember.ember.admin.dto.automation.AutoNotificationRuleCreateRequest;
import com.ember.ember.admin.dto.automation.AutoNotificationRuleResponse;
import com.ember.ember.admin.repository.automation.AutoNotificationRuleRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminAutoNotificationService {

    private final AutoNotificationRuleRepository autoNotificationRuleRepository;

    /**
     * 자동 알림 규칙 목록 조회
     */
    public List<AutoNotificationRuleResponse> getRules() {
        return autoNotificationRuleRepository.findAll().stream()
                .map(AutoNotificationRuleResponse::from)
                .toList();
    }

    /**
     * 자동 알림 규칙 생성
     */
    @Transactional
    public AutoNotificationRuleResponse createRule(AutoNotificationRuleCreateRequest request) {
        AutoNotificationRule rule = AutoNotificationRule.create(
                request.name(),
                request.description(),
                request.triggerCondition(),
                request.notificationChannel(),
                request.templateContent()
        );
        autoNotificationRuleRepository.save(rule);
        return AutoNotificationRuleResponse.from(rule);
    }

    /**
     * 자동 알림 규칙 활성/비활성 토글
     */
    @Transactional
    public AutoNotificationRuleResponse toggleRule(Long ruleId) {
        AutoNotificationRule rule = autoNotificationRuleRepository.findById(ruleId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_AUTO_RULE_NOT_FOUND));
        rule.toggle();
        return AutoNotificationRuleResponse.from(rule);
    }
}
