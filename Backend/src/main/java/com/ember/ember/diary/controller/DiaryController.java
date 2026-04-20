package com.ember.ember.diary.controller;

import com.ember.ember.diary.dto.DiaryCreateRequest;
import com.ember.ember.diary.dto.DiaryCreateResponse;
import com.ember.ember.diary.service.DiaryService;
import com.ember.ember.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * 일기 API 컨트롤러.
 *
 * TODO: 인증 처리 구현 시 @AuthenticationPrincipal 또는 JWT 필터에서 userId 추출.
 *   현재는 Path Variable 또는 쿼리 파라미터로 임시 처리.
 *   M2에서는 실제 인증 연동 없이 컴파일 가능한 구조만 구현.
 */
@RestController
@RequestMapping("/api/diaries")
@RequiredArgsConstructor
public class DiaryController {

    private final DiaryService diaryService;

    /**
     * 일기 생성 API.
     * POST /api/diaries
     *
     * @param userId 인증된 사용자 PK (TODO: JWT 인증 연동 후 @AuthenticationPrincipal로 교체)
     * @param req    일기 생성 요청 (content 최소 100자, 최대 5000자)
     * @return 201 Created + 생성된 일기 정보
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<DiaryCreateResponse> createDiary(
            @RequestParam Long userId,
            @Valid @RequestBody DiaryCreateRequest req
    ) {
        DiaryCreateResponse response = diaryService.createDiary(userId, req);
        return ApiResponse.success(response);
    }
}
