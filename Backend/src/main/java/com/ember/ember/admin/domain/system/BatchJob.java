package com.ember.ember.admin.domain.system;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "batch_jobs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BatchJob extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(name = "cron_expression", length = 50)
    private String cronExpression;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private JobStatus status;

    @Column(name = "last_execution_at")
    private LocalDateTime lastExecutionAt;

    @Column(name = "last_execution_result", length = 20)
    private String lastExecutionResult;

    @Column(name = "next_execution_at")
    private LocalDateTime nextExecutionAt;

    public enum JobStatus {
        ACTIVE, PAUSED, DISABLED
    }

    public static BatchJob create(String name, String description,
                                  String cronExpression, JobStatus status) {
        BatchJob job = new BatchJob();
        job.name = name;
        job.description = description;
        job.cronExpression = cronExpression;
        job.status = (status != null) ? status : JobStatus.ACTIVE;
        return job;
    }

    /** 마지막 실행 결과 갱신 */
    public void updateLastExecution(LocalDateTime executedAt, String result,
                                    LocalDateTime nextAt) {
        this.lastExecutionAt = executedAt;
        this.lastExecutionResult = result;
        this.nextExecutionAt = nextAt;
    }
}
