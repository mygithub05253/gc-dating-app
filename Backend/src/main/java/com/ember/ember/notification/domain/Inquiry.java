package com.ember.ember.notification.domain;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "inquiries")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Inquiry extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 20)
    private String category;

    @Column(nullable = false, length = 50)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private InquiryStatus status = InquiryStatus.OPEN;

    @Column(columnDefinition = "TEXT")
    private String answer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "answered_by")
    private AdminAccount answeredBy;

    @Column(name = "answered_at")
    private LocalDateTime answeredAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    public enum InquiryStatus {
        OPEN, IN_PROGRESS, RESOLVED, CLOSED
    }

    /** 문의 생성 */
    public static Inquiry create(User user, String category, String title, String content) {
        Inquiry inquiry = new Inquiry();
        inquiry.user = user;
        inquiry.category = category;
        inquiry.title = title;
        inquiry.content = content;
        inquiry.status = InquiryStatus.OPEN;
        return inquiry;
    }

    /** 관리자 답변 등록 */
    public void reply(String answer, AdminAccount admin) {
        this.answer = answer;
        this.answeredBy = admin;
        this.answeredAt = LocalDateTime.now();
        this.status = InquiryStatus.RESOLVED;
    }

    /** 문의 종료 처리 */
    public void close() {
        this.closedAt = LocalDateTime.now();
        this.status = InquiryStatus.CLOSED;
    }
}
