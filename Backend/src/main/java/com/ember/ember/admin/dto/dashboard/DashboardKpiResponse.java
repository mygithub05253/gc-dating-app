package com.ember.ember.admin.dto.dashboard;

/**
 * 대시보드 핵심 KPI 응답 DTO.
 */
public record DashboardKpiResponse(
    long dau,
    long mau,
    long newUsersToday,
    long matchesToday,
    long pendingReports,
    long activeExchanges
) {}
