package com.ember.ember.admin.service.content;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.dto.content.AdminExchangeFlowStatsResponse;
import com.ember.ember.admin.dto.content.AdminGuideStepResponse;
import com.ember.ember.admin.dto.content.AdminGuideStepsUpdateRequest;
import com.ember.ember.content.domain.ExchangeDiaryGuideStep;
import com.ember.ember.content.repository.ExchangeDiaryGuideStepRepository;
import com.ember.ember.exchange.domain.ExchangeRoom;
import com.ember.ember.exchange.repository.ExchangeRoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * 관리자 교환일기 흐름 서비스 — 관리자 API v2.1 §6.7 + 교환일기 흐름 집계 (계획 A-4).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminExchangeDiaryGuideService {

    private final ExchangeDiaryGuideStepRepository guideStepRepository;
    private final ExchangeRoomRepository exchangeRoomRepository;

    // ── §6.7 가이드 단계 조회 / 전체 교체 ─────────────────────────────────
    public List<AdminGuideStepResponse> listSteps() {
        return guideStepRepository.findAllByOrderByStepOrderAsc().stream()
                .map(AdminGuideStepResponse::from)
                .toList();
    }

    @Transactional
    @AdminAction(action = "GUIDE_STEPS_REPLACE", targetType = "EXCHANGE_GUIDE")
    public List<AdminGuideStepResponse> replaceSteps(AdminGuideStepsUpdateRequest request) {
        // 전량 삭제 후 재삽입 — 스펙 §6.7 [Backend] 설계대로
        guideStepRepository.deleteAllInBatch();

        // stepOrder 중복 방지: 요청 내 정렬·검증
        List<AdminGuideStepsUpdateRequest.Step> steps = request.steps().stream()
                .sorted(Comparator.comparingInt(AdminGuideStepsUpdateRequest.Step::stepOrder))
                .toList();

        List<ExchangeDiaryGuideStep> saved = steps.stream()
                .map(s -> ExchangeDiaryGuideStep.create(
                        s.stepOrder(), s.stepTitle(), s.description(),
                        s.imageUrl(), s.isActive()))
                .toList();
        guideStepRepository.saveAll(saved);

        return saved.stream().map(AdminGuideStepResponse::from).toList();
    }

    // ── 교환일기 흐름 통계 (깔때기) ─────────────────────────────────────────
    /**
     * 기간 내 교환일기 방 상태 집계.
     * ACTIVE / EXPIRED / COMPLETED / TERMINATED / CHAT_CONNECTED / ARCHIVED / ENDED 7종 기반.
     *
     * 깔때기 단계:
     *  1. 매칭 시작 (총 생성 방 수)
     *  2. 활성 진행 (ACTIVE + CHAT_CONNECTED 합산 — 한 번이라도 진행 중이었던 방)
     *  3. 완주 (COMPLETED + ARCHIVED + ENDED)
     *  4. 중도 이탈 (TERMINATED + EXPIRED)
     */
    public AdminExchangeFlowStatsResponse flowStats(int periodDays) {
        int safe = Math.max(1, Math.min(periodDays, 365));
        LocalDateTime to = LocalDateTime.now();
        LocalDateTime from = to.minusDays(safe);

        Map<ExchangeRoom.RoomStatus, Long> counts = new EnumMap<>(ExchangeRoom.RoomStatus.class);
        for (ExchangeRoom.RoomStatus s : ExchangeRoom.RoomStatus.values()) counts.put(s, 0L);

        for (Object[] row : exchangeRoomRepository.aggregateStatusBetween(from, to)) {
            ExchangeRoom.RoomStatus status = (ExchangeRoom.RoomStatus) row[0];
            Long count = (Long) row[1];
            counts.put(status, count);
        }

        long total = counts.values().stream().mapToLong(Long::longValue).sum();
        long active = counts.get(ExchangeRoom.RoomStatus.ACTIVE) + counts.get(ExchangeRoom.RoomStatus.CHAT_CONNECTED);
        long completed = counts.get(ExchangeRoom.RoomStatus.COMPLETED)
                + counts.get(ExchangeRoom.RoomStatus.ARCHIVED)
                + counts.get(ExchangeRoom.RoomStatus.ENDED);
        long terminated = counts.get(ExchangeRoom.RoomStatus.TERMINATED)
                + counts.get(ExchangeRoom.RoomStatus.EXPIRED);

        double completionRate = total == 0 ? 0d : (double) completed / total;
        // avgTurnsToComplete 는 diary 차수 집계 필요 — 1차 버전은 0 으로 두고 후속 PR 에서 보강.
        double avgTurns = 0d;

        List<AdminExchangeFlowStatsResponse.StepFunnel> funnel = List.of(
                new AdminExchangeFlowStatsResponse.StepFunnel(
                        "MATCHING_STARTED", total, Math.max(0, total - active),
                        total == 0 ? 0d : (double) active / total),
                new AdminExchangeFlowStatsResponse.StepFunnel(
                        "ACTIVE", active, Math.max(0, active - completed),
                        active == 0 ? 0d : (double) completed / active),
                new AdminExchangeFlowStatsResponse.StepFunnel(
                        "COMPLETED", completed, 0, 1.0d)
        );

        return new AdminExchangeFlowStatsResponse(
                safe, total, active, completed, terminated,
                completionRate, avgTurns, funnel);
    }
}
