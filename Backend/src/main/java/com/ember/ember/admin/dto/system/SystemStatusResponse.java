package com.ember.ember.admin.dto.system;

import java.util.List;

public record SystemStatusResponse(
        String overallStatus,
        List<ServiceStatus> services
) {
    public record ServiceStatus(
            String name,
            String status,
            String message,
            Long responseTimeMs
    ) {
    }
}
