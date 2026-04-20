package com.ember.ember.user.service;

import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.idealtype.domain.UserIdealKeyword;
import com.ember.ember.idealtype.repository.UserIdealKeywordRepository;
import com.ember.ember.user.domain.FcmToken;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.dto.*;
import com.ember.ember.user.repository.FcmTokenRepository;
import com.ember.ember.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final UserIdealKeywordRepository userIdealKeywordRepository;
    private final FcmTokenRepository fcmTokenRepository;

    private static final String[] ADJECTIVES = {
            "용감한", "잔잔한", "따뜻한", "빛나는", "포근한",
            "설레는", "고요한", "맑은", "반짝이는", "선명한",
            "깊은", "부드러운", "영롱한", "감성적인", "단단한",
            "아늑한", "투명한", "은은한", "청량한", "달콤한",
            "소소한", "신비로운", "찬란한", "유쾌한", "차분한",
            "솔직한", "자유로운", "따사로운", "낭만적인", "귀여운",
            "활기찬", "정겨운", "순수한", "꿈꾸는", "멋진",
            "재미있는", "진지한", "사랑스런", "느긋한", "씩씩한",
            "미소짓는", "건강한", "즐거운", "성실한", "행복한",
            "기분좋은", "희망찬", "여유로운", "열정적인", "다정한"
    };

    private static final String[] NOUNS = {
            "별빛", "바람", "구름", "햇살", "달빛",
            "이슬", "파도", "나무", "꽃잎", "여우",
            "고양이", "나비", "별똥별", "무지개", "새벽",
            "봄날", "노을", "눈꽃", "소나기", "물결",
            "하늘", "산호", "진주", "토끼", "참새",
            "다람쥐", "코알라", "돌고래", "판다", "수달",
            "기린", "펭귄", "올빼미", "사슴", "호랑이",
            "제비꽃", "해바라기", "민들레", "라벤더", "장미",
            "은하수", "오로라", "마카롱", "카푸치노", "솜사탕",
            "비누방울", "종이배", "풍선", "도토리", "단풍잎"
    };

    /** 랜덤 닉네임 생성 */
    public NicknameGenerateResponse generateNickname() {
        for (int i = 0; i < 10; i++) {
            String adjective = ADJECTIVES[ThreadLocalRandom.current().nextInt(ADJECTIVES.length)];
            String noun = NOUNS[ThreadLocalRandom.current().nextInt(NOUNS.length)];
            String candidate = adjective + noun;

            if (!userRepository.existsByNickname(candidate)) {
                return new NicknameGenerateResponse(candidate);
            }
        }

        // 10회 모두 중복 시 suffix 추가
        String adjective = ADJECTIVES[ThreadLocalRandom.current().nextInt(ADJECTIVES.length)];
        String noun = NOUNS[ThreadLocalRandom.current().nextInt(NOUNS.length)];
        String candidate = adjective + noun + ThreadLocalRandom.current().nextInt(100, 999);
        return new NicknameGenerateResponse(candidate);
    }

    /** 프로필 등록 (온보딩 1단계) */
    @Transactional
    public ProfileResponse createProfile(Long userId, ProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        // 이미 프로필 등록 완료된 경우 차단
        if (user.getOnboardingStep() >= 1) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE);
        }

        // 닉네임 중복 검증
        if (userRepository.existsByNickname(request.nickname())) {
            // 본인 닉네임인 경우는 허용
            if (!request.nickname().equals(user.getNickname())) {
                throw new BusinessException(ErrorCode.NICKNAME_DUPLICATE);
            }
        }

        // 만 18세 이상 검증
        LocalDate birthDate = LocalDate.parse(request.birthDate());
        if (Period.between(birthDate, LocalDate.now()).getYears() < 18) {
            throw new BusinessException(ErrorCode.UNDERAGE_USER);
        }

        User.Gender gender = User.Gender.valueOf(request.gender().toUpperCase());

        user.completeProfile(
                request.realName(), request.nickname(), birthDate,
                gender, request.sido(), request.sigungu(), request.school()
        );

        log.info("프로필 등록 완료: userId={}", userId);
        return new ProfileResponse(user.getId(), user.getNickname());
    }

    /** 내 프로필 조회 */
    public UserMeResponse getMyProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        List<UserIdealKeyword> idealKeywords = userIdealKeywordRepository.findByUserIdWithKeyword(userId);

        return UserMeResponse.from(user, idealKeywords);
    }

    /** 프로필 부분 수정 */
    @Transactional
    public void updateProfile(Long userId, ProfileUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        // 닉네임 변경 시 30일 제한 체크
        if (request.nickname() != null && !request.nickname().equals(user.getNickname())) {
            if (user.getLastNicknameChangedAt() != null
                    && user.getLastNicknameChangedAt().plusDays(30).isAfter(LocalDateTime.now())) {
                throw new BusinessException(ErrorCode.NICKNAME_CHANGE_COOLDOWN);
            }
            if (userRepository.existsByNickname(request.nickname())) {
                throw new BusinessException(ErrorCode.NICKNAME_DUPLICATE);
            }
        }

        user.updateProfile(request.nickname(), request.sido(), request.sigungu(), request.school());
        log.info("프로필 수정 완료: userId={}", userId);
    }

    /** FCM 토큰 등록/갱신 */
    @Transactional
    public void registerFcmToken(Long userId, FcmTokenRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        FcmToken.DeviceType deviceType = FcmToken.DeviceType.valueOf(request.deviceType().toUpperCase());

        // 기존 토큰이 있으면 갱신, 없으면 새로 생성
        var existing = fcmTokenRepository.findByUserIdAndDeviceType(userId, deviceType);
        if (existing.isPresent()) {
            existing.get().updateToken(request.fcmToken());
        } else {
            // 다른 유저가 동일 토큰을 가지고 있으면 삭제 (디바이스 변경)
            fcmTokenRepository.findByFcmToken(request.fcmToken())
                    .ifPresent(fcmTokenRepository::delete);

            fcmTokenRepository.save(FcmToken.builder()
                    .user(user)
                    .fcmToken(request.fcmToken())
                    .deviceType(deviceType)
                    .build());
        }

        log.info("FCM 토큰 등록: userId={}, deviceType={}", userId, deviceType);
    }
}
