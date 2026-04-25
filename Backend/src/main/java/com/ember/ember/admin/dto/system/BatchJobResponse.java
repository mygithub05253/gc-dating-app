package com.ember.ember.admin.dto.system;

import com.ember.ember.admin.domain.system.BatchJob;
import com.ember.ember.admin.domain.system.BatchJob.JobStatus;

import java.time.LocalDateTime;

public record BatchJobResponse(
        Long id,
        String name,
        String description,
        String cronExpression,
        JobStatus status,
        LocalDateTime lastExecutionAt,
        String lastExecutionResult,
        LocalDateTime nextExecutionAt
) {
    public static BatchJobResponse from(BatchJob job) {
        return new BatchJobResponse(
                job.getId(),
                job.getName(),
                job.getDescription(),
                job.getCronExpression(),
                job.getStatus(),
                job.getLastExecutionAt(),
                job.getLastExecutionResult(),
                job.getNextExecutionAt()
        );
    }
}
