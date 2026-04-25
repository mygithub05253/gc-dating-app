package com.ember.ember.admin.dto.event;

import java.time.LocalDate;
import java.util.List;

public record EventReportResponse(
        Long eventId,
        String title,
        String period,
        long totalParticipants,
        long newUserParticipants,
        double conversionRate,
        double retentionRate,
        List<DailyParticipation> dailyParticipation
) {
    public record DailyParticipation(
            LocalDate date,
            long count
    ) {
    }
}
