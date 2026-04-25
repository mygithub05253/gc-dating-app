package com.ember.ember.admin.service.ai;

import com.ember.ember.admin.dto.ai.AiAbTestConfigRequest;
import com.ember.ember.admin.dto.ai.AiAbTestResultsResponse;
import com.ember.ember.admin.dto.ai.AiPipelineMetricsResponse;
import com.ember.ember.admin.dto.ai.AiReanalyzeResponse;
import com.ember.ember.diary.domain.Diary;
import com.ember.ember.diary.repository.DiaryRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.messaging.outbox.entity.OutboxEvent;
import com.ember.ember.messaging.outbox.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 관리자 AI 관리 서비스 — §8 AI 관리 API.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminAiService {

    private final DiaryRepository diaryRepository;
    private final OutboxEventRepository outboxEventRepository;

    /**
     * §8.1 AI 재분석 트리거 — 일기의 분석 상태를 PENDING으로 리셋하고 OutboxEvent를 생성한다.
     */
    @Transactional
    public AiReanalyzeResponse reanalyze(Long diaryId) {
        Diary diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_DIARY_NOT_FOUND));

        // 이미 PENDING/PROCESSING 상태라면 중복 요청 방지
        if (diary.getAnalysisStatus() == Diary.AnalysisStatus.PENDING
                || diary.getAnalysisStatus() == Diary.AnalysisStatus.PROCESSING) {
            throw new BusinessException(ErrorCode.ADM_REANALYSIS_IN_PROGRESS);
        }

        // 분석 상태 리셋
        diary.resetAnalysisStatus();

        // Outbox 이벤트 생성 (OutboxRelay가 RabbitMQ로 릴레이)
        String payload = String.format(
                "{\"diaryId\":%d,\"userId\":%d,\"content\":\"%s\"}",
                diary.getId(),
                diary.getUser().getId(),
                escapeJson(diary.getContent())
        );
        OutboxEvent event = OutboxEvent.of("DIARY", diaryId, "DIARY_ANALYZE_REQUESTED", payload);
        outboxEventRepository.save(event);

        log.info("[AI_REANALYZE] diaryId={} 재분석 요청 생성", diaryId);
        return new AiReanalyzeResponse(diaryId, "PENDING");
    }

    /**
     * §8.2 AI 파이프라인 메트릭 조회.
     */
    public AiPipelineMetricsResponse getPipelineMetrics() {
        long completed = diaryRepository.countByAnalysisStatus(Diary.AnalysisStatus.COMPLETED);
        long failed = diaryRepository.countByAnalysisStatus(Diary.AnalysisStatus.FAILED);
        long pending = diaryRepository.countByAnalysisStatus(Diary.AnalysisStatus.PENDING);
        long processing = diaryRepository.countByAnalysisStatus(Diary.AnalysisStatus.PROCESSING);
        long skipped = diaryRepository.countByAnalysisStatus(Diary.AnalysisStatus.SKIPPED);

        long outboxPending = outboxEventRepository.countByStatus(OutboxEvent.OutboxStatus.PENDING);
        long outboxFailed = outboxEventRepository.countByStatus(OutboxEvent.OutboxStatus.FAILED);

        long total = completed + failed;
        double successRate = (total > 0) ? (completed * 100.0 / total) : 0.0;

        return new AiPipelineMetricsResponse(
                completed, failed, pending, processing, skipped,
                outboxPending, outboxFailed,
                Math.round(successRate * 100.0) / 100.0
        );
    }

    /**
     * §8.3 A/B 테스트 결과 조회 — 현재 A/B 테스트 미활성 상태이므로 빈 결과 반환.
     */
    public AiAbTestResultsResponse getAbTestResults() {
        return new AiAbTestResultsResponse(false, List.of());
    }

    /**
     * §8.4 A/B 테스트 설정 저장 — 현재 스텁 구현.
     */
    @Transactional
    public void saveAbTestConfig(AiAbTestConfigRequest request) {
        // TODO: A/B 테스트 설정 테이블 생성 후 구현
        log.info("[AI_AB_TEST_CONFIG] testName={} enabled={} controlGroup={}%",
                request.testName(), request.enabled(), request.controlGroupPercent());
    }

    private String escapeJson(String text) {
        if (text == null) return "";
        return text.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
