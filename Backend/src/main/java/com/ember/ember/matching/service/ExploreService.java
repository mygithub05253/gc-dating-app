package com.ember.ember.matching.service;

import com.ember.ember.diary.domain.Diary;
import com.ember.ember.diary.domain.DiaryKeyword;
import com.ember.ember.diary.repository.DiaryKeywordRepository;
import com.ember.ember.diary.repository.DiaryRepository;
import com.ember.ember.exchange.domain.ExchangeRoom;
import com.ember.ember.exchange.repository.ExchangeRoomRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.notification.FcmService;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.matching.domain.Matching;
import com.ember.ember.matching.domain.MatchingPass;
import com.ember.ember.matching.dto.*;
import com.ember.ember.matching.repository.MatchingPassRepository;
import com.ember.ember.matching.repository.MatchingRepository;
import com.ember.ember.notification.domain.Notification;
import com.ember.ember.notification.repository.NotificationRepository;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.repository.UserRepository;
import com.ember.ember.matching.service.SimilarityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExploreService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final int EXPLORE_PAGE_SIZE = 10;
    private static final int MIN_DIARY_COUNT = 3;
    private static final int MAX_CONCURRENT_EXCHANGE = 3;
    private static final int SKIP_EXCLUDE_DAYS = 7;

    private final DiaryRepository diaryRepository;
    private final DiaryKeywordRepository diaryKeywordRepository;
    private final UserRepository userRepository;
    private final MatchingRepository matchingRepository;
    private final MatchingPassRepository matchingPassRepository;
    private final ExchangeRoomRepository exchangeRoomRepository;
    private final NotificationRepository notificationRepository;
    private final FcmService fcmService;
    private final SimilarityService similarityService;

    /**
     * 5.1 일기 탐색 (Pull 방식) — 커서 기반 페이징
     */
    public ExploreResponse explore(Long userId, Long cursor) {
        // 매칭 조건 체크: 누적 일기 3개 이상
        long diaryCount = diaryRepository.countByUserId(userId);
        if (diaryCount < MIN_DIARY_COUNT) {
            throw new BusinessException(ErrorCode.MATCHING_NO_DIARY);
        }

        // 제외 대상: 7일 이내 skip한 사용자
        List<Long> skippedUserIds = matchingPassRepository.findSkippedUserIdsSince(
                userId, LocalDateTime.now().minusDays(SKIP_EXCLUDE_DAYS));

        // 빈 리스트 방지 (JPA IN 절에 빈 리스트 방어)
        List<Long> excludeUserIds = skippedUserIds.isEmpty() ? List.of(0L) : skippedUserIds;

        List<Diary> diaries;
        if (cursor == null || cursor == 0) {
            diaries = diaryRepository.findExploreFirstPage(userId, excludeUserIds, PageRequest.of(0, EXPLORE_PAGE_SIZE + 1));
        } else {
            diaries = diaryRepository.findExploreWithCursor(userId, excludeUserIds, cursor, PageRequest.of(0, EXPLORE_PAGE_SIZE + 1));
        }

        boolean hasNext = diaries.size() > EXPLORE_PAGE_SIZE;
        if (hasNext) {
            diaries = diaries.subList(0, EXPLORE_PAGE_SIZE);
        }

        List<ExploreResponse.ExploreDiaryItem> items = diaries.stream()
                .map(d -> toExploreItem(userId, d))
                .collect(Collectors.toList());

        Long nextCursor = hasNext && !items.isEmpty()
                ? diaries.get(diaries.size() - 1).getId()
                : null;

        String guidanceMessage = items.isEmpty() ? "새로운 일기가 올라오면 알려드릴게요!" : null;

        return new ExploreResponse(items, nextCursor, hasNext, guidanceMessage);
    }

    /**
     * 5.1-2 탐색 일기 상세 조회
     */
    public DiaryDetailExploreResponse detail(Long userId, Long diaryId) {
        Diary diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new BusinessException(ErrorCode.DIARY_NOT_FOUND));

        if (diary.getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.MATCHING_SELF_REQUEST);
        }

        User author = diary.getUser();

        // AI 키워드
        List<DiaryKeyword> keywords = diaryKeywordRepository.findByDiaryId(diaryId);
        List<String> personalityKeywords = keywords.stream()
                .filter(k -> k.getTagType() == DiaryKeyword.TagType.LIFESTYLE || k.getTagType() == DiaryKeyword.TagType.EMOTION)
                .map(DiaryKeyword::getLabel).limit(3).collect(Collectors.toList());
        List<String> moodTags = keywords.stream()
                .filter(k -> k.getTagType() == DiaryKeyword.TagType.TONE)
                .map(DiaryKeyword::getLabel).limit(2).collect(Collectors.toList());

        // 작성자의 다른 일기 프리뷰 (최대 5건)
        List<Diary> otherDiaries = diaryRepository.findRecentByUserId(author.getId(), PageRequest.of(0, 6));
        List<DiaryDetailExploreResponse.OtherDiaryPreview> otherPreviews = otherDiaries.stream()
                .filter(d -> !d.getId().equals(diaryId))
                .limit(5)
                .map(d -> DiaryDetailExploreResponse.OtherDiaryPreview.builder()
                        .diaryId(d.getId())
                        .summary(d.getSummary())
                        .createdAt(d.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                        .build())
                .collect(Collectors.toList());

        return DiaryDetailExploreResponse.builder()
                .diaryId(diaryId)
                .authorId(author.getId())
                .ageGroupLabel(getAgeGroupLabel(author.getBirthDate()))
                .content(diary.getContent())
                .summary(diary.getSummary())
                .keywords(personalityKeywords)
                .moodTags(moodTags)
                .category(diary.getCategory())
                .createdAt(diary.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .similarityBadge(similarityService.getSimilarityBadge(userId, author.getId()))
                .otherDiariesPreview(otherPreviews)
                .build();
    }

    /**
     * 5.2 블라인드 미리보기
     */
    public DiaryPreviewResponse preview(Long userId, Long diaryId) {
        Diary diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new BusinessException(ErrorCode.DIARY_NOT_FOUND));

        // 본인 일기 조회 방지
        if (diary.getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.MATCHING_SELF_REQUEST);
        }

        User author = diary.getUser();

        // AI 키워드 조회
        List<DiaryKeyword> keywords = diaryKeywordRepository.findByDiaryId(diaryId);
        List<String> personalityKeywords = keywords.stream()
                .filter(k -> k.getTagType() == DiaryKeyword.TagType.LIFESTYLE || k.getTagType() == DiaryKeyword.TagType.EMOTION)
                .map(DiaryKeyword::getLabel)
                .limit(3)
                .collect(Collectors.toList());
        List<String> moodTags = keywords.stream()
                .filter(k -> k.getTagType() == DiaryKeyword.TagType.TONE)
                .map(DiaryKeyword::getLabel)
                .limit(2)
                .collect(Collectors.toList());

        // 4줄 미리보기
        String preview = truncateToLines(diary.getContent(), 4);

        return DiaryPreviewResponse.builder()
                .diaryId(diaryId)
                .ageGroup(getAgeGroupLabel(author.getBirthDate()))
                .preview(preview)
                .keywords(personalityKeywords)
                .tags(moodTags)
                .aiIntro(diary.getSummary())
                .category(diary.getCategory())
                .matchScore(null)
                .similarityBadge(similarityService.getSimilarityBadge(userId, author.getId()))
                .build();
    }

    /**
     * 5.3 라이프스타일 리포트
     */
    public LifestyleReportResponse getLifestyleReport(Long userId) {
        long totalCount = diaryRepository.countByUserId(userId);
        int requiredCount = 5;

        if (totalCount < requiredCount) {
            return LifestyleReportResponse.builder()
                    .analysisAvailable(false)
                    .requiredDiaryCount(requiredCount)
                    .currentDiaryCount((int) totalCount)
                    .guidanceMessage("일기 " + (requiredCount - totalCount) + "편을 더 작성하면 리포트를 확인할 수 있어요!")
                    .build();
        }

        // 최근 일기 20편 기반 분석
        List<Diary> recentDiaries = diaryRepository.findRecentByUserId(userId, PageRequest.of(0, 20));

        // 활동 히트맵 (작성 시간대 분포)
        List<LifestyleReportResponse.ActivityHeatmapItem> heatmap = buildHeatmap(recentDiaries);

        // 평일/주말 패턴
        long weekdayCount = recentDiaries.stream()
                .filter(d -> d.getDate().getDayOfWeek().getValue() <= 5).count();
        long weekendCount = recentDiaries.size() - weekdayCount;

        // 평균 일기 길이
        int avgLength = (int) recentDiaries.stream()
                .mapToInt(d -> d.getContent().length())
                .average().orElse(0);

        // 공통 키워드 (AI 분석된 키워드 기준)
        List<Long> diaryIds = recentDiaries.stream().map(Diary::getId).collect(Collectors.toList());
        List<String> commonKeywords = findCommonKeywords(diaryIds);

        // 라이프스타일 태그
        List<String> lifestyleTags = findLifestyleTags(diaryIds);

        return LifestyleReportResponse.builder()
                .analysisAvailable(true)
                .requiredDiaryCount(requiredCount)
                .currentDiaryCount((int) totalCount)
                .activityHeatmap(heatmap)
                .weekdayPattern(LifestyleReportResponse.WeekdayPattern.builder()
                        .weekday((int) weekdayCount)
                        .weekend((int) weekendCount)
                        .build())
                .emotionGraph(null)
                .avgDiaryLength(avgLength)
                .commonKeywords(commonKeywords)
                .aiDescription(null)
                .lifestyleTags(lifestyleTags)
                .guidanceMessage(null)
                .build();
    }

    /**
     * 받은 매칭 요청 목록 조회
     */
    public List<MatchingRequestItem> getReceivedRequests(Long userId) {
        List<Matching> requests = matchingRepository.findReceivedRequests(
                userId, Matching.MatchingStatus.PENDING);

        return requests.stream().map(m -> {
            User fromUser = m.getFromUser();
            Diary diary = m.getDiary();
            String preview = diary.getContent().length() > 80
                    ? diary.getContent().substring(0, 80) + "..."
                    : diary.getContent();

            return MatchingRequestItem.builder()
                    .matchingId(m.getId())
                    .fromUserId(fromUser.getId())
                    .fromUserNickname(fromUser.getNickname())
                    .fromUserAgeGroup(getAgeGroupLabel(fromUser.getBirthDate()))
                    .diaryId(diary.getId())
                    .diaryPreview(preview)
                    .requestedAt(m.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                    .build();
        }).collect(Collectors.toList());
    }

    /**
     * 받은 매칭 요청 수락 (상대방 일기 역선택 → 매칭 성사)
     */
    @Transactional
    public MatchingSelectResponse acceptRequest(Long userId, Long matchingId) {
        Matching request = matchingRepository.findById(matchingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.DIARY_NOT_FOUND));

        // 본인에게 온 요청인지 확인
        if (!request.getToUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        if (request.getStatus() != Matching.MatchingStatus.PENDING) {
            throw new BusinessException(ErrorCode.MATCHING_ALREADY_REQUESTED);
        }

        // 동시 교환 3건 제한
        long activeCount = matchingRepository.countActiveExchangesByUserId(userId);
        if (activeCount >= MAX_CONCURRENT_EXCHANGE) {
            throw new BusinessException(ErrorCode.MATCHING_CONCURRENT_LIMIT);
        }

        // 양방향 매칭 성사
        request.markMatched();

        User fromUser = request.getFromUser();
        User toUser = request.getToUser();

        ExchangeRoom room = createExchangeRoom(request, fromUser, toUser);

        sendMatchedNotification(fromUser, toUser, room);
        sendMatchedNotification(toUser, fromUser, room);

        log.info("[ExploreService] 매칭 수락 → 성사 — matchingId={}, roomUuid={}",
                matchingId, room.getRoomUuid());

        return MatchingSelectResponse.builder()
                .matchingId(matchingId)
                .isMatched(true)
                .roomUuid(room.getRoomUuid().toString())
                .build();
    }

    /**
     * 5.4-1 교환 신청 (select)
     */
    @Transactional
    public MatchingSelectResponse select(Long userId, Long diaryId) {
        User fromUser = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        Diary diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new BusinessException(ErrorCode.DIARY_NOT_FOUND));

        User toUser = diary.getUser();

        // 검증: 자기 자신
        if (toUser.getId().equals(userId)) {
            throw new BusinessException(ErrorCode.MATCHING_SELF_REQUEST);
        }

        // 검증: 중복 PENDING 신청
        if (matchingRepository.existsByFromUserIdAndToUserIdAndStatus(
                userId, toUser.getId(), Matching.MatchingStatus.PENDING)) {
            throw new BusinessException(ErrorCode.MATCHING_ALREADY_REQUESTED);
        }

        // 검증: 동시 교환 3건 제한
        long activeCount = matchingRepository.countActiveExchangesByUserId(userId);
        if (activeCount >= MAX_CONCURRENT_EXCHANGE) {
            throw new BusinessException(ErrorCode.MATCHING_CONCURRENT_LIMIT);
        }

        // 매칭 요청 생성
        Matching matching = Matching.create(fromUser, toUser, diary);
        matchingRepository.save(matching);

        // 역방향 PENDING 조회 (양방향 매칭 감지)
        Optional<Matching> reverseMatching = matchingRepository.findByFromUserIdAndToUserIdAndStatus(
                toUser.getId(), userId, Matching.MatchingStatus.PENDING);

        if (reverseMatching.isPresent()) {
            // 양방향 매칭 성사!
            matching.markMatched();
            reverseMatching.get().markMatched();

            // ExchangeRoom 생성
            ExchangeRoom room = createExchangeRoom(matching, fromUser, toUser);

            // 양쪽 알림
            sendMatchedNotification(fromUser, toUser, room);
            sendMatchedNotification(toUser, fromUser, room);

            log.info("[ExploreService] 매칭 성사 — fromUserId={}, toUserId={}, roomUuid={}",
                    userId, toUser.getId(), room.getRoomUuid());

            return MatchingSelectResponse.builder()
                    .matchingId(matching.getId())
                    .isMatched(true)
                    .roomUuid(room.getRoomUuid().toString())
                    .build();
        }

        // 단방향 신청 → 상대방에게 알림
        sendRequestNotification(fromUser, toUser);

        log.info("[ExploreService] 매칭 신청 — fromUserId={}, toUserId={}, matchingId={}",
                userId, toUser.getId(), matching.getId());

        return MatchingSelectResponse.builder()
                .matchingId(matching.getId())
                .isMatched(false)
                .roomUuid(null)
                .build();
    }

    /**
     * 5.4-2 넘기기 (skip)
     */
    @Transactional
    public void skip(Long userId, Long diaryId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        Diary diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new BusinessException(ErrorCode.DIARY_NOT_FOUND));

        MatchingPass pass = MatchingPass.create(user, diary, diary.getUser());
        matchingPassRepository.save(pass);

        log.debug("[ExploreService] skip — userId={}, diaryId={}, targetUserId={}",
                userId, diaryId, diary.getUser().getId());
    }

    // ──────────────────────────────────────────────────────────────────
    // Private 헬퍼
    // ──────────────────────────────────────────────────────────────────

    private ExploreResponse.ExploreDiaryItem toExploreItem(Long userId, Diary diary) {
        User author = diary.getUser();
        String previewContent = diary.getContent().length() > 80
                ? diary.getContent().substring(0, 80) + "..."
                : diary.getContent();

        return ExploreResponse.ExploreDiaryItem.builder()
                .diaryId(diary.getId())
                .authorId(author.getId())
                .ageGroupLabel(getAgeGroupLabel(author.getBirthDate()))
                .region(author.getSido())
                .previewContent(previewContent)
                .category(diary.getCategory())
                .createdAt(diary.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .similarityBadge(similarityService.getSimilarityBadge(userId, author.getId()))
                .build();
    }

    private String getAgeGroupLabel(LocalDate birthDate) {
        if (birthDate == null) return "비공개";
        int age = (int) ChronoUnit.YEARS.between(birthDate, LocalDate.now(KST));
        if (age < 20) return "10대";
        if (age < 30) return "20대";
        if (age < 40) return "30대";
        return "40대";
    }

    private String truncateToLines(String content, int maxLines) {
        String[] lines = content.split("\n");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < Math.min(lines.length, maxLines); i++) {
            if (i > 0) sb.append("\n");
            sb.append(lines[i]);
        }
        if (sb.length() > 200) return sb.substring(0, 200) + "...";
        return sb.toString();
    }

    private ExchangeRoom createExchangeRoom(Matching matching, User userA, User userB) {
        // ExchangeRoom 팩토리 — 직접 리플렉션 없이 Repository save
        ExchangeRoom room = ExchangeRoom.create(userA, userB, matching);
        return exchangeRoomRepository.save(room);
    }

    private void sendRequestNotification(User fromUser, User toUser) {
        String title = "새로운 교환일기 신청";
        String body = fromUser.getNickname() + "님이 일기를 선택했어요. 관심을 표현해보세요!";
        Notification notification = Notification.create(
                toUser, "MATCHING_REQUEST", title, body, "/matching/requests");
        notificationRepository.save(notification);

        log.info("[알림] MATCHING_REQUEST — toUserId={}, title={}", toUser.getId(), title);
    }

    private void sendMatchedNotification(User target, User partner, ExchangeRoom room) {
        String title = "교환일기가 시작되었어요!";
        String body = partner.getNickname() + "님과 교환일기가 시작되었습니다. 첫 번째 일기를 작성해보세요!";
        String deeplink = "/exchange-rooms/" + room.getRoomUuid();
        Notification notification = Notification.create(
                target, "MATCHING_MATCHED", title, body, deeplink);
        notificationRepository.save(notification);

        log.info("[알림] MATCHING_MATCHED — targetUserId={}, roomUuid={}", target.getId(), room.getRoomUuid());
    }

    private List<LifestyleReportResponse.ActivityHeatmapItem> buildHeatmap(List<Diary> diaries) {
        Map<String, Integer> map = new HashMap<>();
        for (Diary d : diaries) {
            if (d.getCreatedAt() != null) {
                int hour = d.getCreatedAt().getHour();
                int day = d.getDate().getDayOfWeek().getValue();
                String key = hour + "_" + day;
                map.merge(key, 1, Integer::sum);
            }
        }
        return map.entrySet().stream()
                .map(e -> {
                    String[] parts = e.getKey().split("_");
                    return LifestyleReportResponse.ActivityHeatmapItem.builder()
                            .hour(Integer.parseInt(parts[0]))
                            .day(Integer.parseInt(parts[1]))
                            .count(e.getValue())
                            .build();
                })
                .collect(Collectors.toList());
    }

    private List<String> findCommonKeywords(List<Long> diaryIds) {
        if (diaryIds.isEmpty()) return List.of();
        // 빈도 기반 키워드 추출
        Map<String, Long> freq = new HashMap<>();
        for (Long diaryId : diaryIds) {
            List<DiaryKeyword> keywords = diaryKeywordRepository.findByDiaryId(diaryId);
            for (DiaryKeyword kw : keywords) {
                freq.merge(kw.getLabel(), 1L, Long::sum);
            }
        }
        return freq.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }

    private List<String> findLifestyleTags(List<Long> diaryIds) {
        if (diaryIds.isEmpty()) return List.of();
        Map<String, Long> freq = new HashMap<>();
        for (Long diaryId : diaryIds) {
            List<DiaryKeyword> keywords = diaryKeywordRepository.findByDiaryId(diaryId);
            keywords.stream()
                    .filter(k -> k.getTagType() == DiaryKeyword.TagType.LIFESTYLE)
                    .forEach(k -> freq.merge(k.getLabel(), 1L, Long::sum));
        }
        return freq.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }
}
