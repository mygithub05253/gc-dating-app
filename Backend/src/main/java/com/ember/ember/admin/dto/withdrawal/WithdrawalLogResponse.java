package com.ember.ember.admin.dto.withdrawal;

import java.time.LocalDateTime;

public record WithdrawalLogResponse(
        Long id,
        Long userId,
        String nickname,
        String reason,
        String detail,
        LocalDateTime withdrawnAt,
        LocalDateTime permanentDeleteAt
) {
}
