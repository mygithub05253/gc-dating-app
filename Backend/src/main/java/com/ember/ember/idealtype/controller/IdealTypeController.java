package com.ember.ember.idealtype.controller;

import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.idealtype.dto.IdealTypeRequest;
import com.ember.ember.idealtype.dto.IdealTypeResponse;
import com.ember.ember.idealtype.dto.KeywordListResponse;
import com.ember.ember.idealtype.service.IdealTypeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Tag(name = "IdealType", description = "이상형 키워드 API")
public class IdealTypeController {

    private final IdealTypeService idealTypeService;

    /** 이상형 키워드 목록 조회 */
    @GetMapping("/api/users/ideal-type/keyword-list")
    @Operation(summary = "이상형 키워드 목록 조회 (공개 API)")
    public ResponseEntity<ApiResponse<KeywordListResponse>> getKeywordList(
            @RequestParam(required = false) String category) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(idealTypeService.getKeywordList(category)));
    }

    /** 이상형 키워드 설정 (온보딩 2단계) */
    @PostMapping("/api/users/ideal-type/keywords")
    @Operation(summary = "이상형 키워드 설정 (최대 3개)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<IdealTypeResponse>> saveIdealKeywords(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody IdealTypeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(idealTypeService.saveIdealKeywords(userDetails.getUserId(), request)));
    }
}
