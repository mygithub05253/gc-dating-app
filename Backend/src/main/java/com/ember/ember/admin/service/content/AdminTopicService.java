package com.ember.ember.admin.service.content;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.dto.content.*;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.topic.domain.WeeklyTopic;
import com.ember.ember.topic.repository.WeeklyTopicRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;

/**
 * 관리자 주제 관리 서비스 — 관리자 API v2.1 §6.4 / §6.5.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminTopicService {

    private final WeeklyTopicRepository weeklyTopicRepository;

    // ── §6.4 목록/생성/수정/삭제 ─────────────────────────────────────────
    public Page<AdminTopicResponse> list(String category, Boolean isActive, Pageable pageable) {
        return weeklyTopicRepository.searchForAdmin(category, isActive, pageable)
                .map(AdminTopicResponse::from);
    }

    @Transactional
    @AdminAction(action = "TOPIC_CREATE", targetType = "TOPIC")
    public AdminTopicResponse create(AdminTopicCreateRequest request) {
        LocalDate monday = toMonday(request.weekStartDate());
        if (weeklyTopicRepository.existsByWeekStartDate(monday)) {
            throw new BusinessException(ErrorCode.ADM_TOPIC_WEEK_CONFLICT);
        }
        WeeklyTopic t = WeeklyTopic.create(
                request.topic(), monday, request.category(),
                request.isActive() == null ? Boolean.TRUE : request.isActive());
        weeklyTopicRepository.save(t);
        return AdminTopicResponse.from(t);
    }

    @Transactional
    @AdminAction(action = "TOPIC_UPDATE", targetType = "TOPIC", targetIdParam = "topicId")
    public AdminTopicResponse update(Long topicId, AdminTopicUpdateRequest request) {
        WeeklyTopic t = load(topicId);
        t.update(request.topic(), request.category(), request.isActive());
        return AdminTopicResponse.from(t);
    }

    @Transactional
    @AdminAction(action = "TOPIC_DELETE", targetType = "TOPIC", targetIdParam = "topicId")
    public void delete(Long topicId) {
        WeeklyTopic t = load(topicId);
        weeklyTopicRepository.delete(t);
    }

    // ── §6.5 주제 스케줄 override ─────────────────────────────────────────
    @Transactional
    @AdminAction(action = "TOPIC_SCHEDULE_OVERRIDE", targetType = "TOPIC", targetIdParam = "topicId")
    public void rescheduleForWeek(LocalDate weekStart, Long topicId, String overrideReason) {
        LocalDate monday = toMonday(weekStart);
        WeeklyTopic target = load(topicId);

        // 해당 주에 이미 다른 주제가 있으면 보류 (충돌 방지)
        if (weeklyTopicRepository.existsByWeekStartDate(monday)
                && !monday.equals(target.getWeekStartDate())) {
            throw new BusinessException(ErrorCode.ADM_TOPIC_WEEK_CONFLICT);
        }
        target.rescheduleTo(monday);
        log.info("[TOPIC_SCHEDULE] topicId={} → {} reason={}", topicId, monday, overrideReason);
    }

    private WeeklyTopic load(Long topicId) {
        return weeklyTopicRepository.findById(topicId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_TOPIC_NOT_FOUND));
    }

    /** 주제 배정은 주 단위(월요일) 기준으로 정규화. */
    private LocalDate toMonday(LocalDate any) {
        return any.with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }
}
