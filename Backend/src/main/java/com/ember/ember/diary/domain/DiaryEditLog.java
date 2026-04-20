package com.ember.ember.diary.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "diary_edit_logs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DiaryEditLog extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "diary_id", nullable = false)
    private Diary diary;

    @Column(name = "content_before", nullable = false, columnDefinition = "TEXT")
    private String contentBefore;

    @Column(name = "content_after", nullable = false, columnDefinition = "TEXT")
    private String contentAfter;

    @Column(name = "edited_at", nullable = false)
    private LocalDateTime editedAt;

    /** 수정 로그 생성 */
    @Builder
    public DiaryEditLog(Diary diary, String contentBefore, String contentAfter, LocalDateTime editedAt) {
        this.diary = diary;
        this.contentBefore = contentBefore;
        this.contentAfter = contentAfter;
        this.editedAt = editedAt;
    }
}
