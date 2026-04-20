package com.ember.ember.global.system.dto;

import com.ember.ember.global.system.domain.AppVersion;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "앱 버전 확인 응답")
public record AppVersionResponse(

        @Schema(description = "업데이트 타입 (NONE/RECOMMENDED/FORCE)")
        String updateType,

        @Schema(description = "최신 버전")
        String latestVersion,

        @Schema(description = "스토어 URL")
        String storeUrl
) {
    public static AppVersionResponse from(AppVersion appVersion, String currentVersion) {
        String updateType = "NONE";

        if (currentVersion != null) {
            if (compareVersion(currentVersion, appVersion.getMinVersion()) < 0) {
                updateType = "FORCE";
            } else if (compareVersion(currentVersion, appVersion.getRecommendedVersion()) < 0) {
                updateType = "RECOMMENDED";
            }
        }

        return new AppVersionResponse(
                updateType,
                appVersion.getRecommendedVersion(),
                appVersion.getStoreUrl()
        );
    }

    /** 버전 비교 (1.0.0 형식) */
    private static int compareVersion(String v1, String v2) {
        String[] parts1 = v1.split("\\.");
        String[] parts2 = v2.split("\\.");
        int len = Math.max(parts1.length, parts2.length);
        for (int i = 0; i < len; i++) {
            int p1 = i < parts1.length ? Integer.parseInt(parts1[i]) : 0;
            int p2 = i < parts2.length ? Integer.parseInt(parts2[i]) : 0;
            if (p1 != p2) return Integer.compare(p1, p2);
        }
        return 0;
    }
}
