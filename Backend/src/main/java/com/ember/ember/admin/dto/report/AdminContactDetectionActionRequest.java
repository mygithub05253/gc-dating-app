package com.ember.ember.admin.dto.report;

import com.ember.ember.report.domain.ContactDetection;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminContactDetectionActionRequest(
        @NotNull ContactDetection.ActionType action,
        @NotBlank @Size(min = 1, max = 500) String adminMemo
) {}
