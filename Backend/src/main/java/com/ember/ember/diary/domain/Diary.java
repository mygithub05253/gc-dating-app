package com.ember.ember.diary.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.topic.domain.WeeklyTopic;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "diaries",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "date"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Diary extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 100)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    private LocalDate date;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id")
    private WeeklyTopic topic;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private DiaryStatus status = DiaryStatus.SUBMITTED;

    @Column(length = 100)
    private String summary;

    @Column(length = 20)
    private String category;

    @Column(name = "is_exchanged", nullable = false)
    private Boolean isExchanged = false;

    public enum DiaryStatus {
        SUBMITTED, ANALYZING, ANALYZED, SKIPPED
    }
}
