package com.ember.ember.auth.service;

import com.ember.ember.auth.dto.*;
import com.ember.ember.diary.domain.UserActivityEvent;
import com.ember.ember.diary.repository.UserActivityEventRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.global.security.jwt.JwtProperties;
import com.ember.ember.global.security.jwt.JwtTokenProvider;
import com.ember.ember.global.security.oauth2.OAuthProvider;
import com.ember.ember.global.security.oauth2.OAuthUserInfo;
import com.ember.ember.user.domain.SocialAccount;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.repository.SocialAccountRepository;
import com.ember.ember.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional(readOnly = true)
public class AuthService {

    private final UserRepository userRepository;
    private final SocialAccountRepository socialAccountRepository;
    private final UserActivityEventRepository activityEventRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;
    private final TokenService tokenService;
    private final Map<String, OAuthProvider> oauthProviders;

    /** OAuthProvider를 providerName 기반 Map으로 주입 */
    public AuthService(UserRepository userRepository,
                       SocialAccountRepository socialAccountRepository,
                       UserActivityEventRepository activityEventRepository,
                       JwtTokenProvider jwtTokenProvider,
                       JwtProperties jwtProperties,
                       TokenService tokenService,
                       List<OAuthProvider> providers) {
        this.userRepository = userRepository;
        this.socialAccountRepository = socialAccountRepository;
        this.activityEventRepository = activityEventRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.jwtProperties = jwtProperties;
        this.tokenService = tokenService;
        this.oauthProviders = providers.stream()
                .collect(Collectors.toMap(OAuthProvider::getProviderName, Function.identity()));
    }

    /** 소셜 로그인/회원가입 */
    @Transactional
    public SocialLoginResponse socialLogin(SocialLoginRequest request) {
        // 1. provider 검증 및 소셜 사용자 정보 조회
        OAuthProvider provider = oauthProviders.get(request.provider().toUpperCase());
        if (provider == null) {
            throw new BusinessException(ErrorCode.UNSUPPORTED_PROVIDER);
        }

        OAuthUserInfo userInfo = provider.getUserInfo(request.socialToken());
        SocialAccount.Provider socialProvider = SocialAccount.Provider.valueOf(request.provider().toUpperCase());

        // 2. 기존 사용자 조회
        var existingAccount = socialAccountRepository.findByProviderAndProviderId(
                socialProvider, userInfo.getProviderId());

        if (existingAccount.isPresent()) {
            return handleExistingUser(existingAccount.get().getUser());
        }

        // 3. 신규 사용자 생성
        return handleNewUser(socialProvider, userInfo, request.email());
    }

    /** 토큰 갱신 (Refresh Token Rotation) */
    @Transactional
    public TokenResponse refreshToken(RefreshRequest request) {
        // 1. RT 유효성 검증
        if (!jwtTokenProvider.validateToken(request.refreshToken())) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_MISMATCH);
        }

        Long userId = jwtTokenProvider.getUserIdFromToken(request.refreshToken());

        // 2. Redis RT와 비교
        String savedRt = tokenService.getRefreshToken(userId);
        if (savedRt == null || !savedRt.equals(request.refreshToken())) {
            // 탈취 의심 → 모든 세션 무효화
            tokenService.deleteRefreshToken(userId);
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_MISMATCH);
        }

        // 3. 새 토큰 발급
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        String newAccessToken = jwtTokenProvider.createAccessToken(userId, user.getRole().name());
        String newRefreshToken = jwtTokenProvider.createRefreshToken(userId);

        tokenService.saveRefreshToken(userId, newRefreshToken, jwtProperties.getRefreshExpiration());

        return new TokenResponse(newAccessToken, newRefreshToken);
    }

    /** 로그아웃 */
    @Transactional
    public void logout(Long userId, String accessToken) {
        // 1. AT 블랙리스트 등록
        long remainingExpiration = jwtTokenProvider.getRemainingExpiration(accessToken);
        tokenService.addToBlacklist(accessToken, remainingExpiration);

        // 2. RT 삭제
        tokenService.deleteRefreshToken(userId);

        // 3. 활동 로그
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));
        activityEventRepository.save(UserActivityEvent.builder()
                .user(user).eventType("LOGOUT").targetType("USER").targetId(userId).build());

        log.info("로그아웃 완료: userId={}", userId);
    }

    /** 탈퇴 유예 계정 복구 */
    @Transactional
    public RestoreResponse restoreAccount(RestoreRequest request) {
        // 모든 유저를 순회하여 restoreToken 매칭 (Redis RESTORE:{userId} 에서 찾기)
        // restoreToken에서 userId 추출 불가하므로, 토큰 형식에 userId를 포함
        // 형식: {userId}:{uuid}
        String[] parts = request.restoreToken().split(":", 2);
        if (parts.length != 2) {
            throw new BusinessException(ErrorCode.RESTORE_TOKEN_INVALID);
        }

        Long userId;
        try {
            userId = Long.parseLong(parts[0]);
        } catch (NumberFormatException e) {
            throw new BusinessException(ErrorCode.RESTORE_TOKEN_INVALID);
        }

        String savedToken = tokenService.getRestoreToken(userId);
        if (savedToken == null || !savedToken.equals(request.restoreToken())) {
            throw new BusinessException(ErrorCode.RESTORE_TOKEN_INVALID);
        }

        // User 상태 검증 — SQLRestriction 때문에 DEACTIVATED는 조회 안 됨, nativeQuery 사용
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            // 소프트 딜리트 된 유저는 일반 조회 불가 → 복구 기간 만료로 처리
            throw new BusinessException(ErrorCode.RESTORE_PERIOD_EXPIRED);
        }

        if (user.getStatus() != User.UserStatus.DEACTIVATED) {
            throw new BusinessException(ErrorCode.RESTORE_PERIOD_EXPIRED);
        }

        if (user.getPermanentDeleteAt() != null && user.getPermanentDeleteAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.RESTORE_PERIOD_EXPIRED);
        }

        // 계정 복구
        user.restore();
        tokenService.deleteRestoreToken(userId);

        String accessToken = jwtTokenProvider.createAccessToken(userId, user.getRole().name());
        String refreshToken = jwtTokenProvider.createRefreshToken(userId);
        tokenService.saveRefreshToken(userId, refreshToken, jwtProperties.getRefreshExpiration());

        // 활동 로그
        activityEventRepository.save(UserActivityEvent.builder()
                .user(user).eventType("ACCOUNT_RESTORE").targetType("USER").targetId(userId).build());

        log.info("계정 복구 완료: userId={}", userId);
        return new RestoreResponse(accessToken, refreshToken, userId);
    }

    // ── Private 메서드 ──

    /** 기존 사용자 로그인 처리 */
    private SocialLoginResponse handleExistingUser(User user) {
        // DEACTIVATED 상태 (탈퇴 유예 중)
        if (user.getStatus() == User.UserStatus.DEACTIVATED) {
            String restoreToken = user.getId() + ":" + UUID.randomUUID();
            tokenService.saveRestoreToken(user.getId(), restoreToken);
            return SocialLoginResponse.of(user, null, null, false, restoreToken);
        }

        // 정지/밴 상태 확인
        if (user.getStatus() == User.UserStatus.SUSPEND_7D
                || user.getStatus() == User.UserStatus.SUSPEND_30D
                || user.getStatus() == User.UserStatus.BANNED) {
            throw new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND);
        }

        // 정상 로그인
        user.updateLastLoginAt();
        String accessToken = jwtTokenProvider.createAccessToken(user.getId(), user.getRole().name());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());
        tokenService.saveRefreshToken(user.getId(), refreshToken, jwtProperties.getRefreshExpiration());

        // 활동 로그
        activityEventRepository.save(UserActivityEvent.builder()
                .user(user).eventType("LOGIN").targetType("USER").targetId(user.getId())
                .detail("{\"isNewUser\":false}").build());

        return SocialLoginResponse.of(user, accessToken, refreshToken, false, null);
    }

    /** 신규 사용자 생성 */
    private SocialLoginResponse handleNewUser(SocialAccount.Provider socialProvider,
                                               OAuthUserInfo userInfo, String email) {
        User user = User.builder()
                .email(email != null ? email : userInfo.getEmail())
                .status(User.UserStatus.ACTIVE)
                .role(User.UserRole.ROLE_GUEST)
                .build();
        userRepository.save(user);

        SocialAccount socialAccount = SocialAccount.builder()
                .user(user)
                .provider(socialProvider)
                .providerId(userInfo.getProviderId())
                .build();
        socialAccountRepository.save(socialAccount);

        user.updateLastLoginAt();

        String accessToken = jwtTokenProvider.createAccessToken(user.getId(), user.getRole().name());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());
        tokenService.saveRefreshToken(user.getId(), refreshToken, jwtProperties.getRefreshExpiration());

        // 활동 로그
        activityEventRepository.save(UserActivityEvent.builder()
                .user(user).eventType("LOGIN").targetType("USER").targetId(user.getId())
                .detail("{\"isNewUser\":true,\"provider\":\"" + socialProvider.name() + "\"}").build());

        log.info("신규 사용자 가입: userId={}, provider={}", user.getId(), socialProvider);
        return SocialLoginResponse.of(user, accessToken, refreshToken, true, null);
    }
}
