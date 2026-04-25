package com.ember.ember.admin.service.system;

import com.ember.ember.admin.domain.system.BatchJob;
import com.ember.ember.admin.domain.system.BatchJobExecution;
import com.ember.ember.admin.dto.system.BatchJobExecutionResponse;
import com.ember.ember.admin.dto.system.BatchJobResponse;
import com.ember.ember.admin.dto.system.BatchJobRunResponse;
import com.ember.ember.admin.repository.system.BatchJobExecutionRepository;
import com.ember.ember.admin.repository.system.BatchJobRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminBatchJobService {

    private final BatchJobRepository batchJobRepository;
    private final BatchJobExecutionRepository batchJobExecutionRepository;

    /**
     * 배치 작업 목록 조회
     */
    public List<BatchJobResponse> getBatchJobs() {
        return batchJobRepository.findAll().stream()
                .map(BatchJobResponse::from)
                .toList();
    }

    /**
     * 배치 작업 실행 이력 조회 (페이징)
     */
    public Page<BatchJobExecutionResponse> getJobExecutions(Long jobId, Pageable pageable) {
        batchJobRepository.findById(jobId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_BATCH_JOB_NOT_FOUND));

        return batchJobExecutionRepository.findByJobIdOrderByStartedAtDesc(jobId, pageable)
                .map(BatchJobExecutionResponse::from);
    }

    /**
     * 배치 작업 수동 실행 트리거
     */
    @Transactional
    public BatchJobRunResponse runJob(Long jobId) {
        BatchJob job = batchJobRepository.findById(jobId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_BATCH_JOB_NOT_FOUND));

        // 이미 실행 중인지 확인
        batchJobExecutionRepository.findFirstByJobIdAndCompletedAtIsNull(jobId)
                .ifPresent(exec -> {
                    throw new BusinessException(ErrorCode.ADM_BATCH_JOB_ALREADY_RUNNING);
                });

        // 실행 기록 생성
        BatchJobExecution execution = BatchJobExecution.start(jobId);
        batchJobExecutionRepository.save(execution);

        // 마지막 실행 시각 갱신
        job.updateLastExecution(LocalDateTime.now(), null, null);

        // 비동기 실행 시뮬레이션 (실제 배치 로직은 Phase 4+에서 연동)
        completeJobAsync(execution.getId());

        return new BatchJobRunResponse(execution.getId(), "RUNNING");
    }

    /**
     * 배치 작업 중단
     */
    @Transactional
    public void abortJob(Long jobId) {
        batchJobRepository.findById(jobId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_BATCH_JOB_NOT_FOUND));

        BatchJobExecution execution = batchJobExecutionRepository.findFirstByJobIdAndCompletedAtIsNull(jobId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_BATCH_JOB_NOT_RUNNING));

        execution.complete(BatchJobExecution.ExecutionResult.ABORTED, 0, "관리자에 의해 중단됨");
    }

    /**
     * 비동기 배치 완료 시뮬레이션 — 실제 배치 로직 연동 전 임시 처리
     */
    @Async
    @Transactional
    public void completeJobAsync(Long executionId) {
        try {
            Thread.sleep(2000); // 2초 시뮬레이션
            batchJobExecutionRepository.findById(executionId).ifPresent(exec -> {
                if (exec.getCompletedAt() == null) {
                    exec.complete(BatchJobExecution.ExecutionResult.SUCCESS, 0, null);
                }
            });
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("배치 작업 비동기 실행 인터럽트: executionId={}", executionId);
        }
    }
}
