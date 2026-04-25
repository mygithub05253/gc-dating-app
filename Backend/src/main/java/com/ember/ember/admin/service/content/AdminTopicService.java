package com.ember.ember.admin.service.content;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.dto.content.*;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.topic.domain.WeeklyTopic;
import com.ember.ember.topic.repository.WeeklyTopicRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

/**
 * 관리자 주제 관리 서비스 — 관리자 API v2.1 §6.4 / §6.5.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminTopicService {

    private final WeeklyTopicRepository weeklyTopicRepository;
    private final EntityManager em;

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

    // ── 주간 주제 스케줄 조회 ─────────────────────────────────────────────
    /**
     * 현재 주부터 N주 앞까지 배정된 주간 주제 스케줄을 반환한다.
     */
    public List<AdminTopicScheduleResponse> getSchedule(int weeks) {
        int safeWeeks = Math.max(1, Math.min(weeks, 52));
        LocalDate today = LocalDate.now();
        LocalDate startMonday = toMonday(today);
        LocalDate endMonday = startMonday.plusWeeks(safeWeeks);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                SELECT id, topic, category, week_start_date, usage_count, is_active
                FROM weekly_topics
                WHERE week_start_date >= :start AND week_start_date < :end
                ORDER BY week_start_date ASC
                """)
                .setParameter("start", startMonday)
                .setParameter("end", endMonday)
                .getResultList();

        return rows.stream()
                .map(r -> new AdminTopicScheduleResponse(
                        ((Number) r[0]).longValue(),
                        (String) r[1],
                        (String) r[2],
                        r[3] instanceof LocalDate ld ? ld : ((java.sql.Date) r[3]).toLocalDate(),
                        ((Number) r[4]).intValue(),
                        (Boolean) r[5]
                ))
                .toList();
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
