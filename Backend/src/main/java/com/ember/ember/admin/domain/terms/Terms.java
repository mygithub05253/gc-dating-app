package com.ember.ember.admin.domain.terms;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "terms")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Terms extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private TermsType type;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false, length = 20)
    private String version;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private TermsStatus status = TermsStatus.DRAFT;

    @Column(name = "is_required", nullable = false)
    private Boolean isRequired = true;

    @Column(name = "effective_date")
    private LocalDate effectiveDate;

    @Column(name = "accept_count", nullable = false)
    private Integer acceptCount = 0;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "change_reason", length = 500)
    private String changeReason;

    public enum TermsType {
        USER_TERMS, AI_TERMS
    }

    public enum TermsStatus {
        DRAFT, ACTIVE, ARCHIVED
    }

    /** 약관 생성 팩터리 */
    public static Terms create(TermsType type, String title, String content, String version,
                               TermsStatus status, Boolean isRequired, LocalDate effectiveDate,
                               Long createdBy, String changeReason) {
        Terms t = new Terms();
        t.type = type;
        t.title = title;
        t.content = content;
        t.version = version;
        t.status = status != null ? status : TermsStatus.DRAFT;
        t.isRequired = isRequired != null ? isRequired : true;
        t.effectiveDate = effectiveDate;
        t.createdBy = createdBy;
        t.changeReason = changeReason;
        return t;
    }

    /** 약관 수정 */
    public void update(String title, String content, String version,
                       TermsStatus status, Boolean isRequired,
                       LocalDate effectiveDate, String changeReason) {
        this.title = title;
        this.content = content;
        if (version != null) this.version = version;
        if (status != null) this.status = status;
        if (isRequired != null) this.isRequired = isRequired;
        this.effectiveDate = effectiveDate;
        this.changeReason = changeReason;
    }

    /** 상태 변경 (아카이브 등) */
    public void updateStatus(TermsStatus status) {
        this.status = status;
    }
}
