package com.ember.ember.notification.controller;

import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.notification.domain.TutorialPage;
import com.ember.ember.notification.dto.TutorialCompleteResponse;
import com.ember.ember.notification.dto.TutorialPageResponse;
import com.ember.ember.notification.repository.TutorialPageRepository;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Tutorial", description = "온보딩 튜토리얼 API")
public class TutorialController {

    private final TutorialPageRepository tutorialPageRepository;
    private final UserRepository userRepository;

    /** 튜토리얼 페이지 목록 조회 */
    @GetMapping("/api/tutorials/pages")
    @Operation(summary = "튜토리얼 페이지 목록 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<List<TutorialPageResponse>>> getTutorialPages() {
        List<TutorialPage> pages = tutorialPageRepository.findByIsActiveTrueOrderByPageOrder();
        List<TutorialPageResponse> responses = pages.stream()
                .map(TutorialPageResponse::from)
                .toList();
        return ResponseEntity.status(HttpStatus.OK).body(ApiResponse.success(responses));
    }

    /** 튜토리얼 완료 처리 */
    @PostMapping("/api/users/tutorial/complete")
    @Operation(summary = "튜토리얼 완료 처리", security = @SecurityRequirement(name = "bearerAuth"))
    @Transactional
    public ResponseEntity<ApiResponse<TutorialCompleteResponse>> completeTutorial(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        User user = userRepository.findById(userDetails.getUserId())
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        LocalDateTime completedAt = LocalDateTime.now();
        user.completeTutorial(completedAt);

        log.info("튜토리얼 완료: userId={}", userDetails.getUserId());
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(new TutorialCompleteResponse(true, completedAt)));
    }
}
