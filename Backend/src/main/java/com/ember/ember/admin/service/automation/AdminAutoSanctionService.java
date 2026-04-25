package com.ember.ember.admin.service.automation;

import com.ember.ember.admin.domain.automation.AutoSanctionRule;
import com.ember.ember.admin.dto.automation.AutoSanctionRuleCreateRequest;
import com.ember.ember.admin.dto.automation.AutoSanctionRuleResponse;
import com.ember.ember.admin.repository.automation.AutoSanctionRuleRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminAutoSanctionService {

    private final AutoSanctionRuleRepository autoSanctionRuleRepository;

    /**
     * 자동 제재 규칙 목록 조회
     */
    public List<AutoSanctionRuleResponse> getRules() {
        return autoSanctionRuleRepository.findAll().stream()
                .map(AutoSanctionRuleResponse::from)
                .toList();
    }

    /**
     * 자동 제재 규칙 생성
     */
    @Transactional
    public AutoSanctionRuleResponse createRule(AutoSanctionRuleCreateRequest request) {
        AutoSanctionRule rule = AutoSanctionRule.create(
                request.name(),
                request.description(),
                request.conditionJson(),
                request.action()
        );
        autoSanctionRuleRepository.save(rule);
        return AutoSanctionRuleResponse.from(rule);
    }

    /**
     * 자동 제재 규칙 활성/비활성 토글
     */
    @Transactional
    public AutoSanctionRuleResponse toggleRule(Long ruleId) {
        AutoSanctionRule rule = autoSanctionRuleRepository.findById(ruleId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_AUTO_RULE_NOT_FOUND));
        rule.toggle();
        return AutoSanctionRuleResponse.from(rule);
    }
}
