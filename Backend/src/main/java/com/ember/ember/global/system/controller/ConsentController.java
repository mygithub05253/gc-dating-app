package com.ember.ember.global.system.controller;

import com.ember.ember.consent.service.AiConsentService;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.global.system.domain.AiConsentLog;
import com.ember.ember.global.system.dto.ConsentRequest;
import com.ember.ember.consent.repository.AiConsentLogRepository;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Consent", description = "약관 동의 API")
public class ConsentController {

    private final AiConsentLogRepository aiConsentLogRepository;
    private final UserRepository userRepository;
    private final AiConsentService aiConsentService;

    /** 약관/AI 분석 동의 등록 */
    @PostMapping("/api/consent")
    @Operation(summary = "약관 동의 등록", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> registerConsent(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ConsentRequest request,
            HttpServletRequest httpRequest) {

        User user = userRepository.findById(userDetails.getUserId())
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        String ipAddress = httpRequest.getRemoteAddr();

        aiConsentLogRepository.save(AiConsentLog.builder()
                .user(user)
                .action("GRANTED")
                .consentType(request.consentType())
                .ipAddress(ipAddress)
                .build());

        // 동의 캐시 무효화
        aiConsentService.invalidateConsent(userDetails.getUserId(), request.consentType());

        log.info("동의 등록: userId={}, type={}", userDetails.getUserId(), request.consentType());
        return ResponseEntity.status(HttpStatus.OK).body(ApiResponse.success());
    }
}
