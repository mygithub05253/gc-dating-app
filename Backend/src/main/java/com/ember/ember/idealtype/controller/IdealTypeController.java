package com.ember.ember.idealtype.controller;

import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.idealtype.dto.IdealTypeRequest;
import com.ember.ember.idealtype.dto.IdealTypeResponse;
import com.ember.ember.idealtype.dto.KeywordListResponse;
import com.ember.ember.idealtype.service.IdealTypeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":{"keywords":[{"id":1,"label":"안정적인 사람","category":"RELATIONSHIP"},{"id":2,"label":"긍정적인 사람","category":"EMOTION"}]}}
                """)))
    })
    public ResponseEntity<ApiResponse<KeywordListResponse>> getKeywordList(
            @RequestParam(required = false) String category) {
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(idealTypeService.getKeywordList(category)));
    }

    /** 이상형 키워드 설정 (온보딩 2단계) */
    @PostMapping("/api/users/ideal-type/keywords")
    @Operation(summary = "이상형 키워드 설정 (최대 3개)", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "성공",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"200","message":"OK","data":null}
                """))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "키워드 초과",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
                {"code":"U004","message":"이상형 키워드는 최대 3개까지 설정할 수 있습니다.","data":null}
                """)))
    })
    public ResponseEntity<ApiResponse<IdealTypeResponse>> saveIdealKeywords(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody IdealTypeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(idealTypeService.saveIdealKeywords(userDetails.getUserId(), request)));
    }
}
