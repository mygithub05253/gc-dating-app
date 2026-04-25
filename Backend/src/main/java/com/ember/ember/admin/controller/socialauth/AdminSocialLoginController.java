package com.ember.ember.admin.controller.socialauth;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.domain.socialauth.SocialLoginErrorLog;
import com.ember.ember.admin.dto.socialauth.SocialLoginErrorDto.ErrorHistoryResponse;
import com.ember.ember.admin.dto.socialauth.SocialLoginErrorDto.ErrorStatsResponse;
import com.ember.ember.admin.service.socialauth.SocialLoginErrorService;
import com.ember.ember.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

/**
 * 소셜 로그인 연동 이슈 관리 API — 명세 v2.3 §7.6 Step 6.
 *
 * <p>엔드포인트 2종</p>
 * <ul>
 *   <li>GET /api/admin/social-login/error-stats?period=1h — 실시간 오류 통계 (ADMIN+)</li>
 *   <li>GET /api/admin/social-login/error-history?provider=KAKAO&period=24h — 오류 이력 (ADMIN+)</li>
 * </ul>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/social-login")
@Tag(name = "Admin Social Login", description = "소셜 로그인 연동 이슈 관리 (명세 v2.3 §7.6)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminSocialLoginController {

    private final SocialLoginErrorService errorService;

    @GetMapping("/error-stats")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "소셜 로그인 실시간 오류 통계",
            description = "지정 기간(1h/24h/7d 등) 내 KAKAO 오류 카운트, 영향 사용자 수, 오류 유형/해결 상태 분포를 반환한다. " +
                          "errorRate/severity는 분모 카운터가 도입된 이후 채워진다.")
    public ResponseEntity<ApiResponse<ErrorStatsResponse>> getStats(
            @RequestParam(defaultValue = "1h") String period) {
        return ResponseEntity.ok(ApiResponse.success(errorService.getStats(period)));
    }

    @GetMapping("/error-history")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @Operation(summary = "소셜 로그인 오류 이력 조회",
            description = "기간/제공자/오류유형으로 필터링하여 페이지네이션 응답.")
    public ResponseEntity<ApiResponse<ErrorHistoryResponse>> getHistory(
            @RequestParam(required = false, defaultValue = "KAKAO") String provider,
            @RequestParam(required = false) SocialLoginErrorLog.ErrorType errorType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                errorService.getHistory(provider, errorType, startDate, endDate, page, size)));
    }
}
