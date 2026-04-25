package com.ember.ember.admin.domain.system;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 배치 작업 실행 이력 — 관리자 시스템 모니터링용.
 */
@Entity
@Table(name = "batch_job_executions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BatchJobExecution extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_id", nullable = false)
    private Long jobId;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ExecutionResult result;

    @Column(name = "processed_count", nullable = false)
    private int processedCount;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "duration_ms")
    private Long durationMs;

    public enum ExecutionResult {
        SUCCESS, FAILED, ABORTED
    }

    /** 배치 작업 실행 시작 팩터리 */
    public static BatchJobExecution start(Long jobId) {
        BatchJobExecution execution = new BatchJobExecution();
        execution.jobId = jobId;
        execution.startedAt = LocalDateTime.now();
        execution.result = ExecutionResult.SUCCESS;
        execution.processedCount = 0;
        return execution;
    }

    /** 배치 작업 완료 처리 */
    public void complete(ExecutionResult result, int processedCount, String error) {
        this.completedAt = LocalDateTime.now();
        this.result = result;
        this.processedCount = processedCount;
        this.errorMessage = error;
        this.durationMs = java.time.Duration.between(this.startedAt, this.completedAt).toMillis();
    }
}
