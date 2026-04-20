package com.ember.ember.diary.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "diary_keywords")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DiaryKeyword extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "diary_id", nullable = false)
    private Diary diary;

    @Column(name = "tag_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private TagType tagType;

    @Column(nullable = false, length = 50)
    private String label;

    @Column(nullable = false, precision = 4, scale = 3)
    private BigDecimal score;

    public enum TagType {
        EMOTION, LIFESTYLE, RELATIONSHIP_STYLE, TONE
    }

    /**
     * AI 분석 태그 결과로부터 DiaryKeyword 생성 팩토리 메서드.
     */
    public static DiaryKeyword of(Diary diary, TagType tagType, String label, java.math.BigDecimal score) {
        DiaryKeyword keyword = new DiaryKeyword();
        keyword.diary = diary;
        keyword.tagType = tagType;
        keyword.label = label;
        keyword.score = score;
        return keyword;
    }
}
