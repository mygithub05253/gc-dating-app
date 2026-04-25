package com.ember.ember.admin.dto.export;

import com.ember.ember.admin.domain.export.ReportExport.ExportFormat;
import com.ember.ember.admin.domain.export.ReportExport.ReportType;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record ReportExportRequest(
        @NotNull ReportType reportType,
        @NotNull ExportFormat format,
        DateRange dateRange,
        String filters
) {
    public record DateRange(
            LocalDate startDate,
            LocalDate endDate
    ) {
    }
}
