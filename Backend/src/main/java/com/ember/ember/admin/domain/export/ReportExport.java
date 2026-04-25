package com.ember.ember.admin.domain.export;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 리포트 내보내기 요청/상태 관리 — 관리자 분석 모듈.
 */
@Entity
@Table(name = "report_exports")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReportExport extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_type", nullable = false, length = 30)
    private ReportType reportType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ExportFormat format;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ExportStatus status;

    @Column(name = "download_url", length = 1000)
    private String downloadUrl;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "requested_by", nullable = false)
    private Long requestedBy;

    public enum ReportType {
        USER_ANALYTICS, MATCHING_PERFORMANCE, OPERATIONS
    }

    public enum ExportFormat {
        CSV, XLSX
    }

    public enum ExportStatus {
        QUEUED, PROCESSING, COMPLETED, FAILED
    }

    /** 리포트 내보내기 요청 팩터리 */
    public static ReportExport request(ReportType reportType, ExportFormat format, Long adminId) {
        ReportExport export = new ReportExport();
        export.reportType = reportType;
        export.format = format;
        export.status = ExportStatus.QUEUED;
        export.requestedBy = adminId;
        return export;
    }

    /** 처리 시작 */
    public void startProcessing() {
        this.status = ExportStatus.PROCESSING;
    }

    /** 처리 완료 */
    public void complete(String url, Long size, LocalDateTime expires) {
        this.status = ExportStatus.COMPLETED;
        this.downloadUrl = url;
        this.fileSize = size;
        this.expiresAt = expires;
    }

    /** 처리 실패 */
    public void fail(String error) {
        this.status = ExportStatus.FAILED;
        this.errorMessage = error;
    }
}
