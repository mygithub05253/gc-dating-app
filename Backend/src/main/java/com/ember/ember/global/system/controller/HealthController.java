package com.ember.ember.global.system.controller;

import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.system.dto.HealthResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "헬스체크", description = "서버 상태 확인 API")
@RestController
@RequiredArgsConstructor
public class HealthController {

    private final Environment environment;

    /** Backend 서버 상태 확인 */
    @Operation(summary = "서버 헬스체크")
    @GetMapping("/api/health")
    public ResponseEntity<ApiResponse<HealthResponse>> health() {
        String[] profiles = environment.getActiveProfiles();
        String activeProfile = profiles.length > 0 ? profiles[0] : "default";

        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(HealthResponse.of(activeProfile)));
    }
}
