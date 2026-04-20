package com.ember.ember.global.system.controller;

import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.system.domain.AppVersion;
import com.ember.ember.global.system.dto.AppVersionResponse;
import com.ember.ember.global.system.repository.AppVersionRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@Tag(name = "System", description = "시스템 API")
public class SystemController {

    private final AppVersionRepository appVersionRepository;

    /** 앱 버전 확인 (강제/권장 업데이트 체크) */
    @GetMapping("/api/system/version")
    @Operation(summary = "앱 버전 확인")
    public ResponseEntity<ApiResponse<AppVersionResponse>> checkVersion(
            @RequestParam(defaultValue = "AOS") String platform,
            @RequestParam(required = false) String currentVersion) {

        AppVersion appVersion = appVersionRepository.findByPlatform(platform.toUpperCase())
                .orElse(null);

        if (appVersion == null) {
            // 버전 정보 없으면 업데이트 불필요
            return ResponseEntity.status(HttpStatus.OK)
                    .body(ApiResponse.success(new AppVersionResponse("NONE", "1.0.0", null)));
        }

        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(AppVersionResponse.from(appVersion, currentVersion)));
    }
}
