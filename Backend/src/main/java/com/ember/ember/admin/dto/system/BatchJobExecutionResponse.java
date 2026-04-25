package com.ember.ember.admin.dto.system;

import com.ember.ember.admin.domain.system.BatchJobExecution;
import com.ember.ember.admin.domain.system.BatchJobExecution.ExecutionResult;

import java.time.LocalDateTime;

public record BatchJobExecutionResponse(
        Long id,
        Long jobId,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        ExecutionResult result,
        int processedCount,
        String errorMessage,
        Long durationMs
) {
    public static BatchJobExecutionResponse from(BatchJobExecution exec) {
        return new BatchJobExecutionResponse(
                exec.getId(),
                exec.getJobId(),
                exec.getStartedAt(),
                exec.getCompletedAt(),
                exec.getResult(),
                exec.getProcessedCount(),
                exec.getErrorMessage(),
                exec.getDurationMs()
        );
    }
}
