package com.ember.ember.admin.domain.campaign;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 일괄 공지/푸시 캠페인 본체 (명세 v2.3 §11.1.3).
 *
 * <p>Phase 2-A 책임</p>
 * <ul>
 *   <li>캠페인 메타(제목·메시지·필터·발송 채널·예약시각) 영속</li>
 *   <li>상태 머신: DRAFT → SCHEDULED/SENDING → COMPLETED/CANCELLED</li>
 *   <li>미리보기 시점 target_count 스냅샷</li>
 * </ul>
 *
 * <p>Phase 2-B에서 추가될 항목: 비동기 워커가 success/failure_count 누적, sent_at/completed_at 타임스탬프 갱신.</p>
 */
@Entity
@Table(name = "notification_campaign")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NotificationCampaign extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "message_subject", nullable = false, length = 500)
    private String messageSubject;

    @Column(name = "message_body", nullable = false, columnDefinition = "TEXT")
    private String messageBody;

    /** 필터 조건 JSON 원본 — Service 측에서 FilterConditionResolver로 파싱. */
    @Column(name = "filter_conditions", nullable = false, columnDefinition = "TEXT")
    private String filterConditionsJson;

    /** 콤마 구분 발송 타입 (NOTICE,PUSH,EMAIL). */
    @Column(name = "send_types", nullable = false, length = 60)
    private String sendTypesCsv;

    /** 즉시 발송이면 null. */
    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private CampaignStatus status = CampaignStatus.DRAFT;

    @Column(name = "target_count", nullable = false)
    private Integer targetCount = 0;

    @Column(name = "success_count", nullable = false)
    private Integer successCount = 0;

    @Column(name = "failure_count", nullable = false)
    private Integer failureCount = 0;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Builder
    private NotificationCampaign(String title, String messageSubject, String messageBody,
                                 String filterConditionsJson, Set<SendType> sendTypes,
                                 LocalDateTime scheduledAt, Integer targetCount, Long createdBy) {
        this.title = title;
        this.messageSubject = messageSubject;
        this.messageBody = messageBody;
        this.filterConditionsJson = filterConditionsJson;
        this.sendTypesCsv = serializeSendTypes(sendTypes);
        this.scheduledAt = scheduledAt;
        this.targetCount = targetCount != null ? targetCount : 0;
        this.createdBy = createdBy;
        this.status = CampaignStatus.DRAFT;
    }

    /** 발송 타입 콤마 문자열을 EnumSet으로 역직렬화. */
    public Set<SendType> getSendTypes() {
        if (sendTypesCsv == null || sendTypesCsv.isBlank()) {
            return EnumSet.noneOf(SendType.class);
        }
        Set<SendType> result = EnumSet.noneOf(SendType.class);
        for (String token : sendTypesCsv.split(",")) {
            String trimmed = token.trim();
            if (!trimmed.isEmpty()) {
                result.add(SendType.valueOf(trimmed));
            }
        }
        return result;
    }

    /** DRAFT → SCHEDULED 또는 즉시 발송이면 SENDING. (Phase 2-B 워커가 SENDING 처리) */
    public void approve() {
        if (this.status != CampaignStatus.DRAFT) {
            throw new IllegalStateException("DRAFT 상태가 아닌 캠페인은 승인할 수 없습니다. 현재=" + this.status);
        }
        if (this.scheduledAt != null && this.scheduledAt.isAfter(LocalDateTime.now())) {
            this.status = CampaignStatus.SCHEDULED;
        } else {
            this.status = CampaignStatus.SENDING;
            this.sentAt = LocalDateTime.now();
        }
    }

    /** SCHEDULED 상태에서만 취소 가능. SENDING/COMPLETED는 별도 예외(409)로 처리. */
    public void cancel() {
        if (this.status != CampaignStatus.SCHEDULED) {
            throw new IllegalStateException("SCHEDULED 상태만 취소할 수 있습니다. 현재=" + this.status);
        }
        this.status = CampaignStatus.CANCELLED;
        this.completedAt = LocalDateTime.now();
    }

    /** 미리보기 시점 대상 수 갱신 (스냅샷). */
    public void refreshTargetCount(int count) {
        this.targetCount = count;
    }

    /** Phase 2-B: 워커가 성공/실패 카운트 누적. */
    public void recordSendResult(int successDelta, int failureDelta) {
        this.successCount = (this.successCount != null ? this.successCount : 0) + successDelta;
        this.failureCount = (this.failureCount != null ? this.failureCount : 0) + failureDelta;
    }

    /** Phase 2-B: 워커가 모든 사용자 발송 완료 시 호출. */
    public void complete() {
        this.status = CampaignStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }

    /**
     * Phase 2-B 워커: SCHEDULED 캠페인의 scheduled_at 도래 시 SENDING 으로 전이.
     * approve()와 분리한 이유: approve는 관리자 호출 진입점이라 DRAFT만 허용해야 하고,
     * SCHEDULED → SENDING 전이는 워커 단독 책임이다.
     */
    public void startSending() {
        if (this.status != CampaignStatus.SCHEDULED && this.status != CampaignStatus.SENDING) {
            throw new IllegalStateException("발송 시작은 SCHEDULED 상태여야 합니다. 현재=" + this.status);
        }
        if (this.status == CampaignStatus.SCHEDULED) {
            this.status = CampaignStatus.SENDING;
            this.sentAt = LocalDateTime.now();
        }
    }

    private static String serializeSendTypes(Set<SendType> sendTypes) {
        if (sendTypes == null || sendTypes.isEmpty()) {
            throw new IllegalArgumentException("sendTypes는 1개 이상 지정해야 합니다.");
        }
        return sendTypes.stream()
                .map(Objects::toString)
                .collect(Collectors.joining(","));
    }

    /** 캠페인 상태 머신 — 명세 §11.1.3 Step 4 status 컬럼. */
    public enum CampaignStatus {
        DRAFT,       // 생성 직후
        SCHEDULED,   // 승인됨, 미래 시각 발송 예약
        SENDING,     // 워커가 발송 중
        COMPLETED,   // 모든 사용자 발송 종료
        CANCELLED    // 취소됨 (SCHEDULED만 취소 가능)
    }

    /** 발송 채널 — 명세 §11.1.3 Step 3 send_types JSON 배열 값. */
    public enum SendType {
        NOTICE,  // 앱 내 공지
        PUSH,    // FCM/APNs 푸시
        EMAIL    // 이메일
    }
}
