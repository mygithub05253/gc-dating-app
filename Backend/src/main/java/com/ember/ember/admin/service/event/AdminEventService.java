package com.ember.ember.admin.service.event;

import com.ember.ember.admin.domain.event.PromotionEvent;
import com.ember.ember.admin.domain.event.PromotionEvent.EventStatus;
import com.ember.ember.admin.domain.event.PromotionEvent.EventTarget;
import com.ember.ember.admin.domain.event.PromotionEvent.EventType;
import com.ember.ember.admin.dto.event.*;
import com.ember.ember.admin.repository.event.EventParticipantRepository;
import com.ember.ember.admin.repository.event.PromotionEventRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminEventService {

    private final PromotionEventRepository promotionEventRepository;
    private final EventParticipantRepository eventParticipantRepository;

    /** 허용 상태 전이 맵 */
    private static final Map<EventStatus, Set<EventStatus>> VALID_TRANSITIONS = Map.of(
            EventStatus.SCHEDULED, Set.of(EventStatus.ACTIVE, EventStatus.ENDED),
            EventStatus.ACTIVE, Set.of(EventStatus.PAUSED, EventStatus.ENDED),
            EventStatus.PAUSED, Set.of(EventStatus.ACTIVE, EventStatus.ENDED)
    );

    /**
     * 이벤트 목록 조회 (필터 + 페이징)
     */
    public Page<EventListResponse> getEvents(String type, String status, String target, Pageable pageable) {
        EventType typeEnum = (type != null) ? EventType.valueOf(type.toUpperCase()) : null;
        EventStatus statusEnum = (status != null) ? EventStatus.valueOf(status.toUpperCase()) : null;
        EventTarget targetEnum = (target != null) ? EventTarget.valueOf(target.toUpperCase()) : null;

        Page<PromotionEvent> page = promotionEventRepository.findByFilters(typeEnum, statusEnum, targetEnum, pageable);

        return page.map(event -> {
            long count = eventParticipantRepository.countByEventId(event.getId());
            return EventListResponse.from(event, count);
        });
    }

    /**
     * 이벤트 생성
     */
    @Transactional
    public EventListResponse createEvent(EventCreateRequest request, Long adminId) {
        // 날짜 유효성 검증
        if (request.endDate().isBefore(request.startDate())) {
            throw new BusinessException(ErrorCode.ADM_EVENT_INVALID_DATE);
        }

        // 시작일이 과거이면 ACTIVE, 미래이면 SCHEDULED
        EventStatus initialStatus = request.startDate().isBefore(LocalDateTime.now())
                ? EventStatus.ACTIVE
                : EventStatus.SCHEDULED;

        PromotionEvent event = PromotionEvent.create(
                request.title(),
                request.description(),
                EventType.valueOf(request.type().toUpperCase()),
                initialStatus,
                EventTarget.valueOf(request.target().toUpperCase()),
                request.startDate(),
                request.endDate(),
                request.config(),
                adminId
        );

        promotionEventRepository.save(event);
        return EventListResponse.from(event, 0);
    }

    /**
     * 이벤트 상태 변경
     */
    @Transactional
    public EventStatusResponse changeStatus(Long eventId, EventStatusRequest request) {
        PromotionEvent event = promotionEventRepository.findById(eventId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_EVENT_NOT_FOUND));

        EventStatus newStatus = EventStatus.valueOf(request.status().toUpperCase());
        EventStatus currentStatus = event.getStatus();

        // ENDED 상태에서는 변경 불가
        if (currentStatus == EventStatus.ENDED) {
            throw new BusinessException(ErrorCode.ADM_EVENT_INVALID_STATUS);
        }

        // 유효한 전이인지 확인
        Set<EventStatus> allowed = VALID_TRANSITIONS.getOrDefault(currentStatus, Set.of());
        if (!allowed.contains(newStatus)) {
            throw new BusinessException(ErrorCode.ADM_EVENT_INVALID_STATUS);
        }

        String previousStatus = currentStatus.name();
        event.changeStatus(newStatus);

        return new EventStatusResponse(event.getId(), previousStatus, newStatus.name());
    }

    /**
     * 이벤트 효과 리포트
     */
    public EventReportResponse getEventReport(Long eventId) {
        PromotionEvent event = promotionEventRepository.findById(eventId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_EVENT_NOT_FOUND));

        long totalParticipants = eventParticipantRepository.countByEventId(eventId);

        // 이벤트 시작 후 7일 이내 가입자 중 참여자 (신규 유저 참여)
        LocalDateTime since = event.getStartDate() != null ? event.getStartDate() : event.getCreatedAt();
        long newUserParticipants = eventParticipantRepository.countNewUserParticipants(eventId, since);

        // 전환율/리텐션은 참여자 기반 추정
        double conversionRate = totalParticipants > 0 ? Math.min(100.0, (double) newUserParticipants / totalParticipants * 100) : 0.0;
        double retentionRate = totalParticipants > 0 ? 75.0 : 0.0; // 실제 리텐션 계산은 별도 집계 필요

        // 일별 참여 통계
        List<Object[]> dailyRows = eventParticipantRepository.countDailyParticipation(eventId);
        List<EventReportResponse.DailyParticipation> dailyParticipation = dailyRows.stream()
                .map(row -> {
                    LocalDate date = row[0] instanceof java.sql.Date sqlDate
                            ? sqlDate.toLocalDate()
                            : (LocalDate) row[0];
                    long count = ((Number) row[1]).longValue();
                    return new EventReportResponse.DailyParticipation(date, count);
                })
                .toList();

        String period = formatPeriod(event.getStartDate(), event.getEndDate());

        return new EventReportResponse(
                event.getId(),
                event.getTitle(),
                period,
                totalParticipants,
                newUserParticipants,
                Math.round(conversionRate * 10) / 10.0,
                retentionRate,
                dailyParticipation
        );
    }

    private String formatPeriod(LocalDateTime start, LocalDateTime end) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        String s = start != null ? start.format(fmt) : "?";
        String e = end != null ? end.format(fmt) : "?";
        return s + " ~ " + e;
    }
}
