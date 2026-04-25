package com.ember.ember.admin.dto.export;

import com.ember.ember.admin.domain.export.ReportExport;
import com.ember.ember.admin.domain.export.ReportExport.ExportFormat;
import com.ember.ember.admin.domain.export.ReportExport.ExportStatus;
import com.ember.ember.admin.domain.export.ReportExport.ReportType;

import java.time.LocalDateTime;

public record ReportExportResponse(
        Long id,
        ReportType reportType,
        ExportFormat format,
        ExportStatus status,
        String downloadUrl,
        Long fileSize,
        LocalDateTime expiresAt,
        String errorMessage,
        LocalDateTime createdAt
) {
    public static ReportExportResponse from(ReportExport export) {
        return new ReportExportResponse(
                export.getId(),
                export.getReportType(),
                export.getFormat(),
                export.getStatus(),
                export.getDownloadUrl(),
                export.getFileSize(),
                export.getExpiresAt(),
                export.getErrorMessage(),
                export.getCreatedAt()
        );
    }
}
